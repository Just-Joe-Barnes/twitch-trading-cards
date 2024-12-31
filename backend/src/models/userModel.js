const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    twitchId: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String },
    packs: { type: Number, default: 0 },
    cards: [
        {
            name: { type: String, required: true },
            rarity: { type: String, required: true },
            imageUrl: { type: String },
            flavorText: { type: String },
            mintNumber: { type: Number, required: true },
            totalCopies: { type: Number, required: true },
        },
    ],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
