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
            name: 'Glintstone Guardian',
            imageUrl: '/images/cards/glintstoneguardian.webp',
            flavorText: 'The only thing between you and the academy',  // <-- Added comma here
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'The Flamboyance',
            imageUrl: '/images/cards/theflamboyance.webp',
            flavorText: 'The best community on Twitch, the Just Joe Show community.',
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
            flavorText: "Its not getting to 100 hours, never has, never will.",
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
        {
            name: 'Damien',
            imageUrl: '/images/cards/damien.png',
            flavorText: 'Man is just another animal, sometimes better, but more often worse than those who walk on all fours, who, because of his "divine spiritual and intellectual development," has become the most vicious animal of all! - joshyoatcakes',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'The Cursed Bristles',
            imageUrl: '/images/cards/thecursedbristles.png',
            flavorText: 'Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Suspicious Harddrive',
            imageUrl: '/images/cards/suspiciousharddrive.webp',
            flavorText: 'A sussy harddrive left behind by a character with... particular... taste.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Helm Of A Hero',
            imageUrl: '/images/cards/helmofahero.webp',
            flavorText: 'The head piece of choice for a soon to be, Elden Lord.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Lightbringer',
            imageUrl: '/images/cards/lightbringer.webp',
            flavorText: 'Not all those who wander are lost. - johnt7uk (Papa John)',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Solstice',
            imageUrl: '/images/cards/solstice.png',
            flavorText: 'It is said that in the harshest winters this figure can be seen roaming the forest, her presence a reminder that the heart of winter is alive, ancient and forever protected. - wintertree',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Pre-Game Boogie',
            imageUrl: '/images/cards/pregameboogie.webp',
            flavorText: 'Before throwing themselves into the horde of bugs, the team get together to throw back some beers and have a little boogie',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'The Lord Of Blood',
            imageUrl: '/images/cards/lordofblood.webp',
            flavorText: 'Honored guest, welcome to the birthplace of our dynasty.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Touch Grass',
            imageUrl: '/images/cards/touchgrass.png',
            flavorText: 'Sometimes we all need to take a break from clicking heads, completing quests and cursing our teammates.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        }
    ];

    try {
        // Clear existing cards first to avoid duplicates
        await Card.deleteMany({});
        console.log('Existing cards cleared.');

        // Insert the new cards
        await Card.insertMany(cards);
        console.log('Cards seeded successfully.');
    } catch (error) {
        console.error('Error seeding database:', error.message);
    }
};

module.exports = seedDatabase;
