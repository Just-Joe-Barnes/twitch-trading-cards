// /src/helpers/eventHelpers.js

const mongoose = require('mongoose');
const User = require('../models/userModel');
const Card = require('../models/cardModel');

// --- Card Generation Logic (Adapted from cardHelpers.js) ---

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

const pickRarityFromList = (probabilities) => {
    // ... (This function is correct, no changes needed)
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

/**
 * Finds a random card template based on a specified rarity.
 * @param {string} rarity - The desired rarity (e.g., 'Rare', 'Epic', or 'Random').
 * @returns {Promise<object|null>} The Mongoose document for the found card template or null.
 */
const findRandomCardTemplate = async (rarity) => {
    try {
        // Build the query. If rarity is 'Random', the match is empty, finding any card.
        // We also check that the rarity has mints available to avoid giving an impossible reward.
        const matchQuery = rarity && rarity.toLowerCase() !== 'random'
            ? { 'rarities.rarity': rarity, 'rarities.remainingCopies': { $gt: 0 } }
            : { 'rarities.remainingCopies': { $gt: 0 } }; // For 'Random', find any card with any available rarity

        // Use MongoDB's aggregation pipeline to efficiently get one random document.
        const randomCards = await Card.aggregate([
            { $match: matchQuery },
            { $sample: { size: 1 } }
        ]);

        if (randomCards.length > 0) {
            // The result from aggregate is a plain object, so we find the full document.
            return await Card.findById(randomCards[0]._id);
        }

        console.warn(`[EventHelper] No card templates found for rarity query:`, matchQuery);
        return null; // No card found
    } catch (error) {
        console.error(`[EventHelper] Error finding random card template:`, error);
        return null;
    }
};


/**
 * Grants a specific card to a user.
 * @param {object} user - The Mongoose user document.
 * @param {object} details - The rewardDetails object from the event.
 * @returns {Promise<object|null>} The granted card instance object or null on failure.
 */
const grantCardReward = async (user, details) => {
    if (!details.cardId || !details.rarity) {
        throw new Error(`Invalid card reward details for user ${user.username}. Missing cardId or rarity.`);
    }

    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const cardDoc = await Card.findById(details.cardId).session(session);
            if (!cardDoc) {
                throw new Error(`Card definition with ID ${details.cardId} not found.`);
            }

            let chosenRarity;

            if (details.rarity.toLowerCase() === 'random') {
                const availableRaritiesOnCard = cardDoc.rarities
                    .filter(r => r.remainingCopies > 0 && r.availableMintNumbers.length > 0)
                    .map(r => r.rarity);

                if (availableRaritiesOnCard.length === 0) {
                    throw new Error(`No rarities with available mints found for card '${cardDoc.name}'.`);
                }

                const validProbabilities = rarityProbabilities.filter(p => availableRaritiesOnCard.includes(p.rarity));
                const totalProbability = validProbabilities.reduce((sum, p) => sum + p.probability, 0);
                const normalizedProbabilities = validProbabilities.map(p => ({
                    rarity: p.rarity,
                    probability: p.probability / totalProbability
                }));
                chosenRarity = pickRarityFromList(normalizedProbabilities);
            } else {
                chosenRarity = details.rarity;
            }

            const rarityObj = cardDoc.rarities.find(r => r.rarity.toLowerCase() === chosenRarity.toLowerCase());
            if (!rarityObj || rarityObj.remainingCopies <= 0 || rarityObj.availableMintNumbers.length === 0) {
                throw new Error(`No mints available for card '${cardDoc.name}' with rarity '${chosenRarity}'.`);
            }

            const randomIndex = Math.floor(Math.random() * rarityObj.availableMintNumbers.length);
            const mintNumber = rarityObj.availableMintNumbers[randomIndex];

            const updatedCard = await Card.findOneAndUpdate(
                { _id: cardDoc._id, 'rarities.rarity': rarityObj.rarity, 'rarities.availableMintNumbers': mintNumber },
                { $inc: { 'rarities.$.remainingCopies': -1 }, $pull: { 'rarities.$.availableMintNumbers': mintNumber } },
                { new: true, session }
            );

            if (!updatedCard) {
                throw new Error(`Mint number #${mintNumber} for ${cardDoc.name} was claimed by another process. Retrying.`);
            }

            const newCardInstance = {
                _id: new mongoose.Types.ObjectId(),
                name: cardDoc.name,
                imageUrl: cardDoc.imageUrl,
                flavorText: cardDoc.flavorText,
                rarity: rarityObj.rarity,
                mintNumber: mintNumber,
                acquiredAt: new Date(),
                // NOTE: Add any other fields your BaseCard component might need, like 'modifier'
                modifier: null, // Example: assuming no modifier by default for event rewards
            };

            await User.updateOne({ _id: user._id }, { $push: { cards: newCardInstance } }, { session });

            await session.commitTransaction();
            console.log(`Successfully granted card '${newCardInstance.name}' #${mintNumber} (${rarityObj.rarity}) to user ${user.username}`);

            // --- CHANGED: Return the detailed card object ---
            return newCardInstance;

        } catch (error) {
            await session.abortTransaction();
            console.error(`Attempt ${attempt} failed for grantCardReward for user ${user.username}:`, error.message);
            if (attempt === MAX_RETRIES) {
                // --- CHANGED: Return null on final failure ---
                return null;
            }
        } finally {
            session.endSession();
        }
    }
    return null; // Should be unreachable, but good for safety
};


/**
 * Grants a specified number of packs to a user.
 * @returns {Promise<object|null>} An object with the amount or null on failure.
 */
const grantPackReward = async (user, details) => {
    const amount = parseInt(details.amount, 10);
    if (isNaN(amount) || amount <= 0) {
        console.error(`Invalid pack reward amount for user ${user.username}: ${details.amount}`);
        return null;
    }

    try {
        user.packs = (user.packs || 0) + amount;
        await user.save();
        console.log(`Successfully granted ${amount} pack(s) to user ${user.username}`);
        return { amount };
    } catch (error) {
        console.error(`Failed to grant pack reward to user ${user.username}:`, error.message);
        return null;
    }
};

/**
 * Grants a specified amount of XP to a user and handles leveling up.
 * @returns {Promise<object|null>} An object with the amount or null on failure.
 */
const grantXpReward = async (user, details) => {
    const amount = parseInt(details.amount, 10);
    if (isNaN(amount) || amount <= 0) {
        console.error(`Invalid XP reward amount for user ${user.username}: ${details.amount}`);
        return null;
    }

    try {
        const newXp = (user.xp || 0) + amount;
        const newLevel = Math.floor(newXp / 100) + 1;

        user.xp = newXp;
        user.level = newLevel;
        await user.save();
        console.log(`Successfully granted ${amount} XP to user ${user.username}. New level: ${newLevel}`);
        return { amount };
    } catch (error) {
        console.error(`Failed to grant XP reward to user ${user.username}:`, error.message);
        return null;
    }
};

module.exports = {
    findRandomCardTemplate,
    grantCardReward,
    grantPackReward,
    grantXpReward,
};
