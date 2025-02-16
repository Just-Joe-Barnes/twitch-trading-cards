const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    offeredItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],  // Reference Card IDs
    requestedItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],  // Reference Card IDs
    offeredPacks: { type: Number, default: 0 },
    requestedPacks: { type: Number, default: 0 },
    status: { type: String, default: 'pending' }
}, {
    timestamps: true
});

const Trade = mongoose.model('Trade', tradeSchema);
module.exports = Trade;
