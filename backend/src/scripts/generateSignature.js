const crypto = require('crypto');

// Replace these with the exact details you are testing with
const TWITCH_SECRET = 'MyTwitchSecretIsSafe'; // Your Twitch Secret from .env
const messageId = '12345'; // From 'Twitch-Eventsub-Message-Id' header
const timestamp = '2025-01-12T01:23:45Z'; // From 'Twitch-Eventsub-Message-Timestamp' header
const rawBody = `{
    "subscription": {
        "id": "test-id",
        "status": "enabled",
        "type": "channel.subscribe",
        "condition": { "broadcaster_user_id": "77266375" },
        "transport": { "method": "webhook", "callback": "http://your-ngrok-url" },
        "created_at": "2025-01-12T01:23:45Z",
        "cost": 0
    },
    "event": {
        "broadcaster_user_id": "77266375",
        "broadcaster_user_name": "testBroadcaster",
        "user_id": "123456",
        "user_name": "testUser",
        "tier": "1000",
        "is_gift": false
    }
}`; // This is your test JSON body

// Compose the message to sign
const message = `${messageId}${timestamp}${rawBody}`;

// Generate the HMAC SHA256 signature
const signature = crypto.createHmac('sha256', TWITCH_SECRET).update(message).digest('hex');

// Output the signature in the correct format
console.log(`Generated Signature: sha256=${signature}`);
