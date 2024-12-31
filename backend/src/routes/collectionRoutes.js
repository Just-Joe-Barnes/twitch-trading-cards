const express = require('express');
const { getCollection } = require('../controllers/collectionController'); // Ensure correct path
const authMiddleware = require('../middleware/authMiddleware'); // Ensure authMiddleware is correctly implemented
const router = express.Router();

// Route for getting the user's card collection
router.get('/user/:userId', authMiddleware.protect, getCollection);

module.exports = router;
