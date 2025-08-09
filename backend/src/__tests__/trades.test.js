const dbHandler = require('./db-handler');
const mongoose = dbHandler.mongoose;
const User = require('../models/userModel');
const tradeService = require('../services/tradeService');

jest.mock('../../notificationService');

describe('Trade Service', () => {
    beforeAll(async () => await dbHandler.connect());
    afterEach(async () => await dbHandler.clearDatabase());
    afterAll(async () => await dbHandler.closeDatabase());

    it('should create a trade successfully', async () => {
        const sender = await User.create({ username: 'sender', twitchId: '1', packs: 5 });
        const recipient = await User.create({ username: 'recipient', twitchId: '2', packs: 5 });
        const senderCard = { _id: new mongoose.Types.ObjectId(), name: 'Card A', rarity: 'Rare', mintNumber: 1, status: 'available' };
        const recipientCard = { _id: new mongoose.Types.ObjectId(), name: 'Card B', rarity: 'Rare', mintNumber: 2, status: 'available' };
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
