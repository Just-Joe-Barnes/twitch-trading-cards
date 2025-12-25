const Trade = require('../models/tradeModel');
const MarketListing = require('../models/MarketListing');

const ALL_RARITIES = ['Basic', 'Common', 'Standard', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Unique', 'Divine'];

const getAchievementContext = async (user) => {
    const cards = user.cards || [];
    const uniqueCards = new Set(cards.map((card) => card.name)).size;

    const setsByName = {};
    cards.forEach((card) => {
        if (!setsByName[card.name]) {
            setsByName[card.name] = new Set();
        }
        setsByName[card.name].add(card.rarity);
    });

    let fullSets = 0;
    for (const rarities of Object.values(setsByName)) {
        if (ALL_RARITIES.every((rarity) => rarities.has(rarity))) {
            fullSets += 1;
        }
    }

    const featuredCount = (user.featuredCards || []).length;
    const modifierCards = cards.filter((card) => card.modifier).length;
    const raritiesOwned = new Set(cards.map((card) => card.rarity)).size;
    const titlesUnlocked = (user.unlockedTitles || []).length;

    const hasModifierCard = cards.some((card) => card.modifier);
    const hasLegendaryCard = cards.some((card) =>
        ['Legendary', 'Mythic', 'Unique', 'Divine'].includes(card.rarity)
    );

    const [tradeCount, listingCount] = await Promise.all([
        Trade.countDocuments({
            $or: [{ sender: user._id }, { recipient: user._id }],
            status: 'accepted',
        }),
        MarketListing.countDocuments({ owner: user._id, status: 'sold' }),
    ]);

    return {
        tradeCount,
        listingCount,
        uniqueCards,
        fullSets,
        featuredCount,
        modifierCards,
        raritiesOwned,
        hasModifierCard,
        hasLegendaryCard,
        titlesUnlocked,
    };
};

const getAchievementCurrent = (achievement, context, user) => {
    switch (achievement.field) {
        case 'uniqueCards':
            return context.uniqueCards;
        case 'fullSets':
            return context.fullSets;
        case 'completedTrades':
            return context.tradeCount;
        case 'completedListings':
            return context.listingCount;
        case 'hasModifierCard':
            return context.hasModifierCard ? 1 : 0;
        case 'hasLegendaryCard':
            return context.hasLegendaryCard ? 1 : 0;
        case 'favoriteCard':
            return user.favoriteCard ? 1 : 0;
        case 'featuredCardsCount':
            return context.featuredCount;
        case 'modifierCards':
            return context.modifierCards;
        case 'raritiesOwned':
            return context.raritiesOwned;
        case 'titlesUnlocked':
            return context.titlesUnlocked;
        default:
            return user[achievement.field] || 0;
    }
};

const buildAchievementProgressMap = async (user, achievements) => {
    const context = await getAchievementContext(user);
    const progressMap = {};

    achievements.forEach((achievement) => {
        const key = achievement.key || achievement.name;
        const current = getAchievementCurrent(achievement, context, user);
        progressMap[key] = {
            current,
            threshold: achievement.threshold,
            unlocked: current >= achievement.threshold,
        };
    });

    return { progressMap, context };
};

module.exports = { buildAchievementProgressMap };
