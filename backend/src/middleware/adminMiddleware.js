const { isSuperAdminUserId } = require('../utils/superAdmin');

const adminMiddleware = (req, res, next) => {
    const userId = req.userId || req.user?.id || req.user?._id;
    const isAllowed = Boolean(req.isAdmin) || isSuperAdminUserId(userId);

    if (!isAllowed) {
        return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    req.isAdmin = true;
    next();
};

module.exports = adminMiddleware;
