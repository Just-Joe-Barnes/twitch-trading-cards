const mongoose = require('mongoose');
const MarketListing = require('../models/MarketListing');
const User = require('../models/userModel');
const { createNotification } = require('../helpers/notificationHelper');
const { sendNotificationToUser } = require('../../notificationService');
const { logAudit } = require('../helpers/auditLogger');

function removeFromFeaturedCards(user, cardId) {
  if (!user.featuredCards) return;
  user.featuredCards = user.featuredCards.filter(
    (c) => c._id.toString() !== cardId.toString()
  );
}
async function acceptOffer(listingId, offerId, userId, session) {
  console.log(`[Accept Offer Service] Starting: listingId=${listingId}, offerId=${offerId}, userId=${userId}`);
  const listing = await MarketListing.findById(listingId).session(session);
  if (!listing) {
      console.log('[Accept Offer Service] Error: Listing not found');
      return { success: false, status: 404, message: 'Listing not found' };
  }
  console.log('[Accept Offer Service] Found listing');

  if (listing.status !== 'active') {
      console.log('[Accept Offer Service] Error: Listing is not active');
      return { success: false, status: 400, message: 'Listing is not active' };
  }
  if (listing.owner.toString() !== userId) {
      console.log('[Accept Offer Service] Error: Unauthorized');
      return { success: false, status: 403, message: 'Unauthorized' };
  }
  console.log('[Accept Offer Service] Authorization check passed');

  const offer = listing.offers.id(offerId);
  if (!offer) {
      console.log('[Accept Offer Service] Error: Offer not found');
      return { success: false, status: 404, message: 'Offer not found' };
  }
  console.log('[Accept Offer Service] Found offer');

  const seller = await User.findById(listing.owner).session(session);
  const buyer = await User.findById(offer.offerer).session(session);
  if (!seller || !buyer) {
      console.log('[Accept Offer Service] Error: Seller or Buyer not found');
      return { success: false, status: 404, message: 'Seller or Buyer not found' };
  }
  console.log('[Accept Offer Service] Found seller and buyer');

  if (buyer.packs < offer.offeredPacks) {
      console.log('[Accept Offer Service] Error: Buyer does not have enough packs');
      return { success: false, status: 400, message: 'Buyer does not have enough packs' };
  }
  console.log('[Accept Offer Service] Buyer pack check passed');

  console.log('[Accept Offer Service] Updating packs locally.');
  buyer.packs -= offer.offeredPacks;
  seller.packs += offer.offeredPacks;
  console.log('[Accept Offer Service] Packs updated locally.');

  console.log('[Accept Offer Service] Finding listed card index in seller collection.');
  const cardIndexInSeller = seller.cards.findIndex(
    c => c.name === listing.card.name && c.mintNumber === listing.card.mintNumber
  );

  if (cardIndexInSeller === -1) {
    console.log("[Accept Offer Service] Error: Listed card not found in seller's collection");
    return { success: false, status: 400, message: "Listed card not found in seller's collection" };
  }
  console.log('[Accept Offer Service] Found listed card index in seller:', cardIndexInSeller);

  // Escrow step for listed card
  console.log('[Accept Offer Service] Setting listed card status to escrow for seller.');
  seller.cards[cardIndexInSeller].status = 'escrow';
  await seller.save({ session });
  console.log('[Accept Offer Service] Seller saved after listed card escrow.');

  // Transfer listed card
  console.log('[Accept Offer Service] Transferring listed card from seller to buyer.');
  const [cardToTransfer] = seller.cards.splice(cardIndexInSeller, 1);
  removeFromFeaturedCards(seller, cardToTransfer._id);
  cardToTransfer.status = 'available'; // Ensure status is set correctly before pushing
  buyer.cards.push(cardToTransfer);
  console.log('[Accept Offer Service] Listed card added to buyer locally.');

  // Save users after listed card transfer (before handling offered cards)
  console.log('[Accept Offer Service] Saving seller after listed card splice.');
  await seller.save({ session });
  console.log('[Accept Offer Service] Seller saved.');
  console.log('[Accept Offer Service] Saving buyer after listed card push.');
  await buyer.save({ session });
  console.log('[Accept Offer Service] Buyer saved.');


  // --- Start: Implement transfer for offered cards ---
  console.log('[Accept Offer Service] Starting offered card transfer logic.');
  const offeredCardDetails = buyer.cards.filter(card =>
    offer.offeredCards.some(offeredCard =>
        // Ensure we match based on unique identifiers, assuming name + mint is unique
        offeredCard.name === card.name && offeredCard.mintNumber === card.mintNumber
    )
  );

  // Check if buyer has all offered cards specified in the offer
  if (offeredCardDetails.length !== offer.offeredCards.length) {
      console.log('[Accept Offer Service] Error: Buyer does not possess all offered cards.');
      return {
        success: false,
        status: 400,
        message: 'Buyer does not possess all offered cards.'
      };
  }
  console.log('[Accept Offer Service] Buyer possesses all offered cards.');

  // Escrow step for offered cards
  console.log('[Accept Offer Service] Setting offered cards status to escrow for buyer.');
  const offeredCardIdsToEscrow = offeredCardDetails.map(c => c._id);
  buyer.cards.forEach(card => {
      if (offeredCardIdsToEscrow.some(id => id.equals(card._id))) {
          card.status = 'escrow';
      }
  });
  await buyer.save({ session });
  console.log('[Accept Offer Service] Buyer saved after offered cards escrow.');

  // Transfer offered cards from buyer to seller
  console.log('[Accept Offer Service] Transferring offered cards from buyer to seller.');
  const cardsToGiveSeller = [];
  // Iterate backwards to safely remove elements while iterating
  for (let i = buyer.cards.length - 1; i >= 0; i--) {
      if (offeredCardIdsToEscrow.some(id => id.equals(buyer.cards[i]._id))) {
          const [removedCard] = buyer.cards.splice(i, 1);
          removeFromFeaturedCards(buyer, removedCard._id);
          removedCard.status = 'available'; // Set status back to available for the seller
          cardsToGiveSeller.push(removedCard);
      }
  }
  seller.cards.push(...cardsToGiveSeller);
  console.log('[Accept Offer Service] Offered cards added to seller locally.');

  // Save users after offered card transfer
  console.log('[Accept Offer Service] Saving seller after receiving offered cards.');
  await seller.save({ session });
  console.log('[Accept Offer Service] Seller saved.');
  console.log('[Accept Offer Service] Saving buyer after giving offered cards.');
  await buyer.save({ session });
  console.log('[Accept Offer Service] Buyer saved.');
  // --- End: Implement transfer for offered cards ---


  console.log('[Accept Offer Service] Deleting the sold listing.');
  listing.status = 'sold'; // Mark as sold before delete, though maybe redundant
  listing.offers = []; // Clear offers before delete
  await listing.deleteOne({ session });
  console.log('[Accept Offer Service] Listing deleted.');

  console.log('[Accept Offer Service] Cancelling conflicting listings for the sold card.');
  await MarketListing.updateMany(
    {
      _id: { $ne: listingId }, // Use listingId from params
      status: 'active',
      'card.name': listing.card.name,
      'card.mintNumber': listing.card.mintNumber
    },
    { $set: { status: 'cancelled', cancellationReason: 'Card sold in another listing' } },
    { session }
  );
  console.log('[Accept Offer Service] Conflicting listings cancelled.');

  // Update status for the main transferred card (seller perspective - likely redundant after splice)
  console.log('[Accept Offer Service] Updating listed card status for seller (redundant?).');
  await User.updateOne(
    { _id: seller._id, 'cards._id': cardToTransfer._id },
    { $set: { 'cards.$[e].status': 'available' } },
    { arrayFilters: [{ 'e._id': cardToTransfer._id }] }
  ).session(session);
  console.log('[Accept Offer Service] Seller listed card status updated.');

  // Update status for the main transferred card (buyer perspective)
  console.log('[Accept Offer Service] Updating listed card status for buyer.');
  await User.updateOne(
    { _id: buyer._id, 'cards._id': cardToTransfer._id },
    { $set: { 'cards.$[e].status': 'available' } },
    { arrayFilters: [{ 'e._id': cardToTransfer._id }] }
  ).session(session);
  console.log('[Accept Offer Service] Buyer listed card status updated.');

   // Update status for the offered cards (buyer perspective - likely redundant after splice)
  console.log('[Accept Offer Service] Updating offered cards status for buyer (redundant?).');
  const offeredCardIds = cardsToGiveSeller.map(c => c._id); // Get IDs of cards transferred to seller
  await User.updateOne(
      { _id: buyer._id, 'cards._id': { $in: offeredCardIds } },
      { $set: { 'cards.$[e].status': 'available' } },
      { arrayFilters: [{ 'e._id': { $in: offeredCardIds } }] }
  ).session(session);
   console.log('[Accept Offer Service] Buyer offered cards status updated.');

  // Update status for the offered cards (seller perspective)
  console.log('[Accept Offer Service] Updating offered cards status for seller.');
   await User.updateOne(
      { _id: seller._id, 'cards._id': { $in: offeredCardIds } }, // Use same IDs
      { $set: { 'cards.$[e].status': 'available' } },
      { arrayFilters: [{ 'e._id': { $in: offeredCardIds } }] }
  ).session(session);
  console.log('[Accept Offer Service] Seller offered cards status updated.');


  console.log('[Accept Offer Service] DB updates complete.');
  logAudit('Market Offer DB Updates', { listingId, offerId, sellerId: seller._id, buyerId: buyer._id });
  return { success: true, seller, buyer, listing, offer };
}

async function finalizeOfferAcceptance({ seller, buyer, listing, offer }) {
  console.log('[Accept Offer Service] Creating notifications.');
  await createNotification(seller._id, {
    type: 'Listing Update',
    message: `Your listing for ${listing.card.name} #${listing.card.mintNumber} has been sold to ${buyer.username}.`,
    link: `/profile/${buyer.username}`
  });
  sendNotificationToUser(seller._id, {
    type: 'Listing Update',
    message: `Your listing for ${listing.card.name} #${listing.card.mintNumber} has been sold to ${buyer.username}.`,
    link: `/profile/${buyer.username}`
  });

  await createNotification(buyer._id, {
    type: 'Listing Update',
    message: `Your offer on ${listing.card.name} #${listing.card.mintNumber} has been accepted.`,
    link: `/collection/${buyer.username}`
  });
  sendNotificationToUser(buyer._id, {
    type: 'Listing Update',
    message: `Your offer on ${listing.card.name} #${listing.card.mintNumber} has been accepted.`,
    link: `/collection/${buyer.username}`
  });
  console.log('[Accept Offer Service] Notifications created.');

  console.log('[Accept Offer Service] Awarding XP.');
  seller.xp = (seller.xp || 0) + 15;
  buyer.xp = (buyer.xp || 0) + 15;
  seller.level = Math.floor(seller.xp / 100) + 1;
  buyer.level = Math.floor(buyer.xp / 100) + 1;
  await seller.save();
  await buyer.save();
  console.log('[Accept Offer Service] XP awarded and users saved.');

  console.log('[Accept Offer Service] Checking achievements.');
  const { checkAndGrantAchievements } = require('../helpers/achievementHelper');
  await checkAndGrantAchievements(seller);
  await checkAndGrantAchievements(buyer);
  console.log('[Accept Offer Service] Achievements checked.');

  logAudit('Market Offer Accepted', { listingId: listing._id, offerId: offer._id, sellerId: seller._id, buyerId: buyer._id });
  console.log('[Accept Offer Service] Completed successfully.');
}

module.exports = {
  acceptOffer,
  finalizeOfferAcceptance
};
