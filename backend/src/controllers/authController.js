const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Twitch login callback with redirect including token
exports.twitchCallback = async (req, res) => {
    const { twitchId, login, email } = req.user;

    try {
        // Find or create the user in the database
        let user = await User.findOne({ twitchId });
        if (!user) {
            user = await User.create({
                twitchId,
                username: login,
                email,
            });
        }

        // Ensure isAdmin is properly set in the database
        if (!user.isAdmin) {
            user.isAdmin = false;
            await user.save();
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log('[Twitch Callback] Generated JWT Token:', token);

        // Redirect the user to the frontend with the token
        res.redirect(`http://localhost:3000/login?token=${token}`);
    } catch (error) {
        console.error('[Twitch Callback] Error:', error.message);
        res.status(500).json({ message: 'Server error during Twitch login' });
    }
};

exports.login = async (req, res) => {
    const { twitchId } = req.body;

    try {
        const user = await User.findOne({ twitchId });

        if (!user) {
            console.log('[AUTH LOGIN] User not found:', twitchId);
            return res.status(404).json({ message: 'User not found' });
        }

        // Ensure isAdmin is properly set in the database
        if (!user.isAdmin) {
            user.isAdmin = false;
            await user.save();
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        console.log('[AUTH LOGIN] Generated JWT Token:', token);

        res.status(200).json({ token, username: user.username, isAdmin: user.isAdmin });
    } catch (error) {
        console.error('[AUTH LOGIN] Error during login:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.validateToken = (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('[AUTH USER] Token received:', token);

    if (!token) {
        console.warn('[AUTH USER] No token provided');
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('[AUTH USER] Token validation failed:', err.message);
            return res.status(401).json({ message: 'Invalid token' });
        }

        console.log('[AUTH USER] Token valid for user ID:', decoded.id);
        res.status(200).json({ userId: decoded.id, isAdmin: decoded.isAdmin });
    });
};
