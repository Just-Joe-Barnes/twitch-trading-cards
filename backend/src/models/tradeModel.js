const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  offeredItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
  requestedItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
  offeredPacks: { type: Number, default: 0 },
  requestedPacks: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending'
  },
  cancellationReason: { type: String, default: '' },
  expiresAt: { type: Date, default: null }
}, {
  timestamps: true
});

// Index commonly queried fields for faster lookups
tradeSchema.index({ status: 1 });
tradeSchema.index({ sender: 1 });
tradeSchema.index({ recipient: 1 });
tradeSchema.index({ offeredItems: 1 });
tradeSchema.index({ requestedItems: 1 });

const Trade = mongoose.model('Trade', tradeSchema);
module.exports = Trade;
