const crypto = require('crypto');

// Your actual values
const TWITCH_SECRET = 'MyTwitchSecretIsSafe'; // Replace with the secret from your .env
const messageId = '12345'; // Replace with the Twitch Eventsub message ID from your logs
const messageTimestamp = '2025-01-12T01:23:45Z'; // Replace with the timestamp from your logs

// Raw Body from Postman (copy-paste here directly as raw JSON)
const rawBody = `
{
  "subscription": {
    "type": "channel.subscribe",
    "id": "test-id",
    "status": "enabled",
    "condition": {
      "broadcaster_user_id": "77266375"
    },
    "transport": {
      "method": "webhook",
      "callback": "http://localhost:5000/api/twitch/webhook"
    },
    "created_at": "2025-01-12T01:23:45Z"
  },
  "event": {
    "user_id": "123456",
    "user_name": "TestUser",
    "broadcaster_user_id": "77266375",
    "broadcaster_user_name": "TestBroadcaster",
    "tier": "1000",
    "is_gift": false
  }
}`.trim(); // Use `.trim()` to remove any accidental leading/trailing spaces

// Signature calculation
const message = `${messageId}${messageTimestamp}${rawBody}`;
const signature = crypto.createHmac('sha256', TWITCH_SECRET).update(message).digest('hex');

// Debugging logs
console.log('TWITCH_SECRET:', TWITCH_SECRET);
console.log('Message ID:', messageId);
console.log('Timestamp:', messageTimestamp);
console.log('Raw Body:', rawBody);
console.log('Concatenated Message:', message);
console.log('Expected Signature:', `sha256=${signature}`);
