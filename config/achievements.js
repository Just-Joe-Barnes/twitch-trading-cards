module.exports = [
  // Level based achievements
  { key: 'LEVEL_1', name: 'Level 1', description: 'Reached Level 1', field: 'level', threshold: 1, reward: {} },
  { key: 'LEVEL_5', name: 'Level 5', description: 'Reached Level 5', field: 'level', threshold: 5, reward: {} },
  { key: 'LEVEL_10', name: 'Level 10', description: 'Reached Level 10', field: 'level', threshold: 10, reward: {} },
  { key: 'LEVEL_20', name: 'Level 20', description: 'Reached Level 20', field: 'level', threshold: 20, reward: {} },
  { key: 'LEVEL_50', name: 'Level 50', description: 'Reached Level 50', field: 'level', threshold: 50, reward: {} },
  // Trade achievements
  { key: 'TRADER_I', name: 'Trader I', description: 'Completed 10 trades', field: 'completedTrades', threshold: 10, reward: {} },
  { key: 'TRADER_II', name: 'Trader II', description: 'Completed 50 trades', field: 'completedTrades', threshold: 50, reward: {} },
  // Listing achievements
  { key: 'SELLER_I', name: 'Seller I', description: 'Sold 10 listings', field: 'completedListings', threshold: 10, reward: {} },
  { key: 'SELLER_II', name: 'Seller II', description: 'Sold 50 listings', field: 'completedListings', threshold: 50, reward: {} },
  // Pack opening achievements
  { key: 'OPENER_I', name: 'Opener I', description: 'Opened 10 packs', field: 'openedPacks', threshold: 10, reward: {} },
  { key: 'OPENER_II', name: 'Opener II', description: 'Opened 50 packs', field: 'openedPacks', threshold: 50, reward: {} },
];
