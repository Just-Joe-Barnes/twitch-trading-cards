const tmi = require('tmi.js');
const mongoose = require('mongoose');
const User = require('./src/models/userModel'); // Adjust path as needed
require('dotenv').config();

// Twitch credentials
const twitchUsername = process.env.TWITCH_USERNAME;
const twitchPassword = process.env.TWITCH_PASSWORD;
const twitchChannel = process.env.TWITCH_CHANNEL;

// MongoDB connection string
const mongoUri = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Create a client with our credentials
const client = new tmi.Client({
    options: { debug: true },
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: twitchUsername,
        password: twitchPassword
    },
    channels: [ twitchChannel ]
});

// Connect to Twitch
client.connect()
.then(() => {
    console.log(`Connected to Twitch channel: ${twitchChannel}`);
})
.catch(console.error);

// Listen for messages
client.on('message', async (channel, tags, message, self) => {
    if (self) return; // Ignore echoed messages

    const username = tags.username;
    console.log(`${username}: ${message}`);

    try {
        // Update the user's lastActive timestamp in the database
        await User.findOneAndUpdate(
            { username: username },
            { lastActive: new Date() },
            { upsert: false } // Only update existing users
        );
    } catch (error) {
        console.error('Error updating user lastActive:', error);
    }
});

client.on('disconnected', (reason) => {
    console.log(`Disconnected: ${reason}`);
});
