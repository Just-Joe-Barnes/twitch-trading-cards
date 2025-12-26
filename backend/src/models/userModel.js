const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    name: String,
    rarity: String,
    mintNumber: Number,
    imageUrl: String,
    flavorText: String,
    modifier: { type: mongoose.Schema.Types.ObjectId, ref: 'Modifier', default: null },
    acquiredAt: { type: Date, default: Date.now }, // Track when the card was acquired
    status: {
        type: String,
        enum: ['available', 'pending', 'escrow'],
        default: 'available',
    }, // Card status
    grade: { type: Number, min: 1, max: 10 },
    slabbed: { type: Boolean, default: false },
    gradedAt: Date,
    gradingRequestedAt: Date,
    lore: { type: String },
    loreAuthor: { type: String },
    gameTags: { type: [String], default: [] },
});

// Index nested card id for faster $elemMatch queries
// Mongoose automatically indexes _id

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, unique: true, sparse: true },
    twitchId: { type: String, unique: true },
    packs: { type: Number, default: 0 },
    cards: [cardSchema], // User's card collection
    openedCards: [cardSchema], // Cards obtained from packs
    openedPacks: { type: Number, default: 0 },
    twitchProfilePic: { type: String },
    featuredCards: [
        {
            name: { type: String, required: true },
            rarity: { type: String, required: true },
            mintNumber: { type: Number, required: true },
            imageUrl: { type: String, required: true },
            flavorText: { type: String }
        },
    ],
    favoriteCard: {
        name: String,
        rarity: String,
    },
    selectedTitle: { type: mongoose.Schema.Types.ObjectId, ref: 'Title', default: null },
    unlockedTitles: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Title' }],
        default: []
    },

    preferredPack: { type: mongoose.Schema.Types.ObjectId, ref: 'Pack', default: null },
    firstLogin: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    lastActive: { type: Date }, // Last active in chat
    loginCount: { type: Number, default: 0 },
    loginStreak: { type: Number, default: 0 },
    lastLogin: { type: Date },

    completedPurchases: { type: Number, default: 0 },

    // Gamification fields
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    completedTrades: { type: Number, default: 0 },
    createdListings: { type: Number, default: 0 },
    completedListings: { type: Number, default: 0 },
    achievements: [
        {
            name: String,
            description: String,
        reward: {
            packs: { type: Number, default: 0 },
            card: { type: Boolean, default: false },
            title: {
                name: { type: String, default: '' },
                slug: { type: String, default: '' },
                description: { type: String, default: '' },
                color: { type: String, default: '' },
                gradient: { type: String, default: '' },
                isAnimated: { type: Boolean, default: false },
                effect: { type: String, default: '' },
            },
        },
        claimed: { type: Boolean, default: false },
        dateEarned: { type: Date, default: Date.now }
        }
    ],
    // Achievements selected to display on profile
    featuredAchievements: [
        {
            name: String,
            description: String,
        reward: {
            packs: { type: Number, default: 0 },
            card: { type: Boolean, default: false },
            title: {
                name: { type: String, default: '' },
                slug: { type: String, default: '' },
                description: { type: String, default: '' },
                color: { type: String, default: '' },
                gradient: { type: String, default: '' },
                isAnimated: { type: Boolean, default: false },
                effect: { type: String, default: '' },
            },
        },
        claimed: { type: Boolean, default: false },
        dateEarned: { type: Date, default: Date.now }
        }
    ],
    pendingEventReward: {
        type: Array,
        default: []
    }
});

// Helpful indexes for frequent queries
userSchema.index({ 'cards._id': 1 });
userSchema.index({ 'cards.status': 1 });
userSchema.index({ 'cards.name': 1, 'cards.rarity': 1 });
// New indexes to accelerate mint number lookups for duplicate checks
userSchema.index({ 'cards.name': 1, 'cards.rarity': 1, 'cards.mintNumber': 1 });
userSchema.index({ 'openedCards.name': 1, 'openedCards.rarity': 1, 'openedCards.mintNumber': 1 });

userSchema.virtual('activity', {
    ref: 'UserActivity',
    localField: '_id',
    foreignField: 'userId',
    justOne: true
});
userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
