const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const { generatePackPreview } = require("../helpers/cardHelpers");
const { addToQueue } = require("../services/queueService");
const {createLogEntry} = require("../utils/logService");


// Middleware to validate the API key sent from Streamer.bot
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === process.env.STREAMER_API_KEY) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized: Invalid API Key' });
    }
};

/**
 * Helper function to find a user and add a specified number of packs.
 * This function will be reused by different endpoints.
 * @param {string} twitchId The Twitch user ID.
 * @param {number} packCount The number of packs to add.
 * @returns {object} The updated user document or null if not found.
 */
const addPacksToUser = async (twitchId, packCount) => {
    if (packCount <= 0) {
        return null;
    }

    const user = await User.findOneAndUpdate(
        { twitchId: twitchId },
        { $inc: { packs: packCount } },
        { new: true, upsert: false }
    );
    return user;
};


/**
 * POST /api/twitch/earn-pack
 * Handles events that award packs to a user's account. This does not open the pack.
 * Expected JSON Payload from Streamer.bot:
 * {
     * "eventType": "subscription" | "giftedSub" | "redemption",
     * "streamerId": "%streamerId%",
     * "userId": "%userId%",
     * "eventData": {
         * // For "subscription":
         * // "subTier": "%subTier%", // "1000", "2000", or "3000"
         * // "cumulativeMonths": "%subMonths%",
         *
         * // For "giftedSub":
         * // "giftTier": "%subTier%", // "1000", "2000", or "3000"
         * // "giftCount": "%giftCount%",
         * // "monthsGifted": "%monthsGifted%", // The number of prepaid months for each gifted sub
         * // "recipientIds": ["%recipientId_1%", "%recipientId_2%"],
         * // "recipientNames": ["%recipientName_1%", "%recipientName_2%"]
         *
         * // For "redemption":
         * // "rewardName": "%rewardName%"
     * }
 * }
 */
router.post('/earn-pack', validateApiKey, async (req, res) => {
    let streamerUser;
    try {
        const { eventType, streamerId, userId, eventData } = req.body;

        if (!eventType || !streamerId || !userId || !eventData) {
            streamerUser = await User.findOne({ twitchId: streamerId });
            await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'Invalid payload. Missing required fields.');
            return res.status(400).json({ message: 'Invalid payload. Missing required fields.' });
        }

        streamerUser = await User.findOne({ twitchId: streamerId });
        await createLogEntry(streamerUser, 'TWITCH_ROUTE_LOG', req);

        console.log(`Received ${eventType} event from Streamer.bot for user: ${userId}`);

        let packsToAward = 0;
        let message = '';

        switch (eventType) {
            case 'subscription':
                const tier = eventData.subTier;
                const months = eventData.cumulativeMonths || 1;
                // Packs based on tier
                if (tier === '1000') packsToAward = 1;
                else if (tier === '2000') packsToAward = 3;
                else if (tier === '3000') packsToAward = 5;

                // Multiply packs by the number of months subscribed
                packsToAward *= months;

                const subscriber = await addPacksToUser(userId, packsToAward);
                if (!subscriber) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `User with Twitch ID ${userId} not found.`);
                    return res.status(404).json({ message: `User with Twitch ID ${userId} not found.` });
                }
                message = `${subscriber.username} subscribed for ${months} months! They have been awarded ${packsToAward} packs.`;
                await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
                break;

            case 'giftedSub':
                const giftTier = eventData.giftTier;
                const giftCount = eventData.giftCount || 1;
                const monthsGifted = eventData.monthsGifted || 1;

                if (giftTier === '1000') packsToAward = 1;
                else if (giftTier === '2000') packsToAward = 3;
                else if (giftTier === '3000') packsToAward = 5;

                // Award packs to the gifter
                const gifterPacks = packsToAward * giftCount * monthsGifted;
                const gifter = await addPacksToUser(userId, gifterPacks);
                if (!gifter) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `Gifter with Twitch ID ${userId} not found.`);
                    return res.status(404).json({ message: `Gifter with Twitch ID ${userId} not found.` });
                }

                // Award packs to each recipient
                const recipientPacks = packsToAward * monthsGifted;
                for (const recipientId of eventData.recipientIds) {
                    await addPacksToUser(recipientId, recipientPacks);
                }

                message = `${gifter.username} gifted ${giftCount} subscriptions and has been awarded ${gifterPacks} packs! Each recipient also received ${recipientPacks} packs.`;
                await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
                break;

            case 'redemption':
                // Assuming this is the "earn pack" redemption
                packsToAward = 1;
                const redeemer = await addPacksToUser(userId, packsToAward);
                if (!redeemer) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `User with Twitch ID ${userId} not found.`);
                    return res.status(404).json({ message: `User with Twitch ID ${userId} not found.` });
                }
                message = `${redeemer.username} redeemed for a new pack! They now have ${redeemer.packs} packs.`;
                await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
                break;

            default:
                await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `Unsupported eventType: ${eventType}.`);
                return res.status(400).json({ message: 'Unsupported eventType.' });
        }

        res.status(200).json({ success: true, message });

    } catch (error) {
        console.error('Error in /earn-pack:', error);
        // Ensure streamerUser is fetched in the catch block if it wasn't successful in the try block
        if (!streamerUser) {
            try {
                const { streamerId } = req.body;
                streamerUser = await User.findOne({ twitchId: streamerId });
            } catch (e) {
                console.error('Failed to find streamer in catch block:', e);
            }
        }
        await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'An internal error occurred.');
        res.status(500).json({ message: 'An internal error occurred.' });
    }
});


/**
 * POST /api/twitch/redeem-pack
 * Handles the channel point redemption to OPEN a pack from a user's account.
 * This consumes a pack and adds the user to the pack opening queue.
 * Expected JSON Payload from Streamer.bot:
 * {
     * "streamerId": "%streamerId%",
     * "userId": "%userId%",
     * "eventData": {
     *  "rewardName": "%rewardName%"
     * }
 * }
 */
router.post('/redeem-pack', validateApiKey, async (req, res) => {
    let streamerUser;
    try {
        const { streamerId, userId } = req.body;

        if (!streamerId || !userId) {
            return res.status(400).json({ message: 'Missing streamerId or userId.' });
        }

        streamerUser = await User.findOne({ twitchId: streamerId });

        const redeemer = await User.findOne({ twitchId: userId });
        if (!redeemer) {
            await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `User with Twitch ID ${userId} not found.`);
            return res.status(404).json({ message: `User with Twitch ID ${userId} not found.` });
        }

        // For this redemption we are technically adding a pack and ripping it straight away,
        // but the code below is if we want to subtract a pack from the user

        // Check if the user has a pack to open
        // if (redeemer.packs < 1) {
        //     const message = `${redeemer.username} does not have any packs to open.`;
        //     await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', message);
        //     return res.status(400).json({ message: message });
        // }
        // Decrement the user's pack count
        // redeemer.packs -= 1;
        // await redeemer.save();

        const newCards = await generatePackPreview(5, false, false);

        addToQueue({
            streamerDbId: streamerId,
            redeemer: redeemer,
            cards: newCards
        });

        const message = `${redeemer.username} has opened a pack and been added to the queue.`;
        await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
        res.status(200).json({ success: true, message: message });

    } catch (error) {
        console.error('Error in /redeem-pack:', error);
        if (!streamerUser) {
            try {
                const { streamerId } = req.body;
                streamerUser = await User.findOne({ twitchId: streamerId });
            } catch (e) {
                console.error('Failed to find streamer in catch block:', e);
            }
        }
        await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'An internal error occurred.');
        res.status(500).json({ message: 'An internal error occurred.' });
    }
});

module.exports = router;
