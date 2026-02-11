const User = require('../models/userModel');
const Pack = require('../models/packModel');
const Card = require('../models/cardModel');
const { generatePackPreviewFromPool, generatePackPreview } = require('../helpers/cardHelpers');
const { createLogEntry } = require("../utils/logService");
const { checkAndGrantAchievements } = require('../helpers/achievementHelper');

async function openPackForUserLogic(userId, templateId, forceModifier = false) {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    if (user.packs <= 0) {
        throw new Error('No unopened packs available for this user');
    }

    let newCards;

    if (templateId) {
        const templatePack = await Pack.findById(templateId);
        if (!templatePack) {
            throw new Error('Pack template not found');
        }

        const now = new Date();
        const poolCards = await Card.find({
            _id: { $in: templatePack.cardPool },
            $and: [
                {
                    $or: [
                        { availableFrom: null },
                        { availableFrom: { $lte: now } }
                    ]
                },
                {
                    $or: [
                        { availableTo: null },
                        { availableTo: { $gte: now } }
                    ]
                }
            ]
        }).select('_id').lean();

        const filteredIds = poolCards.map(card => card._id.toString());
        if (filteredIds.length === 0) {
            throw new Error('Selected pack template has no cards currently available.');
        }
        newCards = await generatePackPreviewFromPool(filteredIds, 5, forceModifier, true);
    } else {
        newCards = await generatePackPreview(5, forceModifier, true);
    }

    if (!newCards || !newCards.length) {
        await createLogEntry(
            user,
            '[ERROR] Failed to generate cards for the pack',
            'Length of newCards is 0 or undefined.'
        );
        throw new Error('Failed to generate cards for the pack');
    }

    for (const card of newCards) {
        card.acquiredAt = new Date();
    }

    const xpGain = 10;
    const newXp = (user.xp || 0) + xpGain;
    const newLevel = Math.floor(newXp / 100) + 1;

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
            $push: { cards: { $each: newCards } },
            $inc: { packs: -1, openedPacks: 1, xp: xpGain },
            $set: { level: newLevel }
        },
        { new: true }
    );

    await checkAndGrantAchievements(updatedUser);

    return { updatedUser, newCards };
}

module.exports = {
    openPackForUserLogic,
};
