const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

const generateRefreshToken = (payload) => {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

const verifyRefreshToken = (token) => {
    return jwt.verify(token, JWT_REFRESH_SECRET);
};

module.exports = { generateToken, generateRefreshToken, verifyRefreshToken };
