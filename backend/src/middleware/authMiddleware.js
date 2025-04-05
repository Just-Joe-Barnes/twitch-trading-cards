const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract the token from the Authorization header
            token = req.headers.authorization.split(' ')[1];
            console.log('[AUTH VALIDATE] Token received:', token);

            // Decode and verify the token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('[AUTH VALIDATE] Decoded token:', decoded);

            // Find the user by `twitchId` or `_id` based on the token payload
            req.user = await User.findOne({ twitchId: decoded.id }).select('-password');
            if (!req.user) {
                console.error('[AUTH VALIDATE] User not found for Twitch ID:', decoded.id);
                return res.status(401).json({ message: 'User not found' });
            }

            // Attach user details to the request for downstream use
            req.userId = req.user._id.toString();
            req.username = req.user.username; // Attach username to the request
            req.twitchId = req.user.twitchId; // Attach Twitch ID to the request
            req.isAdmin = req.user.isAdmin; // Attach admin status
            console.log('[AUTH VALIDATE] User validated:', req.user.username);

            // Update lastActive timestamp on every authenticated request
            req.user.lastActive = new Date();
            await req.user.save();

            next(); // Proceed to the next middleware or route
        } catch (error) {
            console.error('[AUTH VALIDATE] Token error:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

// Middleware to restrict access to admin-only routes
const adminOnly = (req, res, next) => {
    if (req.isAdmin) {
        console.log('[ADMIN CHECK] Admin access granted for user:', req.username);
        next(); // Proceed to the next middleware or route
    } else {
        console.error('[ADMIN CHECK] Access denied for user:', req.username);
        return res.status(403).json({ message: 'Access denied: Admins only' });
    }
};

module.exports = { protect, adminOnly };
