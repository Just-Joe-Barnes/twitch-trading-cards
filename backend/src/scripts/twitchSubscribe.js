const axios = require('axios');
require('dotenv').config({ path: '../../.env' });

// Environment variables from .env
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const TWITCH_USER_ACCESS_TOKEN = 'ks9xvl7p5lq6yeogvkr7ertp4qr2iv';
const TWITCH_SECRET = process.env.TWITCH_SECRET || 'your-default-twitch-secret';

// Updated callback URL: make sure this matches your Express route mounting.
const WEBHOOK_URL = 'https://neds-decks.onrender.com/api/twitch/webhook';
const BROADCASTER_ID = '77266375'; // Replace with your broadcaster's Twitch ID

console.log('Environment Variables Loaded:');
console.log('CLIENT_ID:', TWITCH_CLIENT_ID);
console.log('CLIENT_SECRET:', TWITCH_CLIENT_SECRET);
console.log('USER_ACCESS_TOKEN:', TWITCH_USER_ACCESS_TOKEN);
console.log('TWITCH_SECRET:', TWITCH_SECRET);
console.log('Webhook URL:', WEBHOOK_URL);

// Validate User Access Token
const validateUserAccessToken = async () => {
    try {
        console.log('Validating User Access Token...');
        const response = await axios.get('https://id.twitch.tv/oauth2/validate', {
            headers: { Authorization: `Bearer ${TWITCH_USER_ACCESS_TOKEN}` },
        });
        console.log('Token validation response:', response.data);
        return response.data;
    } catch (err) {
        console.error('Error validating token:', err.response?.data || err.message);
        throw new Error('Failed to validate user access token.');
    }
};

// Fetch App Access Token
const fetchAppAccessToken = async () => {
    try {
        console.log('Fetching App Access Token...');
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: TWITCH_CLIENT_ID,
                client_secret: TWITCH_CLIENT_SECRET,
                grant_type: 'client_credentials',
            },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        console.log('App Access Token fetched successfully:', response.data.access_token);
        return response.data.access_token;
    } catch (err) {
        console.error('Error fetching App Access Token:', err.response?.data || err.message);
        throw new Error('Failed to fetch App Access Token.');
    }
};

// Subscribe to a specific event type
const subscribeToEvent = async (type, condition, accessToken) => {
    try {
        console.log(`Sending Payload for ${type}:`, {
            type,
            version: '1',
            condition,
            transport: {
                method: 'webhook',
                callback: WEBHOOK_URL,
                secret: TWITCH_SECRET,
            },
        });

        const response = await axios.post(
            'https://api.twitch.tv/helix/eventsub/subscriptions',
            {
                type,
                version: '1',
                condition,
                transport: {
                    method: 'webhook',
                    callback: WEBHOOK_URL,
                    secret: TWITCH_SECRET,
                },
            },
            {
                headers: {
                    'Client-ID': TWITCH_CLIENT_ID,
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );
        console.log(`Subscribed to ${type}:`, response.data);
    } catch (err) {
        console.error(`Error subscribing to ${type}:`, err.response?.data || err.message);
    }
};

// Subscribe to All Events
const subscribeToAllEvents = async () => {
    try {
        // Validate User Access Token (for channel subscriptions)
        await validateUserAccessToken();

        // Fetch the App Access Token for channel points redemption event
        const appAccessToken = await fetchAppAccessToken();

        // Use broadcaster's user access token for subscription events that require user-level authorization.
        await subscribeToEvent('channel.subscribe', { broadcaster_user_id: BROADCASTER_ID }, TWITCH_USER_ACCESS_TOKEN);
        await subscribeToEvent('channel.subscription.gift', { broadcaster_user_id: BROADCASTER_ID }, TWITCH_USER_ACCESS_TOKEN);

        // Use app access token for channel points custom reward redemption event.
        await subscribeToEvent(
            'channel.channel_points_custom_reward_redemption.add',
            { broadcaster_user_id: BROADCASTER_ID },
            appAccessToken
        );

        console.log('All subscriptions created successfully');
    } catch (err) {
        console.error('Error in subscription process:', err.message);
    }
};

// Export functions for use in other scripts
module.exports = {
    subscribeToEvent,
    subscribeToAllEvents,
    validateUserAccessToken,
    fetchAppAccessToken,
};

// If the script is run directly, execute the subscription logic
if (require.main === module) {
    subscribeToAllEvents();
}
