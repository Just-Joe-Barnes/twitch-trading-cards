const Event = require('../models/eventModel');
const EventClaim = require('../models/eventClaimModel');
const { grantCardReward, grantPackReward, grantXpReward } = require('../helpers/eventHelpers');

const checkAndAwardLoginEvents = async (user) => {
    const grantedRewards = [];

    try {
        const now = new Date();
        const activeEvents = await Event.find({
            isActive: true,
            triggerType: 'LOGIN',
            startTime: { $lte: now },
            endTime: { $gte: now },
        }).lean();

        if (activeEvents.length === 0) {
            return grantedRewards;
        }

        const userClaims = await EventClaim.find({ userId: user._id, eventId: { $in: activeEvents.map(e => e._id) } }).lean();
        const claimedEventIds = new Set(userClaims.map(claim => claim.eventId.toString()));

        for (const event of activeEvents) {
            if (claimedEventIds.has(event._id.toString())) {
                continue;
            }

            console.log(`[EventService] User ${user.username} is eligible for event '${event.name}'. Granting reward.`);

            let rewardData = null;
            const rewardType = event.rewardType;

            try {
                if (rewardType === 'CARD') {
                    rewardData = await grantCardReward(user, event.rewardDetails);
                } else if (rewardType === 'PACK') {
                    rewardData = await grantPackReward(user, event.rewardDetails);
                } else if (rewardType === 'XP') {
                    rewardData = await grantXpReward(user, event.rewardDetails);
                }

                if (rewardData) {
                    await EventClaim.create({ userId: user._id, eventId: event._id });
                    const payload = { type: rewardType, data: rewardData };

                    grantedRewards.push(payload);
                    console.log(`[EventService] Staged reward for event '${event.name}'. Total staged: ${grantedRewards.length}`);
                }
            } catch (grantError) {
                console.error(`[EventService] FAILED to grant reward for event '${event.name}' to user ${user.username}:`, grantError.message);
            }
        }
    } catch (error) {
        console.error(`[EventService] Error checking login events for user ${user.username}:`, error.message);
    }

    return grantedRewards;
};

module.exports = { checkAndAwardLoginEvents };
