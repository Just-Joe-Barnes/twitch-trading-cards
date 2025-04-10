const mongoose = require('mongoose');
require('dotenv').config();

const Card = require('../models/cardModel');
const Pack = require('../models/packModel');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const now = new Date();

    const expiredCards = await Card.find({
      availableTo: { $ne: null, $lt: now }
    });

    console.log(`Found ${expiredCards.length} expired cards.`);

    for (const card of expiredCards) {
      const result = await Pack.updateMany(
        { cardPool: card._id },
        { $pull: { cardPool: card._id } }
      );
      console.log(`Removed card "${card.name}" (${card._id}) from ${result.modifiedCount} packs.`);
    }

    console.log('Expired cards removed from pack templates.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
