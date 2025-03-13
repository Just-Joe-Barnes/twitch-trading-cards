const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    name: String,
    rarity: String,
    mintNumber: Number,
    imageUrl: String,
    flavorText: String,
    acquiredAt: { type: Date, default: Date.now } // NEW: Track when the card was acquired
});

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, unique: true, sparse: true }, // Updated: use sparse unique index
    twitchId: { type: String, unique: true },
    packs: { type: Number, default: 0 },
    cards: [cardSchema], // Collection of cards owned by the user
    openedCards: [cardSchema], // Cards obtained from packs
    openedPacks: { type: Number, default: 0 }, // Number of packs the user has opened
    featuredCards: [
        {
            name: { type: String, required: true },
            rarity: { type: String, required: true },
            mintNumber: { type: Number, required: true },
            imageUrl: { type: String, required: true },
            flavorText: { type: String }, // Added flavorText field
        },
    ], // Featured cards displayed on the user's profile
    firstLogin: { type: Boolean, default: false }, // First login status
    isAdmin: { type: Boolean, default: false }, // Admin status field
});

const User = mongoose.model('User', userSchema);

module.exports = User;
