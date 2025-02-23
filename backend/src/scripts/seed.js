// backend/src/scripts/seed.js

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from the .env file located at the backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined. Please check your .env file.');
    process.exit(1);
}

console.log('MONGO_URI:', process.env.MONGO_URI);

// Import models
const Card = require('../models/cardModel');
const User = require('../models/userModel');
// Import the seed function
const seedDatabase = require('../utils/seedCards');

mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB.');

        // Clear the cards array from every user
        await User.updateMany({}, { $set: { cards: [] } });
        console.log('All user cards cleared.');

        // Seed the Card collection
        await seedDatabase();

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    });
