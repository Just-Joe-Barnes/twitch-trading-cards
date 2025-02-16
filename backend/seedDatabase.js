const mongoose = require('mongoose');
const seedDatabase = require('./src/utils/seedCards'); // Correct path to seedCards.js
require('dotenv').config();

mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('Connected to MongoDB');
        await seedDatabase(); // Call the seeding function
        console.log('Database seeding completed.');
        process.exit(); // Exit after seeding
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    });
