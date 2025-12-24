const Pack = require('../models/packModel');

const DEFAULT_PACK_NAME = process.env.DEFAULT_PACK_NAME || 'Core Pack';
const DEFAULT_PACK_ID = process.env.DEFAULT_PACK_ID || null;

const getDefaultPack = async () => {
    if (DEFAULT_PACK_ID) {
        try {
            const packById = await Pack.findById(DEFAULT_PACK_ID).lean();
            if (packById) {
                return packById;
            }
        } catch (error) {
            console.error(`[DefaultPack] Failed to load pack by id ${DEFAULT_PACK_ID}:`, error.message);
        }
    }

    if (!DEFAULT_PACK_NAME) {
        return null;
    }

    return Pack.findOne({ name: DEFAULT_PACK_NAME }).lean();
};

const getDefaultPackId = async () => {
    const pack = await getDefaultPack();
    return pack ? pack._id : null;
};

module.exports = {
    DEFAULT_PACK_NAME,
    getDefaultPack,
    getDefaultPackId,
};
