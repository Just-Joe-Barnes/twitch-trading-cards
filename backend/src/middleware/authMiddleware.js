const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const UserActivity = require('../models/UserActivity');

const findUserByTokenId = async (tokenId) => {
    if (mongoose.Types.ObjectId.isValid(tokenId)) {
        return User.findById(tokenId)
            .select(
                'username email isAdmin packs openedPacks loginCount featuredCards favoriteCard preferredPack twitchProfilePic xp level achievements featuredAchievements twitchId'
            )
            .populate('preferredPack', 'name')
            .lean();
    }

    return User.findOne({ twitchId: tokenId })
        .select(
            'username email isAdmin packs openedPacks loginCount featuredCards favoriteCard preferredPack twitchProfilePic xp level achievements featuredAchievements twitchId'
        )
        .populate('preferredPack', 'name')
        .lean();
};

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract the token from the Authorization header
            token = req.headers.authorization.split(' ')[1];
            // console.log('[AUTH VALIDATE] Token received:', token);

            // Decode and verify the token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // console.log('[AUTH VALIDATE] Decoded token:', decoded);

            // Find the user by `twitchId` or `_id` based on the token payload
            req.user = await findUserByTokenId(decoded.id);
            if (!req.user) {
                console.error('[AUTH VALIDATE] User not found for Twitch ID:', decoded.id);
                return res.status(401).json({ message: 'User not found' });
            }

            // Attach user details to the request for downstream use
            // Assign both `_id` and `id` properties to support plain objects
            // returned by `.lean()` while maintaining compatibility with
            // existing controller logic that expects `req.user.id`.
            req.user.id = req.user._id.toString();
            req.userId = req.user.id;
            req.username = req.user.username; // Attach username to the request
            req.twitchId = req.user.twitchId || null; // Attach Twitch ID to the request
            req.isAdmin = req.user.isAdmin; // Attach admin status
            console.log('[AUTH VALIDATE] User validated:', req.user.username);


            /* Exclude certain routes from pinging user activity so it doesn't fail certain actions */
            const excludedRoutes = [
                '/api/trades/:id/status',
            ];

            const isExcluded = excludedRoutes.some(route => {
                const regex = new RegExp(`^${route.replace(/:\w+/g, '[^/]+')}$`);
                return regex.test(req.originalUrl);
            });

            if (!isExcluded && req.user) {
                UserActivity.updateOne(
                    { userId: req.user._id },
                    { $set: { lastActive: new Date() } },
                    { upsert: true }
                ).catch((err) =>
                    console.error('[lastActive update failed]', err)
                );
            }

            next();
        } catch (error) {
            console.error('[AUTH VALIDATE] Token error:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

// Optional protection middleware. It authenticates a user if a token is provided,
// but allows the request to proceed as a "guest" if no token is present or if it's invalid.
const optionalProtect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await findUserByTokenId(decoded.id);

            if (user) {
                req.user = user;
                req.user.id = req.user._id.toString();
                req.userId = req.user.id;
                req.username = req.user.username;
                req.twitchId = req.user.twitchId || null;
                req.isAdmin = req.user.isAdmin;
                console.log('[AUTH OPTIONAL] User validated:', req.user.username);
                // We can also update activity here
                UserActivity.updateOne(
                    { userId: req.user._id },
                    { $set: { lastActive: new Date() } },
                    { upsert: true }
                ).catch((err) =>
                    console.error('[lastActive update failed]', err)
                );
            }
        } catch (error) {
            console.error('[AUTH OPTIONAL] Token present but invalid or user not found. Proceeding as guest.');
        }
    }

    next();
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

module.exports = { protect, adminOnly, optionalProtect };
