const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../../.env' });

const Card = require('../models/cardModel');
const Pack = require('../models/packModel');
const { DEFAULT_PACK_NAME } = require('../helpers/packDefaults');

const DEFAULT_ANIMATION_URL = '/animations/packopening.mp4';

const fetchEligibleCardIds = async () => {
    const cards = await Card.find({
        'rarities.rarity': { $ne: 'Event' },
        $or: [
            { availableFrom: null },
            { availableTo: null }
        ],
    }).select('_id').lean();

    return cards.map(card => card._id);
};

async function createOrUpdateDefaultPack() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Connected to MongoDB');

        const cardIds = await fetchEligibleCardIds();
        console.log(`Found ${cardIds.length} eligible cards for '${DEFAULT_PACK_NAME}'.`);

        let pack = await Pack.findOne({ name: DEFAULT_PACK_NAME });
        if (pack) {
            console.log(`Default pack '${DEFAULT_PACK_NAME}' already exists, updating it...`);
            pack.cardPool = cardIds;
            pack.animationUrl = DEFAULT_ANIMATION_URL;
        } else {
            console.log(`Creating default pack '${DEFAULT_PACK_NAME}'...`);
            pack = new Pack({
                name: DEFAULT_PACK_NAME,
                cardPool: cardIds,
                animationUrl: DEFAULT_ANIMATION_URL,
                userId: null,
                isOpened: false,
                cards: [],
            });
        }

        await pack.save();
        console.log(`Default pack '${DEFAULT_PACK_NAME}' saved with ${cardIds.length} cards.`);
        process.exit(0);
    } catch (error) {
        console.error('Error creating/updating default pack:', error);
        process.exit(1);
    }
}

createOrUpdateDefaultPack();
