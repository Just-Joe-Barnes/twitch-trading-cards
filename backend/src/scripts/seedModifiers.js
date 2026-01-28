const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Modifier = require('../models/modifierModel');

// Load environment variables from the .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const seedModifiers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for seeding modifiers');

    const upsertModifier = async ({ name, description }) => {
      const existing = await Modifier.findOne({ name });
      if (!existing) {
        const modifier = new Modifier({
          name,
          description,
          css: JSON.stringify({}),
          blendMode: null,
          filter: null,
          animation: null,
          overlayImage: null,
          overlayBlendMode: null,
        });
        await modifier.save();
        console.log(`${name} modifier created`);
      } else {
        console.log(`${name} modifier already exists`);
      }
    };

    const aquaModifier = await Modifier.findOne({ name: 'Aqua' });
    const glacialModifier = await Modifier.findOne({ name: 'Glacial' });
    if (aquaModifier && !glacialModifier) {
      aquaModifier.name = 'Glacial';
      await aquaModifier.save();
      console.log('Aqua modifier renamed to Glacial');
    } else if (aquaModifier && glacialModifier) {
      console.log('Both Aqua and Glacial modifiers exist; no rename performed');
    }

    // Check if the Negative modifier already exists
    await upsertModifier({
      name: 'Negative',
      description: 'Inverts the card colours.',
    });
    const negative = await Modifier.findOne({ name: 'Negative' });
    if (negative && negative.filter !== 'invert(1)') {
      negative.filter = 'invert(1)';
      await negative.save();
    }

    await upsertModifier({
      name: 'Glitch',
      description: 'Reactive glitch lines with static overlay.',
    });

    await upsertModifier({
      name: 'Prismatic',
      description: 'Rainbow holographic shimmer.',
    });

    await upsertModifier({
      name: 'Rainbow',
      description: 'Vivid rainbow holographic sheen.',
    });

    await upsertModifier({
      name: 'Cosmic',
      description: 'Deep space shimmer with starfield.',
    });

    await upsertModifier({
      name: 'Glacial',
      description: 'Icy blue holo shimmer.',
    });

    mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error seeding modifiers:', error);
  }
};

seedModifiers();
