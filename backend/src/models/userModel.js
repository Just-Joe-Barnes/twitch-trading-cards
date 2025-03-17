const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    name: String,
    rarity: String,
    mintNumber: Number,
    imageUrl: String,
    flavorText: String,
    acquiredAt: { type: Date, default: Date.now } // Track when the card was acquired
});

// Notification schema
const notificationSchema = new mongoose.Schema({
    type: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String }, // Optional URL or route
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    extra: { type: Object, default: {} } // For any extra flags, e.g., priority
});

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, unique: true, sparse: true },
    twitchId: { type: String, unique: true },
    packs: { type: Number, default: 0 },
    cards: [cardSchema], // User's card collection
    openedCards: [cardSchema], // Cards obtained from packs
    openedPacks: { type: Number, default: 0 },
    featuredCards: [
        {
            name: { type: String, required: true },
            rarity: { type: String, required: true },
            mintNumber: { type: Number, required: true },
            imageUrl: { type: String, required: true },
            flavorText: { type: String }
        },
    ],
    notifications: [notificationSchema], // NEW: Notifications for the user
    firstLogin: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
