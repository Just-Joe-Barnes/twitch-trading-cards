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

const subType = {
    'prime': 1,
    'tier 1': 1,
    'tier 2': 3,
    'tier 3': 5,
    '1000': 1,
    '2000': 3,
    '3000': 5
}

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
            recipientid // Now expecting a comma-separated string for gift bombs
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
                const tier = subtier;
                const months = parseInt(submonths) || 1;

                if (!tier) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'Invalid subscription payload. Missing subtier header.');
                    return res.status(400).json({ message: 'Invalid payload. Missing subtier header.' });
                }

                packsToAward = subType[tier.toLowerCase()] || 1;
                // We're ignoring multi-month for now as requested
                // packsToAward *= months;

                const subscriber = await addPacksToUser(userid, packsToAward);
                if (!subscriber) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `User with Twitch ID ${userid} not found.`);
                    return res.status(404).json({ message: `User with Twitch ID ${userid} not found.` });
                }
                message = `${subscriber.username} subscribed! They have been awarded ${packsToAward} packs.`;
                await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
                break;

            // --- START: MODIFIED GIFTED SUB LOGIC ---
            // --- START: MORE RESILIENT GIFTED SUB LOGIC ---
            case 'giftedSub':
                const giftTier = subtier;
                const giftCount = parseInt(giftcount) || 1;
                const gifterName = req.headers.giftername || 'An anonymous gifter'; // Get name from headers

                if (!recipientid) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `Gifted sub event is missing recipientid header.`);
                    return res.status(400).json({ message: 'Invalid payload. Missing recipientid header.' });
                }

                const packsPerTier = subType[giftTier.toLowerCase()] || 1;

                // --- Gifter Handling ---
                const gifterPacks = packsPerTier * giftCount;
                // Try to add packs, but don't stop if the user is not found.
                // The 'gifter' variable will be the user object on success, or null on failure.
                const gifter = await addPacksToUser(userid, gifterPacks);

                // --- Recipient Handling ---
                const recipientIds = recipientid.split(',');
                const recipientPacks = packsPerTier;

                const updatePromises = recipientIds.map(id => addPacksToUser(id.trim(), recipientPacks));
                // 'results' will be an array of user objects and nulls.
                const results = await Promise.all(updatePromises);

                // Count how many recipients were successfully given packs.
                const successfulRecipients = results.filter(user => user !== null);

                // --- Dynamic Message Construction ---
                let gifterMessage = '';
                if (gifter) {
                    gifterMessage = `${gifter.username} was awarded ${gifterPacks} packs for gifting.`;
                } else {
                    gifterMessage = `${gifterName} (who does not have an account) was not awarded packs.`;
                }

                const recipientMessage = `Of the ${recipientIds.length} recipients, ${successfulRecipients.length} had accounts and received ${recipientPacks} packs each.`;

                message = `${gifterMessage} ${recipientMessage}`;
                await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
                break;
            // --- END: MORE RESILIENT GIFTED SUB LOGIC ---

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
