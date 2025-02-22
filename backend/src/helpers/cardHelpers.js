const Card = require('../models/cardModel');

// Rarity probabilities
const rarityProbabilities = [
    { rarity: 'Divine', probability: 0.001 },
    { rarity: 'Unique', probability: 0.01 },
    { rarity: 'Mythic', probability: 0.05 },
    { rarity: 'Legendary', probability: 0.1 },
    { rarity: 'Epic', probability: 0.15 },
    { rarity: 'Rare', probability: 0.2 },
    { rarity: 'Uncommon', probability: 0.2 },
    { rarity: 'Standard', probability: 0.15 },
    { rarity: 'Common', probability: 0.09 },
    { rarity: 'Basic', probability: 0.029 },
];

// Helper to randomly pick a rarity based on probabilities
const pickRarity = () => {
    const random = Math.random();
    let cumulativeProbability = 0;
    for (const { rarity, probability } of rarityProbabilities) {
        cumulativeProbability += probability;
        if (random <= cumulativeProbability) {
            return rarity;
        }
    }
    return 'Basic'; // Fallback if probabilities don't sum to 1
};

// Generate a card with probabilities using optimized queries
const generateCardWithProbability = async () => {
    try {
        const selectedRarity = pickRarity();

        // Use aggregation to randomly select a card with the desired rarity and available copies
        const cards = await Card.aggregate([
            {
                $match: {
                    'rarities.rarity': selectedRarity,
                    'rarities.remainingCopies': { $gt: 0 },
                    'rarities.availableMintNumbers.0': { $exists: true } // ensure there is at least one available mint number
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

        // Atomically update the card:
        // Decrement remainingCopies and remove the chosen mint number from availableMintNumbers
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
