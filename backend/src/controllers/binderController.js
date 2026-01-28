const mongoose = require('mongoose');
const Binder = require('../models/binderModel');
const User = require('../models/userModel');

const SLOT_COUNT = 9;
const DEFAULT_PAGE_COUNT = 4;
const MAX_PAGES = 200;

const createEmptySlots = () => Array.from({ length: SLOT_COUNT }, () => null);
const createDefaultPages = () => Array.from({ length: DEFAULT_PAGE_COUNT }, () => createEmptySlots());

const DEFAULT_COVER = {
    title: 'My Binder',
    binderColor: '#262626',
    titleColor: '#f4f4f4',
    font: 'Cinzel, "Times New Roman", serif',
};

const findUserByIdentifier = async (identifier) => {
    if (!identifier) return null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
        return User.findOne({ _id: identifier }).select('username cards').lean();
    }
    return User.findOne({ username: identifier }).select('username cards').lean();
};

const sanitizeCover = (cover = {}) => {
    const title = typeof cover.title === 'string' ? cover.title.trim() : DEFAULT_COVER.title;
    const binderColor = typeof cover.binderColor === 'string' ? cover.binderColor : DEFAULT_COVER.binderColor;
    const titleColor = typeof cover.titleColor === 'string' ? cover.titleColor : DEFAULT_COVER.titleColor;
    const font = typeof cover.font === 'string' ? cover.font : DEFAULT_COVER.font;

    return {
        title: title.slice(0, 80),
        binderColor,
        titleColor,
        font,
    };
};

const normalizePages = (pages, cardIdSet) => {
    const safePages = Array.isArray(pages) ? pages.slice(0, MAX_PAGES) : [];
    const sourcePages = safePages.length > 0 ? safePages : createDefaultPages();

    while (sourcePages.length < 2) {
        sourcePages.push(createEmptySlots());
    }

    return sourcePages.map((page) => {
        const slots = Array.isArray(page) ? page : [];
        return Array.from({ length: SLOT_COUNT }, (_, slotIndex) => {
            const slot = slots[slotIndex];
            if (!slot || typeof slot !== 'object') {
                return null;
            }
            const rawId = slot.cardId || slot._id || slot.id;
            if (!rawId) {
                return null;
            }
            const cardId = String(rawId);
            if (!cardIdSet.has(cardId)) {
                return null;
            }
            return {
                cardId,
                locked: Boolean(slot.locked),
            };
        });
    });
};

const hydratePages = (pages, cardMap) =>
    pages.map((page) =>
        page.map((slot) => {
            if (!slot || !slot.cardId) {
                return null;
            }
            const card = cardMap.get(String(slot.cardId));
            if (!card) {
                return null;
            }
            return {
                ...card,
                cardId: String(slot.cardId),
                locked: Boolean(slot.locked),
            };
        })
    );

const getBinderByIdentifier = async (req, res) => {
    try {
        const identifier = req.params.identifier;
        const user = await findUserByIdentifier(identifier);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const binder = await Binder.findOne({ userId: user._id }).lean();
        const cards = Array.isArray(user.cards) ? user.cards : [];
        const cardMap = new Map(cards.map((card) => [String(card._id), card]));
        const cardIdSet = new Set(cardMap.keys());

        const normalizedPages = normalizePages(binder?.pages, cardIdSet);
        const hydratedPages = hydratePages(normalizedPages, cardMap);
        const cover = sanitizeCover({ ...DEFAULT_COVER, ...(binder?.cover || {}) });

        return res.status(200).json({
            binder: {
                pages: hydratedPages,
                cover,
            },
            isNew: !binder,
        });
    } catch (error) {
        console.error('[ERROR] in getBinderByIdentifier:', error);
        return res.status(500).json({ message: 'Server error.' });
    }
};

const updateBinderByIdentifier = async (req, res) => {
    try {
        const identifier = req.params.identifier;
        const user = await findUserByIdentifier(identifier);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isOwner = req.userId && String(req.userId) === String(user._id);
        if (!isOwner && !req.isAdmin) {
            return res.status(403).json({ message: 'Not authorized to update this binder.' });
        }

        const cards = Array.isArray(user.cards) ? user.cards : [];
        const cardIdSet = new Set(cards.map((card) => String(card._id)));
        const pages = normalizePages(req.body?.pages, cardIdSet);
        const cover = sanitizeCover(req.body?.cover);

        const binder = await Binder.findOneAndUpdate(
            { userId: user._id },
            { pages, cover },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();

        const cardMap = new Map(cards.map((card) => [String(card._id), card]));
        const hydratedPages = hydratePages(pages, cardMap);

        return res.status(200).json({
            binder: {
                pages: hydratedPages,
                cover,
            },
            updatedAt: binder?.updatedAt || null,
        });
    } catch (error) {
        console.error('[ERROR] in updateBinderByIdentifier:', error);
        return res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = {
    getBinderByIdentifier,
    updateBinderByIdentifier,
};
