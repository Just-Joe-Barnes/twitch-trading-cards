const express = require('express');
const router = express.Router();
const multer = require('multer');
const ftp = require('basic-ftp');
const path = require('path');
const { Readable } = require('stream');
const { protect } = require('../middleware/authMiddleware');

// Middleware to check admin privileges
const adminOnly = (req, res, next) => {
    if (!req.user || (!req.user.isAdmin && req.user.username !== 'ItchyBeard')) {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
};

const slugify = (text) => {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
});

router.post('/upload-image', protect, adminOnly, upload.single('image'), async (req, res) => {
    const { cardName } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    if (!cardName) return res.status(400).json({ message: 'Card name is required.' });

    const client = new ftp.Client();
    try {
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
        });
        const slug = slugify(cardName);
        const timestamp = Date.now();
        const fileExtension = path.extname(req.file.originalname);
        const uniqueFileName = `${slug}-${timestamp}${fileExtension}`;
        const remotePath = `${process.env.FTP_REMOTE_PATH}/${uniqueFileName}`;
        const readableStream = Readable.from(req.file.buffer);
        await client.uploadFrom(readableStream, remotePath);
        const imageUrl = `${process.env.FTP_PUBLIC_BASE_URL}/${uniqueFileName}`;
        res.json({ imageUrl });
    } catch (error) {
        console.error('FTP Upload Error:', error);
        res.status(500).json({ message: 'Failed to upload file to FTP server.', error: error.message });
    } finally {
        if (!client.closed) client.close();
    }
});

module.exports = router;
