const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    name: { type: String, required: true },
    imageUrl: { type: String, required: true },
    flavorText: { type: String },
    rarity: { type: String, required: true },
    totalCopies: { type: Number, required: true },
    remainingCopies: { type: Number, required: true },
    availableMintNumbers: { type: [Number], default: [] }, // Add this field
});

module.exports = mongoose.model('Card', cardSchema);
