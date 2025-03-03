const mongoose = require('mongoose');
const Trade = require('../models/tradeModel');
const User = require('../models/userModel');

// Create a new trade
const createTrade = async (req, res) => {
    console.log('Trade creation endpoint hit!');
    const { senderId, recipient, offeredItems, requestedItems, offeredPacks, requestedPacks } = req.body;
    console.log('Trade data received:', req.body);

    try {
        // Check sender
        const sender = await User.findById(senderId);
        if (!sender) {
            console.log("Sender not found:", senderId);
            return res.status(404).json({ popupMessage: "Sender not found" });
        }

        // Check recipient (username or ObjectId)
        let recipientUser;
        if (mongoose.Types.ObjectId.isValid(recipient)) {
            recipientUser = await User.findById(recipient);
        } else {
            recipientUser = await User.findOne({ username: recipient });
        }

        if (!recipientUser) {
            console.log("Recipient not found:", recipient);
            return res.status(404).json({ popupMessage: "Recipient not found" });
        }

        // Validate pack availability:
        if (sender.packs < offeredPacks) {
            console.log(`Sender ${sender.username} does not have enough packs. Has: ${sender.packs}, Offered: ${offeredPacks}`);
            return res.status(400).json({
                popupMessage: `Trade failed: Sender only has ${sender.packs} pack(s), but tried to offer ${offeredPacks}.`
            });
        }

        if (recipientUser.packs < requestedPacks) {
            console.log(`Recipient ${recipientUser.username} does not have enough packs. Has: ${recipientUser.packs}, Requested: ${requestedPacks}`);
            return res.status(400).json({
                popupMessage: `Trade failed: Recipient only has ${recipientUser.packs} pack(s), but ${requestedPacks} were requested.`
            });
        }

        // Fetch offered card details from the sender's cards array
        const offeredCardsDetails = sender.cards.filter(card =>
            offeredItems.includes(card._id.toString())
        );

        // Fetch requested card details from the recipient's cards array
        const requestedCardsDetails = recipientUser.cards.filter(card =>
            requestedItems.includes(card._id.toString())
        );

        console.log('Offered Cards:', offeredCardsDetails);
        console.log('Requested Cards:', requestedCardsDetails);

        // Ensure we have at least some valid trade data
        if (offeredCardsDetails.length === 0 && requestedCardsDetails.length === 0 && offeredPacks === 0 && requestedPacks === 0) {
            return res.status(400).json({ popupMessage: "No matching cards found in users' collections and no packs offered." });
        }

        // Save the trade with card IDs and pack numbers
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
        res.status(201).json(trade);
    } catch (err) {
        console.error("Error creating trade:", err);
        res.status(500).json({ popupMessage: err.message });
    }
};

// Get pending trades for a user
const getPendingTrades = async (req, res) => {
    const { userId } = req.params;

    try {
        // Fetch pending trades
        const pendingTrades = await Trade.find({
            $or: [{ sender: userId }, { recipient: userId }],
            status: 'pending'
        })
            .populate('sender', 'username cards')
            .populate('recipient', 'username cards');

        // Enrich trades with card details while guarding against null sender/recipient
        const enrichedTrades = pendingTrades.map(trade => {
            const senderData = trade.sender ? trade.sender : { cards: [] };
            const recipientData = trade.recipient ? trade.recipient : { cards: [] };

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

        console.log("[Backend] Pending trades fetched with populated items:", enrichedTrades);
        res.status(200).json(enrichedTrades);
    } catch (err) {
        console.error("[Backend] Error fetching pending trades:", err);
        res.status(500).json({ message: 'Failed to fetch pending trades', error: err.message });
    }
};

// Get trades for a user (incoming and outgoing)
const getTradesForUser = async (req, res) => {
    const userId = req.params.userId;

    try {
        const trades = await Trade.find({
            $or: [{ sender: userId }, { recipient: userId }]
        })
            .populate('sender', 'username cards')
            .populate('recipient', 'username cards');

        // Enrich trades with full card details, safely handling missing sender/recipient
        const enrichedTrades = trades.map(trade => {
            const senderData = trade.sender ? trade.sender : { cards: [] };
            const recipientData = trade.recipient ? trade.recipient : { cards: [] };

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

// Update trade status (accept, reject, or cancel)
const updateTradeStatus = async (req, res) => {
    const { tradeId } = req.params;
    const { status } = req.body;

    console.log(`[Trade Status Update] Received request to ${status} trade with ID: ${tradeId}`);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Find the trade with the session
        const trade = await Trade.findById(tradeId).session(session);
        if (!trade) {
            console.log("[Trade Status Update] Trade not found");
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ popupMessage: "Trade not found" });
        }

        // Authorization Check
        const isRecipient = trade.recipient.toString() === req.user.id;
        const isSender = trade.sender.toString() === req.user.id;

        if ((['accepted', 'rejected'].includes(status) && !isRecipient) ||
            (status === 'cancelled' && !isSender)) {
            console.log("[Trade Status Update] Unauthorized action");
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ popupMessage: "Unauthorized action" });
        }

        if (!['accepted', 'rejected', 'cancelled'].includes(status)) {
            console.log("[Trade Status Update] Invalid status provided");
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ popupMessage: "Invalid status" });
        }

        // Process acceptance inside transaction
        if (status === 'accepted') {
            console.log("[Trade Status Update] Processing trade acceptance...");

            // Find sender and recipient with session
            const sender = await User.findById(trade.sender).session(session);
            const recipient = await User.findById(trade.recipient).session(session);

            if (!sender || !recipient) {
                console.log("[Trade Status Update] Sender or Recipient not found");
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ popupMessage: "Sender or Recipient not found" });
            }

            // Check packs before processing trade acceptance
            if (sender.packs < trade.offeredPacks) {
                console.log(`[Trade Status Update] Sender ${sender.username} only has ${sender.packs} pack(s) but offered ${trade.offeredPacks}`);
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ popupMessage: `Trade acceptance failed: Sender only has ${sender.packs} pack(s), but tried to offer ${trade.offeredPacks}.` });
            }
            if (recipient.packs < trade.requestedPacks) {
                console.log(`[Trade Status Update] Recipient ${recipient.username} only has ${recipient.packs} pack(s) but requested ${trade.requestedPacks}`);
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ popupMessage: `Trade acceptance failed: Recipient only has ${recipient.packs} pack(s), but ${trade.requestedPacks} were requested.` });
            }

            console.log(`Before pack transfer: Sender Packs: ${sender.packs}, Recipient Packs: ${recipient.packs}`);
            sender.packs = sender.packs - trade.offeredPacks + trade.requestedPacks;
            recipient.packs = recipient.packs - trade.requestedPacks + trade.offeredPacks;
            console.log(`After pack transfer: Sender Packs: ${sender.packs}, Recipient Packs: ${recipient.packs}`);

            // Transfer offered card items from sender to recipient
            trade.offeredItems.forEach((itemId) => {
                const index = sender.cards.findIndex(card => card._id.toString() === itemId.toString());
                if (index !== -1) {
                    const card = sender.cards.splice(index, 1)[0];
                    recipient.cards.push(card);
                } else {
                    console.warn(`Offered card with ID ${itemId} not found in sender's collection.`);
                }
            });

            // Transfer requested card items from recipient to sender
            trade.requestedItems.forEach((itemId) => {
                const index = recipient.cards.findIndex(card => card._id.toString() === itemId.toString());
                if (index !== -1) {
                    const card = recipient.cards.splice(index, 1)[0];
                    sender.cards.push(card);
                } else {
                    console.warn(`Requested card with ID ${itemId} not found in recipient's collection.`);
                }
            });

            // Save both users within the session
            await sender.save({ session });
            await recipient.save({ session });
        }

        // Update the trade status (applies to accepted, rejected, or cancelled)
        trade.status = status;
        await trade.save({ session });

        await session.commitTransaction();
        session.endSession();

        console.log(`[Trade Status Update] Trade ${status} successfully`);
        res.status(200).json({ popupMessage: `Trade ${status} successfully`, trade });
    } catch (error) {
        console.error("[Trade Status Update] Error updating trade status:", error);
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ popupMessage: "Failed to update trade status", error: error.message });
    }
};

module.exports = {
    createTrade,
    getTradesForUser,
    getPendingTrades,
    updateTradeStatus
};
