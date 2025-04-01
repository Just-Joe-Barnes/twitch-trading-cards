// backend/scripts/updateCardCopies.js
const mongoose = require('mongoose');
const Card = require('../models/cardModel');
const User = require('../models/userModel');

const updateCardCopies = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB for card update.');

        // Retrieve all cards
        const cards = await Card.find({});
        for (const card of cards) {
            console.log(`Processing card: ${card.name}`);
            // For each rarity in the card, recalc copies
            for (let rarityObj of card.rarities) {
                const { rarity, totalCopies } = rarityObj;

                // Aggregate all mint numbers that have been used in users' collections (cards and openedCards)
                const usedMintsAgg = await User.aggregate([
                    {
                        $project: {
                            allCards: { $concatArrays: ["$cards", "$openedCards"] },
                        },
                    },
                    { $unwind: "$allCards" },
                    {
                        $match: {
                            "allCards.name": card.name,
                            "allCards.rarity": rarity,
                        },
                    },
                    {
                        $group: {
                            _id: "$allCards.mintNumber",
                        },
                    },
                ]);

                const usedMintNumbers = usedMintsAgg.map((doc) => doc._id);
                const takenCount = usedMintNumbers.length;

                // Update remainingCopies based on taken copies
                rarityObj.remainingCopies = totalCopies - takenCount;
                // Generate all possible mint numbers from 1 to totalCopies
                const allMintNumbers = Array.from({ length: totalCopies }, (_, i) => i + 1);
                // Compute available mint numbers as those not used
                rarityObj.availableMintNumbers = allMintNumbers.filter((num) => !usedMintNumbers.includes(num));
                console.log(`  [${rarity}] Total: ${totalCopies}, Taken: ${takenCount}, Remaining: ${rarityObj.remainingCopies}`);
            }
            await card.save();
            console.log(`Card "${card.name}" updated.`);
        }
        console.log('All cards updated successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error updating card copies:', error);
        process.exit(1);
    }
};

module.exports = updateCardCopies;
