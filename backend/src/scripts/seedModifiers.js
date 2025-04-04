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

    // Check if the Rainbow Holo modifier already exists
    const existingModifier = await Modifier.findOne({ name: 'Rainbow Holo' });

    if (!existingModifier) {
      const rainbowHoloModifier = new Modifier({
        name: 'Rainbow Holo',
        description: 'Adds a rainbow holographic effect to the card name.',
        css: JSON.stringify({
          background: 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          animation: 'rainbow 5s linear infinite',
        }),
        blendMode: null,
        filter: null,
        animation: 'rainbow 5s linear infinite',
        overlayImage: null,
        overlayBlendMode: null,
      });

      await rainbowHoloModifier.save();
      console.log('Rainbow Holo modifier created');
    } else {
      console.log('Rainbow Holo modifier already exists');
    }

    mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error seeding modifiers:', error);
  }
};

seedModifiers();
