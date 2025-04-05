const mongoose = require('mongoose');
const Trade = require('../src/models/tradeModel');
const User = require('../src/models/userModel');
const tradeService = require('../src/services/tradeService');

describe('Trade Service', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should create a trade successfully', async () => {
    const sender = await User.create({ username: 'sender', packs: 5 });
    const recipient = await User.create({ username: 'recipient', packs: 5 });

    const senderCard = { name: 'Card A', rarity: 'Rare', mintNumber: 1, status: 'available' };
    const recipientCard = { name: 'Card B', rarity: 'Rare', mintNumber: 2, status: 'available' };

    sender.cards.push(senderCard);
    recipient.cards.push(recipientCard);
    await sender.save();
    await recipient.save();

    const result = await tradeService.createTrade(sender._id, {
      recipient: recipient._id.toString(),
      offeredItems: [sender.cards[0]._id.toString()],
      requestedItems: [recipient.cards[0]._id.toString()],
      offeredPacks: 1,
      requestedPacks: 1
    });

    expect(result.success).toBe(true);
    expect(result.trade).toBeDefined();
  });
});
