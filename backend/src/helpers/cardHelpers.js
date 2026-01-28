const Card = require('../models/cardModel');
const Modifier = require("../models/modifierModel");
const { getDefaultPack, DEFAULT_PACK_NAME } = require('./packDefaults');
const { getCardAvailability } = require("../controllers/cardController");
const PeriodCounter = require('../models/periodCounterModel');
const Setting = require('../models/settingsModel');
const { getWeeklyKey } = require("../scripts/periods");
const normalizeModifierName = (name) => (name === 'Aqua' ? 'Glacial' : name);
const MODIFIER_CACHE_TTL_MS = 5 * 60 * 1000;
let modifierCache = { items: null, at: 0 };

const REQUIRED_MODIFIERS = [
    { name: 'Negative', description: 'Inverts the card colours.', filter: 'invert(1)' },
    { name: 'Glitch', description: 'Reactive glitch lines with static overlay.' },
    { name: 'Prismatic', description: 'Rainbow holographic shimmer.' },
    { name: 'Rainbow', description: 'Vivid rainbow holographic sheen.' },
    { name: 'Cosmic', description: 'Deep space shimmer with starfield.' },
    { name: 'Glacial', description: 'Icy blue holo shimmer.' }
];

const ensureModifiersExist = async () => {
    const aquaModifier = await Modifier.findOne({ name: 'Aqua' });
    const glacialModifier = await Modifier.findOne({ name: 'Glacial' });
    if (aquaModifier && !glacialModifier) {
        aquaModifier.name = 'Glacial';
        await aquaModifier.save();
    }

    for (const modifier of REQUIRED_MODIFIERS) {
        await Modifier.updateOne(
            { name: modifier.name },
            {
                $setOnInsert: {
                    name: modifier.name,
                    description: modifier.description,
                    css: JSON.stringify({}),
                    blendMode: null,
                    filter: modifier.filter ?? null,
                    animation: null,
                    overlayImage: null,
                    overlayBlendMode: null,
                }
            },
            { upsert: true }
        );
    }
};

const getModifierPool = async () => {
    const now = Date.now();
    if (modifierCache.items && now - modifierCache.at < MODIFIER_CACHE_TTL_MS) {
        return modifierCache.items;
    }
    await ensureModifiersExist();
    const modifiers = await Modifier.find().lean();
    modifierCache = { items: modifiers, at: now };
    return modifiers;
};

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

const epicRollRarityProbabilities = [
    { rarity: 'Epic', probability: 0.8000 },
    { rarity: 'Legendary', probability: 0.1867 },
    { rarity: 'Mythic', probability: 0.0106 },
    { rarity: 'Unique', probability: 0.0024 },
    { rarity: 'Divine', probability: 0.0003 },
];

const legendaryRollRarityProbabilities = [
    { rarity: 'Legendary', probability: 0.85 },
    { rarity: 'Mythic', probability: 0.10 },
    { rarity: 'Unique', probability: 0.04 },
    { rarity: 'Divine', probability: 0.01 },
];

const MODIFIER_CHANCE = parseFloat(process.env.MODIFIER_CHANCE || '0.03');

const getPackLuckProfile = (weeklySubCount) => {
    // Standard: 0-14 subs
    if (weeklySubCount < 15) {
        return { legendaryRolls: 0, epicRolls: 0, rareRolls: 1, standardRolls: 4, profileName: "Standard (1 Rare, 4 Rolls)" };
    }
    // Tier 1: 15-29 subs
    else if (weeklySubCount < 30) {
        return { legendaryRolls: 0, epicRolls: 1, rareRolls: 0, standardRolls: 4, profileName: "Tier 1 (1 Epic, 4 Rolls)" };
    }
    // Tier 2: 30-44 subs
    else if (weeklySubCount < 45) {
        return { legendaryRolls: 0, epicRolls: 0, rareRolls: 2, standardRolls: 3, profileName: "Tier 2 (2 Rare, 3 Rolls)" };
    }
    // Tier 3: 45-59 subs
    else if (weeklySubCount < 60) {
        return { legendaryRolls: 0, epicRolls: 1, rareRolls: 1, standardRolls: 3, profileName: "Tier 3 (1 Epic, 1 Rare, 3 Rolls)" };
    }
    // Tier 4: 60-99 subs
    else if (weeklySubCount < 100) {
        return { legendaryRolls: 0, epicRolls: 2, rareRolls: 0, standardRolls: 3, profileName: "Tier 4 (2 Epic, 3 Rolls)" };
    }
    // Tier 5: 100+ subs
    else {
        return { legendaryRolls: 1, epicRolls: 0, rareRolls: 0, standardRolls: 4, profileName: "Tier 5 (1 Legendary, 4 Rolls)" };
    }
};

const pickRarity = (highRoll = false) => {
    const activeRarityProbabilities = highRoll ? highRollRarityProbabilities : rarityProbabilities;
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

const generateCardWithProbability = async (highRoll = false) => {
    const pack = await getDefaultPack();
    if (!pack || !pack.cardPool || pack.cardPool.length === 0) {
        console.error(`[generateCardWithProbability] Default pack '${DEFAULT_PACK_NAME}' not found or is empty.`);
        return null;
    }
    const poolIds = pack.cardPool;

    while (true) {
        try {
            const availabilityResponse = await getCardAvailability(poolIds);
            const cardAvailabilityGroupedMap = new Map();
            availabilityResponse.rarityRemaining.forEach(item => {
                cardAvailabilityGroupedMap.set(item.cardId.toString(), item);
            });

            const mintAvailablePoolIds = poolIds.filter(cardId => {
                const cardGroupedAvailability = cardAvailabilityGroupedMap.get(cardId.toString());
                return cardGroupedAvailability && Object.values(cardGroupedAvailability.rarityRemaining).some(count => count > 0);
            });

            if (mintAvailablePoolIds.length === 0) {
                console.warn(`[generateCardWithProbability] No cards in the default pool have any available copies.`);
                return null;
            }

            const now = new Date();

            const timeAvailableCards = await Card.find({
                _id: { $in: mintAvailablePoolIds },
                $and: [
                    { $or: [{ availableFrom: null }, { availableFrom: { $lte: now } }] },
                    { $or: [{ availableTo: null }, { availableTo: { $gte: now } }] }
                ]
            }).select('_id').lean();

            const finalAvailablePoolIds = timeAvailableCards.map(c => c._id);

            if (finalAvailablePoolIds.length === 0) {
                console.warn(`[generateCardWithProbability] No cards in the pool are currently available by date.`);
                return null;
            }

            const randomCardId = finalAvailablePoolIds[Math.floor(Math.random() * finalAvailablePoolIds.length)];
            const selectedCard = await Card.findById(randomCardId);

            if (!selectedCard) {
                console.error(`[generateCardWithProbability] Selected Card (ID: ${randomCardId}) not found.`);
                continue;
            }

            const availableRaritiesForCard = selectedCard.rarities.filter(r => {
                const cardGroupedAvailability = cardAvailabilityGroupedMap.get(selectedCard._id.toString());
                return cardGroupedAvailability && (cardGroupedAvailability.rarityRemaining[r.rarity.toLowerCase()] || 0) > 0;
            });

            if (availableRaritiesForCard.length === 0) {
                console.warn(`[generateCardWithProbability] No available rarities for card ${selectedCard.name}. Retrying...`);
                continue;
            }

            const baseProbabilities = highRoll ? highRollRarityProbabilities : rarityProbabilities;
            let filteredAndNormalizedProbabilities = [];
            let totalAvailableProbability = 0;

            for (const baseRarityProb of baseProbabilities) {
                if (availableRaritiesForCard.some(ar => ar.rarity === baseRarityProb.rarity)) {
                    filteredAndNormalizedProbabilities.push(baseRarityProb);
                    totalAvailableProbability += baseRarityProb.probability;
                }
            }

            if (totalAvailableProbability === 0) {
                console.error(`[generateCardWithProbability] Critical: totalAvailableProbability is 0 for card ${selectedCard.name}.`);
                continue;
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
                    if (random <= cumulativeProbability) return rarity;
                }
                return probabilities[probabilities.length - 1]?.rarity;
            };

            const selectedRarityName = pickRarityFromFiltered(filteredAndNormalizedProbabilities);
            const rarityObj = selectedCard.rarities.find(r => r.rarity === selectedRarityName);

            if (!rarityObj || !rarityObj.availableMintNumbers || rarityObj.availableMintNumbers.length === 0) {
                console.error(`[generateCardWithProbability] No available mint numbers for ${selectedRarityName} on card ${selectedCard.name}.`);
                continue;
            }

            const idx = Math.floor(Math.random() * rarityObj.availableMintNumbers.length);
            const mintNumber = rarityObj.availableMintNumbers[idx];

            const updatedCard = await Card.findOneAndUpdate(
                { _id: selectedCard._id, "rarities.rarity": selectedRarityName, "rarities.availableMintNumbers": mintNumber },
                { $inc: { "rarities.$.remainingCopies": -1 }, $pull: { "rarities.$.availableMintNumbers": mintNumber } },
                { new: true }
            );

            if (!updatedCard) {
                console.warn(`[generateCardWithProbability] Minting conflict for ${selectedCard.name}. Retrying...`);
                continue;
            }

            return {
                name: selectedCard.name,
                rarity: selectedRarityName,
                mintNumber,
                imageUrl: selectedCard.imageUrl,
                flavorText: selectedCard.flavorText || 'No flavor text available',
                lore: selectedCard.lore,
                loreAuthor: selectedCard.loreAuthor,
                gameTags: Array.isArray(selectedCard.gameTags) ? selectedCard.gameTags : [],
            };

        } catch (err) {
            console.error('[generateCardWithProbability] Unexpected Error:', err.message, err.stack);
            continue;
        }
    }
};

const rareTier = new Set(["Rare", "Epic", "Legendary", "Mythic", "Unique", "Divine"]);
const isRareOrAbove = (rarity) => rareTier.has(rarity);

const rarityOrder = ["Basic", "Common", "Standard", "Uncommon", "Rare", "Epic", "Legendary", "Mythic", "Unique", "Divine"];
const rarityRank = new Map(rarityOrder.map((rarity, index) => [rarity, index]));
const isRarityAtLeast = (rarity, minimum) => {
    const rank = rarityRank.get(rarity);
    const minRank = rarityRank.get(minimum);
    if (rank === undefined || minRank === undefined) return false;
    return rank >= minRank;
};

const generateRareCardWithProbability = async () => {
    while (true) {
        const card = await generateCardWithProbability(true);
        if (card && isRareOrAbove(card.rarity)) {
            return card;
        }
        console.warn(`Generated card is not Rare or above. Retrying for a rare card...`);
    }
};

const generatePack = async (packSize = 5) => {
    const pack = [];
    let hasRareOrAbove = false;

    for (let i = 0; i < packSize; i++) {
        const isHighRollAttempt = i === 0;
        const card = await generateCardWithProbability(isHighRollAttempt);
        if (card) {
            pack.push(card);
            if (isRareOrAbove(card.rarity)) {
                hasRareOrAbove = true;
            }
        }
    }

    if (!hasRareOrAbove && pack.length > 0) {
        const rareCard = await generateRareCardWithProbability();
        if (rareCard) {
            const randomIndex = Math.floor(Math.random() * pack.length);
            pack[randomIndex] = rareCard;
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
                lore: selectedCard.lore,
                loreAuthor: selectedCard.loreAuthor,
                gameTags: Array.isArray(selectedCard.gameTags) ? selectedCard.gameTags : [],
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

const generateCardPreview = async (options = {}) => {
    const { forceModifier = false } = options;
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

            let appliedModifierId = null;
            let cardName = selectedCard.name;
            if ((Math.random() < MODIFIER_CHANCE) || forceModifier) {
                const modifiers = await getModifierPool();
                if (modifiers.length > 0) {
                    const modToApply = modifiers[Math.floor(Math.random() * modifiers.length)];
                    appliedModifierId = modToApply._id;
                    const normalizedName = normalizeModifierName(modToApply.name);
                    const prefix = normalizedName === "Glitch" ? "Glitched" : normalizedName;
                    cardName = `${prefix} ${cardName}`;
                }
            }

            return {
                name: cardName,
                rarity: selectedRarity,
                mintNumber,
                modifier: appliedModifierId,
                imageUrl: selectedCard.imageUrl,
                flavorText: selectedCard.flavorText || 'No flavor text available',
                lore: selectedCard.lore,
                loreAuthor: selectedCard.loreAuthor,
                gameTags: Array.isArray(selectedCard.gameTags) ? selectedCard.gameTags : [],
            };
        } catch (err) {
            console.error('[generateCardPreview] Error:', err.message);
        }
    }
};

const generateRareCardPreview = async (options = {}) => {
    while (true) {
        const card = await generateCardPreview(options);
        if (card && isRareOrAbove(card.rarity)) {
            return card;
        }
    }
};

const generatePackPreview = async (packSize = 5, forceModifier = false) => {
    const pack = [];
    while (pack.length < packSize) {
        const card = await generateCardPreview({ forceModifier });
        if (card) {
            pack.push(card);
        }
    }
    if (!pack.some(c => isRareOrAbove(c.rarity))) {
        const rareCard = await generateRareCardPreview({ forceModifier });
        if (rareCard) {
            pack[0] = rareCard;
        }
    }
    return pack;
};

const generateCardPreviewFromPool = async (poolIds, options = {}) => {
    const {
        rarityTier = 'Standard',
        forceModifier = false,
        live = false
    } = options;

    let retries = 0;
    const maxRetries = 10;

    while (retries < maxRetries) {
        try {
            if (poolIds.length === 1 && rarityTier === 'Standard') {
                const singleCard = await Card.findById(poolIds[0]);
                if (singleCard && singleCard.rarities.length === 1 && singleCard.rarities[0].rarity === 'Event') {
                    console.log('[generateCardPreviewFromPool] Detected Event Card Pack. Bypassing probability logic.');
                    const eventRarityObj = singleCard.rarities[0];

                    if (!eventRarityObj.availableMintNumbers || eventRarityObj.availableMintNumbers.length === 0) {
                        console.error(`[generateCardPreviewFromPool] Event card '${singleCard.name}' has no available mint numbers.`);
                        return null;
                    }

                    const idx = Math.floor(Math.random() * eventRarityObj.availableMintNumbers.length);
                    const mintNumber = eventRarityObj.availableMintNumbers[idx];

                    return {
                        name: singleCard.name,
                        rarity: 'Event',
                        mintNumber,
                        modifier: null,
                        imageUrl: singleCard.imageUrl,
                        flavorText: singleCard.flavorText || 'No flavor text available',
                        cardId: singleCard._id.toString(),
                        lore: singleCard.lore,
                        loreAuthor: singleCard.loreAuthor,
                        gameTags: Array.isArray(singleCard.gameTags) ? singleCard.gameTags : [],
                    };
                }
            }

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

            let baseProbabilities;
            if (rarityTier === 'Legendary') {
                baseProbabilities = legendaryRollRarityProbabilities;
            } else if (rarityTier === 'Epic') {
                baseProbabilities = epicRollRarityProbabilities;
            } else if (rarityTier === 'Rare') {
                baseProbabilities = highRollRarityProbabilities;
            } else {
                baseProbabilities = rarityProbabilities;
            }

            const possibleRarities = new Set(baseProbabilities.map(p => p.rarity));

            const availablePoolIdsForRarity = availablePoolIds.filter(cardId => {
                const cardData = cardAvailabilityGroupedMap.get(cardId.toString());
                if (!cardData) return false;

                const rarities = cardData.rarityRemaining;
                for (const rarityKey in rarities) {
                    const capitalizedRarity = rarityKey.charAt(0).toUpperCase() + rarityKey.slice(1);
                    if (rarities[rarityKey] > 0 && possibleRarities.has(capitalizedRarity)) {
                        return true;
                    }
                }
                return false;
            });


            if (availablePoolIdsForRarity.length === 0) {
                console.warn(`[generateCardPreviewFromPool] No cards in pool have any available rarities for tier '${rarityTier}'.`);
                return null;
            }

            const randomCardId = availablePoolIdsForRarity[Math.floor(Math.random() * availablePoolIdsForRarity.length)];

            const selectedCard = await Card.findById(randomCardId);

            if (!selectedCard) {
                console.error(`[generateCardPreviewFromPool] Selected Card (ID: ${randomCardId}) not found after availability check. Data inconsistency?`);
                retries++;
                continue;
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
                retries++;
                continue;
            }

            let selectedRarityName;

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
                console.error(`[generateCardPreviewFromPool] Critical: totalAvailableProbability is 0 for card ${selectedCard.name} using tier ${rarityTier}. Retrying...`);
                retries++;
                continue;
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

            selectedRarityName = pickRarityFromFiltered(filteredAndNormalizedProbabilities);

            const finalAvailableCount = cardAvailabilityGroupedMap.get(selectedCard._id.toString())
                ?.rarityRemaining[selectedRarityName.toLowerCase()];

            if (typeof finalAvailableCount !== 'number' || finalAvailableCount <= 0) {
                console.error(`[generateCardPreviewFromPool] Logic error: selectedRarityName '${selectedRarityName}' (${selectedCard._id}) somehow ended up with 0 or undefined remaining copies during final check. Available: ${finalAvailableCount}`);
                retries++;
                continue;
            }

            const rarityObj = selectedCard.rarities.find(r => r.rarity === selectedRarityName);
            if (!rarityObj || !rarityObj.availableMintNumbers || rarityObj.availableMintNumbers.length === 0) {
                console.error(`[generateCardPreviewFromPool] Logic error: selectedRarityName '${selectedRarityName}' has no available mint numbers on the card model despite global availability. Data inconsistency?`);
                retries++;
                continue;
            }

            const idx = Math.floor(Math.random() * rarityObj.availableMintNumbers.length);
            const mintNumber = rarityObj.availableMintNumbers[idx];

            if (live) {
                const updatedCard = await Card.findOneAndUpdate(
                    { _id: selectedCard._id, "rarities.rarity": selectedRarityName, "rarities.availableMintNumbers": mintNumber },
                    { $inc: { "rarities.$.remainingCopies": -1 }, $pull: { "rarities.$.availableMintNumbers": mintNumber } },
                    { new: true }
                );
                if (!updatedCard) {
                    console.warn(`[generateCardPreviewFromPool] Live minting conflict for ${selectedCard.name}. Returning null.`);
                    retries++;
                    continue;
                }
            }

            const gameTags = Array.isArray(selectedCard.gameTags) ? selectedCard.gameTags : [];

            if ((Math.random() < MODIFIER_CHANCE) || forceModifier) {
                const modifiers = await getModifierPool();
                if (modifiers.length > 0) {
                    const modToApply = modifiers[Math.floor(Math.random() * modifiers.length)];
                    appliedModifierId = modToApply._id;
                    const normalizedName = normalizeModifierName(modToApply.name);
                    let cardPrefix = normalizedName === "Glitch" ? "Glitched" : normalizedName;
                    selectedCard.name = cardPrefix + " " + selectedCard.name;
                }
            }

            return {
                name: selectedCard.name,
                rarity: selectedRarityName,
                mintNumber,
                modifier: appliedModifierId,
                imageUrl: selectedCard.imageUrl,
                flavorText: selectedCard.flavorText || 'No flavor text available',
                cardId: selectedCard._id.toString(),
                lore: selectedCard.lore,
                loreAuthor: selectedCard.loreAuthor,
                gameTags,
            };
        } catch (err) {
            console.error('[generateCardPreviewFromPool] Unexpected Error:', err.message, err.stack);
            retries++;
        }
    }

    console.error(`[generateCardPreviewFromPool] FAILED to generate card with options ${JSON.stringify(options)} after ${maxRetries} attempts.`);
    return null;
};

const generatePackPreviewFromPool = async (poolIds, packSize = 5, forceModifier = false, live = false) => {

    let weeklySubCount = 0;
    let overrideApplied = false;

    try {
        const overrideSetting = await Setting.findOne({ key: 'packLuckOverride' }).lean();
        const overrideValue = overrideSetting?.value;
        if (overrideValue?.enabled) {
            const overrideCount = Number(overrideValue.count);
            if (Number.isFinite(overrideCount) && overrideCount >= 0) {
                weeklySubCount = overrideCount;
                overrideApplied = true;
            }
        }
    } catch (err) {
        console.error("Failed to fetch pack luck override:", err);
    }

    if (!overrideApplied) {
        try {
            const w = getWeeklyKey();
            const weeklyDoc = await PeriodCounter.findOne({ scope: 'weekly', periodKey: w.periodKey }).lean();
            if (weeklyDoc) {
                weeklySubCount = weeklyDoc.count;
            }
        } catch (err) {
            console.error("Failed to fetch weekly sub count for pack luck:", err);
        }
    } else {
        console.log(`[generatePackPreviewFromPool] Pack luck override active (${weeklySubCount} subs).`);
    }

    const profile = getPackLuckProfile(weeklySubCount);
    console.log(`[generatePackPreviewFromPool] Generating pack with luck profile: ${profile.profileName} (${weeklySubCount} subs)`);

    const pack = [];
    const missingRolls = { Legendary: 0, Epic: 0, Rare: 0 };

    const generateWithRetry = async (rarityTier, attempts = 5) => {
        for (let attempt = 0; attempt < attempts; attempt++) {
            const card = await generateCardPreviewFromPool(poolIds, { rarityTier, forceModifier, live });
            if (card) {
                return card;
            }
        }
        return null;
    };

    const rollPlan = [
        { tier: 'Legendary', count: profile.legendaryRolls || 0 },
        { tier: 'Epic', count: profile.epicRolls || 0 },
        { tier: 'Rare', count: profile.rareRolls || 0 },
        { tier: 'Standard', count: profile.standardRolls || 0 },
    ];

    for (const { tier, count } of rollPlan) {
        for (let i = 0; i < count; i++) {
            const card = await generateWithRetry(tier);
            if (card) {
                pack.push(card);
            } else if (tier !== 'Standard') {
                missingRolls[tier] += 1;
                console.warn(`[generatePackPreviewFromPool] Failed to generate ${tier} roll after retries.`);
            }
        }
    }

    const hasRare = pack.some(card => card && isRareOrAbove(card.rarity));

    if (!hasRare) {
        console.warn(`[generatePackPreviewFromPool] Pack has no Rare+ card after initial rolls. Triggering pity timer...`);
        const pityCard = await generateCardPreviewFromPool(poolIds, { rarityTier: 'Rare', forceModifier, live });
        if (pityCard) {
            if (pack.length >= packSize) {
                pack[0] = pityCard;
            } else {
                pack.push(pityCard);
            }
        } else {
            console.error(`[generatePackPreviewFromPool] CRITICAL: Pity timer failed to generate a 'Rare' card (no 'Rare+' cards in pool?).`);
        }
    }

    let fillAttempts = 0;
    while (pack.length < packSize && fillAttempts < 5) {
        console.warn(`[generatePackPreviewFromPool] Pack is short (${pack.length}/${packSize}). Filling remaining slots with Standard rolls.`);
        const fillCard = await generateWithRetry('Standard', 3);
        if (fillCard) {
            pack.push(fillCard);
        }
        fillAttempts++;
    }

    const ensureMinimums = async (tier, required) => {
        if (!required) return;
        let current = pack.filter(card => card && isRarityAtLeast(card.rarity, tier)).length;

        while (current < required) {
            const replacement = await generateWithRetry(tier, 5);
            if (!replacement) {
                console.error(`[generatePackPreviewFromPool] Unable to satisfy ${tier} minimum after retries.`);
                break;
            }

            let replaceIndex = -1;
            let lowestRank = Infinity;
            const tierRank = rarityRank.get(tier);

            for (let i = 0; i < pack.length; i++) {
                const card = pack[i];
                if (!card) continue;
                const cardRank = rarityRank.get(card.rarity);
                if (cardRank === undefined || tierRank === undefined) continue;
                if (cardRank < tierRank && cardRank < lowestRank) {
                    lowestRank = cardRank;
                    replaceIndex = i;
                }
            }

            if (replaceIndex === -1) {
                console.warn(`[generatePackPreviewFromPool] No valid replacement slot found while enforcing ${tier} minimum.`);
                break;
            }

            pack[replaceIndex] = replacement;
            current = pack.filter(card => card && isRarityAtLeast(card.rarity, tier)).length;
        }
    };

    if (missingRolls.Legendary || missingRolls.Epic || missingRolls.Rare) {
        console.warn(`[generatePackPreviewFromPool] Missing rolls after initial generation:`, missingRolls);
    }

    await ensureMinimums('Legendary', profile.legendaryRolls || 0);
    await ensureMinimums('Epic', profile.epicRolls || 0);
    await ensureMinimums('Rare', profile.rareRolls || 0);

    if (pack.length < packSize) {
        console.error(`[generatePackPreviewFromPool] CRITICAL: Could not fill pack to size ${packSize}. Final pack size: ${pack.length}`);
    }

    console.log(`[generatePackPreviewFromPool] Pack filled. Rarities: ${pack.map(c => c ? c.rarity : 'FAIL').join(', ')}`);

    for (let i = pack.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pack[i], pack[j]] = [pack[j], pack[i]];
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
    generatePackPreviewFromPool,
    rarityProbabilities,
    MODIFIER_CHANCE,
    getModifierPool
};
