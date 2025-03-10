// src/routes/MarketRoutes.js
const express = require('express');
const router = express.Router();
const MarketListing = require('../models/MarketListing');
const { protect } = require('../middleware/authMiddleware');

// POST /api/market/listings - Create a new market listing.
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
        const listings = await MarketListing.find({ status: 'active' })
            .populate('owner', 'username')
            .populate('offers.offerer', 'username')
            .populate('offers.offeredCards'); // Populate offered card details
        res.status(200).json({ listings });
    } catch (error) {
        console.error('Error fetching market listings:', error);
        res.status(500).json({ message: 'Server error fetching listings' });
    }
});

// GET /api/market/listings/:id - Get a single market listing.
router.get('/listings/:id', protect, async (req, res) => {
    try {
        const listing = await MarketListing.findById(req.params.id)
            .populate('owner', 'username')
            .populate('offers.offerer', 'username')
            .populate('offers.offeredCards');
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        res.status(200).json(listing);
    } catch (error) {
        console.error('Error fetching market listing:', error);
        res.status(500).json({ message: 'Server error fetching listing' });
    }
});

// POST /api/market/listings/:id/offers - Make an offer on a listing.
router.post('/listings/:id/offers', protect, async (req, res) => {
    try {
        const listingId = req.params.id;
        const { message, offeredCards, offeredPacks } = req.body;
        const listing = await MarketListing.findById(listingId);
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        // Prevent offering on your own listing.
        if (listing.owner.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot offer on your own listing.' });
        }
        // Allow only one offer per user on a listing.
        const existingOffer = listing.offers.find(
            offer => offer.offerer.toString() === req.user._id.toString()
        );
        if (existingOffer) {
            return res.status(400).json({ message: 'You already have an active offer on this listing.' });
        }
        listing.offers.push({
            offerer: req.user._id,
            message,
            offeredCards: offeredCards || [],
            offeredPacks: offeredPacks || 0,
        });
        await listing.save();
        res.status(200).json({ message: 'Offer submitted successfully' });
    } catch (error) {
        console.error('Error making offer:', error);
        res.status(500).json({ message: 'Server error making offer' });
    }
});

// DELETE /api/market/listings/:id - Cancel (delete) a listing.
router.delete('/listings/:id', protect, async (req, res) => {
    try {
        const listing = await MarketListing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        // Only the listing owner can cancel the listing.
        if (listing.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You do not have permission to cancel this listing.' });
        }
        // Optionally, you can add logic here to return the card to the user's collection.
        await listing.remove();
        res.status(200).json({ message: 'Listing cancelled and deleted successfully.' });
    } catch (error) {
        console.error('Error deleting listing:', error);
        res.status(500).json({ message: 'Server error deleting listing' });
    }
});

module.exports = router;
