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
            imageUrl: '/images/cards/glintstoneguardian.jpg',
            flavorText: 'The only thing between you and the academy.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'The Flamboyance',
            imageUrl: '/images/cards/theflamboyance.jpg',
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
            imageUrl: '/images/cards/banjosvanguard.jpg',
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
            flavorText: 'In the darkest of shadows, the nose still shines.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'The Best to Ever Do It',
            imageUrl: '/images/cards/besttoeverdoit.jpg',
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
            imageUrl: '/images/cards/partnerincrime.jpg',
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
            imageUrl: '/images/cards/piratelegend.jpg',
            flavorText: "It's not getting to 100 hours, never has, never will.",
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Sneaking Clown',
            imageUrl: '/images/cards/sneakingclown.jpg',
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
            imageUrl: '/images/cards/thegentlemenschoice.jpg',
            flavorText: 'The obvious choice for the sneakiest of heisters.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'The Queen',
            imageUrl: '/images/cards/thequeen.jpg',
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
            imageUrl: '/images/cards/damien.jpg',
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
            imageUrl: '/images/cards/thecursedbristles.jpg',
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
            imageUrl: '/images/cards/suspiciousharddrive.jpg',
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
            imageUrl: '/images/cards/helmofahero.jpg',
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
            imageUrl: '/images/cards/lightbringer.jpg',
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
            imageUrl: '/images/cards/solstice.jpg',
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
            imageUrl: '/images/cards/pregameboogie.jpg',
            flavorText: 'Before throwing themselves into the horde of bugs, the team get together to throw back some beers and have a little boogie.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'The Lord Of Blood',
            imageUrl: '/images/cards/lordofblood.jpg',
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
            imageUrl: '/images/cards/touchgrass.jpg',
            flavorText: 'Sometimes we all need to take a break from clicking heads, completing quests and cursing our teammates. - scorpion7771',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Roundest Zoo',
            imageUrl: '/images/cards/roundestzoo.jpg',
            flavorText: 'A new take on a modern zoo, with all the corners cut, literally.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Ads Are Served',
            imageUrl: '/images/cards/adsareserved.jpg',
            flavorText: 'Hate to run them, have to run them, screw the purple app.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Anti-Nerd Spray',
            imageUrl: '/images/cards/antinerdspray.jpg',
            flavorText: 'For the poor and nerdy! Spray today!',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Flameforged Defender',
            imageUrl: '/images/cards/flameforgeddefender.jpg',
            flavorText: 'Blood, fire, tears, misery - we work where the Devil dances - Feuerfly',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Siamese Soup',
            imageUrl: '/images/cards/siamesesoup.jpg',
            flavorText: 'The most beloved member of the flamboyance.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'One More Heist',
            imageUrl: '/images/cards/onemoreheist.jpg',
            flavorText: 'Stealth, with a hint of chaos.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Best Boy BOSCO',
            imageUrl: '/images/cards/bestboybosco.jpg',
            flavorText: 'R&D says its too dangerous to go alone, APD-B317, but you can call him BOSCO.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Hunters Companion',
            imageUrl: '/images/cards/hunterscompanion.jpg',
            flavorText: 'The kitten with claws and an aptitude for hunting, our boy Beans.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Sip From The Erdtree',
            imageUrl: '/images/cards/sipfromtheerdtree.jpg',
            flavorText: 'Take a sip, right in their face, no respect.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Trash Panda Tavern',
            imageUrl: '/images/cards/trashpandatavern.jpg',
            flavorText: "Cogsworth has just the tipple to set your mind on the course for adventure and beyond. - UnfitFilms",
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Living The Dream',
            imageUrl: '/images/cards/livingthedream.jpg',
            flavorText: 'Overworked and underpaid, another day in paradise.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Night City Vibes',
            imageUrl: '/images/cards/nightcityvibes.jpg',
            flavorText: 'What makes you a criminal in Night City? Getting caught.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        },
        {
            name: 'Silverhand',
            imageUrl: '/images/cards/silverhand.jpg',
            flavorText: 'Wake the fuck up samurai, we got a city to burn.',
            rarities: rarities.map((rarity) => ({
                rarity: rarity.name,
                totalCopies: rarity.totalCopies,
                remainingCopies: rarity.totalCopies,
                availableMintNumbers: Array.from({ length: rarity.totalCopies }, (_, i) => i + 1),
            })),
        }
    ];

    try {
        for (const cardData of cards) {
            const existingCard = await Card.findOne({ name: cardData.name });
            if (existingCard) {
                // Update non-critical fields (imageUrl and flavorText) if needed
                existingCard.imageUrl = cardData.imageUrl;
                existingCard.flavorText = cardData.flavorText;
                // Leave the existing 'rarities' data (remainingCopies, availableMintNumbers) intact
                await existingCard.save();
                console.log(`Card "${cardData.name}" already exists. Updated non-critical fields.`);
            } else {
                await Card.create(cardData);
                console.log(`Card "${cardData.name}" inserted.`);
            }
        }
        console.log('Cards seeded successfully.');
    } catch (error) {
        console.error('Error seeding database:', error.message);
    }
};

module.exports = seedDatabase;
