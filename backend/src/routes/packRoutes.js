const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
    getMyPacks,
    openPack,
    getUsersWithPacks,
    getAllPacks,
    openPacksForUser,
    debugOpenPackForUser,
    openPackById, // Make sure this is defined in packController
} = require('../controllers/packController');

// Route definitions
router.get('/mypacks', protect, getMyPacks); // Fetch user's unopened packs
router.get('/usersWithPacks', protect, adminOnly, getUsersWithPacks); // Admin: Fetch all users with unopened packs
router.post('/openpack', protect, openPack); // Open a pack for the authenticated user
router.get('/allpacks', protect, adminOnly, getAllPacks); // Admin: Fetch all packs
router.post('/admin/openPacksForUser/:userId', protect, adminOnly, openPacksForUser); // Admin: Open packs for a specific user
router.post('/admin/debugOpenPack/:userId', protect, adminOnly, debugOpenPackForUser); // Admin: Generate pack without side effects
router.get('/open/:packId', protect, adminMiddleware, openPackById); // Admin: Open a specific pack by ID

module.exports = router;
