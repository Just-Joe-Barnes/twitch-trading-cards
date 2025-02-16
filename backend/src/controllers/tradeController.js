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
            return res.status(404).json({ message: "Sender not found" });
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
            return res.status(404).json({ message: "Recipient not found" });
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

        // Ensure we have card details before saving
        if (offeredCardsDetails.length === 0 && requestedCardsDetails.length === 0) {
            return res.status(400).json({ message: "No matching cards found in users' collections." });
        }

        // Save the trade with card IDs
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
        res.status(500).json({ error: err.message });
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
            .populate('sender', 'username cards')  // Include sender's cards
            .populate('recipient', 'username cards');  // Include recipient's cards

        // Enrich trades with card details
        const enrichedTrades = pendingTrades.map(trade => {
            const offeredCards = trade.sender.cards.filter(card =>
                trade.offeredItems.some(itemId => itemId.equals(card._id))
            );

            const requestedCards = trade.recipient.cards.filter(card =>
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

        // Enrich trades with full card details
        const enrichedTrades = trades.map(trade => {
            const offeredCards = trade.sender.cards.filter(card =>
                trade.offeredItems.some(itemId => itemId.equals(card._id))
            );

            const requestedCards = trade.recipient.cards.filter(card =>
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
        res.status(500).json({ message: "Failed to fetch trades." });
    }
};

// Update trade status (accept, reject, or cancel)
// Update trade status (accept, reject, or cancel)
const updateTradeStatus = async (req, res) => {
    const { tradeId } = req.params;
    const { status } = req.body;

    console.log(`[Trade Status Update] Received request to ${status} trade with ID: ${tradeId}`);

    try {
        const trade = await Trade.findById(tradeId);
        if (!trade) {
            console.log("[Trade Status Update] Trade not found");
            return res.status(404).json({ message: "Trade not found" });
        }

        // Authorization Check
        const isRecipient = trade.recipient.toString() === req.user.id;
        const isSender = trade.sender.toString() === req.user.id;

        if ((['accepted', 'rejected'].includes(status) && !isRecipient) ||
            (status === 'cancelled' && !isSender)) {
            console.log("[Trade Status Update] Unauthorized action");
            return res.status(403).json({ message: "Unauthorized action" });
        }

        if (!['accepted', 'rejected', 'cancelled'].includes(status)) {
            console.log("[Trade Status Update] Invalid status provided");
            return res.status(400).json({ message: "Invalid status" });
        }

        if (status === 'accepted') {
            console.log("[Trade Status Update] Processing trade acceptance...");

            const sender = await User.findById(trade.sender);
            const recipient = await User.findById(trade.recipient);

            if (!sender || !recipient) {
                console.log("[Trade Status Update] Sender or Recipient not found");
                return res.status(404).json({ message: "Sender or Recipient not found" });
            }

            console.log(`Before transfer: Sender Packs: ${sender.packs}, Recipient Packs: ${recipient.packs}`);

            // Check if sender has enough packs
            if (sender.packs < trade.offeredPacks) {
                console.log("[Trade Status Update] Sender does not have enough packs");
                return res.status(400).json({ message: "Sender does not have enough packs" });
            }

            // Check if recipient has enough packs
            if (recipient.packs < trade.requestedPacks) {
                console.log("[Trade Status Update] Recipient does not have enough packs");
                return res.status(400).json({ message: "Recipient does not have enough packs" });
            }

            // Transfer packs
            sender.packs -= trade.offeredPacks;
            recipient.packs += trade.offeredPacks;

            recipient.packs -= trade.requestedPacks;
            sender.packs += trade.requestedPacks;

            console.log(`After transfer: Sender Packs: ${sender.packs}, Recipient Packs: ${recipient.packs}`);

            await sender.save();
            await recipient.save();
        }

        trade.status = status;
        await trade.save();

        console.log(`[Trade Status Update] Trade ${status} successfully`);
        res.status(200).json({ message: `Trade ${status} successfully`, trade });
    } catch (error) {
        console.error("[Trade Status Update] Error updating trade status:", error);
        res.status(500).json({ message: "Failed to update trade status", error: error.message });
    }
};


module.exports = {
    createTrade,
    getTradesForUser,
    getPendingTrades,
    updateTradeStatus
};
