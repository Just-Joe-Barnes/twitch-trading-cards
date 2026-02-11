const FALLBACK_SUPER_ADMIN_IDS = ['696e18dc3126f68a611387af'];

const parseIds = (value) => {
    if (!value || typeof value !== 'string') {
        return [];
    }

    return value
        .split(',')
        .map((id) => String(id).trim())
        .filter((id) => id.length > 0);
};

const getSuperAdminIds = () => {
    const configured = parseIds(process.env.SUPER_ADMIN_USER_IDS);
    return configured.length > 0 ? configured : FALLBACK_SUPER_ADMIN_IDS;
};

const isSuperAdminUserId = (userId) => {
    if (!userId) return false;
    const normalized = String(userId).trim();
    if (!normalized) return false;
    return getSuperAdminIds().includes(normalized);
};

module.exports = {
    getSuperAdminIds,
    isSuperAdminUserId,
};
