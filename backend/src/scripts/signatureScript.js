const crypto = require('crypto');

const TWITCH_SECRET = 'qzr7pbnubo6eipfcadmipl6lllfw1b'; // Replace with actual secret
const messageId = '12345';
const messageTimestamp = '2025-01-12T01:23:45Z';

// Use exact JSON structure for the gifted subscription event body
const rawBodyObject = {
    subscription: {
        type: "channel.subscription.gift",
        id: "test-id",
        status: "enabled",
        condition: { broadcaster_user_id: "77266375" },
        transport: { method: "webhook", callback: "https://neds-decks.onrender.com/api/twitch/webhook" },
        created_at: "2025-01-12T01:23:45Z"
    },
    event: {
        user_id: "123456",
        user_name: "TestUser",
        broadcaster_user_id: "77266375",
        broadcaster_user_name: "TestBroadcaster",
        tier: "1000",
        is_gift: true,
        total: 5
    }
};

// Convert object to a properly formatted JSON string (ensures consistent formatting)
const rawBody = JSON.stringify(rawBodyObject);

// Concatenate message components for signature computation
const message = messageId + messageTimestamp + rawBody;
const signature = crypto.createHmac('sha256', TWITCH_SECRET).update(message).digest('hex');

console.log('Expected Signature:', `sha256=${signature}`);
console.log('Raw Body:', rawBody);
