const LONDON = 'Europe/London';

function londonParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: LONDON,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const get = (t) => Number(parts.find((p) => p.type === t).value);
    return {
        y: get('year'),
        m: get('month'),
        d: get('day'),
        hh: get('hour'),
        mm: get('minute'),
        ss: get('second'),
    };
}

function dateFromLondonParts(lp) {
    return new Date(Date.UTC(lp.y, lp.m - 1, lp.d, lp.hh, lp.mm, lp.ss));
}

function isoWeekYear(dateUTC) {
    const d = new Date(dateUTC.valueOf());
    d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
    return d.getUTCFullYear();
}

function isoWeekNumber(dateUTC) {
    const d = new Date(dateUTC.valueOf());
    d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
    const week1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    week1.setUTCDate(week1.getUTCDate() + 3 - ((week1.getUTCDay() + 6) % 7));
    return 1 + Math.round((d - week1) / (7 * 24 * 3600 * 1000));
}

function getWeeklyKey(date = new Date()) {
    const lp = londonParts(date);
    const londonUTC = dateFromLondonParts(lp);
    const week = isoWeekNumber(londonUTC);
    const year = isoWeekYear(londonUTC);
    return {
        periodKey: `${year}-W${String(week).padStart(2, '0')}`,
        year,
        week,
    };
}

function getMonthlyKey(date = new Date()) {
    const { y, m } = londonParts(date);
    return {
        periodKey: `${y}-${String(m).padStart(2, '0')}`,
        year: y,
        month: m,
    };
}

module.exports = { LONDON, londonParts, getWeeklyKey, getMonthlyKey };
