// src/routes/authRoutes.js
const express = require("express");
const passport = require("../utils/passport");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Initiate Twitch login - bypass authentication when running locally
router.get("/twitch", async (req, res, next) => {
    const host = req.hostname || req.get('host');
    if (host && (host.includes('localhost') || host.startsWith('127.0.0.1'))) {
        try {
            const devUser = await User.findById('67902369038799d79f21246f');
            if (!devUser) {
                return res.status(404).json({ message: 'Dev user not found' });
            }
            const token = jwt.sign(
                {
                    id: devUser.twitchId || devUser._id,
                    isAdmin: devUser.isAdmin,
                },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            const redirectUrl = `${FRONTEND_URL}/login?token=${token}`;
            return res.redirect(redirectUrl);
        } catch (err) {
            return next(err);
        }
    }
    return passport.authenticate('twitch')(req, res, next);
});

// Twitch callback
router.get(
    "/twitch/callback",
    passport.authenticate("twitch", {
        failureRedirect: FRONTEND_URL,
    }),
    async (req, res) => {
        console.log("[AuthRoutes] FRONTEND_URL:", FRONTEND_URL);
        const user = req.user;
        console.log("Twitch login successful, user:", user);

        let dbUser = await User.findOne({ twitchId: user.id });
        if (!dbUser) {
            console.log("New user detected, awarding 1 login pack.");
            const newUserData = {
                twitchId: user.id,
                username: user.display_name,
                packs: 1,
                firstLogin: false,
                loginCount: 1,
                loginStreak: 1,
                lastLogin: new Date(),
                twitchProfilePic: user.profile_image_url // NEW: Save Twitch profile image URL
            };
            if (user.email) {
                newUserData.email = user.email;
            }
            dbUser = await User.create(newUserData);
        } else {
            // Update the profile picture for existing users
            dbUser.twitchProfilePic = user.profile_image_url;
            await dbUser.save();
            console.log("Returning user detected, checking firstLogin status.");
            if (dbUser.firstLogin) {
                console.log(`User ${dbUser.username} is logging in for the first time.`);
                dbUser = await User.findOneAndUpdate(
                    { twitchId: user.id },
                    { $inc: { packs: 1, loginCount: 1 }, firstLogin: false },
                    { new: true }
                );
                console.log("1 pack awarded. Updated user:", dbUser);
            } else {
                console.log(`User ${dbUser.username} has already logged in before. No pack awarded.`);
            }
            dbUser.loginCount = (dbUser.loginCount || 0) + 1;
            const now = new Date();
            if (dbUser.lastLogin && (now - dbUser.lastLogin) <= 24 * 60 * 60 * 1000) {
                dbUser.loginStreak = (dbUser.loginStreak || 0) + 1;
            } else {
                dbUser.loginStreak = 1;
            }
            dbUser.lastLogin = now;
            await dbUser.save();
        }

        // (Optional) Persist admin status if not already set
        if (dbUser.twitchId === "77266375" && !dbUser.isAdmin) {
            dbUser.isAdmin = true;
            await dbUser.save();
        }

        // Generate JWT token with the admin flag from the DB
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

// Validate JWT token route – returns the full user profile.
router.post("/validate", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Note: decoded.id is actually the Twitch ID
        const user = await User.findOne({ twitchId: decoded.id }).select("-password");
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
    if (req.isAuthenticated()) {
        return res.json(req.user);
    }
    return res.status(401).json({ message: "Not authenticated" });
});

// Logout route
router.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ message: "Logout failed." });
        }
        res.redirect(FRONTEND_URL);
    });
});

module.exports = router;
