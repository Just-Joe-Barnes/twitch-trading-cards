// server.js

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');
const morgan = require('morgan');
const http = require('http'); // Ensure we use http for Socket.io compatibility
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const packRoutes = require('./src/routes/packRoutes');
const collectionRoutes = require('./src/routes/collectionRoutes');
const userRoutes = require('./src/routes/userRoutes');
const twitchRoutes = require('./src/routes/twitchRoutes');
const cardRoutes = require('./src/routes/cardRoutes');
const tradeRoutes = require('./src/routes/tradeRoutes');
const marketRoutes = require('./src/routes/MarketRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const testNotificationRoutes = require('./src/routes/testNotificationRoutes');

const app = express();
const server = http.createServer(app); // Use http server for Socket.io

// Use an environment variable (e.g., CLIENT_URL) with a fallback to localhost
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));

// Middleware to handle raw body only for Twitch webhook
const rawBodyMiddleware = (req, res, buf, encoding) => {
    if (req.originalUrl === '/api/twitch/webhook') {
        req.rawBody = buf.toString(encoding || 'utf-8');
    }
};
app.use(express.json({ verify: rawBodyMiddleware }));

// General Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || "your-session-secret",
    resave: false,
    saveUninitialized: false,
}));

// Logging middleware
app.use(morgan('dev'));

// MongoDB Connection
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

// Root endpoint (useful for Render's health check)
app.get('/', (req, res) => {
    res.status(200).send('OK');
});

// Health Check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/packs', packRoutes);
app.use('/api/users', collectionRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/twitch', twitchRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/test-notification', testNotificationRoutes); // Ensure this is correctly set up

// Default 404 handler (for any unmatched routes)
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
});

// Start server: bind to 0.0.0.0 so external traffic can connect
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Optional: Increase timeouts if needed (uncomment to enable)
server.headersTimeout = 120000; // 120 seconds
server.keepAliveTimeout = 120000;

// Socket.io integration
const socketIo = require('socket.io');
const io = socketIo(server, {
    cors: { origin: process.env.CLIENT_URL || "http://localhost:3000" },
});

const connectedUsers = {}; // Track connected users

// When a client connects, store their socket using their user ID
io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    // Expect the client to send their user ID
    socket.on('join', (userId) => {
        socket.join(userId);
        connectedUsers[userId] = socket.id;
        console.log(`Socket ${socket.id} joined room: ${userId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        Object.keys(connectedUsers).forEach((userId) => {
            if (connectedUsers[userId] === socket.id) {
                delete connectedUsers[userId];
            }
        });
    });
});

// Function to send a notification to a user
const sendNotification = (userId, notification) => {
    console.log(`Sending notification to user: ${userId}`);
    io.to(userId).emit('newNotification', notification);
};

// Export sendNotification so other modules can use it
module.exports.sendNotification = sendNotification;
