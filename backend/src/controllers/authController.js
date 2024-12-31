const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.login = async (req, res) => {
    const { twitchId } = req.body;
    try {
        const user = await User.findOne({ twitchId });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ token, username: user.username });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.validateToken = (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Invalid token' });

        res.status(200).json({ message: 'Token is valid', userId: decoded.id });
    });
};
