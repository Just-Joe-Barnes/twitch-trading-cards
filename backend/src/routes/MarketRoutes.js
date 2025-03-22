// src/routes/MarketRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const MarketListing = require('../models/MarketListing');
const User = require('../models/userModel');
const { protect } = require('../middleware/authMiddleware');
const { createNotification } = require('../helpers/notificationHelper');

// POST /api/market/listings - Create a new market listing.
router.post('/listings', protect, async (req, res) => {
    try {
        const { card } = req.body;
        if (!card || !card.name || !card.imageUrl || !card.rarity || !card.mintNumber) {
            return res.status(400).json({ message: 'Invalid card data' });
        }

        // Prevent listing the same card multiple times.
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

        // Prevent modifying if listing is not active.
        if (listing.status !== 'active') {
            return res.status(400).json({ message: 'This listing is no longer active.' });
        }

        console.log('[MAKE OFFER] Listing owner:', listing.owner.toString());
        console.log('[MAKE OFFER] Current user:', req.user._id.toString());

        // Prevent offering on your own listing
        if (listing.owner.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot offer on your own listing.' });
        }

        // Filter out any existing offers with incomplete card data BEFORE checking for an existing offer
        listing.offers = listing.offers.filter(offer =>
            offer.offeredCards.every(card =>
                card.name &&
                card.imageUrl &&
                card.rarity &&
                card.mintNumber !== undefined &&
                card.mintNumber !== null
            )
        );

        // Allow only one offer per user on a listing
        const existingOffer = listing.offers.find(
            offer => offer.offerer.toString() === req.user._id.toString()
        );
        if (existingOffer) {
            return res.status(400).json({ message: 'You already have an active offer on this listing.' });
        }

        // Add the new offer
        listing.offers.push({
            offerer: req.user._id,
            message,
            offeredCards: offeredCards || [],
            offeredPacks: offeredPacks || 0,
        });

        await listing.save();

        // Send notification to the listing owner: New Market Offer
        await createNotification(listing.owner, {
            type: 'New Market Offer',
            message: `You have received a new offer on your market listing.`,
            link: `/market/listings/${listing._id}`
        });

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

        // Ensure the listing is still active.
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

        if (buyer.packs < offer.offeredPacks) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Buyer does not have enough packs" });
        }

        // Adjust packs: buyer loses offeredPacks, seller gains them.
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

        // Send notifications for listing update on offer acceptance
        await createNotification(seller._id, {
            type: 'Listing Update',
            message: `Your listing has been sold to ${buyer.username}.`,
            link: `/market/listings/${listing._id}`
        });
        await createNotification(buyer._id, {
            type: 'Listing Update',
            message: `Your offer on the listing has been accepted.`,
            link: `/market/listings/${listing._id}`
        });

        res.status(200).json({ message: "Offer accepted, card transferred, and listing sold." });
    } catch (error) {
        console.error('Error accepting offer:', error);
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: 'Failed to accept offer', error: error.message });
    }
});

// DELETE /api/market/listings/:id/offers/self - Cancel (delete) your own offer
router.delete('/listings/:id/offers/self', protect, async (req, res) => {
    try {
        const listing = await MarketListing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        if (listing.status !== 'active') {
            return res.status(400).json({ message: 'This listing is no longer active.' });
        }

        console.log('[CANCEL OFFER] Current user ID:', req.user._id.toString());
        console.log('[CANCEL OFFER] Offerer IDs in listing:', listing.offers.map(o => o.offerer.toString()));

        listing.offers = listing.offers.filter(offer =>
            offer.offeredCards.every(card =>
                card.name &&
                card.imageUrl &&
                card.rarity &&
                card.mintNumber !== undefined &&
                card.mintNumber !== null
            )
        );

        const userOffer = listing.offers.find(
            offer => offer.offerer.toString() === req.user._id.toString()
        );
        if (!userOffer) {
            return res.status(404).json({ message: 'No offer found for the current user.' });
        }

        listing.offers.pull({ _id: userOffer._id });
        await listing.save();

        // Notify listing owner that an offer was cancelled.
        await createNotification(listing.owner, {
            type: 'Listing Update',
            message: `An offer on your listing has been cancelled.`,
            link: `/market/listings/${listing._id}`
        });

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

        if (listing.status !== 'active') {
            return res.status(400).json({ message: 'This listing is no longer active.' });
        }

        if (listing.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You do not have permission to reject offers on this listing.' });
        }

        // Fetch the offer details before removal for notification purposes
        const offer = listing.offers.id(req.params.offerId);
        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        const offererId = offer.offerer;

        listing.offers.pull({ _id: req.params.offerId });
        await listing.save();

        // Notify the offerer that their offer was rejected.
        await createNotification(offererId, {
            type: 'Listing Update',
            message: `Your offer on the listing has been rejected.`,
            link: `/market/listings/${listing._id}`
        });

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
