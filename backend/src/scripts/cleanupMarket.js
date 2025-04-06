const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/userModel');
const MarketListing = require('../models/MarketListing');
const { createNotification } = require('../helpers/notificationHelper');
const { logAudit } = require('../helpers/auditLogger');

async function cleanupMarket() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    const activeListings = await MarketListing.find({ status: 'active' });

    console.log(`Found ${activeListings.length} active listings.`);

    if (activeListings.length > 0) {
      console.log('Active listings IDs:');
      activeListings.forEach(l => {
        console.log(`- ID: ${l._id}, Owner: ${l.owner}, Card: ${l.card.name} #${l.card.mintNumber}`);
      });
    }

    for (const listing of activeListings) {
      console.log(`Processing listing ${listing._id} by owner ${listing.owner}`);

      try {
        const session = await mongoose.startSession();
        session.startTransaction();

        const owner = await User.findById(listing.owner).session(session);
        if (!owner) {
          console.warn(`Owner ${listing.owner} not found.`);
          await session.abortTransaction();
          session.endSession();
          continue;
        }

        const alreadyHasCard = owner.cards.some(
          (c) =>
            c.name === listing.card.name &&
            c.mintNumber === listing.card.mintNumber
        );

        if (!alreadyHasCard) {
          owner.cards.push({
            name: listing.card.name,
            rarity: listing.card.rarity,
            mintNumber: listing.card.mintNumber,
            imageUrl: listing.card.imageUrl,
            flavorText: listing.card.flavorText,
            acquiredAt: new Date(),
            status: 'available',
          });
          console.log(`Returned card ${listing.card.name} #${listing.card.mintNumber} to owner ${owner.username}`);
        }

        await createNotification(owner._id, {
          type: 'Market Cleanup',
          message: 'Your market listing has been cancelled and your card returned due to system maintenance.',
          link: '/market',
        });

        for (const offer of listing.offers) {
          const offerer = await User.findById(offer.offerer).session(session);
          if (!offerer) {
            console.warn(`Offerer ${offer.offerer} not found.`);
            continue;
          }

          for (const card of offer.offeredCards) {
            offerer.cards.push({
              name: card.name,
              rarity: card.rarity,
              mintNumber: card.mintNumber,
              imageUrl: card.imageUrl,
              flavorText: card.flavorText,
              acquiredAt: new Date(),
              status: 'available',
            });
          }

          if (offer.offeredPacks && offer.offeredPacks > 0) {
            offerer.packs += offer.offeredPacks;
          }

          await createNotification(offerer._id, {
            type: 'Market Cleanup',
            message: 'Your offer has been cancelled and your cards/packs returned due to system maintenance.',
            link: '/market',
          });

          console.log(`Returned ${offer.offeredCards.length} cards and ${offer.offeredPacks} packs to offerer ${offerer.username}`);
          await offerer.save({ session });
        }

        listing.status = 'cancelled';
        listing.cancellationReason = 'Market reset cleanup';
        listing.offers = [];
        await listing.save({ session });

        await owner.save({ session });

        logAudit('Market Listing Cancelled', {
          listingId: listing._id,
          ownerId: owner._id,
          reason: 'Market reset cleanup',
        });

        await session.commitTransaction();
        session.endSession();
      } catch (error) {
        console.error(`Error processing listing ${listing._id}:`, error.message);
      }
    }

    console.log('Market cleanup completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during market cleanup:', error);
    process.exit(1);
  }
}

cleanupMarket();
