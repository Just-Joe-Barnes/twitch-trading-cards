// File: backend/routes/externalRoutes.js

const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const ExternalAccount = require('../models/externalAccountModel');
const { addToQueue } = require("../services/queueService");
const { createLogEntry } = require("../utils/logService");
const PeriodCounter = require('../models/periodCounterModel');
const { getWeeklyKey, getMonthlyKey } = require("../scripts/periods");
const { getDefaultPackId } = require('../helpers/packDefaults');

/**
 * NOTE (Streamer.bot integration):
 * - This route is called via Fetch URL actions that send data in headers.
 * - Express lower-cases header keys; this code expects lower-case header names.
 *
 * Supported event types:
 * - subscription                (single subscriber)
 * - redemption                  (channel point / custom redemption)
 * - giftedSub                   (legacy: awards gifter + recipients in one call)
 *
 * New, recommended split flow:
 * - giftedSubRecipient          (Gift Subscription trigger: award ONLY recipient, one call per recipient)
 * - giftedSubGifterBulk         (Gift Bomb trigger: award ONLY gifter, one call per bomb with giftcount=gifts)
 */

const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === process.env.STREAMER_API_KEY) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized: Invalid API Key' });
    }
};

const validateRelaySecret = (req, res, next) => {
    const relaySecret = req.headers['x-relay-secret'];
    if (!process.env.RELAY_SECRET) {
        return res.status(500).json({ message: 'Relay secret not configured.' });
    }

    if (relaySecret && relaySecret === process.env.RELAY_SECRET) {
        return next();
    }

    return res.status(401).json({ message: 'Unauthorized: Invalid relay secret' });
};

const TIKTOK_COINS_PER_PACK = parseInt(process.env.TIKTOK_COINS_PER_PACK || '1000', 10);
const YOUTUBE_SUPERCHAT_PACK_USD = parseFloat(process.env.YOUTUBE_SUPERCHAT_PACK_USD || '5');

const YOUTUBE_TIER_PACKS = {
    '1': 3,
    '2': 6,
    '3': 12,
    '4.99': 3,
    '9.99': 6,
    '19.99': 12,
};

const toPositiveInt = (value) => {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return null;
    const intValue = Math.floor(numberValue);
    return intValue > 0 ? intValue : null;
};

const toPositiveNumber = (value) => {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return null;
    return numberValue > 0 ? numberValue : null;
};

const normalizeProviderId = (value) => {
    if (!value && value !== 0) return '';
    return String(value).trim();
};

const getYouTubePacksForTier = (tierValue) => {
    if (tierValue === null || tierValue === undefined) return null;
    const key = String(tierValue).trim().toLowerCase();
    return YOUTUBE_TIER_PACKS[key] || null;
};

const subType = {
    'prime': 3,
    'tier 1': 3,
    'tier 2': 6,
    'tier 3': 12,
    '1000': 3,
    '2000': 6,
    '3000': 12
};

const getPacksPerTier = (rawTier) => {
    if (!rawTier) return 3;
    const tierKey = String(rawTier).toLowerCase().trim();
    return subType[tierKey] || 3;
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const addPacksToUser = async (twitchId, packCount) => {
    if (!twitchId || packCount <= 0) {
        return null;
    }

    const user = await User.findOneAndUpdate(
        { twitchId: String(twitchId).trim() },
        { $inc: { packs: packCount } },
        { new: true, upsert: false }
    );
    return user;
};

const addPacksToRecipient = async (identifier, packCount) => {
    if (packCount <= 0 || !identifier) {
        return null;
    }

    const trimmed = String(identifier).trim();
    if (!trimmed) return null;

    const user = await User.findOneAndUpdate(
        {
            $or: [
                { twitchId: trimmed },
                { username: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') } }
            ]
        },
        { $inc: { packs: packCount } },
        { new: true, upsert: false }
    );

    return user;
};

const updatePeriodCounters = async (subCount, userTwitchId = null) => {
    try {
        const w = getWeeklyKey();
        const m = getMonthlyKey();

        let monthlyUpdate = {
            $inc: { count: subCount },
            $setOnInsert: { ...m, scope: 'monthly' }
        };

        if (userTwitchId) {
            monthlyUpdate.$addToSet = { activeUserIds: userTwitchId };
        }

        await PeriodCounter.bulkWrite([
            {
                updateOne: {
                    filter: { scope: 'weekly', periodKey: w.periodKey },
                    update: {
                        $inc: { count: subCount },
                        $setOnInsert: { ...w, scope: 'weekly' }
                    },
                    upsert: true
                }
            },
            {
                updateOne: {
                    filter: { scope: 'monthly', periodKey: m.periodKey },
                    update: monthlyUpdate,
                    upsert: true
                }
            }
        ]);
    } catch (error) {
        console.error('Failed to update period counters:', error);
    }
};

const normalizeRecipientIds = (rawRecipients) => {
    const ids = [];

    const pushId = (value) => {
        if (value === null || value === undefined) return;
        const str = String(value).trim();
        if (str.length > 0) ids.push(str);
    };

    const flatten = (value) => {
        if (Array.isArray(value)) {
            value.forEach(flatten);
            return;
        }

        if (value && typeof value === 'object') {
            // Support payloads like [{ id: "..." }, { recipientid: "..." }]
            if ('id' in value) pushId(value.id);
            if ('recipientid' in value) pushId(value.recipientid);
            return;
        }

        pushId(value);
    };

    if (Array.isArray(rawRecipients)) {
        flatten(rawRecipients);
        return ids;
    }

    if (typeof rawRecipients !== 'string') {
        return ids;
    }

    const trimmed = rawRecipients.trim();

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed);
            flatten(parsed);
            return ids;
        } catch (err) {
            console.error('Failed to parse recipientid JSON:', err);
        }
    }

    trimmed
        .split(/[,|;\s]+/)
        .forEach(part => pushId(part));

    return ids;
};

router.get('/earn-pack', validateApiKey, async (req, res) => {
    let streamerUser;
    try {
        const {
            eventtype,
            streamerid,
            userid,
            subtier,
            submonths,
            giftcount,
            recipientid
        } = req.headers;

        if (!eventtype || !streamerid || !userid) {
            if (streamerid) {
                streamerUser = await User.findOne({ _id: streamerid });
            }
            await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'Invalid headers. Missing required fields (eventtype, streamerid, userid).');
            return res.status(400).json({ message: 'Invalid headers. Missing required fields.' });
        }

        streamerUser = await User.findOne({ _id: streamerid });

        // Ensure logs are usable (avoid "[object Object]" in downstream log storage)
        const debugPayload = {
            headers: req.headers,
            rawHeaders: req.rawHeaders,
            query: req.query,
        };
        await createLogEntry(streamerUser, 'TWITCH_ROUTE_LOG', JSON.stringify(debugPayload, null, 2));

        console.log(`Received ${eventtype} event from Streamer.bot for user: ${userid}`);

        let packsToAward = 0;
        let message = '';

        switch (eventtype) {
            case 'subscription': {
                const tier = subtier;
                const months = parseInt(submonths, 10) || 1;

                if (!tier) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'Invalid subscription payload. Missing subtier header.');
                    return res.status(400).json({ message: 'Invalid payload. Missing subtier header.' });
                }

                packsToAward = getPacksPerTier(tier);
                console.log(tier, months, packsToAward);

                const subscriber = await addPacksToUser(userid, packsToAward);

                await updatePeriodCounters(1, userid);

                if (!subscriber) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `User with Twitch ID ${userid} not found.`);
                    return res.status(404).json({ message: `User with Twitch ID ${userid} not found.` });
                }

                message = `${subscriber.username} subscribed! They have been awarded ${packsToAward} packs.`;
                await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
                break;
            }

            /**
             * NEW: Per-recipient handler (Gift Subscription trigger)
             * - Send headers:
             *   eventtype=giftedSubRecipient
             *   userid=<gifter twitch id>
             *   recipientid=<recipient twitch id>
             *   subtier=<tier string>
             *   giftcount=1
             *   giftername=<optional>
             */
            case 'giftedSubRecipient': {
                const tier = subtier;
                const gifterName = req.headers.giftername || 'An anonymous gifter';

                if (!tier) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'Invalid giftedSubRecipient payload. Missing subtier header.');
                    return res.status(400).json({ message: 'Invalid payload. Missing subtier header.' });
                }

                if (!recipientid) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'Invalid giftedSubRecipient payload. Missing recipientid header.');
                    return res.status(400).json({ message: 'Invalid payload. Missing recipientid header.' });
                }

                const packsPerTier = getPacksPerTier(tier);
                const recipient = await addPacksToUser(recipientid, packsPerTier);

                if (!recipient) {
                    message =
                        `GIFTED SUB (RECIPIENT) | ` +
                        `Recipient: (no account) (twitchId: ${recipientid}) | ` +
                        `Gifter: ${gifterName} (twitchId: ${userid}) | ` +
                        `Tier: ${tier} | ` +
                        `Packs Intended: ${packsPerTier} | ` +
                        `Result: SKIPPED_NO_ACCOUNT`;
                    await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
                    break;
                }

                message =
                    `GIFTED SUB (RECIPIENT) | ` +
                    `Recipient: ${recipient.username} (twitchId: ${recipientid}) | ` +
                    `Gifter: ${gifterName} (twitchId: ${userid}) | ` +
                    `Tier: ${tier} | ` +
                    `Packs Awarded: ${packsPerTier} | ` +
                    `Result: AWARDED`;
                await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
                break;
            }

            case 'giftedSubGifterBulk': {
                const tier = subtier;
                const giftCount = parseInt(giftcount, 10) || 0;
                const gifterName = req.headers.giftername || 'An anonymous gifter';

                if (!tier) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'Invalid giftedSubGifterBulk payload. Missing subtier header.');
                    return res.status(400).json({ message: 'Invalid payload. Missing subtier header.' });
                }

                if (!giftCount || giftCount < 1) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'Invalid giftedSubGifterBulk payload. Missing/invalid giftcount header.');
                    return res.status(400).json({ message: 'Invalid payload. Missing or invalid giftcount header.' });
                }

                const packsPerTier = getPacksPerTier(tier);
                const gifterPacks = packsPerTier * giftCount;

                // Counters should increment ONCE per bomb.
                await updatePeriodCounters(giftCount, userid);

                const gifter = await addPacksToUser(userid, gifterPacks);

                if (!gifter) {
                    message = `GIFTED SUB (GIFTER BULK) | ${gifterName} (twitchId: ${userid}) (no account) | Tier: ${String(tier)} | Gifts: ${giftCount} | Packs Intended: ${gifterPacks} (${packsPerTier} per gift) | Result: SKIPPED_NO_ACCOUNT`;
                    await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
                    break;
                }

                message = `GIFTED SUB (GIFTER BULK) | Gifter: ${gifter.username} (twitchId: ${userid}) | Tier: ${String(tier)} | Gifts: ${giftCount} | Packs Awarded: ${gifterPacks} (${packsPerTier} per gift) | Result: AWARDED`;
                await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
                break;
            }

            /**
             * LEGACY: Single call that awards gifter + all recipients (if a list is provided).
             * This is kept for backwards compatibility, but the recommended production setup is:
             * - Gift Subscription -> giftedSubRecipient (recipient awards)
             * - Gift Bomb         -> giftedSubGifterBulk (gifter awards)
             */
            case 'giftedSub': {
                const giftTier = subtier;
                const giftCount = parseInt(giftcount, 10) || 1;
                const gifterName = req.headers.giftername || 'An anonymous gifter';

                if (!giftTier) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'Invalid giftedSub payload. Missing subtier header.');
                    return res.status(400).json({ message: 'Invalid payload. Missing subtier header.' });
                }

                const packsPerTier = getPacksPerTier(giftTier);

                await updatePeriodCounters(giftCount, userid);

                const gifterPacks = packsPerTier * giftCount;
                const gifter = await addPacksToUser(userid, gifterPacks);

                // Recipient list can come as usernames (e.g. %gift.recipientUser0%) or ids.
                // Use addPacksToRecipient so we can match either twitchId OR username (case-insensitive exact).
                const recipientIdsRaw = req.headers.recipientids || recipientid;
                const recipientIds = normalizeRecipientIds(recipientIdsRaw).slice(0, giftCount);

                const recipientPacks = packsPerTier;

                const results = await Promise.all(
                    recipientIds.map(id => addPacksToRecipient(id, recipientPacks))
                );

                const successfulRecipients = results.filter(u => u !== null);

                const recipientsAwarded = results
                    .map((u, i) => (u ? `${u.username} (idOrName: ${recipientIds[i]})` : null))
                    .filter(Boolean);

                const recipientsSkipped = results
                    .map((u, i) => (!u ? `(idOrName: ${recipientIds[i]})` : null))
                    .filter(Boolean);

                await createLogEntry(
                    streamerUser,
                    'TWITCH_ROUTE_REDEMPTION',
                    `GIFTED SUB (LEGACY) | Gifter: ${gifterName} (twitchId: ${userid}) | Tier: ${String(giftTier)} | Gifts: ${giftCount} | Recipient Packs Each: ${recipientPacks} | Awarded To: ${recipientsAwarded.length ? recipientsAwarded.join(', ') : 'none'} | Skipped (no account): ${recipientsSkipped.length ? recipientsSkipped.join(', ') : 'none'}`
                );

                const gifterMessage = gifter
                    ? `${gifter.username} was awarded ${gifterPacks} packs for gifting.`
                    : `${gifterName} (who does not have an account) was not awarded packs.`;

                const recipientMessage = `Of the ${recipientIds.length} recipients, ${successfulRecipients.length} had accounts and received ${recipientPacks} packs each.`;

                message = `${gifterMessage} ${recipientMessage}`;
                await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
                break;
            }

            case 'redemption': {
                const redeemerName = req.headers.redeemername || 'An anonymous user';
                packsToAward = 1;

                const redeemer = await addPacksToUser(userid, packsToAward);

                if (redeemer) {
                    message = `${redeemer.username} redeemed for a new pack! They now have ${redeemer.packs} packs.`;
                } else {
                    message = `${redeemerName} (who does not have an account) redeemed for a pack but was not awarded one.`;
                }

                await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
                break;
            }

            default: {
                await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `Unsupported eventtype: ${eventtype}.`);
                return res.status(400).json({ message: 'Unsupported eventType.' });
            }
        }

        return res.status(200).json({ success: true, message });

    } catch (error) {
        console.error('Error in /earn-pack:', error);
        if (!streamerUser) {
            try {
                const { streamerid } = req.headers;
                if (streamerid) {
                    // existing behavior kept as-is
                    streamerUser = await User.findOne({ twitchId: streamerid });
                }
            } catch (e) {
                console.error('Failed to find streamer in catch block:', e);
            }
        }
        await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'An internal error occurred.');
        return res.status(500).json({ message: 'An internal error occurred.' });
    }
});

router.get('/redeem-pack', validateApiKey, async (req, res) => {
    let streamerUser;
    try {
        const { streamerid: streamerId, userid: userId } = req.headers;

        if (!streamerId || !userId) {
            return res.status(400).json({ message: 'Missing streamerid or userid in headers.' });
        }

        streamerUser = await User.findOne({ _id: streamerId });

        if (!streamerUser) {
            console.error(`[redeem-pack] Failed redemption: Streamer with DB ID ${streamerId} not found.`);
            return res.status(404).json({ message: `Streamer with DB ID ${streamerId} not found.` });
        }

        const redeemer = await User.findOne({ twitchId: userId }).populate('preferredPack');
        if (!redeemer) {
            await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `User with Twitch ID ${userId} not found.`);
            return res.status(404).json({ message: `User with Twitch ID ${userId} not found.` });
        }

        const defaultPackId = await getDefaultPackId();
        const templateId = redeemer.preferredPack?._id || defaultPackId;

        if (!templateId) {
            await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'Default pack not configured.');
            return res.status(500).json({ message: 'Default pack not configured.' });
        }

        await addToQueue({
            streamerDbId: streamerId,
            redeemer: redeemer,
            templateId: templateId
        });

        const message = `${redeemer.username} has redeemed a pack and been added to the queue.`;
        await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
        return res.status(200).json({ success: true, message: message });

    } catch (error) {
        console.error('Error in /redeem-pack:', error);
        if (!streamerUser) {
            try {
                const { streamerid: streamerId } = req.headers;
                streamerUser = await User.findOne({ twitchId: streamerId });
            } catch (e) {
                console.error('Failed to find streamer in catch block:', e);
            }
        }

        if (streamerUser) {
            await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'An internal error occurred.');
        } else {
            console.error('[redeem-pack] An internal error occurred, and streamerUser was null.');
        }

        return res.status(500).json({ message: 'An internal error occurred.' });
    }
});

router.post('/webhook', validateApiKey, async (req, res) => {
    let streamerUser;
    try {
        const { streamerid } = req.headers;
        const payload = req.body;

        if (streamerid) {
            streamerUser = await User.findOne({ twitchId: streamerid });

            if (!streamerUser && /^[0-9a-fA-F]{24}$/.test(streamerid)) {
                streamerUser = await User.findOne({ _id: streamerid });
            }
        }

        await createLogEntry(streamerUser, 'EVENTFLOW_ROUTE_LOG', JSON.stringify(payload, null, 2));

        const { eventType } = payload;

        if (eventType === 'subscribe') {
            const { twitchUserId, tier, isGift } = payload;
            const packsToAward = getPacksPerTier(tier);
            // const subscriber = await addPacksToUser(twitchUserId, packsToAward);
            // await updatePeriodCounters(1, twitchUserId);

            const subscriber = await User.findOne({ twitchId: String(twitchUserId).trim() });

            if (subscriber) {
                await createLogEntry(streamerUser, 'EVENTFLOW_ROUTE_REDEMPTION', `User ${subscriber.username} (ID: ${twitchUserId}) subscribed (Tier ${tier}) and received ${packsToAward} pack(s).`);
            } else {
                await createLogEntry(streamerUser, 'ERROR_EVENTFLOW_ROUTE_REDEMPTION', `User with Twitch ID ${twitchUserId} not found for subscription award. They would have been rewarded ${packsToAward} for tier ${tier}.`);
            }
        } else if (eventType === 'gift_sub') {
            const { twitchUserId, quantity, tier, isAnonymous } = payload;
            const packsPerTier = getPacksPerTier(tier);
            const totalPacks = packsPerTier * quantity;

            // const gifter = await addPacksToUser(twitchUserId, totalPacks);

            const gifter = await User.findOne({ twitchId: String(twitchUserId).trim() });

            if (gifter) {
                await createLogEntry(streamerUser, 'EVENTFLOW_ROUTE_REDEMPTION', `User ${gifter.username} (ID: ${twitchUserId}) gifted ${quantity} subs (Tier ${tier}) and received ${totalPacks} pack(s).`);
            } else {
                 await createLogEntry(streamerUser, 'EVENTFLOW_ROUTE_REDEMPTION', `Anonymous/Unknown user (ID: ${twitchUserId}) gifted ${quantity} subs. No packs awarded to gifter. They would have been rewarded ${packsToAward} for tier ${tier}.`);
            }
        } else if (eventType === 'redeem') {
             const rewardTitle = String(payload.rewardTitle || '').trim().toLowerCase();
             if (rewardTitle === "rush a pack!") {
                if (!streamerUser) {
                    await createLogEntry(null, 'ERROR_EVENTFLOW_ROUTE_REDEMPTION', 'Rush Pack redemption failed: streamer not found.');
                    return res.status(404).json({ message: 'Streamer not found for Rush Pack redemption.' });
                }

                const userId = payload.twitchUserId;
                const redeemer = await User.findOne({ twitchId: userId }).populate('preferredPack');

                if (redeemer) {
                    const defaultPackId = await getDefaultPackId();
                    const templateId = redeemer.preferredPack?._id || defaultPackId;

                    if (templateId) {
                        await addToQueue({
                            streamerDbId: streamerUser._id,
                            redeemer: redeemer,
                            templateId: templateId
                        });
                        await createLogEntry(streamerUser, 'EVENTFLOW_ROUTE_REDEMPTION', `User ${redeemer.username} redeemed a Rush Pack.`);
                    } else {
                         await createLogEntry(streamerUser, 'ERROR_EVENTFLOW_ROUTE_REDEMPTION', 'Default pack not configured for Rush Pack redemption.');
                    }
                } else {
                    await createLogEntry(streamerUser, 'ERROR_EVENTFLOW_ROUTE_REDEMPTION', `User with Twitch ID ${userId} not found for Rush Pack redemption.`);
                }
            }
        } else if (eventType === 'cheer') {
             await createLogEntry(streamerUser, 'EVENTFLOW_ROUTE_LOG', `Cheer received from ${payload.twitchUserName}: ${payload.bits} bits.`);
        }

        return res.status(200).json({ success: true, message: 'Payload received and processed.' });
    } catch (error) {
        console.error('Error in /webhook:', error);
        return res.status(500).json({ message: 'An internal error occurred.' });
    }
});

router.post('/event', validateRelaySecret, async (req, res) => {
    const payload = req.body || {};
    const platform = String(payload.platform || '').trim().toLowerCase();
    const eventType = String(payload.eventType || '').trim().toLowerCase();

    if (!platform || !eventType) {
        return res.status(400).json({ message: 'Missing platform or eventType.' });
    }

    const normalizedPlatform = platform === 'yt' ? 'youtube' : platform;

    if (normalizedPlatform === 'tiktok' && eventType === 'gift') {
        if (!Number.isFinite(TIKTOK_COINS_PER_PACK) || TIKTOK_COINS_PER_PACK <= 0) {
            return res.status(500).json({ message: 'TikTok coin conversion not configured.' });
        }

        const providerUserId = normalizeProviderId(payload.userId);
        const username = payload.username ? String(payload.username).trim() : null;
        const coins = toPositiveInt(payload.coins);

        if (!providerUserId) {
            return res.status(400).json({ message: 'Missing userId for TikTok event.' });
        }

        if (!coins) {
            return res.status(400).json({ message: 'Missing or invalid coins value.' });
        }

        try {
            let account = await ExternalAccount.findOne({ provider: normalizedPlatform, providerUserId });
            if (!account) {
                account = await ExternalAccount.create({
                    provider: normalizedPlatform,
                    providerUserId,
                    username: username || null,
                });
            } else if (username && username !== account.username) {
                account.username = username;
            }

            const coinBalance = Number(account.coinBalance || 0);
            const pendingPacks = Number(account.pendingPacks || 0);
            const combinedCoins = coinBalance + coins;
            const packsFromCoins = Math.floor(combinedCoins / TIKTOK_COINS_PER_PACK);
            const newCoinBalance = combinedCoins % TIKTOK_COINS_PER_PACK;

            let linkedUser = null;
            if (account.userId) {
                linkedUser = await User.findById(account.userId);
            }

            let packsAwarded = 0;
            let pendingPacksAfter = pendingPacks;

            if (linkedUser) {
                packsAwarded = packsFromCoins + pendingPacks;
                pendingPacksAfter = 0;
                if (packsAwarded > 0) {
                    await User.updateOne({ _id: linkedUser._id }, { $inc: { packs: packsAwarded } });
                }
            } else {
                pendingPacksAfter = pendingPacks + packsFromCoins;
            }

            account.coinBalance = newCoinBalance;
            account.pendingPacks = pendingPacksAfter;
            account.totalCoins = (account.totalCoins || 0) + coins;
            if (linkedUser && packsAwarded > 0) {
                account.totalPacksAwarded = (account.totalPacksAwarded || 0) + packsAwarded;
            }
            account.lastEventAt = new Date();

            await account.save();

            return res.status(200).json({
                success: true,
                linked: Boolean(linkedUser),
                packsAwarded,
                pendingPacks: pendingPacksAfter,
                coinBalance: newCoinBalance,
                coinsToNextPack: newCoinBalance ? TIKTOK_COINS_PER_PACK - newCoinBalance : 0,
            });
        } catch (error) {
            console.error('Error handling external event:', error);
            return res.status(500).json({ message: 'An internal error occurred.' });
        }
    }

    if (normalizedPlatform === 'youtube' && (eventType === 'membership' || eventType === 'superchat')) {
        const providerUserId = normalizeProviderId(payload.userId);
        const username = payload.username ? String(payload.username).trim() : null;

        if (!providerUserId) {
            return res.status(400).json({ message: 'Missing userId for YouTube event.' });
        }

        let packsToAward = 0;
        let totalAmount = null;

        if (eventType === 'membership') {
            const tier = payload.tier || payload.tierName || payload.price;
            const tierPacks = getYouTubePacksForTier(tier);
            if (!tierPacks) {
                return res.status(400).json({ message: 'Missing or invalid membership tier.' });
            }
            packsToAward = tierPacks;
        }

        if (eventType === 'superchat') {
            if (!Number.isFinite(YOUTUBE_SUPERCHAT_PACK_USD) || YOUTUBE_SUPERCHAT_PACK_USD <= 0) {
                return res.status(500).json({ message: 'YouTube super chat pack conversion not configured.' });
            }
            const amountUsd = toPositiveNumber(payload.amountUsd || payload.amount || payload.amountUSD);
            if (!amountUsd) {
                return res.status(400).json({ message: 'Missing or invalid super chat amount.' });
            }
            totalAmount = amountUsd;
            packsToAward = Math.floor(amountUsd / YOUTUBE_SUPERCHAT_PACK_USD);
        }

        if (packsToAward <= 0) {
            return res.status(200).json({ success: true, packsAwarded: 0, message: 'No packs awarded for this event.' });
        }

        try {
            let account = await ExternalAccount.findOne({ provider: normalizedPlatform, providerUserId });
            if (!account) {
                account = await ExternalAccount.create({
                    provider: normalizedPlatform,
                    providerUserId,
                    username: username || null,
                });
            } else if (username && username !== account.username) {
                account.username = username;
            }

            const pendingPacks = Number(account.pendingPacks || 0);
            let linkedUser = null;
            if (account.userId) {
                linkedUser = await User.findById(account.userId);
            }

            let packsAwarded = 0;
            let pendingPacksAfter = pendingPacks;

            if (linkedUser) {
                packsAwarded = packsToAward + pendingPacks;
                pendingPacksAfter = 0;
                await User.updateOne({ _id: linkedUser._id }, { $inc: { packs: packsAwarded } });
                account.totalPacksAwarded = (account.totalPacksAwarded || 0) + packsAwarded;
            } else {
                pendingPacksAfter = pendingPacks + packsToAward;
            }

            account.pendingPacks = pendingPacksAfter;
            if (totalAmount) {
                account.totalCoins = (account.totalCoins || 0) + totalAmount;
            }
            account.lastEventAt = new Date();

            await account.save();

            return res.status(200).json({
                success: true,
                linked: Boolean(linkedUser),
                packsAwarded: linkedUser ? packsAwarded : 0,
                pendingPacks: pendingPacksAfter,
            });
        } catch (error) {
            console.error('Error handling YouTube event:', error);
            return res.status(500).json({ message: 'An internal error occurred.' });
        }
    }

    return res.status(400).json({ message: 'Unsupported platform or eventType.' });
});

module.exports = router;
