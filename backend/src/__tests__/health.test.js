const request = require('supertest');
const server = require('../../server'); // Import the http server instance
const dbHandler = require('./db-handler'); // We need the db handler to connect/disconnect

describe('GET /health', () => {
    // Before any tests run, connect to the database and start the server
    beforeAll(async () => {
        await dbHandler.connect();
    });

    // After all tests are done, close the database connection and the server
    afterAll(async () => {
        await dbHandler.closeDatabase();
        server.close();
    });

    it('should respond with a 200 status code and a status of "ok"', async () => {
        const response = await request(server)
            .get('/health')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toBe('ok');
    });
});
