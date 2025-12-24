const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    getBinderByIdentifier,
    updateBinderByIdentifier,
} = require('../controllers/binderController');

const router = express.Router();

router.get('/:identifier', protect, getBinderByIdentifier);
router.put('/:identifier', protect, updateBinderByIdentifier);

module.exports = router;
