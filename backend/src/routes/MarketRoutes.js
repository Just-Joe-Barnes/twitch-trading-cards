// src/routes/MarketRoutes.js
const express = require('express');
const router = express.Router();
const MarketListing = require('../models/MarketListing');
const { protect } = require('../middleware/authMiddleware');

// POST /api/market/listings - Create a new market listing.
// Only allow listing a card if it comes from the user's own collection.
router.post('/listings', protect, async (req, res) => {
    try {
        const { card } = req.body;
        if (!card || !card.name || !card.imageUrl || !card.rarity || !card.mintNumber) {
            return res.status(400).json({ message: 'Invalid card data' });
        }
        const newListing = new MarketListing({
            owner: req.user._id,
            card,
        });
        const savedListing = await newListing.save();
        res.status(201).json(savedListing);
    } catch (error) {
        console.error('Error creating market listing:', error);
        res.status(500).json({ message: 'Server error creating listing' });
    }
});

// GET /api/market/listings - Get all active listings.
router.get('/listings', protect, async (req, res) => {
    try {
        const listings = await MarketListing.find({ status: 'active' }).populate('owner', 'username');
        res.status(200).json({ listings });
    } catch (error) {
        console.error('Error fetching market listings:', error);
        res.status(500).json({ message: 'Server error fetching listings' });
    }
});

// POST /api/market/listings/:id/offers - Make an offer on a listing.
router.post('/listings/:id/offers', protect, async (req, res) => {
    try {
        const listingId = req.params.id;
        const { message, offeredPrice } = req.body;
        const listing = await MarketListing.findById(listingId);
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        // Add the offer to the listing.
        listing.offers.push({
            offerer: req.user._id,
            message,
            offeredPrice,
        });
        await listing.save();

        // (Optional: Create a notification for the listing owner here.)

        res.status(200).json({ message: 'Offer submitted successfully' });
    } catch (error) {
        console.error('Error making offer:', error);
        res.status(500).json({ message: 'Server error making offer' });
    }
});

module.exports = router;
