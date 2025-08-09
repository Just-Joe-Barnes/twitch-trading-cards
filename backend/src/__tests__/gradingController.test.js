// FIXED: Import the actual exported function 'startGrading'
const { startGrading } = require('../controllers/gradingController');
const User = require('../models/userModel');

jest.mock('../models/userModel');

describe('Grading Controller - startGrading', () => {
    afterEach(() => jest.clearAllMocks());

    it('returns a 400 error when required parameters are missing', async () => {
        const req = { body: {} };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await startGrading(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'userId and cardId are required' });
    });

    // You can now add more tests for startGrading, completeGrading etc.
});
