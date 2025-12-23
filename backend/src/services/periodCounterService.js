const PeriodCounter = require('../models/periodCounterModel');
const {getWeeklyKey, getMonthlyKey} = require("../scripts/periods");

const updatePeriodCounters = async (amount = 1) => {
    const w = getWeeklyKey();
    const m = getMonthlyKey();

    try {
        const bulkOps = [
            {
                updateOne: {
                    filter: { scope: 'weekly', periodKey: w.periodKey },
                    update: {
                        $inc: { count: amount },
                        $setOnInsert: { ...w, scope: 'weekly' }
                    },
                    upsert: true
                }
            },
            {
                updateOne: {
                    filter: { scope: 'monthly', periodKey: m.periodKey },
                    update: {
                        $inc: { count: amount },
                        $setOnInsert: { ...m, scope: 'monthly' }
                    },
                    upsert: true
                }
            }
        ];
        await PeriodCounter.bulkWrite(bulkOps);
    } catch (error) {
        console.error('Failed to update period counters:', error);
        throw error;
    }
};

const trackUserActivity = async (userId) => {
    if (!userId) return;

    const m = getMonthlyKey();

    try {
        await PeriodCounter.updateOne(
            { scope: 'monthly', periodKey: m.periodKey },
            {
                $addToSet: { activeUserIds: userId },
                $setOnInsert: {
                    ...m,
                    scope: 'monthly',
                    count: 0
                }
            },
            { upsert: true }
        );
    } catch (error) {
        console.error(`Failed to track user activity for ${userId}:`, error);
    }
};

const ensurePeriodCounters = async () => {
    const w = getWeeklyKey();
    const m = getMonthlyKey();

    try {
        await PeriodCounter.bulkWrite([
            {
                updateOne: {
                    filter: { scope: 'weekly', periodKey: w.periodKey },
                    update: {
                        $setOnInsert: { ...w, scope: 'weekly', count: 0 }
                    },
                    upsert: true
                }
            },
            {
                updateOne: {
                    filter: { scope: 'monthly', periodKey: m.periodKey },
                    update: {
                        $setOnInsert: { ...m, scope: 'monthly', count: 0, activeUserIds: [] }
                    },
                    upsert: true
                }
            }
        ]);
    } catch (error) {
        console.error('Failed to ensure period counters:', error);
    }
};
module.exports = {
    updatePeriodCounters,
    trackUserActivity,
    ensurePeriodCounters
};


