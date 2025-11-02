const Event = require('../models/eventModel');
const EventClaim = require('../models/eventClaimModel');
const { findRandomCardTemplate, grantCardReward, grantPackReward, grantXpReward } = require('../helpers/eventHelpers');
const { createLogEntry } = require("../utils/logService");
const { createNotification } = require('../helpers/notificationHelper');
const { sendNotificationToUser } = require('../../notificationService');
const Card = require("../models/cardModel");
const User = require('../models/userModel');
// No need for mongoose import here anymore

const checkAndAwardLoginEvents = async (user) => {
    let rewardsAdded = false;
    // Get count before adding
    const rewardsBefore = user.pendingEventReward ? user.pendingEventReward.length : 0;

    try {
        const now = new Date();
        const activeEvents = await Event.find({
            isActive: true,
            triggerType: 'LOGIN',
            startTime: { $lte: now },
            endTime: { $gte: now },
        }).lean();

        if (activeEvents.length === 0) return [];

        const userClaims = await EventClaim.find({ userId: user._id, eventId: { $in: activeEvents.map(e => e._id) } }).lean();
        const claimedEventIds = new Set(userClaims.map(claim => claim.eventId.toString()));

        for (const event of activeEvents) {
            if (claimedEventIds.has(event._id.toString())) continue;

            console.log(`[EventService] User ${user.username} is eligible for event '${event.name}'. Granting reward.`);
            let rewardData = null;
            const rewardType = event.rewardType;

            try {
                if (!event.rewardDetails) {
                    console.warn(`[EventService] Event '${event.name}' is missing rewardDetails. Skipping.`);
                    continue;
                }

                // --- Grant Reward Logic (unchanged) ---
                if (rewardType === 'CARD' || rewardType === 'RANDOM_CARD') {
                    let cardTemplate = null;
                    let selectedRarity = event.rewardDetails.rarity;
                    if (rewardType === 'CARD') cardTemplate = await Card.findById(event.rewardDetails.cardId);
                    else cardTemplate = await findRandomCardTemplate(selectedRarity);
                    if (!cardTemplate) { console.warn(`[EventService] No card template found for '${event.name}'. Skipping.`); continue; }
                    const rewardDetails = { cardId: cardTemplate._id, rarity: selectedRarity };
                    rewardData = await grantCardReward(user, rewardDetails);
                    if (rewardData) await createLogEntry(user,'REWARD_GRANTED', `Card '${rewardData.name}' (#${rewardData.mintNumber}) from event '${event.name}'`, { type: 'CARD', eventId: event._id, cardId: rewardData._id, mintNumber: rewardData.mintNumber });
                } else if (rewardType === 'PACK') {
                    rewardData = await grantPackReward(user, event.rewardDetails);
                    if (rewardData) await createLogEntry(user,'REWARD_GRANTED', `${rewardData.amount} pack(s) from event '${event.name}'`, { type: 'PACK', eventId: event._id, amount: rewardData.amount });
                } else if (rewardType === 'XP') {
                    rewardData = await grantXpReward(user, event.rewardDetails);
                    if (rewardData) await createLogEntry(user, 'REWARD_GRANTED', `${rewardData.amount} XP from event '${event.name}'`, { type: 'XP', eventId: event._id, amount: rewardData.amount });
                }
                // --- End Grant Reward Logic ---

                if (rewardData) {
                    await EventClaim.create({ userId: user._id, eventId: event._id });

                    let notificationMessage = '';
                    const link = `/collection/${user.username}`;
                    if (rewardType === 'CARD' || rewardType === 'RANDOM_CARD') notificationMessage = `Event Reward: Card '${rewardData.name}' (#${rewardData.mintNumber})!`;
                    else if (rewardType === 'PACK') notificationMessage = `Event Reward: ${rewardData.amount} pack${rewardData.amount > 1 ? 's' : ''}!`;
                    else if (rewardType === 'XP') notificationMessage = `Event Reward: ${rewardData.amount} XP!`;
                    const notificationPayload = { type: 'Event Reward', message: notificationMessage, link: link };
                    await createNotification(user._id, notificationPayload);
                    sendNotificationToUser(user._id, notificationPayload);

                    // --- THIS IS THE FIX ---
                    // Create payload WITHOUT manual _id
                    const payload = {
                        type: rewardType,
                        data: rewardData,
                        message: event.message
                    };
                    // --- END FIX ---

                    if (!user.pendingEventReward) user.pendingEventReward = [];
                    // Push the plain object to the user doc in memory
                    user.pendingEventReward.push(payload);
                    rewardsAdded = true;
                    console.log(`[EventService] Staged reward for event '${event.name}'.`);
                }
            } catch (grantError) {
                console.error(`[EventService] FAILED grant for event '${event.name}':`, grantError.message);
                await createLogEntry(user, 'REWARD_FAILED', `Failed grant for event '${event.name}': ${grantError.message}`, { eventId: event._id, error: grantError.message });
            }
        }

        if (rewardsAdded) {
            // Save the user - Mongoose will add _id's to the new subdocs here
            await user.save();

            // *** THE FIX ***
            // Re-fetch the FULL user document (no .lean()) to get the definitive state
            const updatedUser = await User.findById(user._id);
            if (!updatedUser) {
                console.error(`[EventService] Failed to re-fetch user ${user._id} after saving rewards.`);
                return []; // Return empty if re-fetch fails
            }

            // Slice the array from the *updated* user document.
            // These subdocs WILL have the correct Mongoose-generated _id.
            const newlyAddedRewards = updatedUser.pendingEventReward.slice(rewardsBefore);
            // --- END FIX ---

            console.log('--- RETURNING NEW REWARDS TO CLIENT (eventService) ---');
            console.log(JSON.stringify(newlyAddedRewards, null, 2));
            console.log('---------------------------------');

            return newlyAddedRewards;
        }

    } catch (error) {
        console.error(`[EventService] Error checking login events for user ${user.username}:`, error.message);
        await createLogEntry(user, 'SYSTEM_ERROR', `Error checking login events: ${error.message}`, { context: 'Login Event Check', error: error.message });
    }

    return [];
};

module.exports = { checkAndAwardLoginEvents };
