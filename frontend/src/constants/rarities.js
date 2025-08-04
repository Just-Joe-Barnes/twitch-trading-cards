export const rarities = [
    { name: 'Basic', totalCopies: 1000, color: '#8D8D8D' },
    { name: 'Common', totalCopies: 800, color: '#64B5F6' },
    { name: 'Standard', totalCopies: 600, color: '#66BB6A' },
    { name: 'Uncommon', totalCopies: 400, color: '#1976D2' },
    { name: 'Rare', totalCopies: 300, color: '#AB47BC' },
    { name: 'Epic', totalCopies: 200, color: '#FFA726' },
    { name: 'Legendary', totalCopies: 100, color: '#e32232' },
    { name: 'Mythic', totalCopies: 50, color: 'hotpink' },
    { name: 'Unique', totalCopies: 10, color: 'black' },
    { name: 'Divine', totalCopies: 1, color: 'white' },
];

export const getRarityColor = (rarityName) => {
    const rarityObject = rarities.find(r => r.name.toLowerCase() === rarityName?.toLowerCase());
    return rarityObject ? rarityObject.color : '#fff';
};
