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

// Create a new trade
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

// The rest of the functions remain unchanged for now
// Update trade status (accept, reject, or cancel)
const updateTradeStatus = async (req, res) => {
    const { tradeId } = req.params;
    const { status } = req.body;

    const statusSchema = Joi.object({
        status: Joi.string().valid('accepted', 'rejected', 'cancelled').required()
    });
    const { error } = statusSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: 'Invalid status update: ' + error.details[0].message });
    }

    console.log(`[Trade Status Update] Received request to ${status} trade with ID: ${tradeId}`);

    logAudit('Trade Status Update Attempt', { userId: req.userId, tradeId, newStatus: status });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const trade = await Trade.findById(tradeId).session(session);
        if (!trade) {
            console.log("[Trade Status Update] Trade not found");
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Trade not found" });
        }

        // Fetch both sender and recipient first
        const sender = await User.findById(trade.sender).session(session);
        const recipient = await User.findById(trade.recipient).session(session);
        if (!sender || !recipient) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Sender or Recipient not found" });
        }

        // Now call achievements check
        const { checkAndGrantAchievements } = require('../helpers/achievementHelper');
        await checkAndGrantAchievements(sender);
        await checkAndGrantAchievements(recipient);

        if (!sender || !recipient) { // This check is now redundant but kept for safety, can be removed later if desired
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Sender or Recipient not found" });
        }

        const isRecipient = trade.recipient.toString() === req.userId;
        const isSender = trade.sender.toString() === req.userId;

        // Only the recipient can accept or reject, only the sender can cancel
        if ((['accepted', 'rejected'].includes(status) && !isRecipient) ||
            (status === 'cancelled' && !isSender)) {
            console.log("[Trade Status Update] Unauthorized action");
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ message: "Unauthorized action" });
        }

        if (!['accepted', 'rejected', 'cancelled'].includes(status)) {
            console.log("[Trade Status Update] Invalid status provided");
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Invalid status" });
        }

        // If accepted, perform the card/pack exchange
        if (status === 'accepted') {
            console.log("[Trade Status Update] Processing trade acceptance...");

            if (sender.packs < trade.offeredPacks) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: "Sender does not have enough packs" });
            }
            if (recipient.packs < trade.requestedPacks) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: "Recipient does not have enough packs" });
            }
            sender.packs = sender.packs - trade.offeredPacks + trade.requestedPacks;
            recipient.packs = recipient.packs - trade.requestedPacks + trade.offeredPacks;

            // Move cards to escrow before transfer
            const offeredCardsDetails = sender.cards.filter(card =>
                trade.offeredItems.some(itemId => itemId.equals(card._id))
            );
            const requestedCardsDetails = recipient.cards.filter(card =>
                trade.requestedItems.some(itemId => itemId.equals(card._id))
            );

            // Mark all involved cards as 'escrow'
            offeredCardsDetails.forEach(card => {
                card.status = 'escrow';
            });
            requestedCardsDetails.forEach(card => {
                card.status = 'escrow';
            });

            await sender.save({ session });
            await recipient.save({ session });

            // Transfer ownership after escrow
            offeredCardsDetails.forEach(card => {
                const index = sender.cards.findIndex(c => c._id.toString() === card._id.toString());
                if (index !== -1) {
                    const cardObj = sender.cards.splice(index, 1)[0];
                    removeFromFeaturedCards(sender, cardObj._id);
                    cardObj.status = 'available';
                    recipient.cards.push(cardObj);
                } else {
                    console.warn(`Offered card with ID ${card._id} not found in sender's collection.`);
                }
            });

            requestedCardsDetails.forEach(card => {
                const index = recipient.cards.findIndex(c => c._id.toString() === card._id.toString());
                if (index !== -1) {
                    const cardObj = recipient.cards.splice(index, 1)[0];
                    removeFromFeaturedCards(recipient, cardObj._id);
                    cardObj.status = 'available';
                    sender.cards.push(cardObj);
                } else {
                    console.warn(`Requested card with ID ${card._id} not found in recipient's collection.`);
                }
            });

            await sender.save({ session });
            await recipient.save({ session });

            // Mark cards as available in the sender's collection
            await User.updateOne(
                { _id: sender._id, "cards._id": { $in: offeredCardsDetails.map(c => c._id) } },
                { $set: { "cards.$[element].status": 'available' } },
                { arrayFilters: [{ "element._id": { $in: offeredCardsDetails.map(c => c._id) } }] }
            ).session(session);

            // Mark cards as available in the recipient's collection
            await User.updateOne(
                { _id: recipient._id, "cards._id": { $in: requestedCardsDetails.map(c => c._id) } },
                { $set: { "cards.$[element].status": 'available' } },
                { arrayFilters: [{ "element._id": { $in: requestedCardsDetails.map(c => c._id) } }] }
            ).session(session);

            // Cleanup conflicting trades involving traded cards
            const tradedCardIds = [...trade.offeredItems, ...trade.requestedItems];

            await Trade.bulkWrite([
              {
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
              }
            ], { session });

            await MarketListing.bulkWrite([
              {
                updateMany: {
                  filter: {
                    "card._id": { $in: tradedCardIds },
                    status: 'active'
                  },
                  update: {
                    $set: { status: 'cancelled', cancellationReason: 'Card traded in another transaction' }
                  }
                }
              }
            ], { session });
        } else if (status === 'rejected' || status === 'cancelled') {
            const offeredCardIds = trade.offeredItems;
            const requestedCardIds = trade.requestedItems;

            // Mark offered cards as available in the sender's collection
            await User.updateOne(
                { _id: sender._id, "cards._id": { $in: offeredCardIds } },
                { $set: { "cards.$[element].status": 'available' } },
                { arrayFilters: [{ "element._id": { $in: offeredCardIds } }] }
            ).session(session);

            // Mark requested cards as available in the recipient's collection
            await User.updateOne(
                { _id: recipient._id, "cards._id": { $in: requestedCardIds } },
                { $set: { "cards.$[element].status": 'available' } },
                { arrayFilters: [{ "element._id": { $in: requestedCardIds } }] }
            ).session(session);
        }

        // Update trade status for accepted, rejected, or cancelled
        trade.status = status;
        await trade.save({ session });

        // Award XP if trade accepted
        if (status === 'accepted') {
            sender.xp = (sender.xp || 0) + 20;
            recipient.xp = (recipient.xp || 0) + 20;
            sender.level = Math.floor(sender.xp / 100) + 1;
            recipient.level = Math.floor(recipient.xp / 100) + 1;
            await sender.save({ session });
            await recipient.save({ session });
        }

        await session.commitTransaction();
        session.endSession();

        console.log(`[Trade Status Update] Trade ${status} successfully`);

        // Send notifications based on the status change:
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
        console.error("[Trade Status Update] Error:", error);
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: "Failed to update trade status", error: error.message });
    }
};

const getPendingTrades = async (req, res) => {
    const { userId } = req.params;
    try {
        const pendingTrades = await Trade.find({
            $or: [{ sender: userId }, { recipient: userId }],
            status: 'pending'
        })
            .populate('sender', 'username cards')
            .populate('recipient', 'username cards')
            .lean();

        const enrichedTrades = pendingTrades.map(trade => {
            const senderData = trade.sender || { cards: [] };
            const recipientData = trade.recipient || { cards: [] };

            const offeredCards = (senderData.cards || []).filter(card =>
                trade.offeredItems.some(itemId => itemId.equals(card._id))
            );
            const requestedCards = (recipientData.cards || []).filter(card =>
                trade.requestedItems.some(itemId => itemId.equals(card._id))
            );

            return {
                ...trade,
                offeredItems: offeredCards,
                requestedItems: requestedCards
            };
        });

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
        const trades = await Trade.find({
            $or: [{ sender: userId }, { recipient: userId }]
        })
            .populate('sender', 'username cards')
            .populate('recipient', 'username cards')
            .lean();

        const enrichedTrades = trades.map(trade => {
            const senderData = trade.sender || { cards: [] };
            const recipientData = trade.recipient || { cards: [] };

            const offeredCards = (senderData.cards || []).filter(card =>
                trade.offeredItems.some(itemId => itemId.equals(card._id))
            );
            const requestedCards = (recipientData.cards || []).filter(card =>
                trade.requestedItems.some(itemId => itemId.equals(card._id))
            );

            return {
                ...trade,
                offeredItems: offeredCards,
                requestedItems: requestedCards
            };
        });

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
