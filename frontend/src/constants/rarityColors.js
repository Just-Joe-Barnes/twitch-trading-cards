export const rarityColors = {
  Basic: '#8D8D8D',
  Common: '#64B5F6',
  Standard: '#66BB6A',
  Uncommon: '#1976D2',
  Rare: '#AB47BC',
  Epic: '#FFA726',
  Legendary: '#e32232',
  Mythic: 'hotpink',
  Unique: 'black',
  Divine: 'white',
};

export const getRarityColor = (rarity) => rarityColors[rarity] || '#fff';
