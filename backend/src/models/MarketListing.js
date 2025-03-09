// src/models/MarketListing.js
const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    offerer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String },
    offeredPrice: { type: Number }, // Optional field if you want to track a price
    createdAt: { type: Date, default: Date.now }
});

const marketListingSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // We store the card details in the listing to "freeze" its details at listing time.
    card: {
        name: { type: String, required: true },
        imageUrl: { type: String, required: true },
        rarity: { type: String, required: true },
        mintNumber: { type: Number, required: true },
        flavorText: { type: String }
    },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'sold'], default: 'active' },
    offers: [offerSchema]
});

module.exports = mongoose.model('MarketListing', marketListingSchema);
