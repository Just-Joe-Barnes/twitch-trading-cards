const { cards, rarities } = require('./seedCards'); // Adjust path based on the actual location


// Generate random cards with rarity weighting
const generateRandomCards = (count) => {
    const result = [];
    const rarityWeightMap = rarities.reduce((acc, rarity, index) => {
        acc[rarity.name] = Math.pow(2, rarities.length - index - 1); // Assign higher weight to rarer cards
        return acc;
    }, {});

    const totalWeight = Object.values(rarityWeightMap).reduce((sum, weight) => sum + weight, 0);

    for (let i = 0; i < count; i++) {
        // Randomly determine rarity
        let random = Math.random() * totalWeight;
        let selectedRarity = null;

        for (const rarity of rarities) {
            random -= rarityWeightMap[rarity.name];
            if (random <= 0) {
                selectedRarity = rarity.name;
                break;
            }
        }

        // Filter cards matching the selected rarity
        const matchingCards = cards.filter(card =>
            card.rarities.some(r => r.rarity === selectedRarity && r.remainingCopies > 0)
        );

        if (matchingCards.length > 0) {
            const selectedCard = matchingCards[Math.floor(Math.random() * matchingCards.length)];
            const rarityInfo = selectedCard.rarities.find(r => r.rarity === selectedRarity);

            // Update rarity info
            rarityInfo.remainingCopies -= 1;
            const mintNumber = rarityInfo.availableMintNumbers.shift();

            // Add to result
            result.push({
                name: selectedCard.name,
                imageUrl: selectedCard.imageUrl,
                flavorText: selectedCard.flavorText,
                rarity: selectedRarity,
                mintNumber,
            });
        }
    }

    return result;
};

module.exports = { generateRandomCards };
