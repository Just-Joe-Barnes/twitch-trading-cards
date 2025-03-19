// fixOldOffers.js
require('dotenv').config({ path: '../../.env' }); // Adjust path if needed
const mongoose = require('mongoose');
const MarketListing = require('../models/MarketListing');
const User = require('../models/userModel');

(async () => {
    try {
        // 1) Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        // 2) Find listings with offers that might have incomplete card data
        const listings = await MarketListing.find({
            'offers.offeredCards': { $exists: true, $ne: [] },
        });

        console.log(`Found ${listings.length} listings to inspect.`);

        for (const listing of listings) {
            let updatedListing = false; // Track if we change any data

            for (const offer of listing.offers) {
                // Iterate through each offered card in this offer
                for (let i = 0; i < offer.offeredCards.length; i++) {
                    const offeredCard = offer.offeredCards[i];

                    // Check if it's missing required fields (name, imageUrl, rarity, mintNumber)
                    const hasAllFields =
                        offeredCard.name &&
                        offeredCard.imageUrl &&
                        offeredCard.rarity &&
                        (offeredCard.mintNumber !== undefined && offeredCard.mintNumber !== null);

                    if (!hasAllFields) {
                        console.log(
                            `Listing ${listing._id} / Offer ${offer._id} has incomplete card data:`,
                            offeredCard
                        );

                        // First, try to match in the offerer's own collection.
                        let foundCard = null;
                        const offererId = offer.offerer;
                        let user = await User.findById(offererId);

                        if (user) {
                            // Attempt matching by _id (converted to hex strings)
                            if (offeredCard._id) {
                                let offeredCardHex;
                                try {
                                    offeredCardHex = offeredCard._id.toHexString
                                        ? offeredCard._id.toHexString()
                                        : offeredCard._id.toString();
                                } catch (e) {
                                    console.log(`❌ Could not convert offeredCard._id to hex string:`, e.message);
                                }
                                if (offeredCardHex) {
                                    foundCard = user.cards.find((c) => {
                                        const userCardHex = c._id.toHexString
                                            ? c._id.toHexString()
                                            : c._id.toString();
                                        return userCardHex === offeredCardHex;
                                    });
                                }
                            }

                            // If not found and if offeredCard has name and mintNumber, try name + mintNumber matching.
                            if (!foundCard && offeredCard.name && offeredCard.mintNumber != null) {
                                foundCard = user.cards.find(
                                    (c) =>
                                        c.name === offeredCard.name &&
                                        c.mintNumber === offeredCard.mintNumber
                                );
                            }
                        } else {
                            console.log(`⚠️ Offerer ${offererId} not found in DB.`);
                        }

                        // If still not found in the offerer's collection, search ALL users.
                        if (!foundCard && offeredCard._id) {
                            console.log(`Searching all users for card ${offeredCard._id}`);
                            // Find any user whose cards array contains a card with a matching _id.
                            const otherUser = await User.findOne({ "cards._id": offeredCard._id });
                            if (otherUser) {
                                foundCard = otherUser.cards.find((c) => {
                                    const userCardHex = c._id.toHexString
                                        ? c._id.toHexString()
                                        : c._id.toString();
                                    const offeredCardHex = offeredCard._id.toHexString
                                        ? offeredCard._id.toHexString()
                                        : offeredCard._id.toString();
                                    return userCardHex === offeredCardHex;
                                });
                            }
                        }

                        if (!foundCard) {
                            console.log(
                                `⚠️ Could not find a matching card for listing ${listing._id} / offer ${offer._id}.`
                            );
                            continue;
                        }

                        // 5) Copy the missing fields from foundCard to the offeredCard
                        if (!offeredCard.name) {
                            offeredCard.name = foundCard.name;
                        }
                        if (!offeredCard.imageUrl) {
                            offeredCard.imageUrl = foundCard.imageUrl;
                        }
                        if (!offeredCard.rarity) {
                            offeredCard.rarity = foundCard.rarity;
                        }
                        if (offeredCard.mintNumber === undefined || offeredCard.mintNumber === null) {
                            offeredCard.mintNumber = foundCard.mintNumber;
                        }
                        if (!offeredCard.flavorText) {
                            offeredCard.flavorText = foundCard.flavorText;
                        }

                        updatedListing = true;
                        console.log(`✅ Updated card data for listing ${listing._id} / offer ${offer._id}.`);
                    }
                }
            }

            // 6) Save the listing if we updated anything
            if (updatedListing) {
                await listing.save();
                console.log(`✅ Saved updates for listing ${listing._id}`);
            }
        }

        console.log('🎉 Done fixing old offers!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration error:', err);
        process.exit(1);
    }
})();
