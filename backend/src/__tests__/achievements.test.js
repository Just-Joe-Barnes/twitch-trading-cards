const request = require('supertest');
const jwt = require('jsonwebtoken');
const server = require('../../server');
const dbHandler = require('./db-handler');
const User = require('../models/userModel');
const Trade = require('../models/tradeModel'); // <-- 1. Import the Trade model

// Mocks remain the same
jest.mock('../../../config/achievements', () => ([
    {
        name: 'Master Trader',
        description: 'Complete 10 trades.',
        field: 'completedTrades',
        threshold: 10,
        reward: { packs: 5 },
    },
]));
jest.mock('../helpers/achievementHelper', () => ({
    checkAndGrantAchievements: jest.fn().mockResolvedValue(true),
}));
jest.mock('../helpers/cardHelpers', () => ({
    generateCardWithProbability: jest.fn().mockResolvedValue({
        name: 'Test Reward Card',
        rarity: 'Rare',
        mintNumber: 1,
    }),
}));


describe('Achievement Routes', () => {
    let testUser;
    let token;

    beforeAll(async () => await dbHandler.connect());

    // The beforeEach setup is now split for different tests
    beforeEach(async () => {
        // Clear mocks before each test
        jest.clearAllMocks();
    });

    afterEach(async () => await dbHandler.clearDatabase());

    afterAll(async () => {
        await dbHandler.closeDatabase();
        server.close();
    });

    describe('GET /api/achievements', () => {
        it('should return a list of achievements with correct progress', async () => {
            // --- 2. UPDATED SETUP FOR THIS TEST ---
            // Create two users to trade between
            testUser = await User.create({ username: 'achieveuser', twitchId: '112233' });
            const otherUser = await User.create({ username: 'otheruser', twitchId: '445566' });
            token = jwt.sign({ id: testUser.twitchId, isAdmin: false }, process.env.JWT_SECRET);

            // Create 9 completed Trade documents involving the testUser
            const tradePromises = [];
            for (let i = 0; i < 9; i++) {
                tradePromises.push(Trade.create({
                    sender: testUser._id,
                    recipient: otherUser._id,
                    status: 'accepted',
                }));
            }
            await Promise.all(tradePromises);
            // --- END OF UPDATED SETUP ---

            const response = await request(server)
                .get('/api/achievements')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            const achievements = response.body.achievements;
            const masterTraderAch = achievements.find(a => a.name === 'Master Trader');

            expect(masterTraderAch).toBeDefined();
            expect(masterTraderAch.current).toBe(9); // This will now correctly be 9
            expect(masterTraderAch.achieved).toBe(false);
        });
    });

    describe('POST /api/achievements/claim', () => {
        // This test's setup can remain as it is, as it's a more direct unit test
        // of the claiming mechanism, not the achievement granting logic.
        beforeEach(async () => {
            testUser = await User.create({ username: 'achieveuser', twitchId: '112233', packs: 0 });
            token = jwt.sign({ id: testUser.twitchId, isAdmin: false }, process.env.JWT_SECRET);
        });

        it('should allow a user to claim an unlocked, unclaimed achievement', async () => {
            const unlockedAchievement = {
                name: 'Master Trader',
                reward: { packs: 5 },
                claimed: false,
                dateEarned: new Date(),
            };
            testUser.achievements.push(unlockedAchievement);
            await testUser.save();

            const response = await request(server)
                .post('/api/achievements/claim')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Master Trader' })
                .expect(200);

            expect(response.body.success).toBe(true);

            // The user started with 0 packs and the reward is 5 packs
            expect(response.body.packs).toBe(5);

            const updatedUser = await User.findById(testUser._id);
            const claimedAch = updatedUser.achievements.find(a => a.name === 'Master Trader');
            expect(claimedAch.claimed).toBe(true);
        });

        it('should NOT allow a user to claim an already claimed achievement', async () => {
            const claimedAchievement = {
                name: 'Master Trader',
                reward: { packs: 5 },
                claimed: true,
                dateEarned: new Date(),
            };
            testUser.achievements.push(claimedAchievement);
            await testUser.save();

            const response = await request(server)
                .post('/api/achievements/claim')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Master Trader' })
                .expect(400);

            expect(response.body.message).toBe('Reward already claimed');
        });
    });
});
