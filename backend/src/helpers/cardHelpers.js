const Card = require('../models/cardModel');
const User = require('../models/userModel'); // Using the User model since cards are embedded

// Updated rarity probabilities: Basic is most common, Divine is most rare.
const rarityProbabilities = [
    { rarity: 'Basic', probability: 0.40 },
    { rarity: 'Common', probability: 0.20 },
    { rarity: 'Standard', probability: 0.15 },
    { rarity: 'Uncommon', probability: 0.10 },
    { rarity: 'Rare', probability: 0.07 },
    { rarity: 'Epic', probability: 0.04 },
    { rarity: 'Legendary', probability: 0.02 },
    { rarity: 'Mythic', probability: 0.014 },
    { rarity: 'Unique', probability: 0.005 },
    { rarity: 'Divine', probability: 0.001 },
];

const MAX_ATTEMPTS = 5; // Maximum number of re-roll attempts

// Helper to randomly pick a rarity based on updated probabilities
const pickRarity = () => {
    const random = Math.random();
    let cumulativeProbability = 0;
    for (const { rarity, probability } of rarityProbabilities) {
        cumulativeProbability += probability;
        if (random <= cumulativeProbability) {
            return rarity;
        }
    }
    return 'Basic'; // Fallback if probabilities don't sum exactly to 1
};

// Generate a card with probabilities and ensure uniqueness across all user collections
const generateCardWithProbability = async (attempts = 0) => {
    if (attempts >= MAX_ATTEMPTS) {
        console.warn('Maximum attempts reached. Unable to generate a unique card.');
        return null;
    }
    try {
        const selectedRarity = pickRarity();

        // Use aggregation to randomly select a card with the desired rarity and available copies
        const cards = await Card.aggregate([
            {
                $match: {
                    'rarities.rarity': selectedRarity,
                    'rarities.remainingCopies': { $gt: 0 },
                    'rarities.availableMintNumbers.0': { $exists: true } // ensure at least one available mint number
                }
            },
            { $sample: { size: 1 } }
        ]);

        if (!cards || cards.length === 0) {
            console.warn(`No cards found for rarity: ${selectedRarity}`);
            return null;
        }
        const selectedCard = cards[0];

        // Find the subdocument for the selected rarity
        const rarityObj = selectedCard.rarities.find(r => r.rarity === selectedRarity);
        if (!rarityObj || rarityObj.remainingCopies <= 0 || !rarityObj.availableMintNumbers || rarityObj.availableMintNumbers.length === 0) {
            console.warn(`No valid rarity data for rarity: ${selectedRarity} in card: ${selectedCard.name}`);
            return null;
        }

        // Select a random mint number from availableMintNumbers
        const randomIndex = Math.floor(Math.random() * rarityObj.availableMintNumbers.length);
        const mintNumber = rarityObj.availableMintNumbers[randomIndex];

        // Check that no card with the same name, rarity, and mint number exists in any user's collection
        const duplicate = await User.findOne({
            $or: [
                { cards: { $elemMatch: { name: selectedCard.name, rarity: selectedRarity, mintNumber } } },
                { openedCards: { $elemMatch: { name: selectedCard.name, rarity: selectedRarity, mintNumber } } }
            ]
        });
        if (duplicate) {
            console.warn(`Duplicate card detected for ${selectedCard.name}, rarity: ${selectedRarity}, mint number: ${mintNumber}. Retrying...`);
            return await generateCardWithProbability(attempts + 1);
        }

        // Atomically update the card: decrement remainingCopies and remove the chosen mint number
        const updatedCard = await Card.findOneAndUpdate(
            {
                _id: selectedCard._id,
                'rarities.rarity': selectedRarity,
                'rarities.remainingCopies': { $gt: 0 }
            },
            {
                $inc: { 'rarities.$.remainingCopies': -1 },
                $pull: { 'rarities.$.availableMintNumbers': mintNumber }
            },
            { new: true }
        );

        if (!updatedCard) {
            console.warn(`Failed to update card: ${selectedCard.name}`);
            return null;
        }

        console.log('[generateCardWithProbability] Generated card:', {
            name: selectedCard.name,
            rarity: selectedRarity,
            mintNumber,
            imageUrl: selectedCard.imageUrl,
            flavorText: selectedCard.flavorText,
        });

        return {
            name: selectedCard.name,
            rarity: selectedRarity,
            mintNumber,
            imageUrl: selectedCard.imageUrl,
            flavorText: selectedCard.flavorText || 'No flavor text available',
        };
    } catch (error) {
        console.error('[generateCardWithProbability] Error:', error.message);
        return null;
    }
};

module.exports = { generateCardWithProbability, pickRarity };
