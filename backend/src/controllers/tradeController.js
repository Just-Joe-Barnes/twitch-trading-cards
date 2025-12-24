const Joi = require('joi');
const mongoose = require('mongoose');
const Trade = require('../models/tradeModel');
const User = require('../models/userModel');
const MarketListing = require('../models/MarketListing');
const { createNotification } = require('../helpers/notificationHelper');
const { sendNotificationToUser } = require('../../notificationService');
const { logAudit } = require('../helpers/auditLogger');
const tradeService = require('../services/tradeService');

function removeFromFeaturedCards(user, cardId) {
    if (!user.featuredCards) return;
    user.featuredCards = user.featuredCards.filter(
        (c) => c._id.toString() !== cardId.toString()
    );
}

const createTrade = async (req, res) => {
    const tradeSchema = Joi.object({
        recipient: Joi.alternatives().try(Joi.string().required(), Joi.string().hex().length(24).required()),
        offeredItems: Joi.array().items(Joi.string().hex().length(24)).required(),
        requestedItems: Joi.array().items(Joi.string().hex().length(24)).required(),
        offeredPacks: Joi.number().min(0).required(),
        requestedPacks: Joi.number().min(0).required(),
        counterOf: Joi.string().hex().length(24).optional()
    });

    const { error } = tradeSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ popupMessage: 'Invalid trade data: ' + error.details[0].message });
    }

    const senderId = req.userId;
    const { recipient, offeredItems, requestedItems, offeredPacks, requestedPacks, counterOf } = req.body;

    logAudit('Trade Create Attempt', { senderId, body: req.body });

    const result = await tradeService.createTrade(senderId, { recipient, offeredItems, requestedItems, offeredPacks, requestedPacks, counterOf });

    if (!result.success) {
        return res.status(result.status || 500).json({ popupMessage: result.message });
    }

    return res.status(201).json(result.trade);
};

const updateTradeStatus = async (req, res) => {
    const { tradeId } = req.params;
    const { status } = req.body;

    const statusSchema = Joi.object({
        status: Joi.string().valid('accepted', 'rejected', 'cancelled').required()
    });
    const { error } = statusSchema.validate(req.body);
    if (error) {
        console.error("[Trade Status Update] Joi validation error:", error.details[0].message);
        return res.status(400).json({ message: 'Invalid status update: ' + error.details[0].message });
    }

    console.log(`[Trade Status Update] Received request to ${status} trade with ID: ${tradeId} by UserID: ${req.userId}`);
    logAudit('Trade Status Update Attempt', { userId: req.userId, tradeId, newStatus: status });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const trade = await Trade.findById(tradeId).session(session);
        if (!trade) {
            console.log(`[Trade Status Update] Trade with ID ${tradeId} not found.`);
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Trade not found" });
        }
        console.log(`[Trade Status Update] Found trade: ${trade._id}, current status: ${trade.status}`);
        console.log(`[Trade Status Update] Trade sender: ${trade.sender}, recipient: ${trade.recipient}`);
        console.log(`[Trade Status Update] Offered Items: ${trade.offeredItems.length}, Requested Items: ${trade.requestedItems.length}`);
        console.log(`[Trade Status Update] Offered Packs: ${trade.offeredPacks}, Requested Packs: ${trade.requestedPacks}`);

        const sender = await User.findById(trade.sender).session(session);
        const recipient = await User.findById(trade.recipient).session(session);
        if (!sender || !recipient) {
            console.log("[Trade Status Update] Sender or Recipient user not found.");
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Sender or Recipient not found" });
        }
        console.log(`[Trade Status Update] Sender: ${sender.username} (${sender._id}), Recipient: ${recipient.username} (${recipient._id})`);

        const isRecipient = trade.recipient.toString() === req.userId;
        const isSender = trade.sender.toString() === req.userId;
        console.log(`[Trade Status Update] Is recipient making request? ${isRecipient}. Is sender making request? ${isSender}.`);

        if (trade.status !== 'pending') {
            console.log(`[Trade Status Update] Trade is not pending (current status: ${trade.status}). Cannot change status to ${status}.`);
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: `Trade is already ${trade.status}. Cannot update.` });
        }

        if (!req.user.isAdmin) {
            if ((['accepted', 'rejected'].includes(status) && !isRecipient) ||
                (status === 'cancelled' && !isSender)) {
                console.log("[Trade Status Update] Unauthorized action. User is not the correct party to perform this action.");
                await session.abortTransaction();
                session.endSession();
                return res.status(403).json({ message: "Unauthorized action" });
            }
        }

        let senderUpdates = {};
        let recipientUpdates = {};
        let senderCardsToUpdate = [];
        let recipientCardsToUpdate = [];


        if (status === 'accepted') {
            console.log("[Trade Status Update] Processing trade acceptance...");

            if (sender.packs < trade.offeredPacks) {
                console.log(`[Trade Status Update] Sender (${sender.username}) does not have enough packs. Has: ${sender.packs}, Needs: ${trade.offeredPacks}`);
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: "Sender does not have enough packs" });
            }
            if (recipient.packs < trade.requestedPacks) {
                console.log(`[Trade Status Update] Recipient (${recipient.username}) does not have enough packs. Has: ${recipient.packs}, Needs: ${trade.requestedPacks}`);
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: "Recipient does not have enough packs" });
            }
            console.log(`[Trade Status Update] Packs before transaction - Sender: ${sender.packs}, Recipient: ${recipient.packs}`);

            senderUpdates.packs = sender.packs - trade.offeredPacks + trade.requestedPacks;
            recipientUpdates.packs = recipient.packs - trade.requestedPacks + trade.offeredPacks;
            console.log(`[Trade Status Update] Packs after calculation - Sender: ${senderUpdates.packs}, Recipient: ${recipientUpdates.packs}`);

            const offeredCardsDetails = [];
            for (const offeredItemId of trade.offeredItems) {
                const card = sender.cards.find(c => c._id.equals(offeredItemId));
                if (!card) {
                    console.warn(`[Trade Status Update] Sender (${sender.username}) missing offered card: ${offeredItemId}`);
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json({ message: `Sender is missing an offered card.` });
                }
                offeredCardsDetails.push(card);
            }

            const requestedCardsDetails = [];
            for (const requestedItemId of trade.requestedItems) {
                const card = recipient.cards.find(c => c._id.equals(requestedItemId));
                if (!card) {
                    console.warn(`[Trade Status Update] Recipient (${recipient.username}) missing requested card: ${requestedItemId}`);
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json({ message: `Recipient is missing a requested card.` });
                }
                requestedCardsDetails.push(card);
            }
            console.log(`[Trade Status Update] All offered and requested cards found in respective collections.`);

            const newSenderCards = sender.cards.filter(card =>
                !trade.offeredItems.some(itemId => itemId.equals(card._id))
            ).concat(requestedCardsDetails.map(card => {
                removeFromFeaturedCards(recipient, card._id);
                card.status = 'available';
                card.acquiredAt = new Date();
                return card;
            }));

            const newRecipientCards = recipient.cards.filter(card =>
                !trade.requestedItems.some(itemId => itemId.equals(card._id))
            ).concat(offeredCardsDetails.map(card => {
                removeFromFeaturedCards(sender, card._id);
                card.status = 'available';
                card.acquiredAt = new Date();
                return card;
            }));

            senderUpdates.cards = newSenderCards;
            recipientUpdates.cards = newRecipientCards;
            console.log(`[Trade Status Update] New card arrays constructed in memory.`);

            senderUpdates.xp = (sender.xp || 0) + 20;
            recipientUpdates.xp = (recipient.xp || 0) + 20;
            senderUpdates.level = Math.floor(senderUpdates.xp / 100) + 1;
            recipientUpdates.level = Math.floor(recipientUpdates.xp / 100) + 1;
            senderUpdates.completedTrades = (sender.completedTrades || 0) + 1;
            recipientUpdates.completedTrades = (recipient.completedTrades || 0) + 1;
            console.log("[Trade Status Update] XP and completed trades prepared.");

            const tradedCardIds = [...trade.offeredItems, ...trade.requestedItems];
            console.log(`[Trade Status Update] Cleaning up other pending trades/listings involving traded cards: ${tradedCardIds.length} cards.`);

            const tradeUpdateOperations = [];
            if (tradedCardIds.length > 0) {
                tradeUpdateOperations.push({
                    updateMany: {
                        filter: {
                            _id: { $ne: trade._id },
                            status: 'pending',
                            $or: [
                                { offeredItems: { $in: tradedCardIds } },
                                { requestedItems: { $in: tradedCardIds } }
                            ]
                        },
                        update: {
                            $set: { status: 'cancelled', cancellationReason: 'Card traded in another transaction' }
                        }
                    }
                });
            }

            const marketListingUpdateOperations = [];
            if (tradedCardIds.length > 0) {
                marketListingUpdateOperations.push({
                    updateMany: {
                        filter: {
                            "card._id": { $in: tradedCardIds },
                            status: 'active'
                        },
                        update: {
                            $set: { status: 'cancelled', cancellationReason: 'Card traded in another transaction' }
                        }
                    }
                });
            }

            if (tradeUpdateOperations.length > 0) {
                await Trade.bulkWrite(tradeUpdateOperations, { session });
                console.log("[Trade Status Update] Other conflicting pending trades cancelled.");
            }
            if (marketListingUpdateOperations.length > 0) {
                await MarketListing.bulkWrite(marketListingUpdateOperations, { session });
                console.log("[Trade Status Update] Conflicting market listings cancelled.");
            }

        } else if (status === 'rejected' || status === 'cancelled') {
            console.log(`[Trade Status Update] Processing trade ${status}. Marking cards as available.`);
            const offeredCardIds = trade.offeredItems;
            const requestedCardIds = trade.requestedItems;

            senderCardsToUpdate = offeredCardIds;
            recipientCardsToUpdate = requestedCardIds;

            console.log(`[Trade Status Update] Card IDs prepared for status update.`);
        }

        if (Object.keys(senderUpdates).length > 0) {
            Object.assign(sender, senderUpdates);
            await sender.save({ session });
            console.log(`[Trade Status Update] Sender document saved with all changes.`);
        }
        if (senderCardsToUpdate.length > 0 && !Object.keys(senderUpdates).length) {
            await User.updateOne(
                { _id: sender._id, "cards._id": { $in: senderCardsToUpdate } },
                { $set: { "cards.$[element].status": 'available' } },
                { arrayFilters: [{ "element._id": { $in: senderCardsToUpdate } }] }
            ).session(session);
            console.log(`[Trade Status Update] Sender's relevant cards marked available via updateOne.`);
        }


        if (Object.keys(recipientUpdates).length > 0) {
            Object.assign(recipient, recipientUpdates);
            await recipient.save({ session });
            console.log(`[Trade Status Update] Recipient document saved with all changes.`);
        }
        if (recipientCardsToUpdate.length > 0 && !Object.keys(recipientUpdates).length) {
            await User.updateOne(
                { _id: recipient._id, "cards._id": { $in: recipientCardsToUpdate } },
                { $set: { "cards.$[element].status": 'available' } },
                { arrayFilters: [{ "element._id": { $in: recipientCardsToUpdate } }] }
            ).session(session);
            console.log(`[Trade Status Update] Recipient's relevant cards marked available via updateOne.`);
        }


        trade.status = status;
        await trade.save({ session });
        console.log(`[Trade Status Update] Trade status updated to ${status} in database.`);

        if (status === 'accepted') {
            const { checkAndGrantAchievements } = require('../helpers/achievementHelper');
            await checkAndGrantAchievements(sender);
            await checkAndGrantAchievements(recipient);
            console.log("[Trade Status Update] Achievements checked/granted.");
        }


        await session.commitTransaction();
        session.endSession();

        console.log(`[Trade Status Update] Trade ${status} successfully. Transaction committed.`);

        if (status === 'accepted') {
            await createNotification(sender._id, {
                type: 'Trade Update',
                message: `Your trade offer to ${recipient.username} has been accepted.`,
                link: `/trades/pending`
            });
            sendNotificationToUser(sender._id, {
                type: 'Trade Update',
                message: `Your trade offer to ${recipient.username} has been accepted.`,
                link: `/trades/pending`
            });
            await createNotification(recipient._id, {
                type: 'Trade Update',
                message: `You have accepted a trade offer from ${sender.username}.`,
                link: `/trades/pending`
            });
            sendNotificationToUser(recipient._id, {
                type: 'Trade Update',
                message: `You have accepted a trade offer from ${sender.username}.`,
                link: `/trades/pending`
            });
        } else if (status === 'rejected') {
            await createNotification(sender._id, {
                type: 'Trade Update',
                message: `Your trade offer to ${recipient.username} has been rejected.`,
                link: `/trades/pending`
            });
            sendNotificationToUser(sender._id, {
                type: 'Trade Update',
                message: `Your trade offer to ${recipient.username} has been rejected.`,
                link: `/trades/pending`
            });
        } else if (status === 'cancelled') {
            if (isSender) {
                await createNotification(recipient._id, {
                    type: 'Trade Update',
                    message: `The trade offer from ${sender.username} has been cancelled.`,
                    link: `/trades/pending`
                });
                sendNotificationToUser(recipient._id, {
                    type: 'Trade Update',
                    message: `The trade offer from ${sender.username} has been cancelled.`,
                    link: `/trades/pending`
                });
            } else {
                await createNotification(sender._id, {
                    type: 'Trade Update',
                    message: `Your trade offer to ${recipient.username} has been cancelled.`,
                    link: `/trades/pending`
                });
                sendNotificationToUser(sender._id, {
                    type: 'Trade Update',
                    message: `Your trade offer to ${recipient.username} has been cancelled.`,
                    link: `/trades/pending`
                });
            }
        }

        logAudit('Trade Status Updated', { tradeId: trade._id, newStatus: status, userId: req.userId });

        res.status(200).json({ message: `Trade ${status} successfully`, trade });
    } catch (error) {
        console.error("[Trade Status Update] Uncaught error during transaction:", error);
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: "Failed to update trade status", error: error.message });
    }
};

const getPendingTrades = async (req, res) => {
    const { userId } = req.params;
    try {
        const uid = new mongoose.Types.ObjectId(userId);
        const pipeline = [
            {
                $match: {
                    status: 'pending',
                    $or: [{ sender: uid }, { recipient: uid }]
                }
            },
            {
                $lookup: {
                    from: 'users',
                    let: { senderId: '$sender', offered: '$offeredItems' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$senderId'] } } },
                        {
                            $project: {
                                username: 1,
                                selectedTitle: 1,
                                cards: {
                                    $filter: {
                                        input: '$cards',
                                        as: 'c',
                                        cond: { $in: ['$$c._id', '$$offered'] }
                                    }
                                }
                            }
                        }
                    ],
                    as: 'senderInfo'
                }
            },
            { $unwind: { path: '$senderInfo', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'titles',
                    localField: 'senderInfo.selectedTitle',
                    foreignField: '_id',
                    as: 'senderTitle'
                }
            },
            { $unwind: { path: '$senderTitle', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    let: { recipientId: '$recipient', requested: '$requestedItems' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$recipientId'] } } },
                        {
                            $project: {
                                username: 1,
                                selectedTitle: 1,
                                cards: {
                                    $filter: {
                                        input: '$cards',
                                        as: 'c',
                                        cond: { $in: ['$$c._id', '$$requested'] }
                                    }
                                }
                            }
                        }
                    ],
                    as: 'recipientInfo'
                }
            },
            { $unwind: { path: '$recipientInfo', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'titles',
                    localField: 'recipientInfo.selectedTitle',
                    foreignField: '_id',
                    as: 'recipientTitle'
                }
            },
            { $unwind: { path: '$recipientTitle', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    offeredItems: '$senderInfo.cards',
                    requestedItems: '$recipientInfo.cards',
                    sender: {
                        username: '$senderInfo.username',
                        selectedTitle: {
                            name: '$senderTitle.name',
                            color: '$senderTitle.color',
                            gradient: '$senderTitle.gradient',
                            isAnimated: '$senderTitle.isAnimated',
                            effect: '$senderTitle.effect'
                        }
                    },
                    recipient: {
                        username: '$recipientInfo.username',
                        selectedTitle: {
                            name: '$recipientTitle.name',
                            color: '$recipientTitle.color',
                            gradient: '$recipientTitle.gradient',
                            isAnimated: '$recipientTitle.isAnimated',
                            effect: '$recipientTitle.effect'
                        }
                    },
                    offeredPacks: 1,
                    requestedPacks: 1,
                    status: 1,
                    cancellationReason: 1,
                    expiresAt: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    offeredItemsSnapshot: 1,
                    requestedItemsSnapshot: 1
                }
            }
        ];

        const enrichedTrades = await Trade.aggregate(pipeline);
        console.log("[Backend] Pending trades fetched:", enrichedTrades);
        res.status(200).json(enrichedTrades);
    } catch (err) {
        console.error("[Backend] Error fetching pending trades:", err);
        res.status(500).json({ message: 'Failed to fetch pending trades', error: err.message });
    }
};

const getTradesForUser = async (req, res) => {
    const { userId } = req.params;
    try {
        const uid = new mongoose.Types.ObjectId(userId);
        const pipeline = [
            {
                $match: { $or: [{ sender: uid }, { recipient: uid }] }
            },
            {
                $lookup: {
                    from: 'users',
                    let: { senderId: '$sender', offered: '$offeredItems' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$senderId'] } } },
                        {
                            $project: {
                                username: 1,
                                selectedTitle: 1,
                                cards: {
                                    $filter: {
                                        input: '$cards',
                                        as: 'c',
                                        cond: { $in: ['$$c._id', '$$offered'] }
                                    }
                                }
                            }
                        }
                    ],
                    as: 'senderInfo'
                }
            },
            { $unwind: { path: '$senderInfo', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'titles',
                    localField: 'senderInfo.selectedTitle',
                    foreignField: '_id',
                    as: 'senderTitle'
                }
            },
            { $unwind: { path: '$senderTitle', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    let: { recipientId: '$recipient', requested: '$requestedItems' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$recipientId'] } } },
                        {
                            $project: {
                                username: 1,
                                selectedTitle: 1,
                                cards: {
                                    $filter: {
                                        input: '$cards',
                                        as: 'c',
                                        cond: { $in: ['$$c._id', '$$requested'] }
                                    }
                                }
                            }
                        }
                    ],
                    as: 'recipientInfo'
                }
            },
            { $unwind: { path: '$recipientInfo', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'titles',
                    localField: 'recipientInfo.selectedTitle',
                    foreignField: '_id',
                    as: 'recipientTitle'
                }
            },
            { $unwind: { path: '$recipientTitle', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    offeredItems: '$senderInfo.cards',
                    requestedItems: '$recipientInfo.cards',
                    sender: {
                        username: '$senderInfo.username',
                        selectedTitle: {
                            name: '$senderTitle.name',
                            color: '$senderTitle.color',
                            gradient: '$senderTitle.gradient',
                            isAnimated: '$senderTitle.isAnimated',
                            effect: '$senderTitle.effect'
                        }
                    },
                    recipient: {
                        username: '$recipientInfo.username',
                        selectedTitle: {
                            name: '$recipientTitle.name',
                            color: '$recipientTitle.color',
                            gradient: '$recipientTitle.gradient',
                            isAnimated: '$recipientTitle.isAnimated',
                            effect: '$recipientTitle.effect'
                        }
                    },
                    offeredPacks: 1,
                    requestedPacks: 1,
                    status: 1,
                    cancellationReason: 1,
                    expiresAt: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    offeredItemsSnapshot: 1,
                    requestedItemsSnapshot: 1
                }
            }
        ];

        const enrichedTrades = await Trade.aggregate(pipeline);
        res.status(200).json(enrichedTrades);
    } catch (error) {
        console.error("[Backend] Error fetching trades:", error);
        res.status(500).json({ message: "Failed to fetch trades.", error: error.message });
    }
};

module.exports = {
    createTrade,
    getTradesForUser,
    getPendingTrades,
    updateTradeStatus
};
