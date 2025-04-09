const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../../.env' });

const Card = require('../models/cardModel');
const Pack = require('../models/packModel');
const User = require('../models/userModel');

async function createOrUpdateOriginalsPack() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    const adminUser = await User.findOne({ isAdmin: true });
    if (!adminUser) {
      throw new Error('No admin user found. Cannot assign pack owner.');
    }
    console.log('Using admin user:', adminUser.username);

    const cards = await Card.find();
    console.log('Fetched', cards.length, 'cards');

    const allCardIds = cards.map(c => c._id);

    let pack = await Pack.findOne({ type: 'Originals', series: 'Series 1' });

    if (pack) {
      console.log('Originals pack already exists, updating it...');
      pack.cardPool = allCardIds;
      pack.availableFrom = new Date();
      pack.availableTo = null;
      pack.userId = adminUser._id;
    } else {
      console.log('Creating new Originals pack...');
      pack = new Pack({
        type: 'Originals',
        series: 'Series 1',
        availableFrom: new Date(),
        availableTo: null,
        cardPool: allCardIds,
        userId: adminUser._id,
        isOpened: false,
        cards: [],
      });
    }

    await pack.save();
    console.log('Originals pack saved with', allCardIds.length, 'cards.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating/updating Originals pack:', error);
    process.exit(1);
  }
}

createOrUpdateOriginalsPack();
