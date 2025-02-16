const express = require('express');
const { getCollectionByIdentifier, getLoggedInUserCollection } = require('../controllers/collectionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Route for fetching the logged-in user's collection
router.get('/', protect, getLoggedInUserCollection);

// Route for fetching another user's collection by identifier
router.get('/:identifier/collection', protect, getCollectionByIdentifier);

module.exports = router;
