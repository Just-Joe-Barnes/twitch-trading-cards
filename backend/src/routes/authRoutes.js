const express = require("express");
const passport = require("passport");

const router = express.Router();

// Twitch Authentication Routes
router.get(
    "/twitch",
    passport.authenticate("twitch", { scope: ["user:read:email"] })
);

router.get(
    "/twitch/callback",
    passport.authenticate("twitch", { failureRedirect: "/login" }),
    (req, res) => {
        console.log("Successful authentication:", req.user);
        res.redirect("/dashboard"); // Redirect to the dashboard after successful login
    }
);

// API route to fetch the current authenticated user
router.get("/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
        // If the user is authenticated, send their user info
        return res.json({
            id: req.user.id,
            displayName: req.user.displayName,
            profileImage: req.user.profile_image_url,
            email: req.user.email,
            broadcasterType: req.user.broadcaster_type,
            createdAt: req.user.created_at,
        });
    } else {
        // If not authenticated, send an unauthorized response
        return res.status(401).json({ message: "Unauthorized" });
    }
});

module.exports = router;
