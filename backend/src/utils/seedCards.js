require('dotenv').config();
const mongoose = require('mongoose');
const Card = require('../models/cardModel');

mongoose
    .connect(process.env.DATABASE_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('Connected to MongoDB for seeding cards'))
    .catch((err) => {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    });

const seedCards = async () => {
    const cards = [
        {
            name: 'Dragon',
            imageUrl: '/public/images/cards/dragon.png',
            flavorText: 'A simple dragon',
            rarity: 'Common',
            totalCopies: 500,
            remainingCopies: 500,
            availableMintNumbers: Array.from({ length: 500 }, (_, i) => i + 1),
        },
        {
            name: 'Dragon',
            imageUrl: '/public/images/cards/dragon.png',
            flavorText: 'A mighty dragon!',
            rarity: 'Uncommon',
            totalCopies: 300,
            remainingCopies: 300,
            availableMintNumbers: Array.from({ length: 300 }, (_, i) => i + 1),
        },
        {
            name: 'Dragon',
            imageUrl: '/public/images/cards/dragon.png',
            flavorText: 'A mighty dragon!',
            rarity: 'Rare',
            totalCopies: 100,
            remainingCopies: 100,
            availableMintNumbers: Array.from({ length: 100 }, (_, i) => i + 1),
        },
        {
            name: 'Dragon',
            imageUrl: '/public/images/cards/dragon.png',
            flavorText: 'A mighty dragon!',
            rarity: 'Legendary',
            totalCopies: 20,
            remainingCopies: 20,
            availableMintNumbers: Array.from({ length: 20 }, (_, i) => i + 1),
        },
        {
            name: 'Dragon',
            imageUrl: '/public/images/cards/dragon.png',
            flavorText: 'A mighty dragon!',
            rarity: 'Mythic',
            totalCopies: 1,
            remainingCopies: 1,
            availableMintNumbers: [1],
        },
        {
            name: 'Ned',
            imageUrl: '/public/images/cards/ned.png',
            flavorText: 'The boy',
            rarity: 'Common',
            totalCopies: 500,
            remainingCopies: 500,
            availableMintNumbers: Array.from({ length: 500 }, (_, i) => i + 1),
        },
        {
            name: 'Ned',
            imageUrl: '/public/images/cards/ned.png',
            flavorText: 'The boy uncommon',
            rarity: 'Uncommon',
            totalCopies: 300,
            remainingCopies: 300,
            availableMintNumbers: Array.from({ length: 300 }, (_, i) => i + 1),
        },
        {
            name: 'Ned',
            imageUrl: '/public/images/cards/ned.png',
            flavorText: 'the boy rare',
            rarity: 'Rare',
            totalCopies: 100,
            remainingCopies: 100,
            availableMintNumbers: Array.from({ length: 100 }, (_, i) => i + 1),
        },
        {
            name: 'Ned',
            imageUrl: '/public/images/cards/ned.png',
            flavorText: 'The boy legendary',
            rarity: 'Legendary',
            totalCopies: 20,
            remainingCopies: 20,
            availableMintNumbers: Array.from({ length: 20 }, (_, i) => i + 1),
        },
    ];

    await Card.deleteMany(); // Clear existing cards
    await Card.insertMany(cards);

    console.log('Cards seeded successfully');
    mongoose.connection.close();
};

seedCards();
