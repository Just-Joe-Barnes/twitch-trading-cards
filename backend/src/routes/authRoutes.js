const express = require("express");
const passport = require("../utils/passport");
const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
const User = require("../models/userModel");
const ExternalAccount = require('../models/externalAccountModel');
const { checkAndAwardLoginEvents } = require('../services/eventService');
const Setting = require('../models/settingsModel');
const {trackUserActivity} = require("../services/periodCounterService");

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://192.168.0.136:3000";
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;
const TIKTOK_AUTHORIZE_URL = process.env.TIKTOK_AUTHORIZE_URL || "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = process.env.TIKTOK_TOKEN_URL || "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USERINFO_URL = process.env.TIKTOK_USERINFO_URL || "https://open.tiktokapis.com/v2/user/info/";
const TIKTOK_USERINFO_FIELDS = process.env.TIKTOK_USERINFO_FIELDS || "open_id,union_id,display_name,avatar_url";
const TIKTOK_SCOPES = process.env.TIKTOK_SCOPES || "user.info.basic";
const TIKTOK_ENABLED = Boolean(TIKTOK_CLIENT_KEY && TIKTOK_CLIENT_SECRET && TIKTOK_REDIRECT_URI);

const buildFirstLoginReward = () => ({
    type: 'PACK',
    data: { amount: 1 },
    message: 'Welcome to Neds Decks! Here is your first pack to get you started.'
});

const ensureUniqueUsername = async (preferredName) => {
    const base = (preferredName || 'new-user').trim() || 'new-user';
    let candidate = base;
    let suffix = 1;

    while (await User.exists({ username: candidate })) {
        candidate = `${base}${suffix}`;
        suffix += 1;
    }

    return candidate;
};

const updateLoginStats = async (user, { displayName, profilePic } = {}) => {
    if (displayName && user.username !== displayName) {
        user.username = displayName;
    }

    if (profilePic) {
        user.twitchProfilePic = profilePic;
    }

    const now = new Date();
    const lastLogin = user.lastLogin;

    const isSameDay = (d1, d2) => {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    if (!isSameDay(now, lastLogin)) {
        user.loginCount = (user.loginCount || 0) + 1;

        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);

        if (lastLogin && isSameDay(lastLogin, yesterday)) {
            user.loginStreak = (user.loginStreak || 0) + 1;
        } else {
            user.loginStreak = 1;
        }

        user.lastLogin = now;
        await user.save();
    }

    user.lastLogin = now;
    await user.save();
};

const finalizeLogin = async (dbUser, isNewUser) => {
    const maintenanceSetting = await Setting.findOne({ key: 'maintenanceMode' });
    const isMaintenanceMode = maintenanceSetting ? maintenanceSetting.value : false;

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
        { id: dbUser._id.toString(), isAdmin: dbUser.isAdmin },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    return token;
};

const getUserForExternalAccount = async (provider, providerUserId) => {
    const account = await ExternalAccount.findOne({ provider, providerUserId });
    if (account && account.userId && mongoose.Types.ObjectId.isValid(account.userId)) {
        const user = await User.findById(account.userId);
        if (user) {
            return { user, account, isNewUser: false };
        }
    }

    return { user: null, account, isNewUser: false };
};

module.exports = function(io) {
    router.get("/twitch", async (req, res, next) => {
        return passport.authenticate('twitch')(req, res, next);
    });

    router.get(
        "/twitch/callback",
        passport.authenticate("twitch", { failureRedirect: FRONTEND_URL }),
        async (req, res) => {
            const user = req.user;

            let dbUser = await User.findOne({ twitchId: user.id });
            let isNewUser = false;

            if (!dbUser) {
                isNewUser = true;

                dbUser = await User.create({
                    twitchId: user.id,
                    username: await ensureUniqueUsername(user.display_name),
                    packs: 1,
                    firstLogin: true,
                    pendingEventReward: [buildFirstLoginReward()],
                    loginCount: 1,
                    loginStreak: 1,
                    lastLogin: new Date(),
                    twitchProfilePic: user.profile_image_url
                });
            } else {
                await updateLoginStats(dbUser, {
                    displayName: user.display_name,
                    profilePic: user.profile_image_url
                });
            }

            await ExternalAccount.findOneAndUpdate(
                { provider: 'twitch', providerUserId: user.id },
                {
                    $set: {
                        provider: 'twitch',
                        providerUserId: user.id,
                        username: user.display_name,
                        userId: dbUser._id,
                    }
                },
                { upsert: true }
            );

            const token = await finalizeLogin(dbUser, isNewUser);

            const redirectUrl = `${FRONTEND_URL}/login?token=${token}`;
            res.redirect(redirectUrl);
        }
    );

    router.get("/youtube", (req, res, next) => {
        if (!passport.isYouTubeEnabled) {
            return res.status(501).json({ message: 'YouTube login not configured.' });
        }
        return passport.authenticate('google', {
            scope: ['profile', 'email']
        })(req, res, next);
    });

    router.get(
        "/youtube/callback",
        (req, res, next) => {
            if (!passport.isYouTubeEnabled) {
                return res.status(501).json({ message: 'YouTube login not configured.' });
            }
            return passport.authenticate('google', { failureRedirect: FRONTEND_URL })(req, res, next);
        },
        async (req, res) => {
            const profile = req.user || {};
            const providerUserId = profile.id;
            const displayName = profile.displayName || profile.username || 'YouTube User';
            const avatarUrl = profile.photos && profile.photos.length ? profile.photos[0].value : null;
            const email = profile.emails && profile.emails.length ? profile.emails[0].value : null;

            let dbUser = null;
            let isNewUser = false;

            const lookup = await getUserForExternalAccount('youtube', providerUserId);
            dbUser = lookup.user;
            if (!dbUser) {
                isNewUser = true;
                const username = await ensureUniqueUsername(displayName);
                const emailExists = email ? await User.exists({ email: email.toLowerCase() }) : false;
                dbUser = await User.create({
                    username,
                    email: emailExists ? undefined : (email ? email.toLowerCase() : undefined),
                    packs: 1,
                    firstLogin: true,
                    pendingEventReward: [buildFirstLoginReward()],
                    loginCount: 1,
                    loginStreak: 1,
                    lastLogin: new Date(),
                    twitchProfilePic: avatarUrl || undefined
                });
            } else {
                await updateLoginStats(dbUser, { displayName, profilePic: avatarUrl });
            }

            await ExternalAccount.findOneAndUpdate(
                { provider: 'youtube', providerUserId },
                {
                    $set: {
                        provider: 'youtube',
                        providerUserId,
                        username: displayName,
                        userId: dbUser._id,
                    }
                },
                { upsert: true }
            );

            const token = await finalizeLogin(dbUser, isNewUser);
            const redirectUrl = `${FRONTEND_URL}/login?token=${token}`;
            res.redirect(redirectUrl);
        }
    );

    router.get("/tiktok", (req, res) => {
        if (!TIKTOK_ENABLED) {
            return res.status(501).json({ message: 'TikTok login not configured.' });
        }

        const state = crypto.randomBytes(16).toString('hex');
        if (req.session) {
            req.session.tiktokState = state;
        }

        const params = new URLSearchParams({
            client_key: TIKTOK_CLIENT_KEY,
            redirect_uri: TIKTOK_REDIRECT_URI,
            response_type: 'code',
            scope: TIKTOK_SCOPES,
            state: state,
        });

        return res.redirect(`${TIKTOK_AUTHORIZE_URL}?${params.toString()}`);
    });

    router.get("/tiktok/callback", async (req, res) => {
        if (!TIKTOK_ENABLED) {
            return res.status(501).json({ message: 'TikTok login not configured.' });
        }

        const { code, state } = req.query;
        if (!code) {
            return res.redirect(FRONTEND_URL);
        }

        if (req.session && req.session.tiktokState && state !== req.session.tiktokState) {
            return res.status(401).json({ message: 'Invalid TikTok state.' });
        }

        if (req.session) {
            req.session.tiktokState = null;
        }

        try {
            const tokenParams = new URLSearchParams({
                client_key: TIKTOK_CLIENT_KEY,
                client_secret: TIKTOK_CLIENT_SECRET,
                code: String(code),
                grant_type: 'authorization_code',
                redirect_uri: TIKTOK_REDIRECT_URI,
            });

            const tokenResponse = await axios.post(TIKTOK_TOKEN_URL, tokenParams.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            const tokenData = tokenResponse.data?.data || tokenResponse.data || {};
            const accessToken = tokenData.access_token;

            if (!accessToken) {
                console.error('[TikTok OAuth] Missing access token:', tokenResponse.data);
                return res.redirect(FRONTEND_URL);
            }

            const userResponse = await axios.get(TIKTOK_USERINFO_URL, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { fields: TIKTOK_USERINFO_FIELDS },
            });

            const userData = userResponse.data?.data?.user || userResponse.data?.data || {};
            const providerUserId = userData.open_id || tokenData.open_id || userData.union_id || tokenData.union_id;
            const displayName = userData.display_name || userData.nickname || 'TikTok User';
            const avatarUrl = userData.avatar_url || null;

            if (!providerUserId) {
                console.error('[TikTok OAuth] Missing user id:', userResponse.data);
                return res.redirect(FRONTEND_URL);
            }

            let dbUser = null;
            let isNewUser = false;

            const lookup = await getUserForExternalAccount('tiktok', providerUserId);
            dbUser = lookup.user;
            if (!dbUser) {
                isNewUser = true;
                const username = await ensureUniqueUsername(displayName);
                dbUser = await User.create({
                    username,
                    packs: 1,
                    firstLogin: true,
                    pendingEventReward: [buildFirstLoginReward()],
                    loginCount: 1,
                    loginStreak: 1,
                    lastLogin: new Date(),
                    twitchProfilePic: avatarUrl || undefined
                });
            } else {
                await updateLoginStats(dbUser, { displayName, profilePic: avatarUrl });
            }

            await ExternalAccount.findOneAndUpdate(
                { provider: 'tiktok', providerUserId },
                {
                    $set: {
                        provider: 'tiktok',
                        providerUserId,
                        username: displayName,
                        userId: dbUser._id,
                    }
                },
                { upsert: true }
            );

            const token = await finalizeLogin(dbUser, isNewUser);
            const redirectUrl = `${FRONTEND_URL}/login?token=${token}`;
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('[TikTok OAuth] Failed:', error.response?.data || error.message);
            return res.redirect(FRONTEND_URL);
        }
    });

    router.post("/validate", async (req, res) => {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            let user = null;

            if (mongoose.Types.ObjectId.isValid(decoded.id)) {
                user = await User.findById(decoded.id)
                    .select("username email isAdmin packs loginCount xp level twitchProfilePic pendingEventReward");
            }

            if (!user) {
                user = await User.findOne({ twitchId: decoded.id })
                    .select("username email isAdmin packs loginCount xp level twitchProfilePic pendingEventReward");
            }

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
