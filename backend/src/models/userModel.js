const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rarity: { type: String, required: true },
    imageUrl: { type: String },
    flavorText: { type: String },
    mintNumber: { type: Number },
    totalCopies: { type: Number },
});

const userSchema = new mongoose.Schema({
    twitchId: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String },
    packs: { type: Number, default: 0 },
    cards: [cardSchema], // Ensure this field is properly defined
});

module.exports = mongoose.model('User', userSchema);
