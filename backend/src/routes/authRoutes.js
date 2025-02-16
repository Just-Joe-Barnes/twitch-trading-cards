const express = require("express");
const passport = require("../utils/passport");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const router = express.Router();

// Use an environment variable for the front-end URL (fallback to localhost for development)
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Initiate Twitch login
router.get("/twitch", passport.authenticate("twitch"));

// Twitch callback
router.get(
    "/twitch/callback",
    passport.authenticate("twitch", {
        failureRedirect: FRONTEND_URL, // Redirect here if authentication fails
    }),
    async (req, res) => {
        const user = req.user;
        console.log("Twitch login successful, user:", user);

        // Check if the user already exists in the database
        let dbUser = await User.findOne({ twitchId: user.id });

        if (!dbUser) {
            console.log("New user detected, awarding 1 login pack.");
            // Create a new user with 1 pack for the first login
            dbUser = await User.create({
                twitchId: user.id,
                username: user.display_name,
                packs: 1, // Award 1 pack on first login
                firstLogin: false, // Set firstLogin to false after awarding
            });
        } else {
            console.log("Returning user detected, checking firstLogin status.");
            if (dbUser.firstLogin) {
                console.log(`User ${dbUser.username} is logging in for the first time.`);
                // Award pack and update firstLogin
                dbUser = await User.findOneAndUpdate(
                    { twitchId: user.id },
                    { $inc: { packs: 1 }, firstLogin: false },
                    { new: true }
                );
                console.log("1 pack awarded. Updated user:", dbUser);
            } else {
                console.log(`User ${dbUser.username} has already logged in before. No pack awarded.`);
            }
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: dbUser.twitchId,
                isAdmin: dbUser.twitchId === "77266375", // Your ID is set as admin
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        console.log("Generated JWT Token:", token);

        // Redirect to the frontend login page with the token in the query string
        const redirectUrl = `${FRONTEND_URL}/login?token=${token}`;
        console.log("Redirecting to:", redirectUrl);
        res.redirect(redirectUrl);
    }
);

// Route to check user authentication status
router.get("/user", (req, res) => {
    if (req.isAuthenticated()) {
        console.log("User is authenticated:", req.user);
        return res.json(req.user);
    }
    console.log("User not authenticated");
    return res.status(401).json({ message: "Not authenticated" });
});

// Logout route
router.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).json({ message: "Logout failed." });
        }
        console.log("User logged out successfully");
        res.redirect(FRONTEND_URL);
    });
});

// Validate JWT token route
router.post("/validate", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    console.log("[AUTH VALIDATE] Token received:", token);

    if (!token) {
        console.log("[AUTH VALIDATE] No token provided");
        return res.status(401).json({ message: "No token provided" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log("[AUTH VALIDATE] Invalid token:", token);
            return res.status(401).json({ message: "Invalid token" });
        }

        console.log("[AUTH VALIDATE] Token valid for user ID:", decoded.id);
        res.status(200).json({ userId: decoded.id, isAdmin: decoded.isAdmin });
    });
});

module.exports = router;
