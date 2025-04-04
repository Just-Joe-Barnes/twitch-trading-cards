const mongoose = require('mongoose');

const raritySchema = new mongoose.Schema({
    rarity: { type: String, required: true },
    totalCopies: { type: Number, required: true },
    remainingCopies: { type: Number, required: true },
    availableMintNumbers: { type: [Number], required: true },
});

const cardSchema = new mongoose.Schema({
    name: { type: String, required: true },
    imageUrl: { type: String, required: true },
    flavorText: { type: String },
    modifier: { type: mongoose.Schema.Types.ObjectId, ref: 'Modifier' },
    rarities: [raritySchema], // Nest rarities as an array of objects
});

const Card = mongoose.model('Card', cardSchema);

module.exports = Card;
