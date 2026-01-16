const passport = require("passport");
const axios = require("axios");
const TwitchStrategy = require("passport-twitch-new").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const OAuth2Strategy = require("passport-oauth2");

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

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

passport.isYouTubeEnabled = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI);

if (passport.isYouTubeEnabled) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
                callbackURL: GOOGLE_REDIRECT_URI,
            },
            (accessToken, refreshToken, profile, done) => {
                profile.token = accessToken;
                return done(null, profile);
            }
        )
    );
}

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;
const TIKTOK_AUTHORIZE_URL = process.env.TIKTOK_AUTHORIZE_URL || "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = process.env.TIKTOK_TOKEN_URL || "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USERINFO_URL = process.env.TIKTOK_USERINFO_URL || "https://open.tiktokapis.com/v2/user/info/";
const TIKTOK_USERINFO_FIELDS = process.env.TIKTOK_USERINFO_FIELDS || "open_id,union_id,display_name,avatar_url";
const TIKTOK_SCOPES = process.env.TIKTOK_SCOPES || "user.info.basic";

passport.isTikTokEnabled = Boolean(TIKTOK_CLIENT_KEY && TIKTOK_CLIENT_SECRET && TIKTOK_REDIRECT_URI);

if (passport.isTikTokEnabled) {
    const tiktokStrategy = new OAuth2Strategy(
        {
            authorizationURL: TIKTOK_AUTHORIZE_URL,
            tokenURL: TIKTOK_TOKEN_URL,
            clientID: TIKTOK_CLIENT_KEY,
            clientSecret: TIKTOK_CLIENT_SECRET,
            callbackURL: TIKTOK_REDIRECT_URI,
            scope: TIKTOK_SCOPES.split(',').map(scope => scope.trim()).filter(Boolean),
        },
        (accessToken, refreshToken, profile, done) => {
            return done(null, profile);
        }
    );

    tiktokStrategy.authorizationParams = () => ({
        client_key: TIKTOK_CLIENT_KEY,
    });

    tiktokStrategy.tokenParams = () => ({
        client_key: TIKTOK_CLIENT_KEY,
    });

    tiktokStrategy.userProfile = async (accessToken, done) => {
        try {
            const response = await axios.get(TIKTOK_USERINFO_URL, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { fields: TIKTOK_USERINFO_FIELDS }
            });

            const data = response.data?.data?.user || response.data?.data || response.data;
            const profile = {
                id: data?.open_id || data?.union_id || data?.user_id || data?.id,
                displayName: data?.display_name || data?.nickname || data?.username || 'TikTok User',
                photos: data?.avatar_url ? [{ value: data.avatar_url }] : [],
            };

            return done(null, profile);
        } catch (error) {
            return done(error);
        }
    };

    passport.use('tiktok', tiktokStrategy);
}


module.exports = passport;
