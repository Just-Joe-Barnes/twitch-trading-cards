export const TITLE_EFFECT_OPTIONS = [
    { value: '', label: 'None' },
    { value: 'bronze', label: 'Bronze' },
    { value: 'silver', label: 'Silver' },
    { value: 'gold', label: 'Gold' },
    { value: 'platinum', label: 'Platinum' },
    { value: 'fire', label: 'Fire' },
    { value: 'opal', label: 'Opal' },
    { value: 'emerald', label: 'Emerald' }
];

export const normalizeTitleEffect = (effect = '') => {
    return String(effect)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};
