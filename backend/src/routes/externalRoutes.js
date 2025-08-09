const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
// FIXED: Import the broadcast function instead of the raw io instance
const { broadcastToUser } = require('../../notificationService');
const {generatePackPreview} = require("../helpers/cardHelpers");
const {addToQueue} = require("../services/queueService");

const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === process.env.STREAMER_API_KEY) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized: Invalid API Key' });
    }
};

router.post('/redeem-pack', validateApiKey, async (req, res) => {
    try {
        // We now expect the streamer's DB User ID and the redeemer's Twitch ID
        const { streamerId, twitchUserId } = req.body;
        if (!streamerId || !twitchUserId) {
            return res.status(400).json({ message: 'streamerId and twitchUserId are required.' });
        }

        const redeemer = await User.findOne({ twitchId: twitchUserId });
        if (!redeemer) {
            return res.status(404).json({ message: `User with Twitch ID ${twitchUserId} not found.` });
        }

        const newCards = await generatePackPreview(5, false, false);

        addToQueue({
            streamerDbId: streamerId,
            redeemer: redeemer,
            cards: newCards
        });

        res.status(200).json({ success: true, message: `${redeemer.username} added to the pack opening queue.` });

    } catch (error) {
        console.error('Error in /redeem-pack:', error);
        res.status(500).json({ message: 'An internal error occurred.' });
    }
});

module.exports = router;
