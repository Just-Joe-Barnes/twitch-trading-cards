// src/routes/MarketRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const MarketListing = require('../models/MarketListing');
const User = require('../models/userModel');
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

// GET /api/market/listings - Get all active listings with pagination.
router.get('/listings', protect, async (req, res) => {
    try {
        // Get pagination parameters from query, default page=1 and limit=9
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;
        const skip = (page - 1) * limit;

        const listingsPromise = MarketListing.find({ status: 'active' })
            .populate('owner', 'username')
            .populate('offers.offerer', 'username')
            .populate('offers.offeredCards')
            .skip(skip)
            .limit(limit);

        const countPromise = MarketListing.countDocuments({ status: 'active' });
        const [listings, total] = await Promise.all([listingsPromise, countPromise]);
        const pages = Math.ceil(total / limit);

        res.status(200).json({ listings, total, page, pages });
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

// PUT /api/market/listings/:id/offers/:offerId/accept - Accept an offer (listing owner only)
router.put('/listings/:id/offers/:offerId/accept', protect, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const listing = await MarketListing.findById(req.params.id).session(session);
        if (!listing) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Listing not found' });
        }
        if (listing.owner.toString() !== req.user._id.toString()) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ message: 'You do not have permission to accept offers on this listing.' });
        }
        if (listing.status !== 'active') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Listing is not active.' });
        }
        // Find the offer by offerId
        const offer = listing.offers.id(req.params.offerId);
        if (!offer) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Offer not found' });
        }
        // Process the transaction:
        // Transfer the listed card from seller to buyer and exchange packs if applicable.
        const seller = await User.findById(listing.owner).session(session);
        const buyer = await User.findById(offer.offerer).session(session);
        if (!seller || !buyer) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Seller or Buyer not found' });
        }

        // Identify the card in seller's collection using card name and mintNumber.
        const cardIndex = seller.cards.findIndex(card =>
            card.name === listing.card.name && card.mintNumber === listing.card.mintNumber
        );
        if (cardIndex === -1) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Card not found in seller's collection" });
        }
        const card = seller.cards.splice(cardIndex, 1)[0];
        // Add the card to buyer's collection.
        buyer.cards.push(card);

        // Transfer packs: Buyer must have enough packs to pay the offeredPacks amount.
        if (buyer.packs < offer.offeredPacks) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Buyer does not have enough packs" });
        }
        buyer.packs -= offer.offeredPacks;
        seller.packs += offer.offeredPacks;

        // Save the user documents.
        await seller.save({ session });
        await buyer.save({ session });

        // Mark the listing as sold and clear all offers.
        listing.status = 'sold';
        listing.offers = [];
        await listing.save({ session });

        // Cleanup: Cancel any other active listings with the same card.
        await MarketListing.updateMany(
            {
                _id: { $ne: listing._id },
                status: 'active',
                "card.name": listing.card.name,
                "card.mintNumber": listing.card.mintNumber
            },
            { $set: { status: 'cancelled', cancellationReason: 'Card sold in another listing' } },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "Offer accepted, card transferred, and listing sold." });
    } catch (error) {
        console.error('Error accepting offer:', error);
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: 'Failed to accept offer', error: error.message });
    }
});

// DELETE /api/market/listings/:id/offers/:offerId - Reject (delete) an offer (listing owner only)
router.delete('/listings/:id/offers/:offerId', protect, async (req, res) => {
    try {
        const listing = await MarketListing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        if (listing.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You do not have permission to reject offers on this listing.' });
        }
        const offer = listing.offers.id(req.params.offerId);
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        offer.remove();
        await listing.save();
        res.status(200).json({ message: 'Offer rejected and removed.' });
    } catch (error) {
        console.error('Error rejecting offer:', error);
        res.status(500).json({ message: 'Server error rejecting offer' });
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
        await listing.deleteOne();
        res.status(200).json({ message: 'Listing cancelled and deleted successfully.' });
    } catch (error) {
        console.error('Error deleting listing:', error);
        res.status(500).json({ message: 'Server error deleting listing' });
    }
});

module.exports = router;
