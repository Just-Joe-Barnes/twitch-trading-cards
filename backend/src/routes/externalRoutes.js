const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const { addToQueue } = require("../services/queueService");
const { createLogEntry } = require("../utils/logService");
const PeriodCounter = require('../models/periodCounterModel');
const {getWeeklyKey, getMonthlyKey} = require("../scripts/periods");

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
}

const addPacksToUser = async (twitchId, packCount) => {
    if (packCount <= 0) {
        return null;
    }

    const user = await User.findOneAndUpdate(
        { twitchId: twitchId },
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
        await createLogEntry(streamerUser, 'TWITCH_ROUTE_LOG', { headers: req.headers });

        console.log(`Received ${eventtype} event from Streamer.bot for user: ${userid}`);
        console.log(eventtype);

        let packsToAward = 0;
        let message = '';

        switch (eventtype) {
            case 'subscription':
                const tier = subtier;
                const months = parseInt(submonths) || 1;

                if (!tier) {
                    await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'Invalid subscription payload. Missing subtier header.');
                    return res.status(400).json({ message: 'Invalid payload. Missing subtier header.' });
                }

                packsToAward = subType[tier.toLowerCase()] || 3;

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

            case 'giftedSub':
                const giftTier = subtier;
                const giftCount = parseInt(giftcount) || 1;
                const gifterName = req.headers.giftername || 'An anonymous gifter';

        console.log(giftTier, giftCount, gifterName);

                const packsPerTier = subType[giftTier.toLowerCase()] || 3;

                console.log(packsPerTier);

                await updatePeriodCounters(giftCount, userid);

                const gifterPacks = packsPerTier * giftCount;
                const gifter = await addPacksToUser(userid, gifterPacks);

                console.log(gifterPacks);

                const normalizeRecipientIds = (rawRecipients) => {
                    const ids = [];

                    const pushId = (value) => {
                        if (value === null || value === undefined) return;
                        const str = String(value).trim();
                        if (str.length > 0) {
                            ids.push(str);
                        }
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

                const recipientIds = normalizeRecipientIds(req.headers.recipientids || recipientid);
                const recipientPacks = packsPerTier;

                console.log(recipientPacks);

                const updatePromises = recipientIds.map(id => {
                    const trimmedId = id.trim();
                    return addPacksToUser(trimmedId, recipientPacks);
                });
                const results = await Promise.all(updatePromises);

                const successfulRecipients = results.filter(user => user !== null);

                let gifterMessage = '';
                if (gifter) {
                    gifterMessage = `${gifter.username} was awarded ${gifterPacks} packs for gifting.`;
                } else {
                    gifterMessage = `${gifterName} (who does not have an account) was not awarded packs.`;
                }

                const recipientMessage = `Of the ${recipientIds.length} recipients, ${successfulRecipients.length} had accounts and received ${recipientPacks} packs each.`;

                message = `${gifterMessage} ${recipientMessage}`;

                console.log(message);
                await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
                break;

            case 'redemption':
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

            default:
                await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `Unsupported eventtype: ${eventtype}.`);
                return res.status(400).json({ message: 'Unsupported eventType.' });
        }

        res.status(200).json({ success: true, message });

    } catch (error) {
        console.error('Error in /earn-pack:', error);
        if (!streamerUser) {
            try {
                const { streamerid } = req.headers;
                if (streamerid) {
                    streamerUser = await User.findOne({ twitchId: streamerid });
                }
            } catch (e) {
                console.error('Failed to find streamer in catch block:', e);
            }
        }
        await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', 'An internal error occurred.');
        res.status(500).json({ message: 'An internal error occurred.' });
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
            console.error(`[redeem-pack] Failed redemption: Streamer with Twitch ID ${streamerId} not found.`);
            return res.status({ message: `Streamer with Twitch ID ${streamerId} not found.` });
        }

        const redeemer = await User.findOne({ twitchId: userId }).populate('preferredPack');
        if (!redeemer) {
            await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `User with Twitch ID ${userId} not found.`);
            return res.status(404).json({ message: `User with Twitch ID ${userId} not found.` });
        }

        const templateId = redeemer.preferredPack?._id || '67f68591c7560fa1a75f142c';

        await addToQueue({
            streamerDbId: streamerId,
            redeemer: redeemer,
            templateId: templateId
        });

        const message = `${redeemer.username} has redeemed a pack and been added to the queue.`;
        await createLogEntry(streamerUser, 'TWITCH_ROUTE_REDEMPTION', message);
        res.status(200).json({ success: true, message: message });

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

        res.status(500).json({ message: 'An internal error occurred.' });
    }
});


module.exports = router;

