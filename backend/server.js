const express = require('express');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');
const morgan = require('morgan');
const http = require('http');
const fs = require('fs');
const path = require('path');
const Setting = require('./src/models/settingsModel');
const cron = require('node-cron');
require('dotenv').config();

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const uploadDir = path.join(__dirname, 'public/uploads/cards');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);

const socketIo = require('socket.io');
const io = socketIo(server, {
    cors: { origin: process.env.CLIENT_URL || "http://localhost:3000" },
});

const { initializeQueueService, markAsReady, handleOverlayDisconnect } = require('./src/services/queueService');
const {handleMonthlyPayout} = require("./src/services/payoutService");
const { expireOldMarketListings, DEFAULT_LISTING_MAX_AGE_DAYS } = require('./src/services/marketCleanupService');
const { startYouTubeRelay } = require('./src/services/youtubeRelayService');

const socketUserMap = new Map();
const overlaySocketMap = new Map();

initializeQueueService(io, overlaySocketMap);


// --- AUTOMATED MONTHLY PAYOUT ---
// This cron string means: "At 02:00 on day 1 of every month."
// (Minute: 0, Hour: 2, Day-of-Month: 1, Month: *, Day-of-Week: *)
console.log('[Scheduler] Initializing monthly payout job.');
cron.schedule('0 2 1 * *', async () => {
    console.log('[Scheduler] Running scheduled monthly payout...');
    try {
        await handleMonthlyPayout();
        console.log('[Scheduler] Monthly payout completed successfully.');
    } catch (error) {
        console.error('[Scheduler] Monthly payout FAILED:', error);
    }
}, {
    timezone: "Europe/London"
});

// --- AUTOMATED MARKET LISTING EXPIRY ---
// This cron string means: "At 03:00 every day."
console.log('[Scheduler] Initializing market listing expiry job.');
cron.schedule('0 3 * * *', async () => {
    console.log(`[Scheduler] Running market listing expiry (>${DEFAULT_LISTING_MAX_AGE_DAYS} days)...`);
    try {
        const { expiredCount } = await expireOldMarketListings();
        console.log(`[Scheduler] Market listing expiry completed. Expired: ${expiredCount}.`);
    } catch (error) {
        console.error('[Scheduler] Market listing expiry FAILED:', error);
    }
}, {
    timezone: "Europe/London"
});



io.on('connection', (socket) => {
    // console.log('A client connected:', socket.id);

    socket.on('join', (userId) => {
        socket.join(userId);
        socketUserMap.set(socket.id, userId);
        console.log(`Socket ${socket.id} joined room for user ID: ${userId}`);
    });

    socket.on('register-overlay', (userId) => {
        console.log(`Socket ${socket.id} REGISTERED as overlay for user ${userId}`);
        overlaySocketMap.set(userId, socket.id);
        markAsReady(socket.id);
    });

    socket.on('animation-complete', () => {
        console.log(`Socket ${socket.id} signaled animation complete.`);
        markAsReady(socket.id);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        const userId = socketUserMap.get(socket.id);
        if (userId) {
            if (overlaySocketMap.get(userId) === socket.id) {
                console.log(`Overlay socket ${socket.id} for user ${userId} disconnected.`);
                overlaySocketMap.delete(userId);
                handleOverlayDisconnect(userId);
            }
            socketUserMap.delete(socket.id);
        }
    });
});

app.use((req, res, next) => {
    req.io = io;
    next();
});

app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));

const rawBodyMiddleware = (req, res, buf, encoding) => {
    if (req.originalUrl === '/api/twitch/webhook') {
        req.rawBody = buf.toString(encoding || 'utf-8');
    }
};

app.use(session({
    secret: process.env.SESSION_SECRET || "your-session-secret",
    resave: false,
    saveUninitialized: false,
}));

app.use(morgan('dev'));

if (require.main === module) {
    console.log("ATTEMPTING TO CONNECT WITH URI:", process.env.MONGO_URI);
    mongoose
        .connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        .then(() => {
            console.log("MongoDB connected successfully");
            Setting.initialize();
        })
        .catch((err) => {
            console.error("MongoDB connection error:", err.message);
            process.exit(1);
        });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        startYouTubeRelay();
    });
}

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.get('/', (req, res) => { res.status(200).send('OK'); });
app.get('/health', (req, res) => { res.status(200).json({ status: 'ok' }); });

app.use(express.json({ verify: rawBodyMiddleware, limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', require('./src/routes/authRoutes')(io));
app.use('/api/twitch', require('./src/routes/twitchRoutes'));
app.use('/api/admin', require('./src/routes/uploadRoutes'));
app.use('/api/packs', require('./src/routes/packRoutes'));
app.use('/api/users', require('./src/routes/collectionRoutes'));
app.use('/api/cards', require('./src/routes/cardRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/binders', require('./src/routes/binderRoutes'));
app.use('/api/trades', require('./src/routes/tradeRoutes'));
app.use('/api/market', require('./src/routes/MarketRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));
app.use('/api/test-notification', require('./src/routes/testNotificationRoutes'));
app.use('/api/grading', require('./src/routes/gradingRoutes'));
app.use('/api/modifiers', require('./src/routes/modifierRoutes'));
app.use('/api/achievements', require('./src/routes/achievementRoutes'));
app.use('/api/settings', require('./src/routes/settingsRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/events', require('./src/routes/eventRoutes'));
app.use('/api/log', require('./src/routes/logRoutes'));
app.use('/api/bounty', require('./src/routes/bountyRoutes'));
app.use('/api/community', require('./src/routes/communityRoutes'));
app.use('/api/external', require('./src/routes/externalRoutes'));


app.use((req, res) => { res.status(500).json({ message: "Route not found" }); });
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
});

server.headersTimeout = 120000;
server.keepAliveTimeout = 120000;

module.exports = server;
