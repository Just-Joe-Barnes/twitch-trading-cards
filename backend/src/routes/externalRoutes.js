// File: backend/routes/externalRoutes.js

const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
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

module.exports = router;
