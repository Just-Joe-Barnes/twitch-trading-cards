require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const packRoutes = require('./src/routes/packRoutes');
const cardRoutes = require('./src/routes/cardRoutes');
const adminRoutes = require('./src/routes/adminRoutes'); // Import adminRoutes
const mintingLogRoutes = require('./src/routes/mintingLogRoutes');
const collectionRoutes = require('./src/routes/collectionRoutes'); // Import collectionRoutes

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB Connection
mongoose
    .connect(process.env.DATABASE_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err.message);
        process.exit(1); // Exit process if MongoDB connection fails
    });

// Middleware
app.use(express.json());
app.use(
    cors({
        origin: 'http://localhost:3000',
        credentials: true,
    })
);

// Serve static files from the 'public' folder
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'secret',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: process.env.DATABASE_URL }),
        cookie: { secure: false, httpOnly: true, maxAge: 60 * 60 * 1000 }, // 1 hour
    })
);

// Routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/packs', packRoutes); // Pack routes for handling opening packs
app.use('/cards', cardRoutes); // Card routes for handling card management
app.use('/admin', adminRoutes); // Add admin routes
app.use('/minting', mintingLogRoutes);
app.use('/api/collection', collectionRoutes); // Add collection routes

// Root route for health check
app.get('/', (req, res) => {
    res.send('Backend server is running.');
});

// Start server
app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`)
);
