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
            callbackURL: process.env.TWITCH_REDIRECT_URI,
            scope: ["user:read:email", "channel:read:subscriptions"],
        },
        (accessToken, refreshToken, profile, done) => {
            profile.token = accessToken;
            console.log("AccessToken:", accessToken);
            console.log("RefreshToken:", refreshToken);
            console.log("Profile:", profile);
            return done(null, profile);
        }
    )
);


module.exports = passport;
