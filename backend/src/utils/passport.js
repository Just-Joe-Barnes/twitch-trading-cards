const passport = require('passport');
const TwitchStrategy = require('passport-twitch-strategy').Strategy;

passport.use(
    new TwitchStrategy(
        {
            clientID: process.env.TWITCH_CLIENT_ID,
            clientSecret: process.env.TWITCH_CLIENT_SECRET,
            callbackURL: process.env.TWITCH_REDIRECT_URI,
            scope: 'user:read:email',
        },
        (accessToken, refreshToken, profile, done) => {
            // Save user details into session or database as needed
            done(null, profile);
        }
    )
);

// Serialize user into session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from session
passport.deserializeUser((obj, done) => {
    done(null, obj);
});
