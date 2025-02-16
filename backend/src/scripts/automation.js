const axios = require('axios');
require('dotenv').config({ path: '../../.env' }); // Adjust path if needed

// Refresh User Access Token
const refreshUserAccessToken = async () => {
    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: process.env.TWITCH_REFRESH_TOKEN, // Ensure this is set in your .env file
            },
        });
        console.log('User Access Token refreshed successfully');
        process.env.TWITCH_USER_ACCESS_TOKEN = response.data.access_token;
        process.env.TWITCH_REFRESH_TOKEN = response.data.refresh_token; // Save the new refresh token securely
    } catch (err) {
        console.error('Error refreshing user access token:', err.response?.data || err.message);
    }
};

// Fetch New App Access Token
const fetchAppAccessToken = async () => {
    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                grant_type: 'client_credentials',
            },
        });
        console.log('App Access Token fetched successfully');
        process.env.TWITCH_APP_ACCESS_TOKEN = response.data.access_token;
    } catch (err) {
        console.error('Error fetching app access token:', err.response?.data || err.message);
    }
};

// Renew Webhooks
const renewWebhooks = async () => {
    console.log('Renewing webhooks...');
    try {
        // Import and call your subscription logic from twitchSubscribe.js
        const { subscribeToEvents } = require('./twitchSubscribe');
        await subscribeToEvents(); // Ensure your subscription function is exported
        console.log('Webhooks renewed successfully.');
    } catch (err) {
        console.error('Error renewing webhooks:', err.message);
    }
};

// Schedule Periodic Tasks
const scheduleTasks = () => {
    setInterval(() => {
        console.log('Refreshing App Access Token...');
        fetchAppAccessToken();
    }, 60 * 60 * 1000); // Every hour

    setInterval(() => {
        console.log('Renewing Webhooks...');
        renewWebhooks();
    }, 8 * 24 * 60 * 60 * 1000); // Every 8 days (before 10-day webhook expiry)

    setInterval(() => {
        console.log('Refreshing User Access Token...');
        refreshUserAccessToken();
    }, 50 * 24 * 60 * 60 * 1000); // Every 50 days (before 60-day expiry)
};

// Start the automation
scheduleTasks();
