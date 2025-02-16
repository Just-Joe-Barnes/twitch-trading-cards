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

// Generate a card with probabilities
const generateCardWithProbability = async () => {
    try {
        // Determine rarity
        const selectedRarity = pickRarity();

        // Find all cards with the selected rarity
        const cards = await Card.find({ 'rarities.rarity': selectedRarity });

        if (!cards.length) {
            console.warn(`No cards found for rarity: ${selectedRarity}`);
            return null;
        }

        // Pick a random card of the selected rarity
        const card = cards[Math.floor(Math.random() * cards.length)];

        // Get the rarity object
        const rarity = card.rarities.find((r) => r.rarity === selectedRarity);

        if (!rarity || rarity.remainingCopies <= 0) {
            console.warn(
                `No remaining copies for rarity: ${selectedRarity} in card: ${card.name}`
            );
            return null;
        }

        // Select a random mint number from available pool
        const randomIndex = Math.floor(Math.random() * rarity.availableMintNumbers.length);
        const mintNumber = rarity.availableMintNumbers.splice(randomIndex, 1)[0];

        // Update remaining copies
        rarity.remainingCopies--;

        // Save updated card state
        await Card.findByIdAndUpdate(card._id, { rarities: card.rarities });

        // Log generated card for debugging
        console.log('[generateCardWithProbability] Generated card:', {
            name: card.name,
            rarity: selectedRarity,
            mintNumber,
            imageUrl: card.imageUrl,
            flavorText: card.flavorText,
        });

        // Return generated card details
        return {
            name: card.name,
            rarity: selectedRarity,
            mintNumber,
            imageUrl: card.imageUrl,
            flavorText: card.flavorText || 'No flavor text available', // Default if missing
        };
    } catch (error) {
        console.error('[generateCardWithProbability] Error:', error.message);
        return null;
    }
};


module.exports = { generateCardWithProbability };
