const mongoose = require('mongoose');
const User = require('../models/userModel');
const Card = require('../models/cardModel');

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
 * Finds a random card template matching a rarity.
 */
const findRandomCardTemplate = async (rarity) => {
    try {
        const matchQuery = rarity && rarity.toLowerCase() !== 'random'
            ? { 'rarities.rarity': rarity, 'rarities.remainingCopies': { $gt: 0 } }
            : { 'rarities.remainingCopies': { $gt: 0 } };

        const randomCards = await Card.aggregate([
            { $match: matchQuery },
            { $sample: { size: 1 } }
        ]);

        if (randomCards.length > 0) {
            return await Card.findById(randomCards[0]._id);
        }

        console.warn(`[EventHelper] No card templates found for rarity query:`, matchQuery);
        return null;
    } catch (error) {
        console.error(`[EventHelper] Error finding random card template:`, error);
        return null;
    }
};

/**
 * Grants a specific card. This is a complex transaction.
 * It *does* commit its own changes to the DB because it needs
 * to atomically claim a mint number.
 */
const grantCardReward = async (user, details) => {
    if (!details.cardId || !details.rarity) {
        throw new Error(`Invalid card reward details for user ${user.username}. Missing cardId or rarity.`);
    }

    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        // Start a transaction
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Find the card template
            const cardDoc = await Card.findById(details.cardId).session(session);
            if (!cardDoc) {
                throw new Error(`Card definition with ID ${details.cardId} not found.`);
            }

            let chosenRarity;

            // Handle 'Random' rarity for a specific card
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

            // Pick a random mint number from the available list
            const randomIndex = Math.floor(Math.random() * rarityObj.availableMintNumbers.length);
            const mintNumber = rarityObj.availableMintNumbers[randomIndex];

            // Atomically pull that mint number and decrement remaining copies
            const updatedCard = await Card.findOneAndUpdate(
                { _id: cardDoc._id, 'rarities.rarity': rarityObj.rarity, 'rarities.availableMintNumbers': mintNumber },
                { $inc: { 'rarities.$.remainingCopies': -1 }, $pull: { 'rarities.$.availableMintNumbers': mintNumber } },
                { new: true, session }
            );

            if (!updatedCard) {
                // This means another process grabbed the mint. Transaction will abort and retry.
                throw new Error(`Mint number #${mintNumber} for ${cardDoc.name} was claimed by another process. Retrying.`);
            }

            // Create the card *instance* to be added to the user's collection
            const newCardInstance = {
                _id: new mongoose.Types.ObjectId(),
                name: cardDoc.name,
                imageUrl: cardDoc.imageUrl,
                flavorText: cardDoc.flavorText,
                rarity: rarityObj.rarity,
                mintNumber: mintNumber,
                acquiredAt: new Date(),
                modifier: null,
                gameTags: Array.isArray(cardDoc.gameTags) ? cardDoc.gameTags : [],
            };

            // Add the new card to the user's `cards` array
            await User.updateOne({ _id: user._id }, { $push: { cards: newCardInstance } }, { session });

            // If all checks passed, commit the transaction
            await session.commitTransaction();
            console.log(`Successfully granted card '${newCardInstance.name}' #${mintNumber} (${rarityObj.rarity}) to user ${user.username}`);

            // Return the new card object so the service knows what was granted
            return newCardInstance;

        } catch (error) {
            // If anything failed, abort the transaction
            await session.abortTransaction();
            console.error(`Attempt ${attempt} failed for grantCardReward for user ${user.username}:`, error.message);
            if (attempt === MAX_RETRIES) {
                return null; // Failed all retries
            }
        } finally {
            session.endSession();
        }
    }
    return null;
};

/**
 * Grants a specified number of packs to a user.
 * IMPORTANT: This function *only* modifies the user object in memory.
 * It does NOT save the user. The calling service is responsible for saving.
 */
const grantPackReward = async (user, details) => {
    const amount = parseInt(details.amount, 10);
    if (isNaN(amount) || amount <= 0) {
        console.error(`Invalid pack reward amount for user ${user.username}: ${details.amount}`);
        return null;
    }

    try {
        // Modify the user object in memory
        user.packs = (user.packs || 0) + amount;
        // DO NOT SAVE HERE
        console.log(`Successfully staged ${amount} pack(s) for user ${user.username}`);
        return { amount }; // Return the reward data
    } catch (error) {
        console.error(`Failed to grant pack reward to user ${user.username}:`, error.message);
        return null;
    }
};

/**
 * Grants a specified amount of XP to a user.
 * IMPORTANT: This function *only* modifies the user object in memory.
 * It does NOT save the user. The calling service is responsible for saving.
 */
const grantXpReward = async (user, details) => {
    const amount = parseInt(details.amount, 10);
    if (isNaN(amount) || amount <= 0) {
        console.error(`Invalid XP reward amount for user ${user.username}: ${details.amount}`);
        return null;
    }

    try {
        // Modify the user object in memory
        const newXp = (user.xp || 0) + amount;
        const newLevel = Math.floor(newXp / 100) + 1;
        user.xp = newXp;
        user.level = newLevel;
        // DO NOT SAVE HERE
        console.log(`Successfully staged ${amount} XP to user ${user.username}. New level: ${newLevel}`);
        return { amount }; // Return the reward data
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
