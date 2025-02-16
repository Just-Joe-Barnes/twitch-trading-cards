const mongoose = require('mongoose');
const User = require('../models/userModel');
const Card = require('../models/cardModel'); // Import the Card model
const seedDatabase = require('../utils/seedCards'); // For reseeding cards

// Replace this with your MongoDB connection string
const mongoUri = 'mongodb+srv://jobybarnes1:Qazwsx4321!@cluster0.lrqb8.mongodb.net/';

const resetDatabase = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB.');

        // 1. Clear `cards` field and reset `packs` for all users
        const updatedUsers = await User.updateMany(
            {}, // Matches all users
            { $set: { cards: [], packs: 0 } } // Resets cards and packs
        );
        console.log(`Successfully reset ${updatedUsers.nModified} users.`);

        // 2. Remove all cards from the `cards` collection
        const deletedCards = await Card.deleteMany({});
        console.log(`Successfully deleted ${deletedCards.deletedCount} cards from the database.`);

        // 3. Reseed the `cards` collection
        await seedDatabase();
        console.log('Cards reseeded successfully.');
    } catch (error) {
        console.error('Error during reset and reseed:', error.message);
    } finally {
        // Close the database connection
        mongoose.connection.close();
    }
};

resetDatabase();
