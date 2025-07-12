module.exports = [
  // Level based achievements
  { key: 'LEVEL_1', name: 'Level 1', description: 'Reached Level 1', field: 'level', threshold: 1, reward: { card: true } },
  { key: 'LEVEL_5', name: 'Level 5', description: 'Reached Level 5', field: 'level', threshold: 5, reward: { card: true } },
  { key: 'LEVEL_10', name: 'Level 10', description: 'Reached Level 10', field: 'level', threshold: 10, reward: { card: true } },
  { key: 'LEVEL_20', name: 'Level 20', description: 'Reached Level 20', field: 'level', threshold: 20, reward: { card: true } },
  { key: 'LEVEL_50', name: 'Level 50', description: 'Reached Level 50', field: 'level', threshold: 50, reward: { packs: 1 } },
  // Trade achievements
  { key: 'FIRST_TRADE', name: 'First Trade', description: 'Complete your first trade', field: 'completedTrades', threshold: 1, reward: { card: true } },
  { key: 'TRADER_I', name: 'Trader I', description: 'Completed 10 trades', field: 'completedTrades', threshold: 10, reward: { card: true } },
  { key: 'TRADER_II', name: 'Trader II', description: 'Completed 50 trades', field: 'completedTrades', threshold: 50, reward: { card: true } },
  { key: 'TRADER_III', name: 'Trader III', description: 'Completed 100 trades', field: 'completedTrades', threshold: 100, reward: { packs: 1 } },
  // Listing achievements (listings created)
  { key: 'SELLER_I', name: 'Seller I', description: 'Create 10 market listings', field: 'createdListings', threshold: 10, reward: { card: true } },
  { key: 'SELLER_II', name: 'Seller II', description: 'Create 50 market listings', field: 'createdListings', threshold: 50, reward: { card: true } },
  { key: 'SELLER_III', name: 'Seller III', description: 'Create 100 market listings', field: 'createdListings', threshold: 100, reward: { packs: 1 } },
  // Market sales achievements
  { key: 'FIRST_SALE', name: 'First Sale', description: 'Sell your first listing', field: 'completedListings', threshold: 1, reward: { card: true } },
  { key: 'MERCHANT_I', name: 'Merchant I', description: 'Sold 10 cards on the market', field: 'completedListings', threshold: 10, reward: { card: true } },
  { key: 'MERCHANT_II', name: 'Merchant II', description: 'Sold 50 cards on the market', field: 'completedListings', threshold: 50, reward: { card: true } },
  { key: 'MERCHANT_III', name: 'Merchant III', description: 'Sold 100 cards on the market', field: 'completedListings', threshold: 100, reward: { packs: 1 } },
  // Pack opening achievements
  { key: 'FIRST_PACK', name: 'First Pack', description: 'Open your first pack', field: 'openedPacks', threshold: 1, reward: { card: true } },
  { key: 'OPENER_I', name: 'Opener I', description: 'Opened 10 packs', field: 'openedPacks', threshold: 10, reward: { card: true } },
  { key: 'OPENER_II', name: 'Opener II', description: 'Opened 50 packs', field: 'openedPacks', threshold: 50, reward: { card: true } },
  { key: 'OPENER_III', name: 'Opener III', description: 'Opened 100 packs', field: 'openedPacks', threshold: 100, reward: { packs: 1 } },
  // Collection achievements
  { key: 'FAVORITE_CARD', name: 'Card Fan', description: 'Set a favorite card', field: 'favoriteCard', threshold: 1, reward: { card: true } },
  { key: 'MODDED_CARD', name: 'Modifier Collector', description: 'Obtain a card with a modifier', field: 'hasModifierCard', threshold: 1, reward: { card: true } },
  { key: 'LEGENDARY_CARD', name: 'Legendary Collector', description: 'Acquire a Legendary or better card', field: 'hasLegendaryCard', threshold: 1, reward: { packs: 1 } },
  { key: 'COLLECTOR_I', name: 'Collector I', description: 'Own 10 unique cards', field: 'uniqueCards', threshold: 10, reward: { card: true } },
  { key: 'COLLECTOR_II', name: 'Collector II', description: 'Own 50 unique cards', field: 'uniqueCards', threshold: 50, reward: { card: true } },
  { key: 'COLLECTOR_III', name: 'Collector III', description: 'Own 100 unique cards', field: 'uniqueCards', threshold: 100, reward: { packs: 1 } },
  { key: 'FULL_SET', name: 'Full Set Achiever', description: 'Own every rarity of a single card', field: 'fullSets', threshold: 1, reward: { packs: 1 } },
  // Login milestones
  { key: 'LOGIN_I', name: 'Regular I', description: 'Login 10 times', field: 'loginCount', threshold: 10, reward: { card: true } },
  { key: 'LOGIN_II', name: 'Regular II', description: 'Login 50 times', field: 'loginCount', threshold: 50, reward: { card: true } },
  { key: 'LOGIN_III', name: 'Regular III', description: 'Login 100 times', field: 'loginCount', threshold: 100, reward: { packs: 1 } },
  { key: 'FIRST_LOGIN', name: 'First Login', description: 'Login for the first time', field: 'loginCount', threshold: 1, reward: { card: true } },
  { key: 'DAILY_STREAK', name: 'Daily Streak', description: 'Log in 7 days in a row', field: 'loginStreak', threshold: 7, reward: { packs: 1 } },
  // Profile customization
  { key: 'FEATURED_FAN', name: 'Featured Fan', description: 'Feature any card on your profile', field: 'featuredCardsCount', threshold: 1, reward: { card: true } },
  { key: 'SHOWCASE_PRO', name: 'Showcase Pro', description: 'Feature four cards at once', field: 'featuredCardsCount', threshold: 4, reward: { packs: 1 } },
  // Market purchases
  { key: 'FIRST_PURCHASE', name: 'First Purchase', description: 'Buy your first card from the market', field: 'completedPurchases', threshold: 1, reward: { card: true } },
  { key: 'BUYER_I', name: 'Buyer I', description: 'Buy 10 cards from listings', field: 'completedPurchases', threshold: 10, reward: { card: true } },
  { key: 'BUYER_II', name: 'Buyer II', description: 'Buy 50 cards from listings', field: 'completedPurchases', threshold: 50, reward: { card: true } },
  { key: 'BUYER_III', name: 'Buyer III', description: 'Buy 100 cards from listings', field: 'completedPurchases', threshold: 100, reward: { packs: 1 } },
  // Additional milestones
  { key: 'MASTER_TRADER', name: 'Master Trader', description: 'Complete 200 trades', field: 'completedTrades', threshold: 200, reward: { packs: 1 } },
  { key: 'PACK_ADDICT', name: 'Pack Addict', description: 'Open 500 packs', field: 'openedPacks', threshold: 500, reward: { packs: 2 } },
  { key: 'MODIFIER_HUNTER', name: 'Modifier Hunter', description: 'Own 10 cards with modifiers', field: 'modifierCards', threshold: 10, reward: { card: true } },
  { key: 'RARITY_HUNTER', name: 'Rarity Hunter', description: 'Collect at least one card of every rarity', field: 'raritiesOwned', threshold: 10, reward: { packs: 1 } },
  { key: 'SET_MASTER', name: 'Set Master', description: 'Own 10 full card sets', field: 'fullSets', threshold: 10, reward: { packs: 2 } },
  { key: 'LEGEND_HOARDER', name: 'Legend Hoarder', description: 'Own 250 unique cards', field: 'uniqueCards', threshold: 250, reward: { packs: 2 } },
];
