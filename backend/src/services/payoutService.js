const PeriodCounter = require('../models/periodCounterModel');
const User = require('../models/userModel');
const {getMonthlyKey} = require("../scripts/periods");

// This function defines the reward tiers.
// You can easily change this later.
function calculatePacksToAward(subCount) {
    // These goals match your CommunityPage.js
    if (subCount >= 100) return 5;
    if (subCount >= 80) return 4;
    if (subCount >= 60) return 3;
    if (subCount >= 40) return 2;
    if (subCount >= 20) return 1;
    return 0; // If no tier was met
}

async function handleMonthlyPayout() {
    // 1. GET *LAST* MONTH'S DATA
    // We create a date for "today" and set the day to 0.
    // JS trick: setDate(0) rolls back to the *last day of the previous month*.
    const lastMonthDate = new Date();
    lastMonthDate.setUTCDate(0); // e.g., if it's Nov 1st, this becomes Oct 31st

    // Now get the key for that date (e.g., "2025-10")
    const lastMonth = getMonthlyKey(lastMonthDate);
    const lastMonthKey = lastMonth.periodKey; // e.g., "2025-10"

    console.log(`[PayoutService] Checking rewards for period: ${lastMonthKey}`);

    // 2. FIND THE PERIODCOUNTER DOCUMENT FOR LAST MONTH
    const periodData = await PeriodCounter.findOne({
        scope: 'monthly',
        periodKey: lastMonthKey
    }).lean(); // .lean() makes it a fast, read-only query

    if (!periodData) {
        console.log(`[PayoutService] No data found for ${lastMonthKey}. No rewards given.`);
        return;
    }

    // 3. CALCULATE THE REWARD
    const totalSubs = periodData.count;
    const packsToAward = calculatePacksToAward(totalSubs);

    if (packsToAward === 0) {
        console.log(`[PayoutService] Goal for ${lastMonthKey} not met (Subs: ${totalSubs}). No rewards given.`);
        return;
    }

    // 4. FIND THE USERS TO REWARD
    const usersToReward = periodData.activeUserIds;
    if (!usersToReward || usersToReward.length === 0) {
        console.log(`[PayoutService] Goal was met, but no active users were tracked for ${lastMonthKey}.`);
        return;
    }

    console.log(`[PayoutService] Awarding ${packsToAward} packs to ${usersToReward.length} active users for period ${lastMonthKey}.`);

    // 5. GIVE THE REWARD
    // We use the `pendingEventReward` system you already have (from authRoutes.js)
    // This is better than just adding packs, as the user will be notified.
    const rewardPayload = {
        type: 'PACK', // Or whatever type you use
        data: { amount: packsToAward },
        message: `Community Goal Met! You earned ${packsToAward} pack(s) for being active in ${lastMonth.year}-${lastMonth.month}.`
    };

    // Use $push to add the reward to each user's pending array
    // This is one single, efficient database operation.

    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    const validObjectIds = usersToReward.filter(id => objectIdPattern.test(id));

    await User.updateMany(
        {
            $or: [
                { _id: { $in: validObjectIds } },
                { twitchId: { $in: usersToReward } }
            ]
        },
        { $push: { pendingEventReward: rewardPayload } }
    );

    return {
        success: true,
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount
    };
}


module.exports = {
    handleMonthlyPayout
};

