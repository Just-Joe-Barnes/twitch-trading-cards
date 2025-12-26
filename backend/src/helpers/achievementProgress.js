const Trade = require('../models/tradeModel');
const MarketListing = require('../models/MarketListing');
const Pack = require('../models/packModel');
const Card = require('../models/cardModel');

const ALL_RARITIES = ['Basic', 'Common', 'Standard', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Unique', 'Divine'];

const MODIFIER_PREFIXES = ['Glitched ', 'Negative ', 'Prismatic '];

const normalizeName = (value = '') => String(value).trim().toLowerCase();

const normalizeBaseName = (value = '') => {
    let cleaned = String(value).trim();
    for (const prefix of MODIFIER_PREFIXES) {
        if (cleaned.startsWith(prefix)) {
            cleaned = cleaned.slice(prefix.length);
            break;
        }
    }
    return cleaned.trim().toLowerCase();
};

const getAchievementContext = async (user) => {
    const cards = user.cards || [];
    const rawNames = cards.map((card) => normalizeName(card.name)).filter(Boolean);
    const baseNames = cards.map((card) => normalizeBaseName(card.name)).filter(Boolean);
    const uniqueCards = new Set(rawNames).size;
    const cardNameCounts = baseNames.reduce((acc, name) => {
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {});
    const cardNameSet = new Set(baseNames);
    const cardTagNameSets = {};
    const taggedCardNameSet = new Set();
    const tagSet = new Set();
    cards.forEach((card) => {
        const cardNameKey = normalizeBaseName(card.name);
        const tags = Array.isArray(card.gameTags) ? card.gameTags : [];
        if (tags.length > 0 && cardNameKey) {
            taggedCardNameSet.add(cardNameKey);
        }
        tags.forEach((tag) => {
            const tagKey = normalizeName(tag);
            if (!tagKey || !cardNameKey) return;
            tagSet.add(tagKey);
            if (!cardTagNameSets[tagKey]) cardTagNameSets[tagKey] = new Set();
            cardTagNameSets[tagKey].add(cardNameKey);
        });
    });

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
        cardNameCounts,
        cardNameSet,
        cardTagNameSets,
        taggedCards: taggedCardNameSet.size,
        tagsDiscovered: tagSet.size,
    };
};

const getPackKey = (achievement) => {
    if (achievement.packId) {
        return `id:${achievement.packId}`;
    }
    if (achievement.packName) {
        return `name:${achievement.packName}`;
    }
    return null;
};

const getAchievementCurrent = (achievement, context, user, packCardNamesByKey = {}) => {
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
        case 'ownsCardName': {
            const key = normalizeName(achievement.cardName || '');
            if (!key) return 0;
            return context.cardNameCounts[key] || 0;
        }
        case 'ownsCardNames': {
            const names = Array.isArray(achievement.cardNames) ? achievement.cardNames : [];
            const normalized = names.map((name) => normalizeName(name)).filter(Boolean);
            if (normalized.length === 0) return 0;
            let owned = 0;
            normalized.forEach((name) => {
                if (context.cardNameSet.has(name)) owned += 1;
            });
            return owned;
        }
        case 'cardsFromPack': {
            const packKey = getPackKey(achievement);
            if (!packKey) return 0;
            const packNames = packCardNamesByKey[packKey] || new Set();
            let owned = 0;
            packNames.forEach((name) => {
                if (context.cardNameSet.has(name)) owned += 1;
            });
            return owned;
        }
        case 'cardsWithTag': {
            const tagKey = normalizeName(achievement.tag || '');
            if (!tagKey) return 0;
            const tagSet = context.cardTagNameSets[tagKey];
            return tagSet ? tagSet.size : 0;
        }
        case 'taggedCards':
            return context.taggedCards;
        case 'tagsDiscovered':
            return context.tagsDiscovered;
        default:
            return user[achievement.field] || 0;
    }
};

const buildAchievementProgressMap = async (user, achievements) => {
    const context = await getAchievementContext(user);
    const packCardNamesByKey = {};

    const packKeys = achievements
        .filter((achievement) => achievement.field === 'cardsFromPack')
        .map((achievement) => getPackKey(achievement))
        .filter(Boolean);

    if (packKeys.length > 0) {
        for (const packKey of packKeys) {
            if (packCardNamesByKey[packKey]) continue;
            let packDoc = null;
            if (packKey.startsWith('id:')) {
                const packId = packKey.slice(3);
                packDoc = await Pack.findById(packId).select('cardPool name').lean();
            } else if (packKey.startsWith('name:')) {
                const packName = packKey.slice(5);
                packDoc = await Pack.findOne({ name: packName }).select('cardPool name').lean();
            }

            if (!packDoc || !Array.isArray(packDoc.cardPool) || packDoc.cardPool.length === 0) {
                packCardNamesByKey[packKey] = new Set();
                continue;
            }

            const cards = await Card.find({ _id: { $in: packDoc.cardPool } })
                .select('name')
                .lean();
            const nameSet = new Set(
                cards
                    .map((card) => normalizeName(card.name))
                    .filter(Boolean)
            );
            packCardNamesByKey[packKey] = nameSet;
        }
    }
    const progressMap = {};

    achievements.forEach((achievement) => {
        const key = achievement.key || achievement.name;
        const current = getAchievementCurrent(achievement, context, user, packCardNamesByKey);
        progressMap[key] = {
            current,
            threshold: achievement.threshold,
            unlocked: current >= achievement.threshold,
        };
    });

    return { progressMap, context };
};

module.exports = { buildAchievementProgressMap };
