const mongoose = require('mongoose');
const MarketListing = require('../models/MarketListing');
const User = require('../models/userModel');
const { createNotification } = require('../helpers/notificationHelper');
const { logAudit } = require('../helpers/auditLogger');

const DEFAULT_LISTING_MAX_AGE_DAYS = 7;

let cleanupInProgress = false;

const getCutoffDate = (now, maxAgeDays) => {
    const ms = maxAgeDays * 24 * 60 * 60 * 1000;
    return new Date(now.getTime() - ms);
};

const notifyListingExpiry = async ({ listing, ownerId, offererIds, maxAgeDays }) => {
    const cardLabel = `${listing.card.name} #${listing.card.mintNumber}`;
    const listingLink = '/market';

    if (ownerId) {
        await createNotification(ownerId, {
            type: 'Listing Update',
            message: `Your market listing for ${cardLabel} expired after ${maxAgeDays} days and was cancelled. Your card is back in your collection.`,
            link: listingLink
        });
    }

    if (offererIds.length) {
        await Promise.all(
            offererIds.map((offererId) =>
                createNotification(offererId, {
                    type: 'Listing Update',
                    message: `An offer you made on ${cardLabel} expired because the listing timed out.`,
                    link: listingLink
                })
            )
        );
    }
};

const expireOldMarketListings = async ({ now = new Date(), maxAgeDays = DEFAULT_LISTING_MAX_AGE_DAYS } = {}) => {
    if (cleanupInProgress) {
        console.log('[Market Expiry] Cleanup already running; skipping.');
        return { skipped: true, expiredCount: 0 };
    }

    cleanupInProgress = true;
    try {
        const cutoffDate = getCutoffDate(now, maxAgeDays);
        const staleListings = await MarketListing.find({
            status: 'active',
            createdAt: { $lte: cutoffDate }
        }).select('_id');

        console.log(`[Market Expiry] Found ${staleListings.length} listings older than ${maxAgeDays} days.`);

        let expiredCount = 0;

        for (const listingRef of staleListings) {
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                const listing = await MarketListing.findById(listingRef._id).session(session);
                if (!listing || listing.status !== 'active') {
                    await session.abortTransaction();
                    session.endSession();
                    continue;
                }

                const owner = await User.findById(listing.owner).session(session);
                const ownerId = owner ? owner._id : null;

                if (owner) {
                    const cardInCollection = owner.cards.find(
                        (card) =>
                            card.name === listing.card.name &&
                            card.mintNumber === listing.card.mintNumber
                    );

                    if (cardInCollection) {
                        cardInCollection.status = 'available';
                        await owner.save({ session });
                    } else {
                        console.warn(`[Market Expiry] Owner ${owner._id} missing card ${listing.card.name} #${listing.card.mintNumber}.`);
                    }
                } else {
                    console.warn(`[Market Expiry] Owner ${listing.owner} not found for listing ${listing._id}.`);
                }

                listing.status = 'cancelled';
                listing.cancellationReason = 'Listing expired';
                await listing.save({ session });

                await session.commitTransaction();
                session.endSession();

                const offererIds = [
                    ...new Set(
                        listing.offers
                            .map((offer) => offer.offerer && offer.offerer.toString())
                            .filter(Boolean)
                    )
                ];

                await notifyListingExpiry({ listing, ownerId, offererIds, maxAgeDays });

                logAudit('Market Listing Expired', {
                    listingId: listing._id,
                    ownerId: listing.owner,
                    offererIds,
                    createdAt: listing.createdAt,
                    expiredAt: now
                });

                expiredCount += 1;
            } catch (error) {
                console.error(`[Market Expiry] Failed to expire listing ${listingRef._id}:`, error.message);
                await session.abortTransaction();
                session.endSession();
            }
        }

        return { skipped: false, expiredCount };
    } finally {
        cleanupInProgress = false;
    }
};

module.exports = {
    expireOldMarketListings,
    DEFAULT_LISTING_MAX_AGE_DAYS
};
