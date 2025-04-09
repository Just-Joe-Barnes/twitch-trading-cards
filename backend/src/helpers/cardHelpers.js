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
const generateCardWithProbability = async () => {
    while (true) {
        try {
            const selectedRarity = pickRarity();

            // Use aggregation to randomly select a card with the desired rarity and available copies
            const now = new Date();
            const cards = await Card.aggregate([
                {
                    $match: {
                        'rarities.rarity': selectedRarity,
                        'rarities.remainingCopies': { $gt: 0 },
                        'rarities.availableMintNumbers.0': { $exists: true },
                        $or: [
                            { availableFrom: null },
                            { availableFrom: { $lte: now } }
                        ],
                        $or: [
                            { availableTo: null },
                            { availableTo: { $gte: now } }
                        ]
                        // Optionally add series filter here
                    }
                },
                { $sample: { size: 1 } }
            ]);

            if (!cards || cards.length === 0) {
                console.warn(`No cards found for rarity: ${selectedRarity}. Retrying...`);
                continue;
            }
            const selectedCard = cards[0];

            // Find the subdocument for the selected rarity
            const rarityObj = selectedCard.rarities.find(r => r.rarity === selectedRarity);
            if (!rarityObj || rarityObj.remainingCopies <= 0 || !rarityObj.availableMintNumbers || rarityObj.availableMintNumbers.length === 0) {
                console.warn(`No valid rarity data for rarity: ${selectedRarity} in card: ${selectedCard.name}. Retrying...`);
                continue;
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
                continue;
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
                console.warn(`Failed to update card: ${selectedCard.name}. Retrying...`);
                continue;
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
            // Continue loop after error
        }
    }
};

// --- New functions to ensure at least one Rare or above in a pack ---

// Define the set of rarities that are considered Rare or higher
const rareTier = new Set(["Rare", "Epic", "Legendary", "Mythic", "Unique", "Divine"]);

const isRareOrAbove = (rarity) => {
    return rareTier.has(rarity);
};

// Generates a card ensuring its rarity is Rare or above by trying until it succeeds.
const generateRareCardWithProbability = async () => {
    while (true) {
        const card = await generateCardWithProbability();
        if (card && isRareOrAbove(card.rarity)) {
            return card;
        }
        console.warn(`Generated card is not Rare or above. Retrying for a rare card...`);
    }
};

// Generates a pack of cards (default size: 5) and ensures that at least one card is Rare or higher.
const generatePack = async (packSize = 5) => {
    const pack = [];
    while (pack.length < packSize) {
        const card = await generateCardWithProbability();
        if (card) {
            pack.push(card);
        }
    }
    // If no card in the pack is Rare or above, replace the first card with a rare card.
    if (!pack.some(card => isRareOrAbove(card.rarity))) {
        const rareCard = await generateRareCardWithProbability();
        if (rareCard) {
            pack[0] = rareCard;
        }
    }
    return pack;
};

const generateCardFromPool = async (poolIds) => {
    while (true) {
        try {
            const selectedRarity = pickRarity();

            const now = new Date();
            const cards = await Card.aggregate([
                {
                    $match: {
                        _id: { $in: poolIds },
                        'rarities.rarity': selectedRarity,
                        'rarities.remainingCopies': { $gt: 0 },
                        'rarities.availableMintNumbers.0': { $exists: true },
                        $or: [
                            { availableFrom: null },
                            { availableFrom: { $lte: now } }
                        ],
                        $or: [
                            { availableTo: null },
                            { availableTo: { $gte: now } }
                        ]
                    }
                },
                { $sample: { size: 1 } }
            ]);

            if (!cards || cards.length === 0) {
                console.warn(`[generateCardFromPool] No cards found for rarity ${selectedRarity} in pool. Retrying...`);
                continue;
            }

            const selectedCard = cards[0];
            const rarityObj = selectedCard.rarities.find(r => r.rarity === selectedRarity);
            if (!rarityObj || rarityObj.remainingCopies <= 0 || !rarityObj.availableMintNumbers.length) {
                console.warn(`[generateCardFromPool] No valid rarity data for ${selectedRarity} in card ${selectedCard.name}. Retrying...`);
                continue;
            }

            const randomIndex = Math.floor(Math.random() * rarityObj.availableMintNumbers.length);
            const mintNumber = rarityObj.availableMintNumbers[randomIndex];

            const duplicate = await User.findOne({
                $or: [
                    { cards: { $elemMatch: { name: selectedCard.name, rarity: selectedRarity, mintNumber } } },
                    { openedCards: { $elemMatch: { name: selectedCard.name, rarity: selectedRarity, mintNumber } } }
                ]
            });
            if (duplicate) {
                console.warn(`[generateCardFromPool] Duplicate card detected. Retrying...`);
                continue;
            }

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
                console.warn(`[generateCardFromPool] Failed to update card ${selectedCard.name}. Retrying...`);
                continue;
            }

            return {
                name: selectedCard.name,
                rarity: selectedRarity,
                mintNumber,
                imageUrl: selectedCard.imageUrl,
                flavorText: selectedCard.flavorText || 'No flavor text available',
            };
        } catch (error) {
            console.error('[generateCardFromPool] Error:', error.message);
        }
    }
};

const generateRareCardFromPool = async (poolIds) => {
    while (true) {
        const card = await generateCardFromPool(poolIds);
        if (card && isRareOrAbove(card.rarity)) {
            return card;
        }
        console.warn(`[generateRareCardFromPool] Generated card is not Rare or above. Retrying...`);
    }
};

const generatePackFromPool = async (poolIds, packSize = 5) => {
    const pack = [];
    while (pack.length < packSize) {
        const card = await generateCardFromPool(poolIds);
        if (card) {
            pack.push(card);
        }
    }
    if (!pack.some(card => isRareOrAbove(card.rarity))) {
        const rareCard = await generateRareCardFromPool(poolIds);
        if (rareCard) {
            pack[0] = rareCard;
        }
    }
    return pack;
};

module.exports = {
    generateCardWithProbability,
    pickRarity,
    generatePack,
    generateCardFromPool,
    generatePackFromPool
};
