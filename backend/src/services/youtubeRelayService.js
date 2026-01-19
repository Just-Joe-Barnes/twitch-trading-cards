const axios = require('axios');

const DEFAULT_POLL_INTERVAL_MS = 15000;
const DEFAULT_RETRY_DELAY_MS = 30000;
const MIN_POLL_INTERVAL_MS = 5000;
const MAX_SEEN_IDS = 1000;

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const isEnabled = () => {
    const flag = String(process.env.YOUTUBE_RELAY_ENABLED || '').trim().toLowerCase();
    return flag === '1' || flag === 'true' || flag === 'yes';
};

const getClientCredentials = () => {
    return {
        clientId: process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.YOUTUBE_REFRESH_TOKEN,
    };
};

const getLiveVideoId = () => {
    const value = String(process.env.YOUTUBE_LIVE_VIDEO_ID || '').trim();
    return value || null;
};

const getApiKey = () => {
    const value = String(process.env.YOUTUBE_API_KEY || '').trim();
    return value || null;
};

const getEventEndpoint = () => {
    const baseUrl = normalizeBaseUrl(
        process.env.YOUTUBE_EVENT_BASE_URL ||
        process.env.API_BASE_URL ||
        `http://127.0.0.1:${process.env.PORT || 5000}`
    );
    const endpoint = String(process.env.YOUTUBE_EVENT_ENDPOINT || process.env.EVENT_ENDPOINT || '/api/external/event').trim();
    return `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const extractTier = (tierName) => {
    if (!tierName) return null;
    const raw = String(tierName).trim();
    const match = raw.match(/(\d+(?:\.\d+)?)/);
    if (match) {
        return match[1];
    }
    return raw;
};

const amountFromMicros = (micros) => {
    const value = toNumber(micros);
    if (value === null) return null;
    return value / 1000000;
};

const createSeenTracker = () => {
    const seenIds = new Set();

    return {
        has(id) {
            return seenIds.has(id);
        },
        add(id) {
            if (seenIds.has(id)) return;
            seenIds.add(id);
            if (seenIds.size > MAX_SEEN_IDS) {
                const oldest = seenIds.values().next().value;
                if (oldest) {
                    seenIds.delete(oldest);
                }
            }
        },
    };
};

const startYouTubeRelay = () => {
    if (!isEnabled()) {
        console.log('[YouTube Relay] Disabled. Set YOUTUBE_RELAY_ENABLED=true to start.');
        return;
    }

    const { clientId, clientSecret, refreshToken } = getClientCredentials();
    if (!clientId || !clientSecret || !refreshToken) {
        console.log('[YouTube Relay] Missing client credentials or refresh token.');
        return;
    }

    const relaySecret = process.env.RELAY_SECRET;
    if (!relaySecret) {
        console.log('[YouTube Relay] Missing RELAY_SECRET.');
        return;
    }

    const eventUrl = getEventEndpoint();
    console.log(`[YouTube Relay] Posting events to ${eventUrl}`);

    const state = {
        accessToken: null,
        accessTokenExpiry: 0,
        liveChatId: process.env.YOUTUBE_LIVE_CHAT_ID || null,
        nextPageToken: null,
        seen: createSeenTracker(),
        running: true,
    };

    const getAccessToken = async () => {
        const now = Date.now();
        if (state.accessToken && state.accessTokenExpiry - 30000 > now) {
            return state.accessToken;
        }

        const params = new URLSearchParams();
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        params.append('refresh_token', refreshToken);
        params.append('grant_type', 'refresh_token');

        const response = await axios.post('https://oauth2.googleapis.com/token', params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const { access_token: accessToken, expires_in: expiresIn } = response.data || {};
        if (!accessToken) {
            throw new Error('Failed to obtain access token.');
        }

        state.accessToken = accessToken;
        state.accessTokenExpiry = now + (Number(expiresIn || 0) * 1000);
        return accessToken;
    };

    const fetchLiveChatId = async (accessToken) => {
        if (state.liveChatId) {
            return state.liveChatId;
        }

        const liveVideoId = getLiveVideoId();
        if (liveVideoId) {
            const apiKey = getApiKey();
            const headers = apiKey ? {} : { Authorization: `Bearer ${accessToken}` };
            const params = {
                part: 'liveStreamingDetails',
                id: liveVideoId,
            };
            if (apiKey) {
                params.key = apiKey;
            }

            const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params,
                headers,
            });

            const video = (response.data && response.data.items && response.data.items[0]) || null;
            const liveChatId = video && video.liveStreamingDetails && video.liveStreamingDetails.activeLiveChatId;
            if (liveChatId) {
                state.liveChatId = liveChatId;
                state.nextPageToken = null;
                return liveChatId;
            }
        }

        const response = await axios.get('https://www.googleapis.com/youtube/v3/liveBroadcasts', {
            params: {
                part: 'snippet,contentDetails',
                broadcastStatus: 'active',
                mine: true,
            },
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const broadcast = (response.data && response.data.items && response.data.items[0]) || null;
        const liveChatId = broadcast && broadcast.contentDetails && broadcast.contentDetails.activeLiveChatId;

        if (!liveChatId) {
            return null;
        }

        state.liveChatId = liveChatId;
        state.nextPageToken = null;
        return liveChatId;
    };

    const postEvent = async (payload) => {
        try {
            await axios.post(eventUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-relay-secret': relaySecret,
                },
                timeout: 10000,
            });
        } catch (error) {
            const status = error.response ? error.response.status : 'unknown';
            console.error('[YouTube Relay] Failed to post event:', status, error.message);
        }
    };

    const handleMessage = async (message) => {
        if (!message || !message.id) return;
        if (state.seen.has(message.id)) return;
        state.seen.add(message.id);

        const { snippet, authorDetails } = message;
        if (!snippet || !authorDetails) return;

        const userId = authorDetails.channelId || authorDetails.channelUrl || authorDetails.displayName;
        const username = authorDetails.displayName || null;

        if (snippet.superChatDetails) {
            const amountValue = amountFromMicros(snippet.superChatDetails.amountMicros);
            if (!amountValue) return;

            await postEvent({
                platform: 'youtube',
                eventType: 'superchat',
                userId,
                username,
                amountUsd: amountValue,
                amount: amountValue,
                currency: snippet.superChatDetails.currency,
            });
            return;
        }

        if (snippet.newSponsorDetails) {
            const tierName = snippet.newSponsorDetails.memberLevelName || null;
            const tier = extractTier(tierName);

            await postEvent({
                platform: 'youtube',
                eventType: 'membership',
                userId,
                username,
                tier,
                tierName,
            });
        }
    };

    const pollOnce = async () => {
        let accessToken;
        try {
            accessToken = await getAccessToken();
        } catch (error) {
            console.error('[YouTube Relay] Token refresh failed:', error.message);
            return DEFAULT_RETRY_DELAY_MS;
        }

        let liveChatId;
        try {
            liveChatId = await fetchLiveChatId(accessToken);
        } catch (error) {
            console.error('[YouTube Relay] Failed to fetch live broadcast:', error.response?.data || error.message);
            state.liveChatId = null;
            return DEFAULT_RETRY_DELAY_MS;
        }

        if (!liveChatId) {
            return DEFAULT_RETRY_DELAY_MS;
        }

        try {
            const response = await axios.get('https://www.googleapis.com/youtube/v3/liveChat/messages', {
                params: {
                    part: 'snippet,authorDetails',
                    liveChatId,
                    pageToken: state.nextPageToken || undefined,
                },
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            const items = response.data && response.data.items ? response.data.items : [];
            for (const message of items) {
                await handleMessage(message);
            }

            state.nextPageToken = response.data.nextPageToken || null;

            const apiInterval = toNumber(response.data.pollingIntervalMillis);
            const configuredInterval = toNumber(process.env.YOUTUBE_POLL_INTERVAL_MS);
            const interval = Math.max(
                MIN_POLL_INTERVAL_MS,
                configuredInterval || apiInterval || DEFAULT_POLL_INTERVAL_MS
            );
            return interval;
        } catch (error) {
            const reason = error.response && error.response.data && error.response.data.error &&
                error.response.data.error.errors && error.response.data.error.errors[0] &&
                error.response.data.error.errors[0].reason;

            console.error('[YouTube Relay] Live chat polling failed:', reason || error.message);

            if (reason === 'liveChatEnded' || reason === 'liveChatNotFound') {
                state.liveChatId = null;
                state.nextPageToken = null;
            }

            return DEFAULT_RETRY_DELAY_MS;
        }
    };

    const loop = async () => {
        while (state.running) {
            const delay = await pollOnce();
            await sleep(delay);
        }
    };

    loop().catch((error) => {
        console.error('[YouTube Relay] Fatal error:', error.message);
    });
};

module.exports = { startYouTubeRelay };
