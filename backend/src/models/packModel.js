const mongoose = require('mongoose');

// Define the schema for packs
const packSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Owner of the pack
    isOpened: { type: Boolean, default: false }, // Whether the pack has been opened
    openedAt: { type: Date }, // Timestamp for when the pack was opened
    cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }], // Cards in the pack

    // New fields for pack type and availability
    type: { type: String, default: 'Base' },
    series: { type: String, default: 'Base' },
    availableFrom: { type: Date, default: null },
    availableTo: { type: Date, default: null },
    cardPool: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }], // Optional specific card pool
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('Pack', packSchema);
