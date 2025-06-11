// src/routes/twitchRoutes.js
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/userModel');

const router = express.Router();

// Environment variables
const TWITCH_SECRET = process.env.TWITCH_SECRET;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
let TWITCH_REFRESH_TOKEN = process.env.TWITCH_REFRESH_TOKEN;
const CHANNEL_POINTS_COST = parseInt(process.env.CHANNEL_POINTS_COST || '5000', 10);
// Packs awarded for each subscription tier
const tierPacks = { '1000': 1, '2000': 5, '3000': 20 };

if (!TWITCH_SECRET) {
    console.error('TWITCH_SECRET is not defined in the environment variables!');
    process.exit(1);
}

// Middleware to validate Twitch EventSub requests
const verifyTwitchRequest = (req, res, next) => {
    if (!req.rawBody) {
        console.error('🚨 Raw body is missing!');
        return res.status(400).send('Bad Request');
    }

    console.log('✅ Received raw body:', JSON.stringify(req.rawBody));

    const message = req.headers['twitch-eventsub-message-id'] +
        req.headers['twitch-eventsub-message-timestamp'] +
        req.rawBody;

    const computedSignature = crypto.createHmac('sha256', TWITCH_SECRET)
        .update(message)
        .digest('hex');

    const expectedSignature = `sha256=${computedSignature}`;

    console.log('🔍 Computed Signature:', expectedSignature);
    console.log('🔍 Received Signature:', req.headers['twitch-eventsub-message-signature']);

    if (req.headers['twitch-eventsub-message-signature'] !== expectedSignature) {
        console.error('❌ Signature mismatch! Event rejected.');
        return res.status(403).send('Forbidden');
    }

    console.log('✅ Signature verification passed.');
    next();
};

// Function to handle Twitch events
const handleTwitchEvent = async (event) => {
    console.log('Handling Twitch event:', event.type);
    const { user_id, user_name, type, reward, total, tier } = event;

    try {
        switch (type) {
            case 'channel.subscribe':
                console.log(`Processing channel.subscribe for ${user_name} (${user_id})`);
                // Check if the user exists before awarding packs
                const existingSubscriber = await User.findOne({ twitchId: user_id });
                if (existingSubscriber) {
                    const packsToAward = tierPacks[tier] || 1;
                    await User.findOneAndUpdate(
                        { twitchId: user_id },
                        { $inc: { packs: packsToAward } },
                        { new: true }
                    );
                    console.log(`${packsToAward} pack(s) awarded to subscriber ${user_name} (${user_id}).`);
                } else {
                    console.error(`❌ User not found for Twitch ID ${user_id} (${user_name}). Subscription event ignored.`);
                }
                break;

            case 'channel.subscription.gift':
                console.log('Processing channel.subscription.gift event:', event);
                // Award packs to the gifter only if they have an account on Ned's Decks
                const giftedCount = total || 1;
                if (!user_id) {
                    console.error("❌ No valid Twitch ID found for gifted subscription event", event);
                    break;
                }
                const existingGifter = await User.findOne({ twitchId: user_id });
                if (existingGifter) {
                    const packsPerSub = tierPacks[tier] || 1;
                    const totalPacks = packsPerSub * giftedCount;
                    // Increment packs for existing gifter
                    const updatedGifter = await User.findOneAndUpdate(
                        { twitchId: user_id },
                        { $inc: { packs: totalPacks } },
                        { new: true }
                    );
                    console.log(`🎁 ${totalPacks} pack(s) awarded to gifter (${user_id}). New pack count: ${updatedGifter.packs}`);
                } else {
                    // No account exists, so do not award a pack.
                    console.error(`❌ User not found for Twitch ID ${user_id} in gifted subscription event. Pack not awarded.`);
                }
                break;

            case 'channel.channel_points_custom_reward_redemption.add':
                if (
                    reward &&
                    reward.title === "Get A Ned's Decks Pack" &&
                    reward.cost === CHANNEL_POINTS_COST
                ) {
                    console.log(`Processing channel points redemption for ${user_name}`);
                    const existingUser = await User.findOne({ twitchId: user_id });
                    if (existingUser) {
                        existingUser.packs += 1;
                        await existingUser.save();
                        console.log(`✅ 1 pack added to ${user_name} (Total Packs: ${existingUser.packs})`);
                    } else {
                        console.error(`❌ User not found for Twitch ID ${user_id} (${user_name}). Redemption ignored.`);
                    }
                } else {
                    console.log(`⚠️ Unhandled reward title: ${reward?.title}`);
                }
                break;

            default:
                console.log(`⚠️ Unhandled event type: ${type}`);
        }
    } catch (error) {
        console.error(`❌ Error handling event ${type} for ${user_name}:`, error.message);
        throw error;
    }
};

// Webhook Endpoint
router.post('/webhook', verifyTwitchRequest, async (req, res) => {
    // --- NEW CHALLENGE HANDLING ---
    // If a challenge exists in the body, immediately return it.
    if (req.body.challenge) {
        console.log('Received challenge:', req.body.challenge);
        return res.status(200).send(req.body.challenge);
    }
    // --------------------------------

    const messageType = req.headers['twitch-eventsub-message-type'];
    const event = req.body.event;
    const eventType = req.body.subscription ? req.body.subscription.type : event.type;

    if (messageType === 'notification') {
        try {
            await handleTwitchEvent({ ...event, type: eventType });
            return res.status(200).send('Event processed');
        } catch (error) {
            return res.status(500).send('Server Error');
        }
    }

    res.status(400).send('Bad Request');
});

// Refresh Twitch Access Token
router.post('/refresh-token', async (req, res) => {
    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                grant_type: 'refresh_token',
                refresh_token: TWITCH_REFRESH_TOKEN,
                client_id: TWITCH_CLIENT_ID,
                client_secret: TWITCH_CLIENT_SECRET,
            },
        });
        const { access_token, refresh_token } = response.data;
        TWITCH_REFRESH_TOKEN = refresh_token;
        process.env.TWITCH_REFRESH_TOKEN = refresh_token;
        res.status(200).json({ accessToken: access_token, refreshToken: refresh_token });
    } catch (error) {
        console.error('Error refreshing Twitch Access Token:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

router.get('/test', (req, res) => {
    res.send('Twitch route test OK');
});

module.exports = router;
