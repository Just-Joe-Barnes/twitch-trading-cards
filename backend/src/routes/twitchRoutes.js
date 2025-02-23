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

if (!TWITCH_SECRET) {
    console.error('TWITCH_SECRET is not defined in the environment variables!');
    process.exit(1);
}

// Middleware to validate Twitch EventSub requests
const verifyTwitchRequest = (req, res, next) => {
    if (!req.rawBody) {
        console.error('Raw body is missing!');
        return res.status(400).send('Bad Request');
    }

    const message = `${req.headers['twitch-eventsub-message-id']}${req.headers['twitch-eventsub-message-timestamp']}${req.rawBody}`;
    const signature = crypto.createHmac('sha256', TWITCH_SECRET).update(message).digest('hex');
    const expectedSignature = `sha256=${signature}`;

    if (req.headers['twitch-eventsub-message-signature'] !== expectedSignature) {
        console.error('Signature mismatch! Event rejected.');
        return res.status(403).send('Forbidden');
    }

    next();
};

// Function to handle Twitch events
const handleTwitchEvent = async (event) => {
    console.log('--- DEBUG LOGS: handleTwitchEvent ---');
    console.log('Event Data:', event);

    const { user_id, user_name, type, reward, total } = event;

    try {
        switch (type) {
            case 'channel.subscribe':
                console.log(`Processing channel.subscribe event for user ${user_name} (${user_id})`);
                const updatedUser = await User.findOneAndUpdate(
                    { twitchId: user_id },
                    { $inc: { packs: 1 } },
                    { upsert: true, new: true }
                );
                if (updatedUser) {
                    console.log(`1 pack successfully awarded to user ${user_name}. Updated packs: ${updatedUser.packs}`);
                } else {
                    console.error(`Failed to update user ${user_name} (${user_id})`);
                }
                break;

            case 'channel.subscription.gift':
                const giftedCount = total || 1;
                console.log(`Processing channel.subscription.gift with ${giftedCount} gifts by user ${user_name}`);
                const updatedGiftedUser = await User.findOneAndUpdate(
                    { twitchId: user_id },
                    { $inc: { packs: giftedCount } },
                    { upsert: true, new: true }
                );
                if (updatedGiftedUser) {
                    console.log(`${giftedCount} packs successfully awarded to user ${user_name}. Updated packs: ${updatedGiftedUser.packs}`);
                } else {
                    console.error(`Failed to update user ${user_name} (${user_id})`);
                }
                break;

            case 'channel.channel_points_custom_reward_redemption.add':
                // Check that the reward title and cost match what we expect
                if (
                    reward &&
                    reward.title === "Get A Ned's Decks Pack" &&
                    reward.cost === 10000
                ) {
                    console.log(`Processing channel points redemption for user ${user_name}`);
                    const updatedPointsUser = await User.findOneAndUpdate(
                        { twitchId: user_id },
                        { $inc: { packs: 1 } },
                        { upsert: true, new: true }
                    );
                    if (updatedPointsUser) {
                        console.log(`1 pack successfully awarded to user ${user_name} for redeeming channel points. Updated packs: ${updatedPointsUser.packs}`);
                    } else {
                        console.error(`Failed to update user ${user_name} (${user_id})`);
                    }
                } else {
                    console.log(`Unhandled reward title: ${reward?.title}`);
                }
                break;

            default:
                console.log(`Unhandled event type: ${type}`);
        }
    } catch (error) {
        console.error(`Error handling event of type ${type} for user ${user_name}:`, error.message);
        throw error;
    }
    console.log('--- END DEBUG LOGS: handleTwitchEvent ---');
};

// Webhook endpoint
router.post('/webhook', verifyTwitchRequest, async (req, res) => {
    const messageType = req.headers['twitch-eventsub-message-type'];
    const event = req.body.event;
    const subscriptionType = req.body.subscription?.type;

    console.log('--- DEBUG LOGS: /webhook ---');
    console.log('Message Type:', messageType);
    console.log('Subscription Type:', subscriptionType);
    console.log('Event Data:', event);

    if (messageType === 'webhook_callback_verification') {
        console.log('Webhook verification received:', req.body.challenge);
        return res.status(200).send(req.body.challenge);
    }

    if (messageType === 'notification') {
        try {
            console.log('Processing notification...');
            await handleTwitchEvent({ ...event, type: subscriptionType }); // Pass type explicitly
            console.log('Notification processed successfully.');
            return res.status(200).send('Event processed');
        } catch (error) {
            console.error('Error processing notification:', error.message);
            return res.status(500).send('Server Error');
        }
    }

    console.log('Unhandled message type received:', messageType);
    res.status(400).send('Bad Request');
});

// Endpoint to manually refresh the token for testing purposes
router.post('/refresh-token', async (req, res) => {
    try {
        console.log('Refreshing Twitch Access Token...');
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

        console.log('Twitch Access Token refreshed successfully.');
        res.status(200).json({ accessToken: access_token, refreshToken: refresh_token });
    } catch (error) {
        console.error('Error refreshing Twitch Access Token:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to refresh token' });
    }

    router.get('/test', (req, res) => {
        console.log('GET /api/twitch/test reached!');
        res.send('Twitch route test OK');
    });

});

module.exports = router;
