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

        // New check: Prevent listing the same card multiple times.
        const existingListing = await MarketListing.findOne({
            owner: req.user._id,
            "card.name": card.name,
            "card.mintNumber": card.mintNumber,
            status: 'active'
        });
        if (existingListing) {
            return res.status(400).json({ message: 'You already have an active listing for this card.' });
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;
        const skip = (page - 1) * limit;

        const listingsPromise = MarketListing.find({ status: 'active' })
            .populate('owner', 'username')
            .populate('offers.offerer', 'username')
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
            .populate('offers.offerer', 'username');
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

        // 1. Fetch the listing
        const listing = await MarketListing.findById(listingId);
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        // NEW: Prevent modifying if listing is no longer active.
        if (listing.status !== 'active') {
            return res.status(400).json({ message: 'This listing is no longer active.' });
        }

        // 2. Debug logs
        console.log('[MAKE OFFER] Listing owner:', listing.owner.toString());
        console.log('[MAKE OFFER] Current user:', req.user._id.toString());

        // 3. Prevent offering on your own listing
        if (listing.owner.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot offer on your own listing.' });
        }

        // 4. Filter out any existing offers with incomplete card data BEFORE checking for an existing offer
        listing.offers = listing.offers.filter(offer =>
            offer.offeredCards.every(card =>
                card.name &&
                card.imageUrl &&
                card.rarity &&
                card.mintNumber !== undefined &&
                card.mintNumber !== null
            )
        );

        // 5. Allow only one offer per user on a listing
        const existingOffer = listing.offers.find(
            offer => offer.offerer.toString() === req.user._id.toString()
        );
        if (existingOffer) {
            return res.status(400).json({ message: 'You already have an active offer on this listing.' });
        }

        // 6. Add the new offer
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

        // NEW: Ensure the listing is still active.
        if (listing.status !== 'active') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'This listing is no longer active.' });
        }

        if (listing.owner.toString() !== req.user._id.toString()) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ message: 'You do not have permission to accept offers on this listing.' });
        }
        const offer = listing.offers.id(req.params.offerId);
        if (!offer) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Offer not found' });
        }
        const seller = await User.findById(listing.owner).session(session);
        const buyer = await User.findById(offer.offerer).session(session);
        if (!seller || !buyer) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Seller or Buyer not found' });
        }

        // Transfer each offered card from buyer to seller
        for (const offeredCard of offer.offeredCards) {
            const buyerCardIndex = buyer.cards.findIndex(c =>
                c.name === offeredCard.name && c.mintNumber === offeredCard.mintNumber
            );
            if (buyerCardIndex === -1) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: `Offered card ${offeredCard.name} not found in buyer's collection` });
            }
            const transferredCard = buyer.cards.splice(buyerCardIndex, 1)[0];
            seller.cards.push(transferredCard);
        }

        // Transfer the listed card from seller to buyer
        const cardIndex = seller.cards.findIndex(card =>
            card.name === listing.card.name && card.mintNumber === listing.card.mintNumber
        );
        if (cardIndex === -1) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Card not found in seller's collection" });
        }
        const card = seller.cards.splice(cardIndex, 1)[0];
        buyer.cards.push(card);

        if (buyer.packs < offer.offeredPacks) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Buyer does not have enough packs" });
        }
        buyer.packs -= offer.offeredPacks;
        seller.packs += offer.offeredPacks;

        await seller.save({ session });
        await buyer.save({ session });

        listing.status = 'sold';
        listing.offers = [];
        await listing.save({ session });

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

// DELETE /api/market/listings/:id/offers/self - Cancel (delete) your own offer
// (Place this BEFORE the more general DELETE route below)
router.delete('/listings/:id/offers/self', protect, async (req, res) => {
    try {
        const listing = await MarketListing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        // NEW: Prevent modifications if the listing is not active.
        if (listing.status !== 'active') {
            return res.status(400).json({ message: 'This listing is no longer active.' });
        }

        // Debug logs
        const currentUserId = req.user._id.toString();
        console.log('[CANCEL OFFER] Current user ID:', currentUserId);
        console.log('[CANCEL OFFER] Offerer IDs in listing:', listing.offers.map(o => o.offerer.toString()));

        // Filter out incomplete offers first
        listing.offers = listing.offers.filter(offer =>
            offer.offeredCards.every(card =>
                card.name &&
                card.imageUrl &&
                card.rarity &&
                card.mintNumber !== undefined &&
                card.mintNumber !== null
            )
        );

        // Find the user's offer
        const userOffer = listing.offers.find(
            offer => offer.offerer.toString() === currentUserId
        );
        if (!userOffer) {
            return res.status(404).json({ message: 'No offer found for the current user.' });
        }

        // Remove the offer using Mongoose's pull() method
        listing.offers.pull({ _id: userOffer._id });
        await listing.save();

        res.status(200).json({ message: 'Your offer has been cancelled.' });
    } catch (error) {
        console.error('Error cancelling offer:', error);
        res.status(500).json({ message: 'Server error cancelling offer' });
    }
});

// DELETE /api/market/listings/:id/offers/:offerId - Reject (delete) an offer (listing owner only)
router.delete('/listings/:id/offers/:offerId', protect, async (req, res) => {
    try {
        const listing = await MarketListing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        // NEW: Prevent modifications if the listing is not active.
        if (listing.status !== 'active') {
            return res.status(400).json({ message: 'This listing is no longer active.' });
        }

        if (listing.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You do not have permission to reject offers on this listing.' });
        }
        // Use pull to remove the offer directly
        listing.offers.pull({ _id: req.params.offerId });
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
        // NEW: Prevent deleting a listing that's already completed.
        if (listing.status !== 'active') {
            return res.status(400).json({ message: 'This listing is no longer active.' });
        }
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
