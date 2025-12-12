const express = require("express");
const passport = require("../utils/passport");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { checkAndAwardLoginEvents } = require('../services/eventService');
const Setting = require('../models/settingsModel');
const {trackUserActivity} = require("../services/periodCounterService");

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://192.168.0.136:3000";

module.exports = function(io) {
    router.get("/twitch", async (req, res, next) => {
        const host = req.hostname || req.get('host');
        const maintenanceSetting = await Setting.findOne({ key: 'maintenanceMode' });
        const isMaintenanceMode = maintenanceSetting ? maintenanceSetting.value : false;
        return passport.authenticate('twitch')(req, res, next);
    });

    router.get(
        "/twitch/callback",
        passport.authenticate("twitch", { failureRedirect: FRONTEND_URL }),
        async (req, res) => {
            const maintenanceSetting = await Setting.findOne({ key: 'maintenanceMode' });
            const isMaintenanceMode = maintenanceSetting ? maintenanceSetting.value : false;

            const user = req.user;

            let dbUser = await User.findOne({ twitchId: user.id });
            let isNewUser = false;

            if (!dbUser) {
                isNewUser = true;

                const firstLoginReward = {
                    type: 'PACK',
                    data: { amount: 1 },
                    message: 'Welcome to Neds Decks! Here is your first pack to get you started.'
                };

                dbUser = await User.create({
                    twitchId: user.id,
                    username: user.display_name,
                    packs: 1,
                    firstLogin: true,
                    pendingEventReward: [firstLoginReward],
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
                const lastLogin = dbUser.lastLogin;

                const isSameDay = (d1, d2) => {
                    if (!d1 || !d2) return false;
                    return d1.getFullYear() === d2.getFullYear() &&
                        d1.getMonth() === d2.getMonth() &&
                        d1.getDate() === d2.getDate();
                };

                if (!isSameDay(now, lastLogin)) {
                    dbUser.loginCount = (dbUser.loginCount || 0) + 1;

                    const yesterday = new Date();
                    yesterday.setDate(now.getDate() - 1);

                    if (lastLogin && isSameDay(lastLogin, yesterday)) {
                        dbUser.loginStreak = (dbUser.loginStreak || 0) + 1;
                    } else {
                        dbUser.loginStreak = 1;
                    }

                    dbUser.lastLogin = now;
                    await dbUser.save();
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

            if (!isMaintenanceMode || dbUser.isAdmin) {
                const rewardPayloads = await checkAndAwardLoginEvents(dbUser);
                if (rewardPayloads && rewardPayloads.length > 0) {
                    dbUser.pendingEventReward = rewardPayloads;
                    await dbUser.save();
                }
                await trackUserActivity(dbUser._id);
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

    router.post("/validate", async (req, res) => {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findOne({ twitchId: decoded.id })
                .select("username email isAdmin packs loginCount xp level twitchProfilePic pendingEventReward");

            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }
            return res.status(200).json(user);
        } catch (err) {
            return res.status(401).json({ message: "Invalid token" });
        }
    });

    router.get("/user", (req, res) => {
        if (req.isAuthenticated()) {
            return res.json(req.user);
        }
        return res.status(401).json({ message: "Not authenticated" });
    });

    router.get("/logout", (req, res) => {
        req.logout((err) => {
            if (err) {
                return res.status(500).json({ message: "Logout failed." });
            }
            res.redirect(FRONTEND_URL);
        });
    });

    return router;
};
