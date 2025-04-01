// backend/src/scripts/seed.js

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from the .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined. Please check your .env file.');
    process.exit(1);
}

console.log('MONGO_URI:', process.env.MONGO_URI);

// Import models
const Card = require('../models/cardModel');
const User = require('../models/userModel');

// Import the seed function and update function
const seedDatabase = require('../utils/seedCards');
const updateCardCopies = require('./updateCardCopies');

mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB.');

        // Step 1: Seed cards (only adds or updates non-critical fields)
        await seedDatabase();

        // Step 2: Recalculate remaining copies and available mints
        await updateCardCopies();

        // Done
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    });
