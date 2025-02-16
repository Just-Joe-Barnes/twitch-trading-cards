const axios = require('axios');

async function refreshTwitchToken() {
    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                refresh_token: process.env.TWITCH_REFRESH_TOKEN,
                grant_type: 'refresh_token',
            },
        });

        // Update environment variables
        process.env.TWITCH_ACCESS_TOKEN = response.data.access_token;
        process.env.TWITCH_REFRESH_TOKEN = response.data.refresh_token;

        console.log('[TOKEN REFRESH] Access token refreshed successfully.');
        return response.data;
    } catch (error) {
        console.error('[TOKEN REFRESH] Failed to refresh Twitch token:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = {
    refreshTwitchToken,
};
