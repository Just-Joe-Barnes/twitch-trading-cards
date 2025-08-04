const Card = require('../models/cardModel');
const Modifier = require("../models/modifierModel");
const getCardAvailability = require("../controllers/cardController");

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

const highRollRarityProbabilities = [
    { rarity: 'Rare', probability: 0.615 },
    { rarity: 'Epic', probability: 0.30 },
    { rarity: 'Legendary', probability: 0.07 },
    { rarity: 'Mythic', probability: 0.004 },
    { rarity: 'Unique', probability: 0.0009 },
    { rarity: 'Divine', probability: 0.0001 },
];

const MODIFIER_CHANCE = parseFloat(process.env.MODIFIER_CHANCE || '0.05');

const pickRarity = (highRoll = false) => {
    let activeRarityProbabilities;

    if (highRoll) {
        activeRarityProbabilities = highRollRarityProbabilities;
    } else {
        activeRarityProbabilities = rarityProbabilities;
    }

    const random = Math.random();
    let cumulativeProbability = 0;

    for (const { rarity, probability } of activeRarityProbabilities) {
        cumulativeProbability += probability;
        if (random <= cumulativeProbability) {
            return rarity;
        }
    }

    return activeRarityProbabilities[activeRarityProbabilities.length - 1]?.rarity || 'Basic';
};

// Generate a card with probabilities and ensure uniqueness across all user collections
const generateCardWithProbability = async () => {
    const currentTime = new Date();
    const anyAvailable = await Card.exists({
        'rarities.remainingCopies': { $gt: 0 },
        'rarities.availableMintNumbers.0': { $exists: true },
        $or: [
            { availableFrom: null },
            { availableFrom: { $lte: currentTime } }
        ],
        $or: [
            { availableTo: null },
            { availableTo: { $gte: currentTime } }
        ]
    });

    if (!anyAvailable) {
        console.error('[generateCardWithProbability] No cards available');
        return null;
    }

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

            // Atomically update the card: decrement remainingCopies and remove the chosen mint number
            const updatedCard = await Card.findOneAndUpdate(
                {
                    _id: selectedCard._id,
                    'rarities.rarity': selectedRarity,
                    'rarities.remainingCopies': { $gt: 0 },
                    'rarities.availableMintNumbers': mintNumber
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


            const updatedCard = await Card.findOneAndUpdate(
                {
                    _id: selectedCard._id,
                    'rarities.rarity': selectedRarity,
                    'rarities.remainingCopies': { $gt: 0 },
                    'rarities.availableMintNumbers': mintNumber
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

// --- Preview (debug) generation functions that do not modify card data ---
const generateCardPreview = async () => {
    while (true) {
        try {
            const selectedRarity = pickRarity();
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
                    }
                },
                { $sample: { size: 1 } }
            ]);

            if (!cards || cards.length === 0) {
                continue;
            }

            const selectedCard = cards[0];
            const rarityObj = selectedCard.rarities.find(r => r.rarity === selectedRarity);
            if (!rarityObj || !rarityObj.availableMintNumbers.length) {
                continue;
            }

            const idx = Math.floor(Math.random() * rarityObj.availableMintNumbers.length);
            const mintNumber = rarityObj.availableMintNumbers[idx];

            return {
                name: selectedCard.name,
                rarity: selectedRarity,
                mintNumber,
                imageUrl: selectedCard.imageUrl,
                flavorText: selectedCard.flavorText || 'No flavor text available',
            };
        } catch (err) {
            console.error('[generateCardPreview] Error:', err.message);
        }
    }
};

const generateRareCardPreview = async () => {
    while (true) {
        const card = await generateCardPreview();
        if (card && isRareOrAbove(card.rarity)) {
            return card;
        }
    }
};

const generatePackPreview = async (packSize = 5) => {
    const pack = [];
    while (pack.length < packSize) {
        const card = await generateCardPreview();
        if (card) {
            pack.push(card);
        }
    }
    if (!pack.some(c => isRareOrAbove(c.rarity))) {
        const rareCard = await generateRareCardPreview();
        if (rareCard) {
            pack[0] = rareCard;
        }
    }
    return pack;
};

const generateCardPreviewFromPool = async (poolIds, randomHighRoll, forceModifier, live) => {
    try {
        let appliedModifierId = null;

        let availabilityResponse;
        try {
            availabilityResponse = await getCardAvailability(poolIds);
        } catch (apiErr) {
            console.error('[generateCardPreviewFromPool] Error fetching card availability:', apiErr.message);
            return null;
        }

        const rarityRemainingData = availabilityResponse.rarityRemaining;

        const cardAvailabilityGroupedMap = new Map();
        rarityRemainingData.forEach(item => {
            cardAvailabilityGroupedMap.set(item.cardId.toString(), item);
        });

        const availablePoolIds = poolIds.filter(cardId => {
            const cardGroupedAvailability = cardAvailabilityGroupedMap.get(cardId.toString());
            if (!cardGroupedAvailability) {
                return false;
            }
            return Object.values(cardGroupedAvailability.rarityRemaining).some(availableCount => availableCount > 0);
        });

        if (availablePoolIds.length === 0) {
            console.warn(`[generateCardPreviewFromPool] No cards in the pool have any available copies globally.`);
            return null;
        }

        const randomCardId = availablePoolIds[Math.floor(Math.random() * availablePoolIds.length)];

        const selectedCard = await Card.findById(randomCardId);

        if (!selectedCard) {
            console.error(`[generateCardPreviewFromPool] Selected Card (ID: ${randomCardId}) not found after availability check. Data inconsistency?`);
            return null;
        }

        const availableRaritiesForCard = selectedCard.rarities.filter(
            r => {
                const cardGroupedAvailability = cardAvailabilityGroupedMap.get(selectedCard._id.toString());
                if (!cardGroupedAvailability) return false;

                const availableCount = cardGroupedAvailability.rarityRemaining[r.rarity.toLowerCase()];

                return typeof availableCount === 'number' && availableCount > 0;
            }
        );

        if (availableRaritiesForCard.length === 0) {
            console.warn(`[generateCardPreviewFromPool] No available rarities (based on global availability) for card ${selectedCard.name} (ID: ${selectedCard._id}).`);
            return null;
        }

        const baseProbabilities = randomHighRoll ? highRollRarityProbabilities : rarityProbabilities;

        let filteredAndNormalizedProbabilities = [];
        let totalAvailableProbability = 0;

        for (const baseRarityProb of baseProbabilities) {
            const matchingAvailableRarity = availableRaritiesForCard.find(
                ar => ar.rarity === baseRarityProb.rarity
            );
            if (matchingAvailableRarity) {
                filteredAndNormalizedProbabilities.push(baseRarityProb);
                totalAvailableProbability += baseRarityProb.probability;
            }
        }

        if (totalAvailableProbability === 0) {
            console.error(`[generateCardPreviewFromPool] Critical: totalAvailableProbability is 0 for card ${selectedCard.name}. This should not happen if availableRaritiesForCard.length > 0.`);
            return null;
        }

        filteredAndNormalizedProbabilities = filteredAndNormalizedProbabilities.map(p => ({
            rarity: p.rarity,
            probability: p.probability / totalAvailableProbability
        }));

        const pickRarityFromFiltered = (probabilities) => {
            const random = Math.random();
            let cumulativeProbability = 0;

            for (const { rarity, probability } of probabilities) {
                cumulativeProbability += probability;
                if (random <= cumulativeProbability) {
                    return rarity;
                }
            }
            return probabilities[probabilities.length - 1]?.rarity;
        };

        const selectedRarityName = pickRarityFromFiltered(filteredAndNormalizedProbabilities);

        const finalAvailableCount = cardAvailabilityGroupedMap.get(selectedCard._id.toString())
            ?.rarityRemaining[selectedRarityName.toLowerCase()];

        if (typeof finalAvailableCount !== 'number' || finalAvailableCount <= 0) {
            console.error(`[generateCardPreviewFromPool] Logic error: selectedRarityName '${selectedRarityName}' (${selectedCard._id}) somehow ended up with 0 or undefined remaining copies during final check. Available: ${finalAvailableCount}`);
            return null;
        }

        const rarityObj = selectedCard.rarities.find(r => r.rarity === selectedRarityName);

        if (!rarityObj || !rarityObj.availableMintNumbers || rarityObj.availableMintNumbers.length === 0) {
            console.error(`[generateCardPreviewFromPool] Logic error: selectedRarityName '${selectedRarityName}' has no available mint numbers on the card model despite global availability. Data inconsistency?`);
            return null;
        }

        const idx = Math.floor(Math.random() * rarityObj.availableMintNumbers.length);
        const mintNumber = rarityObj.availableMintNumbers[idx];

        if (live) {
            rarityObj.availableMintNumbers.splice(idx, 1);
            rarityObj.remainingCopies--;
            await selectedCard.save();
        }

        if (Math.random() < MODIFIER_CHANCE || forceModifier) {
            const modifiers = await Modifier.find().lean();
            const modToApply = modifiers[Math.floor(Math.random() * modifiers.length)];

            appliedModifierId = modToApply._id;
            selectedCard.modifier = modToApply._id;
            const prefix = modToApply.name === 'Glitch' ? 'Glitched' : modToApply.name;
            selectedCard.name = `${prefix} ${selectedCard.name}`;
        }

        return {
            name: selectedCard.name,
            rarity: selectedRarityName,
            mintNumber,
            modifier: appliedModifierId,
            imageUrl: selectedCard.imageUrl,
            flavorText: selectedCard.flavorText || 'No flavor text available',
            cardId: selectedCard._id.toString()
        };
    } catch (err) {
        console.error('[generateCardPreviewFromPool] Unexpected Error:', err.message, err.stack);
        return null;
    }
};

const generatePackPreviewFromPool = async (poolIds, packSize = 5, forceModifier = false, live = false) => {
    const pack = [];
    const randomHighRoll = Math.floor(Math.random() * packSize)
    for (let x = 0; x < packSize; x) {
        console.log(randomHighRoll, x, x===randomHighRoll);
        const card = await generateCardPreviewFromPool(poolIds, x === randomHighRoll, forceModifier, live);
        x += 1;
        if (card) {
            pack.push(card);
        }
    }

    return pack;
};


module.exports = {
    generateCardWithProbability,
    pickRarity,
    generatePack,
    generateCardFromPool,
    generatePackFromPool,
    generateCardPreview,
    generatePackPreview,
    generateCardPreviewFromPool,
    generatePackPreviewFromPool
};
