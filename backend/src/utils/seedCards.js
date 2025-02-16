// backend/src/utils/seedCards.js

const Card = require('../models/cardModel');

const seedDatabase = async () => {
    const rarities = [
        { name: 'Basic', totalCopies: 1000 },
        { name: 'Common', totalCopies: 800 },
        { name: 'Standard', totalCopies: 600 },
        { name: 'Uncommon', totalCopies: 400 },
        { name: 'Rare', totalCopies: 300 },
        { name: 'Epic', totalCopies: 200 },
        { name: 'Legendary', totalCopies: 100 },
        { name: 'Mythic', totalCopies: 50 },
        { name: 'Unique', totalCopies: 10 },
        { name: 'Divine', totalCopies: 1 },
    ];

    const cards = [
        {
            name: 'Dragon',
            imageUrl: '/images/cards/dragon.png',
            flavorText: 'A mythical beast that rules the skies.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Ned',
            imageUrl: '/images/cards/phoenix.png',
            flavorText: 'The quirky adventurer.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Banjos Vanguard',
            imageUrl: '/images/cards/banjosvanguard.webp',
            flavorText: 'A former ice guard who protected his country from war and crimes. He is the last surviving Ice Guardian because he was saved by Banjo. - BanjoVGC',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'The Golden Nose',
            imageUrl: '/images/cards/thegoldennose.jpg',
            flavorText: 'In the darkest of shadows, the nose still shines',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'The Best to Ever Do It',
            imageUrl: '/images/cards/besttoeverdoit.png',
            flavorText: 'All loot, stealth only, DSOD. Gaming.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Partner In Crime',
            imageUrl: '/images/cards/partnerincrime.png',
            flavorText: 'They will never see me with these shades on.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'The Pirate Legend',
            imageUrl: '/images/cards/piratelegend.webp',
            flavorText: 'Its not getting to 100 hours, never has, never will.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Sneaking Clown',
            imageUrl: '/images/cards/sneakingclown.webp',
            flavorText: 'Smooth, sleek, sly.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'The Gentlemens Choice',
            imageUrl: '/images/cards/thegentlemenschoice.webp',
            flavorText: 'Smooth, sleek, sly.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'The Queen',
            imageUrl: '/images/cards/thequeen.webp',
            flavorText: 'All hail, the queen. - omgeorgiaa',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
    ];

    try {
        // Clear the existing cards from the Card collection
        await Card.deleteMany({});
        console.log('Existing cards cleared from the Card collection.');

        // Insert the new cards
        await Card.insertMany(cards);
        console.log('Cards seeded successfully.');
    } catch (error) {
        console.error('Error seeding database:', error.message);
    }
};

module.exports = seedDatabase;
