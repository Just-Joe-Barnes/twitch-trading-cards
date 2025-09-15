// /server.js

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');
const morgan = require('morgan');
const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();


// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'public/uploads/cards');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);

// --- SOCKET.IO INITIALIZATION ---
const socketIo = require('socket.io');
const io = socketIo(server, {
    cors: { origin: process.env.CLIENT_URL || "http://localhost:3000" },
});

const { initializeQueueService, markAsReady } = require('./src/services/queueService');
initializeQueueService(io);

const connectedUsers = {};

io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);
    socket.on('join', (userId) => {
        socket.join(userId);
        connectedUsers[userId] = socket.id;
        console.log(`Socket ${socket.id} joined room for user ID: ${userId}`);
    });
    socket.on('animation-complete', () => {
        console.log(`Socket ${socket.id} signaled animation complete.`);
        markAsReady(socket.id);
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        Object.keys(connectedUsers).forEach((userId) => {
            if (connectedUsers[userId] === socket.id) {
                delete connectedUsers[userId];
            }
        });
    });
});
// --- END OF SOCKET.IO INITIALIZATION ---

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
    mongoose
        .connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        .then(() => console.log("MongoDB connected successfully"))
        .catch((err) => {
            console.error("MongoDB connection error:", err.message);
            process.exit(1);
        });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.get('/', (req, res) => { res.status(200).send('OK'); });
app.get('/health', (req, res) => { res.status(200).json({ status: 'ok' }); });

app.use(express.json({ verify: rawBodyMiddleware, limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- UPDATED ROUTE USAGE ---
// Using inline require statements prevents module initialization order issues.
app.use('/api/auth', require('./src/routes/authRoutes')(io));
app.use('/api/twitch', require('./src/routes/twitchRoutes'));
app.use('/api/admin', require('./src/routes/uploadRoutes'));
app.use('/api/packs', require('./src/routes/packRoutes'));
app.use('/api/users', require('./src/routes/collectionRoutes'));
app.use('/api/cards', require('./src/routes/cardRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/trades', require('./src/routes/tradeRoutes'));
app.use('/api/market', require('./src/routes/MarketRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));
app.use('/api/test-notification', require('./src/routes/testNotificationRoutes'));
app.use('/api/grading', require('./src/routes/gradingRoutes'));
app.use('/api/modifiers', require('./src/routes/modifierRoutes'));
app.use('/api/achievements', require('./src/routes/achievementRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/events', require('./src/routes/eventRoutes'));
app.use('/api/log', require('./src/routes/logRoutes'));
app.use('/api/bounty', require('./src/routes/bountyRoutes'));
app.use('/api/external', require('./src/routes/externalRoutes'));


app.use((req, res) => { res.status(404).json({ message: "Route not found" }); });
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
});

server.headersTimeout = 120000;
server.keepAliveTimeout = 120000;

module.exports = server;

