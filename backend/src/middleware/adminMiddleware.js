const adminMiddleware = (req, res, next) => {
    // Your user ID from MongoDB
    const adminUserId = '67902369038799d79f21246f';

    // Debugging: Log the userId for validation
    console.log('[AdminMiddleware] req.userId:', req.userId);

    // Check if the logged-in user's ID matches the admin ID
    if (req.userId !== adminUserId) {
        return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    // Proceed to the next middleware or route handler
    next();
};

module.exports = adminMiddleware;
