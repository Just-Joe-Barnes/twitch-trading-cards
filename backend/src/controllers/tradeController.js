const mongoose = require('mongoose');
const Trade = require('../models/tradeModel');
const User = require('../models/userModel');
const { createNotification } = require('../helpers/notificationHelper');

// Create a new trade
const createTrade = async (req, res) => {
    console.log('Trade creation endpoint hit!');

    // Instead of trusting senderId from body, always use token-based ID
    const senderId = req.userId;
    const { recipient, offeredItems, requestedItems, offeredPacks, requestedPacks } = req.body;
    console.log('Trade data received:', req.body);

    try {
        // 1) Check if sender and recipient are the same
        if (senderId === recipient) {
            console.log("Trade failed: User cannot trade with themselves.");
            return res.status(400).json({ popupMessage: "You cannot create a trade with yourself." });
        }

        // 2) Check the sender from token
        const sender = await User.findById(senderId);
        if (!sender) {
            console.log("Sender not found:", senderId);
            return res.status(404).json({ popupMessage: "Sender not found" });
        }

        // 3) Check the recipient
        let recipientUser;
        if (mongoose.Types.ObjectId.isValid(recipient)) {
            // If the client gave a userId
            recipientUser = await User.findById(recipient);
        } else {
            // If the client gave a username
            recipientUser = await User.findOne({ username: recipient });
        }
        if (!recipientUser) {
            console.log("Recipient not found:", recipient);
            return res.status(404).json({ popupMessage: "Recipient not found" });
        }

        // 4) Validate pack availability
        if (offeredPacks > sender.packs) {
            return res.status(400).json({
                popupMessage: `Trade failed: You only have ${sender.packs} pack(s), but tried to offer ${offeredPacks}.`
            });
        }
        if (requestedPacks > recipientUser.packs) {
            return res.status(400).json({
                popupMessage: `Trade failed: Recipient only has ${recipientUser.packs} pack(s), but you requested ${requestedPacks}.`
            });
        }

        // 5) Check the user actually owns offeredItems
        const offeredCardsDetails = sender.cards.filter(card =>
            offeredItems.includes(card._id.toString())
        );
        if (offeredItems.length !== offeredCardsDetails.length) {
            return res.status(400).json({
                popupMessage: "You are attempting to trade card(s) you do not own."
            });
        }

        // 6) Check that the recipient owns each requestedItem
        const requestedCardsDetails = recipientUser.cards.filter(card =>
            requestedItems.includes(card._id.toString())
        );
        if (requestedItems.length !== requestedCardsDetails.length) {
            return res.status(400).json({
                popupMessage: "You requested card(s) the recipient does not own."
            });
        }

        // 7) If there's truly nothing being traded, reject
        if (
            offeredCardsDetails.length === 0 &&
            requestedCardsDetails.length === 0 &&
            offeredPacks === 0 &&
            requestedPacks === 0
        ) {
            return res.status(400).json({
                popupMessage: "No valid trade data. Neither side is offering anything."
            });
        }

        // 8) Save the trade
        const trade = new Trade({
            sender: sender._id,
            recipient: recipientUser._id,
            offeredItems: offeredCardsDetails.map(card => card._id),
            requestedItems: requestedCardsDetails.map(card => card._id),
            offeredPacks,
            requestedPacks,
            status: 'pending'
        });

        await trade.save();
        console.log('Trade saved successfully:', trade);

        // Debug log before sending notification
        console.log('Sending trade offer notification to recipient:', recipientUser._id, 'from sender:', sender.username, 'for trade:', trade._id);

        await createNotification(recipientUser._id, {
            type: 'Trade Offer Received',
            message: `You have received a trade offer from ${sender.username}.`,
            link: `/trades/${trade._id}`
        });

        res.status(201).json(trade);
    } catch (err) {
        console.error("Error creating trade:", err);
        res.status(500).json({ popupMessage: err.message });
    }
};

// Update trade status (accept, reject, or cancel)
const updateTradeStatus = async (req, res) => {
    const { tradeId } = req.params;
    const { status } = req.body;

    console.log(`[Trade Status Update] Received request to ${status} trade with ID: ${tradeId}`);

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

        // Fetch both sender and recipient for notifications
        const sender = await User.findById(trade.sender).session(session);
        const recipient = await User.findById(trade.recipient).session(session);
        if (!sender || !recipient) {
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

            // Transfer offered cards: remove from sender, add to recipient
            trade.offeredItems.forEach(itemId => {
                const index = sender.cards.findIndex(c => c._id.toString() === itemId.toString());
                if (index !== -1) {
                    const card = sender.cards.splice(index, 1)[0];
                    recipient.cards.push(card);
                } else {
                    console.warn(`Offered card with ID ${itemId} not found in sender's collection.`);
                }
            });
            // Transfer requested cards: remove from recipient, add to sender
            trade.requestedItems.forEach(itemId => {
                const index = recipient.cards.findIndex(c => c._id.toString() === itemId.toString());
                if (index !== -1) {
                    const card = recipient.cards.splice(index, 1)[0];
                    sender.cards.push(card);
                } else {
                    console.warn(`Requested card with ID ${itemId} not found in recipient's collection.`);
                }
            });

            await sender.save({ session });
            await recipient.save({ session });

            // Cleanup conflicting trades involving traded cards
            const tradedCardIds = [...trade.offeredItems, ...trade.requestedItems];
            await Trade.updateMany(
                {
                    _id: { $ne: trade._id },
                    status: 'pending',
                    $or: [
                        { offeredItems: { $in: tradedCardIds } },
                        { requestedItems: { $in: tradedCardIds } }
                    ]
                },
                {
                    $set: { status: 'cancelled', cancellationReason: 'Card traded in another transaction' }
                },
                { session }
            );
        }

        // Update trade status for accepted, rejected, or cancelled
        trade.status = status;
        await trade.save({ session });

        await session.commitTransaction();
        session.endSession();

        console.log(`[Trade Status Update] Trade ${status} successfully`);

        // Send notifications based on the status change:
        if (status === 'accepted') {
            await createNotification(sender._id, {
                type: 'Trade Update',
                message: `Your trade offer to ${recipient.username} has been accepted.`,
                link: `/trades/${trade._id}`
            });
            await createNotification(recipient._id, {
                type: 'Trade Update',
                message: `You have accepted a trade offer from ${sender.username}.`,
                link: `/trades/${trade._id}`
            });
        } else if (status === 'rejected') {
            await createNotification(sender._id, {
                type: 'Trade Update',
                message: `Your trade offer to ${recipient.username} has been rejected.`,
                link: `/trades/${trade._id}`
            });
        } else if (status === 'cancelled') {
            if (isSender) {
                await createNotification(recipient._id, {
                    type: 'Trade Update',
                    message: `The trade offer from ${sender.username} has been cancelled.`,
                    link: `/trades/${trade._id}`
                });
            } else {
                await createNotification(sender._id, {
                    type: 'Trade Update',
                    message: `Your trade offer to ${recipient.username} has been cancelled.`,
                    link: `/trades/${trade._id}`
                });
            }
        }

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
            .populate('recipient', 'username cards');

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
                ...trade.toObject(),
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
            .populate('recipient', 'username cards');

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
                ...trade.toObject(),
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
