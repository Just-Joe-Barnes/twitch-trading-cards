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
    lore: { type: String },
    loreAuthor: { type: String },
    modifier: { type: mongoose.Schema.Types.ObjectId, ref: 'Modifier' },
    rarities: [raritySchema],
    availableFrom: { type: Date, default: null },
    availableTo: { type: Date, default: null },
    series: { type: String, default: 'Base' },
    isHidden: { type: Boolean, default: false },
    gameTags: { type: [String], default: [] },
});

// Helpful indexes for frequent queries
cardSchema.index({ name: 1 });
cardSchema.index({ 'rarities.rarity': 1 });
cardSchema.index({ gameTags: 1 });

const Card = mongoose.model('Card', cardSchema);

module.exports = Card;
