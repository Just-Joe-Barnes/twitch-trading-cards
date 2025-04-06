const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { sensitiveLimiter } = require('../middleware/rateLimiter');
const { sendNotificationToUser } = require('../../notificationService');
const marketService = require('../services/marketService');
const MarketListing = require('../models/MarketListing');

router.post('/listings', protect, sensitiveLimiter, async (req, res) => {
    try {
        const cardSchema = Joi.object({
            name: Joi.string().required(),
            imageUrl: Joi.string().uri().required(),
            rarity: Joi.string().required(),
            mintNumber: Joi.number().integer().min(0).required(),
            flavorText: Joi.string().allow('', null)
        });

        const { error } = cardSchema.validate(req.body.card);
        if (error) {
            return res.status(400).json({ message: 'Invalid card data: ' + error.details[0].message });
        }

        logAudit('Market Listing Create Attempt', { userId: req.user._id, body: req.body });

        const { card } = req.body;

        // Check if the card is already pending
        const user = await User.findById(req.user._id);
        const cardInCollection = user.cards.find(
            c => c.name === card.name && c.mintNumber === card.mintNumber
        );

        if (!cardInCollection) {
            return res.status(400).json({ message: 'Card not found in your collection.' });
        }

        if (cardInCollection.status === 'pending') {
            return res.status(400).json({ message: 'This card is currently pending in another trade or market listing.' });
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

        // Mark the card as pending in the user's collection
        await User.updateOne(
            { _id: req.user._id, "cards._id": cardInCollection._id },
            { $set: { "cards.$.status": 'pending' } }
        );

        const savedListing = await newListing.save();
        logAudit('Market Listing Created', { listingId: savedListing._id, userId: req.user._id });

        // Optionally notify the owner (self) about listing creation
        sendNotificationToUser(req.user._id, {
            type: 'Listing Created',
            message: 'Your card has been listed on the market.',
            link: `/market/listings/${savedListing._id}`
        });

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
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
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
router.post('/listings/:id/offers', protect, sensitiveLimiter, async (req, res) => {
    try {
        const offerSchema = Joi.object({
            message: Joi.string().allow('', null),
            offeredCards: Joi.array().items(
                Joi.object({
                    name: Joi.string().required(),
                    imageUrl: Joi.string().uri().required(),
                    rarity: Joi.string().required(),
                    mintNumber: Joi.number().integer().min(0).required(),
                    flavorText: Joi.string().allow('', null)
                })
            ).required(),
            offeredPacks: Joi.number().min(0).required()
        });

        const { error } = offerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: 'Invalid offer data: ' + error.details[0].message });
        }

        logAudit('Market Offer Create Attempt', { userId: req.user._id, listingId: req.params.id, body: req.body });

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
        sendNotificationToUser(listing.owner, {
            type: 'New Market Offer',
            message: `You have received a new offer on your market listing.`,
            link: `/market/listings/${listing._id}`
        });

        logAudit('Market Offer Created', { listingId: listing._id, offererId: req.user._id });

        res.status(200).json({ message: 'Offer submitted successfully' });
    } catch (error) {
        console.error('Error making offer:', error);
        res.status(500).json({ message: 'Server error making offer' });
    }
});

// PUT /api/market/listings/:id/offers/:offerId/accept - Accept an offer (listing owner only)
router.put('/listings/:id/offers/:offerId/accept', protect, sensitiveLimiter, async (req, res) => {
  logAudit('Market Offer Accept Attempt', { userId: req.user._id, listingId: req.params.id, offerId: req.params.offerId });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await marketService.acceptOffer(req.params.id, req.params.offerId, req.user._id.toString(), session);

    if (!result.success) {
      await session.abortTransaction();
      session.endSession();
      return res.status(result.status || 500).json({ message: result.message });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Offer accepted, card transferred, and listing sold.' });
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

        const user = await User.findById(req.user._id);
        const cardInCollection = user.cards.find(
            c => c.name === listing.card.name && c.mintNumber === listing.card.mintNumber
        );

        if (cardInCollection) {
            // Mark the card as available in the user's collection
            await User.updateOne(
                { _id: req.user._id, "cards._id": cardInCollection._id },
                { $set: { "cards.$.status": 'available' } }
            );
        }

        await listing.deleteOne();
        res.status(200).json({ message: 'Listing cancelled and deleted successfully.' });
    } catch (error) {
        console.error('Error deleting listing:', error);
        res.status(500).json({ message: 'Server error deleting listing' });
    }
});

module.exports = router;
