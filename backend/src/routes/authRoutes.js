// src/routes/authRoutes.js
const express = require("express");
const passport = require("../utils/passport");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Log = require("../models/logModel");
const { checkAndAwardLoginEvents } = require('../services/eventService');

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://192.168.0.136:3000";

module.exports = function(io) {
    router.get("/twitch", async (req, res, next) => {
        return passport.authenticate('twitch')(req, res, next);
    });

    // Twitch callback
    router.get(
        "/twitch/callback",
        passport.authenticate("twitch", { failureRedirect: FRONTEND_URL }),
        async (req, res) => {
            const user = req.user;

            let dbUser = await User.findOne({ twitchId: user.id });
            if (!dbUser) {
                dbUser = await User.create({
                    twitchId: user.id,
                    username: user.display_name,
                    packs: 1,
                    firstLogin: false,
                    loginCount: 1,
                    loginStreak: 1,
                    lastLogin: new Date(),
                    twitchProfilePic: user.profile_image_url
                });
            } else {
                dbUser.twitchProfilePic = user.profile_image_url;
                dbUser.loginCount = (dbUser.loginCount || 0) + 1;
                if (dbUser.username !== user.display_name) {
                    dbUser.username = user.display_name;
                }
                const now = new Date();
                if (dbUser.lastLogin && (now - dbUser.lastLogin) <= 24 * 60 * 60 * 1000) {
                    dbUser.loginStreak = (dbUser.loginStreak || 0) + 1;
                } else {
                    dbUser.loginStreak = 1;
                }
                dbUser.lastLogin = now;
                await dbUser.save();
            }

            try {
                const message = isNewUser
                    ? `New user created and logged in: ${dbUser.username}`
                    : `User logged in: ${dbUser.username}`;
                console.log(`[LOG] ${message}`);
            } catch (logErr) {
                console.error("Failed to save login log:", logErr);
            }

            const rewardPayloads = await checkAndAwardLoginEvents(dbUser); // It's now an array
            if (rewardPayloads && rewardPayloads.length > 0) {
                dbUser.pendingEventReward = rewardPayloads;
                await dbUser.save();
            }

            if (dbUser.twitchId === "77266375" && !dbUser.isAdmin) {
                dbUser.isAdmin = true;
                await dbUser.save();
            }

            const token = jwt.sign(
                { id: dbUser.twitchId, isAdmin: dbUser.isAdmin },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            const redirectUrl = `${FRONTEND_URL}/login?token=${token}`;
            res.redirect(redirectUrl);
        }
    );

    // Validate JWT token route – returns a minimal user profile
    router.post("/validate", async (req, res) => {
        // ... (this route is fine, no changes needed)
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findOne({ twitchId: decoded.id })
                .select("username email isAdmin packs loginCount xp level twitchProfilePic")
                .lean();
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }
            return res.status(200).json(user);
        } catch (err) {
            return res.status(401).json({ message: "Invalid token" });
        }
    });

    // Route to check authentication status via passport
    router.get("/user", (req, res) => {
        // ... (this route is fine, no changes needed)
        if (req.isAuthenticated()) {
            return res.json(req.user);
        }
        return res.status(401).json({ message: "Not authenticated" });
    });

    // Logout route
    router.get("/logout", (req, res) => {
        // ... (this route is fine, no changes needed)
        req.logout((err) => {
            if (err) {
                return res.status(500).json({ message: "Logout failed." });
            }
            res.redirect(FRONTEND_URL);
        });
    });

    // --- CHANGED: Return the configured router at the end of the function ---
    return router;
};

// --- CHANGED: The old module.exports = router; line is removed ---
