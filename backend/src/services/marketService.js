const mongoose = require('mongoose');
const MarketListing = require('../models/MarketListing');
const User = require('../models/userModel');
const { createNotification } = require('../helpers/notificationHelper');
const { sendNotificationToUser } = require('../../notificationService');
const { logAudit } = require('../helpers/auditLogger');

async function acceptOffer(listingId, offerId, userId, session) {
  const listing = await MarketListing.findById(listingId).session(session);
  if (!listing) return { success: false, status: 404, message: 'Listing not found' };

  if (listing.status !== 'active') return { success: false, status: 400, message: 'Listing is not active' };

  if (listing.owner.toString() !== userId) return { success: false, status: 403, message: 'Unauthorized' };

  const offer = listing.offers.id(offerId);
  if (!offer) return { success: false, status: 404, message: 'Offer not found' };

  const seller = await User.findById(listing.owner).session(session);
  const buyer = await User.findById(offer.offerer).session(session);
  if (!seller || !buyer) return { success: false, status: 404, message: 'Seller or Buyer not found' };

  if (buyer.packs < offer.offeredPacks) return { success: false, status: 400, message: 'Buyer does not have enough packs' };

  buyer.packs -= offer.offeredPacks;
  seller.packs += offer.offeredPacks;

  const cardIndexInSeller = seller.cards.findIndex(
    c => c.name === listing.card.name && c.mintNumber === listing.card.mintNumber
  );

  if (cardIndexInSeller === -1) {
    return { success: false, status: 400, message: "Listed card not found in seller's collection" };
  }

  // Escrow step
  seller.cards[cardIndexInSeller].status = 'escrow';
  await seller.save({ session });

  const [cardToTransfer] = seller.cards.splice(cardIndexInSeller, 1);
  cardToTransfer.status = 'available';
  buyer.cards.push(cardToTransfer);

  await seller.save({ session });
  await buyer.save({ session });

  listing.status = 'sold';
  listing.offers = [];
  await listing.deleteOne({ session });

  await MarketListing.updateMany(
    {
      _id: { $ne: listing._id },
      status: 'active',
      'card.name': listing.card.name,
      'card.mintNumber': listing.card.mintNumber
    },
    { $set: { status: 'cancelled', cancellationReason: 'Card sold in another listing' } },
    { session }
  );

  await User.updateOne(
    { _id: seller._id, 'cards._id': cardToTransfer._id },
    { $set: { 'cards.$[e].status': 'available' } },
    { arrayFilters: [{ 'e._id': cardToTransfer._id }] }
  ).session(session);

  await User.updateOne(
    { _id: buyer._id, 'cards._id': cardToTransfer._id },
    { $set: { 'cards.$[e].status': 'available' } },
    { arrayFilters: [{ 'e._id': cardToTransfer._id }] }
  ).session(session);

  await createNotification(seller._id, {
    type: 'Listing Update',
    message: `Your listing has been sold to ${buyer.username}.`,
    link: `/market/listings/${listing._id}`
  });
  sendNotificationToUser(seller._id, {
    type: 'Listing Update',
    message: `Your listing has been sold to ${buyer.username}.`,
    link: `/market/listings/${listing._id}`
  });

  await createNotification(buyer._id, {
    type: 'Listing Update',
    message: `Your offer on the listing has been accepted.`,
    link: `/market/listings/${listing._id}`
  });
  sendNotificationToUser(buyer._id, {
    type: 'Listing Update',
    message: `Your offer on the listing has been accepted.`,
    link: `/market/listings/${listing._id}`
  });

  // Award XP
  seller.xp = (seller.xp || 0) + 15;
  buyer.xp = (buyer.xp || 0) + 15;
  seller.level = Math.floor(seller.xp / 100) + 1;
  buyer.level = Math.floor(buyer.xp / 100) + 1;
  await seller.save({ session });
  await buyer.save({ session });

  const { checkAndGrantAchievements } = require('../helpers/achievementHelper');
  await checkAndGrantAchievements(seller);
  await checkAndGrantAchievements(buyer);

  logAudit('Market Offer Accepted', { listingId, offerId, sellerId: seller._id, buyerId: buyer._id });

  return { success: true };
}

module.exports = {
  acceptOffer
};
