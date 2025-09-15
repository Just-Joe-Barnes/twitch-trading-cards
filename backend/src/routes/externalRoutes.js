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


router.get('/earn-pack', validateApiKey, async (req, res) => {
    let streamerUser;
    try {
        // Destructure from req.headers (lowercase is convention)
        const {
            eventtype,
            streamerid,
            userid,
            subtier,
            submonths,
            giftcount,
            recipientids // Comma-separated string of recipient IDs
        } = req.headers;

        // --- Start: Updated Validation ---
        if (!eventtype || !streamerid || !userid) {
            // Find streamer if possible for logging
            if (streamerid) {
                streamerUser = await User.findOne({ _id: streamerid });
            }
            await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'Invalid headers. Missing required fields (eventtype, streamerid, userid).');
            return res.status(400).json({ message: 'Invalid headers. Missing required fields.' });
        }
        // --- End: Updated Validation ---

        streamerUser = await User.findOne({ _id: streamerid });
        // Log headers instead of the full request object which has an empty body
        await createLogEntry(streamerUser, 'TWITCH_ROUTE_LOG', { headers: req.headers });

        console.log(`Received ${eventtype} event from Streamer.bot for user: ${userid}`);

        let packsToAward = 0;
        let message = '';

        switch (eventtype) {
            case 'subscription':
                const tier = subtier; // e.g., '1000', '2000', '3000'
                // Parse header string to number, default to 1 if not provided
                const months = parseInt(submonths) || 1;

                if (!tier) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'Invalid subscription payload. Missing subtier header.');
                    return res.status(400).json({ message: 'Invalid payload. Missing subtier header.' });
                }

                if (tier === '1000') packsToAward = 1;
                else if (tier === '2000') packsToAward = 3;
                else if (tier === '3000') packsToAward = 5;

                packsToAward *= months;

                const subscriber = await addPacksToUser(userid, packsToAward);
                if (!subscriber) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `User with Twitch ID ${userid} not found.`);
                    return res.status(404).json({ message: `User with Twitch ID ${userid} not found.` });
                }
                message = `${subscriber.username} subscribed for ${months} months! They have been awarded ${packsToAward} packs.`;
                await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
                break;

            case 'giftedSub':
                const giftTier = subtier;
                const giftCount = parseInt(giftcount) || 1;
                const monthsGifted = parseInt(submonths) || 1;

                if (!giftTier || !recipientids) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'Invalid giftedSub payload. Missing subtier or recipientids header.');
                    return res.status(400).json({ message: 'Invalid payload. Missing subtier or recipientids header.' });
                }

                if (giftTier === '1000') packsToAward = 1;
                else if (giftTier === '2000') packsToAward = 3;
                else if (giftTier === '3000') packsToAward = 5;

                // Award packs to the gifter
                const gifterPacks = packsToAward * giftCount * monthsGifted;
                const gifter = await addPacksToUser(userid, gifterPacks);
                if (!gifter) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `Gifter with Twitch ID ${userid} not found.`);
                    return res.status(404).json({ message: `Gifter with Twitch ID ${userid} not found.` });
                }

                // Award packs to each recipient
                const recipientPacks = packsToAward * monthsGifted;
                // Split the comma-separated string into an array of IDs
                const recipientIdArray = recipientids.split(',');
                for (const recipientId of recipientIdArray) {
                    // Ensure we don't process empty strings if the header is malformed
                    if(recipientId) {
                        await addPacksToUser(recipientId.trim(), recipientPacks);
                    }
                }

                message = `${gifter.username} gifted ${giftCount} subscriptions and has been awarded ${gifterPacks} packs! Each of the ${recipientIdArray.length} recipients also received ${recipientPacks} packs.`;
                await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
                break;

            case 'redemption':
                packsToAward = 1;
                const redeemer = await addPacksToUser(userid, packsToAward);
                if (!redeemer) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `User with Twitch ID ${userid} not found.`);
                    return res.status(404).json({ message: `User with Twitch ID ${userid} not found.` });
                }
                message = `${redeemer.username} redeemed for a new pack! They now have ${redeemer.packs} packs.`;
                await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
                break;

            default:
                await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `Unsupported eventtype: ${eventtype}.`);
                return res.status(400).json({ message: 'Unsupported eventType.' });
        }

        res.status(200).json({ success: true, message });

    } catch (error) {
        console.error('Error in /earn-pack:', error);
        if (!streamerUser) {
            try {
                // Get streamerId from headers in the catch block
                const { streamerid } = req.headers;
                if (streamerid) {
                    streamerUser = await User.findOne({ twitchId: streamerid });
                }
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
