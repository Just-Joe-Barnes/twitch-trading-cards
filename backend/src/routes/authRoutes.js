// src/routes/authRoutes.js
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
        console.log("[AuthRoutes] process.env.FRONTEND_URL:", process.env.FRONTEND_URL);

        const user = req.user;
        console.log("Twitch login successful, user:", user);

        // Check if the user already exists in the database
        let dbUser = await User.findOne({ twitchId: user.id });

        if (!dbUser) {
            console.log("New user detected, awarding 1 login pack.");
            let newUserData = {
                twitchId: user.id,
                username: user.display_name,
                packs: 1, // Award 1 pack on first login
                firstLogin: false, // Set firstLogin to false after awarding
            };
            if (user.email) {
                newUserData.email = user.email;
            }
            dbUser = await User.create(newUserData);
        } else {
            console.log("Returning user detected, checking firstLogin status.");
            if (dbUser.firstLogin) {
                console.log(`User ${dbUser.username} is logging in for the first time.`);
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

        // Persist admin status for the designated admin Twitch ID ("77266375")
        if (dbUser.twitchId === "77266375" && !dbUser.isAdmin) {
            dbUser.isAdmin = true;
            await dbUser.save();
        }

        // Generate JWT token using the persisted admin flag
        const token = jwt.sign(
            {
                id: dbUser.twitchId,
                isAdmin: dbUser.isAdmin,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        console.log("Generated JWT Token:", token);

        const redirectUrl = `${FRONTEND_URL}/login?token=${token}`;
        console.log("[AuthRoutes] Redirecting to:", redirectUrl);

        res.redirect(redirectUrl);
    }
);

// Route to check user authentication status and return full user profile
router.post("/validate", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    console.log("[AUTH VALIDATE] Token received:", token);

    if (!token) {
        console.log("[AUTH VALIDATE] No token provided");
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("[AUTH VALIDATE] Token decoded:", decoded);
        // Fetch the full user profile from the database
        const user = await User.findOne({ twitchId: decoded.id }).select('-password');
        if (!user) {
            console.log("[AUTH VALIDATE] User not found for Twitch ID:", decoded.id);
            return res.status(401).json({ message: "User not found" });
        }
        console.log("[AUTH VALIDATE] User validated:", user.username);
        res.status(200).json(user);
    } catch (err) {
        console.log("[AUTH VALIDATE] Token validation failed:", err.message);
        return res.status(401).json({ message: "Invalid token" });
    }
});

// Route to check user authentication status (using passport)
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

module.exports = router;
