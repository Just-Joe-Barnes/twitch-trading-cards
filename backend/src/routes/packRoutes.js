const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Card = require('../models/cardModel');
const User = require('../models/userModel');

// Probability distribution for rarities
const rarityProbabilities = {
    Common: 0.6,
    Uncommon: 0.25,
    Rare: 0.1,
    Legendary: 0.049,
    Mythic: 0.001,
};

// Helper function to determine rarity based on probabilities
const determineRarity = () => {
    const rand = Math.random();
    let cumulativeProbability = 0;

    for (const [rarity, probability] of Object.entries(rarityProbabilities)) {
        cumulativeProbability += probability;
        if (rand <= cumulativeProbability) {
            return rarity;
        }
    }
    return 'Common'; // Fallback
};

// API to open a pack
router.post('/open', async (req, res) => {
    console.log('Route accessed: /packs/open'); // Entry log to confirm route is hit

    const { userId } = req.body;
    if (!userId) {
        console.error('Error: User ID is required to open a pack.');
        return res.status(400).json({ error: 'User ID is required to open a pack.' });
    }

    try {
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const user = await User.findById(userObjectId);
        if (!user) {
            console.error('Error: User not found.');
            return res.status(404).json({ error: 'User not found.' });
        }

        if (user.packs <= 0) {
            console.error('Error: No packs available to open.');
            return res.status(400).json({ error: 'No packs available to open.' });
        }

        const mintedCards = [];
        for (let i = 0; i < 6; i++) {
            const rarity = determineRarity();
            const cardPool = await Card.find({ rarity, remainingCopies: { $gt: 0 } });

            if (cardPool.length === 0) {
                console.warn(`Warning: No cards available for rarity ${rarity}.`);
                continue;
            }

            const randomCard = cardPool[Math.floor(Math.random() * cardPool.length)];
            console.log('Card selected:', randomCard.name);

            // Debugging `availableMintNumbers`
            console.log('Before minting:', randomCard.availableMintNumbers);

            if (!randomCard.availableMintNumbers || randomCard.availableMintNumbers.length === 0) {
                console.error(`Error: No available mint numbers for card: ${randomCard.name}`);
                return res.status(500).json({ error: `No available mint numbers for card: ${randomCard.name}` });
            }

            // Randomly select a mint number
            const randomIndex = Math.floor(Math.random() * randomCard.availableMintNumbers.length);
            const mintNumber = randomCard.availableMintNumbers.splice(randomIndex, 1)[0];

            // Debugging randomization
            console.log('Random index selected:', randomIndex);
            console.log('Mint number selected:', mintNumber);

            // Force Mongoose to detect changes to the array
            randomCard.markModified('availableMintNumbers');

            // Save updated card with new `availableMintNumbers` and decrement `remainingCopies`
            randomCard.remainingCopies -= 1;
            await randomCard.save();

            // Add minted card to the response array
            mintedCards.push({
                name: randomCard.name,
                imageUrl: randomCard.imageUrl,
                flavorText: randomCard.flavorText,
                rarity: randomCard.rarity,
                mintNumber,
                totalCopies: randomCard.totalCopies,
            });

            // Add the minted card to the user's collection
            user.cards.push({
                name: randomCard.name,
                rarity: randomCard.rarity,
                imageUrl: randomCard.imageUrl,
                flavorText: randomCard.flavorText,
                mintNumber,
                totalCopies: randomCard.totalCopies,
            });
        }

        // Deduct one pack from the user's count
        user.packs -= 1;
        await user.save();

        console.log('Pack opened successfully. Minted cards:', mintedCards);
        res.json({ cards: mintedCards });
    } catch (error) {
        console.error('Error in /packs/open route:', error);
        res.status(500).json({ error: 'Failed to open the pack.' });
    }
});

module.exports = router;
