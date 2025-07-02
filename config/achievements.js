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
  { key: 'TRADER_III', name: 'Trader III', description: 'Completed 100 trades', field: 'completedTrades', threshold: 100, reward: {} },
  // Listing achievements (based on completed sales)
  { key: 'SELLER_I', name: 'Seller I', description: 'Sold 10 cards on the market', field: 'completedListings', threshold: 10, reward: {} },
  { key: 'SELLER_II', name: 'Seller II', description: 'Sold 50 cards on the market', field: 'completedListings', threshold: 50, reward: {} },
  { key: 'SELLER_III', name: 'Seller III', description: 'Sold 100 cards on the market', field: 'completedListings', threshold: 100, reward: {} },
  // Market sales achievements
  { key: 'MERCHANT_I', name: 'Merchant I', description: 'Sold 10 cards on the market', field: 'completedListings', threshold: 10, reward: {} },
  { key: 'MERCHANT_II', name: 'Merchant II', description: 'Sold 50 cards on the market', field: 'completedListings', threshold: 50, reward: {} },
  { key: 'MERCHANT_III', name: 'Merchant III', description: 'Sold 100 cards on the market', field: 'completedListings', threshold: 100, reward: {} },
  // Pack opening achievements
  { key: 'OPENER_I', name: 'Opener I', description: 'Opened 10 packs', field: 'openedPacks', threshold: 10, reward: {} },
  { key: 'OPENER_II', name: 'Opener II', description: 'Opened 50 packs', field: 'openedPacks', threshold: 50, reward: {} },
  { key: 'OPENER_III', name: 'Opener III', description: 'Opened 100 packs', field: 'openedPacks', threshold: 100, reward: {} },
  // Collection achievements
  { key: 'COLLECTOR_I', name: 'Collector I', description: 'Own 10 unique cards', field: 'uniqueCards', threshold: 10, reward: {} },
  { key: 'COLLECTOR_II', name: 'Collector II', description: 'Own 50 unique cards', field: 'uniqueCards', threshold: 50, reward: {} },
  { key: 'COLLECTOR_III', name: 'Collector III', description: 'Own 100 unique cards', field: 'uniqueCards', threshold: 100, reward: {} },
  { key: 'FULL_SET', name: 'Full Set Achiever', description: 'Own every rarity of a single card', field: 'fullSets', threshold: 1, reward: {} },
  // Login milestones
  { key: 'LOGIN_I', name: 'Regular I', description: 'Login 10 times', field: 'loginCount', threshold: 10, reward: {} },
  { key: 'LOGIN_II', name: 'Regular II', description: 'Login 50 times', field: 'loginCount', threshold: 50, reward: {} },
  { key: 'LOGIN_III', name: 'Regular III', description: 'Login 100 times', field: 'loginCount', threshold: 100, reward: {} },
];
