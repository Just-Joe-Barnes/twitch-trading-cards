const passport = require("passport");
const TwitchStrategy = require("passport-twitch-new").Strategy;

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

passport.use(
    new TwitchStrategy(
        {
            clientID: process.env.TWITCH_CLIENT_ID,
            clientSecret: process.env.TWITCH_CLIENT_SECRET,
            callbackURL: "http://localhost:5000/api/auth/twitch/callback",
            scope: ["user_read", "channel_read"],
        },
        (accessToken, refreshToken, profile, done) => {
            profile.token = accessToken; // Attach token to the user profile
            console.log('AccessToken:', accessToken); // Debugging AccessToken
            console.log('RefreshToken:', refreshToken); // Debugging RefreshToken
            console.log('Profile:', profile); // Debugging Profile
            return done(null, profile);
        }
    )
);

module.exports = passport;
