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
    lore: { type: String }, // Optional lore field
    loreAuthor: { type: String }, // Optional lore author field
    modifier: { type: mongoose.Schema.Types.ObjectId, ref: 'Modifier' },
    rarities: [raritySchema], // Nest rarities as an array of objects
    availableFrom: { type: Date, default: null },
    availableTo: { type: Date, default: null },
    series: { type: String, default: 'Base' },
});

// Helpful indexes for frequent queries
cardSchema.index({ name: 1 });
cardSchema.index({ 'rarities.rarity': 1 });

const Card = mongoose.model('Card', cardSchema);

module.exports = Card;
