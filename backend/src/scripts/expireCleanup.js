const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Trade = require('../models/tradeModel');
const User = require('../models/userModel');
const MarketListing = require('../models/MarketListing');
const { expireOldMarketListings } = require('../services/marketCleanupService');

async function cleanupExpired() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const now = new Date();

  console.log('Starting cleanup of expired trades and offers at', now.toISOString());

  // Expire trades
  const expiredTrades = await Trade.find({ expiresAt: { $lte: now }, status: 'pending' });
  for (const trade of expiredTrades) {
    console.log('Cancelling expired trade', trade._id);

    trade.status = 'cancelled';
    trade.cancellationReason = 'Trade expired';
    await trade.save();

    // Free up cards
    await User.updateOne(
      { _id: trade.sender, 'cards._id': { $in: trade.offeredItems } },
      { $set: { 'cards.$[elem].status': 'available' } },
      { arrayFilters: [{ 'elem._id': { $in: trade.offeredItems } }] }
    );
    await User.updateOne(
      { _id: trade.recipient, 'cards._id': { $in: trade.requestedItems } },
      { $set: { 'cards.$[elem].status': 'available' } },
      { arrayFilters: [{ 'elem._id': { $in: trade.requestedItems } }] }
    );
  }

  // Expire offers inside listings
  const listings = await MarketListing.find({ status: 'active' });
  for (const listing of listings) {
    let changed = false;
    listing.offers = listing.offers.filter(offer => {
      if (offer.expiresAt && offer.expiresAt <= now) {
        console.log('Removing expired offer', offer._id, 'from listing', listing._id);
        changed = true;
        return false; // remove expired
      }
      return true; // keep
    });
    if (changed) {
      await listing.save();
    }
  }

  await expireOldMarketListings({ now });

  console.log('Expired cleanup complete.');
  await mongoose.disconnect();
}

cleanupExpired().catch(err => {
  console.error('Error during expired cleanup:', err);
  process.exit(1);
});
