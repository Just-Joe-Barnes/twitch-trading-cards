const mongoose = require('mongoose');
const User = require('../src/models/userModel');
const { gradeCard } = require('../src/controllers/gradingController');

jest.mock('../src/models/userModel');

describe('grading controller', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns error when missing params', async () => {
    const req = { body: {}, user: { isAdmin: true } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await gradeCard(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
