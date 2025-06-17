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

    // Check if the Negative modifier already exists
    const existingModifier = await Modifier.findOne({ name: 'Negative' });

    if (!existingModifier) {
      const negativeModifier = new Modifier({
        name: 'Negative',
        description: 'Inverts the card colours.',
        css: JSON.stringify({}),
        blendMode: null,
        filter: 'invert(1)',
        animation: null,
        overlayImage: null,
        overlayBlendMode: null,
      });

      await negativeModifier.save();
      console.log('Negative modifier created');
    } else {
      console.log('Negative modifier already exists');
    }

    const glitchExisting = await Modifier.findOne({ name: 'Glitch' });

    if (!glitchExisting) {
      const glitchModifier = new Modifier({
        name: 'Glitch',
        description: 'Static glitch overlay.',
        css: JSON.stringify({}),
        blendMode: null,
        filter: null,
        animation: null,
        overlayImage: null,
        overlayBlendMode: null,
      });

      await glitchModifier.save();
      console.log('Glitch modifier created');
    } else {
      console.log('Glitch modifier already exists');
    }

    const prismExisting = await Modifier.findOne({ name: 'Prismatic Hologram' });

    if (!prismExisting) {
      const prismModifier = new Modifier({
        name: 'Prismatic Hologram',
        description: 'Rainbow holographic shimmer.',
        css: JSON.stringify({}),
        blendMode: null,
        filter: null,
        animation: null,
        overlayImage: null,
        overlayBlendMode: null,
      });

      await prismModifier.save();
      console.log('Prismatic Hologram modifier created');
    } else {
      console.log('Prismatic Hologram modifier already exists');
    }

    mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error seeding modifiers:', error);
  }
};

seedModifiers();
