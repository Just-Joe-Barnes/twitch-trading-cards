const crypto = require('crypto');

// Your actual values
const TWITCH_SECRET = 'MyTwitchSecretIsSafe'; // Replace with your actual TWITCH_SECRET
const messageId = '12345'; // Replace with the Twitch EventSub message ID
const messageTimestamp = '2025-01-12T01:23:45Z'; // Replace with the timestamp from your logs

// Build the raw JSON body as an object
const rawBodyObject = {
    subscription: {
        type: "channel.subscribe",
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
        is_gift: false
    }
};

// Convert the object to a canonical JSON string (no extra whitespace)
const rawBody = JSON.stringify(rawBodyObject);

// Concatenate the message parts exactly as expected by Twitch
const message = `${messageId}${messageTimestamp}${rawBody}`;

// Generate the HMAC SHA256 signature
const signature = crypto.createHmac('sha256', TWITCH_SECRET).update(message).digest('hex');

console.log('Expected Signature:', `sha256=${signature}`);
console.log('Raw Body:', rawBody);
