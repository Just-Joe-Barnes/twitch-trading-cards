const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  offerer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String },
  offeredCards: [{
    name: { type: String, required: true },
    imageUrl: { type: String, required: true },
    rarity: { type: String, required: true },
    mintNumber: { type: Number, required: true },
    flavorText: { type: String },
    // Optional modifier information for the offered card
    modifier: { type: mongoose.Schema.Types.Mixed, default: null }
  }],
  offeredPacks: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null }
});

const marketListingSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  card: {
    name: { type: String, required: true },
    imageUrl: { type: String, required: true },
    rarity: { type: String, required: true },
    mintNumber: { type: Number, required: true },
    flavorText: { type: String },
    // Include modifier details if present on the card being listed
    modifier: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  createdAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['active', 'sold', 'cancelled'],
    default: 'active'
  },
  cancellationReason: { type: String, default: '' },
  offers: [offerSchema]
});

// Index status for faster retrieval of active listings
marketListingSchema.index({ status: 1 });

module.exports = mongoose.model('MarketListing', marketListingSchema);
