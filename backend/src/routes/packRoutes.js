const express = require('express');
const { body, validationResult } = require('express-validator');
const { openPack } = require('../controllers/packController');
const router = express.Router();

router.post(
    '/open',
    [
        body('userId')
            .isString()
            .withMessage('User ID must be a string.')
            .notEmpty()
            .withMessage('User ID is required.'),
    ],
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: true, errors: errors.array() });
        }
        next();
    },
    openPack
);

module.exports = router;
