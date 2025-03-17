const express = require('express');
const http = require('http'); // <-- Import http module
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const packRoutes = require('./src/routes/packRoutes');
const collectionRoutes = require('./src/routes/collectionRoutes');
const userRoutes = require('./src/routes/userRoutes');
const twitchRoutes = require('./src/routes/twitchRoutes');
const cardRoutes = require('./src/routes/cardRoutes');
const tradeRoutes = require('./src/routes/tradeRoutes');
const marketRoutes = require('./src/routes/MarketRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes'); // ✅ Added missing import

const app = express();

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
app.use('/api/notifications', notificationRoutes); // ✅ Fixed duplicate /api mount

// Default 404 handler (for any unmatched routes)
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
});

// Create HTTP server (to attach Socket.io)
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// ✅ Fixed Socket.io Integration
const socketIo = require('socket.io');
const io = socketIo(server, {
    cors: { origin: process.env.CLIENT_URL || "http://localhost:3000" },
});

// When a client connects, store their socket using their user ID (this is one strategy)
io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    // Optionally, expect the client to send their user ID for room joining:
    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`Socket ${socket.id} joined room: ${userId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Example function to send a notification (to be called by your business logic)
const sendNotification = (userId, notification) => {
    io.to(userId).emit('newNotification', notification);
};

// Start server on the correct `server` instance
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Export sendNotification for other modules
module.exports = { server, io, sendNotification };

// At the bottom, before the error handling middleware
const testNotificationRoutes = require('./src/routes/testNotificationRoutes');
app.use('/api', testNotificationRoutes);