const express = require("express");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
require("dotenv").config();

const authRoutes = require('./src/routes/authRoutes');

const app = express();

// Session middleware
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
    })
);

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Use routes
app.use("/api/auth", authRoutes);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../frontend/build")));

// Catch-all handler for React
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
