const request = require('supertest');
const jwt = require('jsonwebtoken');
const server = require('../../server'); // The running server instance
const dbHandler = require('./db-handler');
const User = require('../models/userModel');

// We need mongoose to create specific ObjectIDs for testing
const mongoose = dbHandler.mongoose;

describe('Authentication and User Routes', () => {

    // Connect to the in-memory database before all tests
    beforeAll(async () => await dbHandler.connect());

    // Clear all test data after each test
    afterEach(async () => await dbHandler.clearDatabase());

    // Disconnect from the database and close the server after all tests
    afterAll(async () => {
        await dbHandler.closeDatabase();
        server.close();
    });


    /**
     * =================================================================
     * LOGIN TESTS (/api/auth)
     * =================================================================
     */
    describe('GET /api/auth/twitch (Dev Login)', () => {
        it('should login as a dev user and redirect with a token', async () => {
            // Setup: Create the hardcoded dev user that the route looks for
            const devUserId = '67bb86d40e52af8a17da00fd';
            await User.create({
                _id: new mongoose.Types.ObjectId(devUserId),
                username: 'ItchyBeard',
                twitchId: '12345',
                isAdmin: true,
            });

            // Action: Make a request to the dev login endpoint
            const response = await request(server)
                .get('/api/auth/twitch')
                .expect(302); // Expect a redirect

            // Assertion: Check that the redirect URL contains a token
            const redirectUrl = response.headers.location;
            expect(redirectUrl).toContain('/login?token=');

            // Optional but good: Verify the token is valid
            const token = redirectUrl.split('token=')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            expect(decoded.id).toBe('12345');
            expect(decoded.isAdmin).toBe(true);
        });
    });


    /**
     * =================================================================
     * USER PROFILE & COLLECTION TESTS (/api/users)
     * =================================================================
     */
    describe('Protected User Routes', () => {
        let testUser;
        let token;

        // Before each test in this block, create a user and generate a token
        beforeEach(async () => {
            testUser = await User.create({
                username: 'testuser',
                twitchId: '98765',
                isAdmin: false,
                cards: [
                    { name: 'Card A', rarity: 'Common', mintNumber: 1 },
                    { name: 'Card B', rarity: 'Rare', mintNumber: 101 },
                ]
            });

            token = jwt.sign({ id: testUser.twitchId, isAdmin: testUser.isAdmin }, process.env.JWT_SECRET);
        });

        it('should fetch the logged-in user profile via GET /api/users/me', async () => {
            const response = await request(server)
                .get('/api/users/me')
                .set('Authorization', `Bearer ${token}`) // Set the auth header
                .expect(200);

            expect(response.body.username).toBe('testuser');
            expect(response.body.twitchId).toBe('98765');
        });

        it('should fetch a user profile by username via GET /api/users/profile/:username', async () => {
            const response = await request(server)
                .get(`/api/users/profile/testuser`)
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body.username).toBe('testuser');
        });

        it('should fetch a user collection via GET /api/users/:userId/collection', async () => {
            const response = await request(server)
                .get(`/api/users/${testUser._id}/collection`)
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body).toHaveProperty('cards');
            expect(response.body.cards).toHaveLength(2);
            expect(response.body.cards[0].name).toBe('Card A');
        });
    });
});
