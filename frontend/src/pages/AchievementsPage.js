import React, {useEffect, useMemo, useState} from 'react';
import {fetchAchievements, claimAchievement, fetchFeaturedAchievements, updateFeaturedAchievements} from '../utils/api';
import { normalizeTitleEffect } from '../utils/titleEffects';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/AchievementsPage.css';

const CATEGORY_ORDER = [
    'Progression',
    'Trading',
    'Market',
    'Packs',
    'Collection',
    'Tags',
    'Login',
    'Profile',
    'Titles',
    'Admin',
    'General',
];

const AchievementsPage = () => {
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [claiming, setClaiming] = useState(false);
    const [featured, setFeatured] = useState([]);
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('achViewMode') || 'all');
    const [categoryFilter, setCategoryFilter] = useState(() => localStorage.getItem('achCategoryFilter') || 'all');
    const [sortMode, setSortMode] = useState(() => localStorage.getItem('achSortMode') || 'default');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchAchievements();
                setAchievements(data.achievements || []);
                const feat = await fetchFeaturedAchievements();
                setFeatured(feat.featuredAchievements || []);
            } catch (err) {
                console.error('Failed to load achievements:', err);
                setError('Failed to load achievements');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        localStorage.setItem('achViewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        localStorage.setItem('achCategoryFilter', categoryFilter);
    }, [categoryFilter]);

    useEffect(() => {
        localStorage.setItem('achSortMode', sortMode);
    }, [sortMode]);

    const toggleFeatured = async (ach) => {
        const isFeatured = featured.some((f) => f.name === ach.name);
        let newFeatured;
        if (isFeatured) {
            newFeatured = featured.filter((f) => f.name !== ach.name);
        } else {
            if (featured.length >= 4) {
                if (window.showToast) window.showToast('You can only feature up to 4 achievements', 'error');
                return;
            }
            newFeatured = [...featured, ach];
        }
        setFeatured(newFeatured);
        try {
            await updateFeaturedAchievements(newFeatured.map((f) => f.name));
            if (window.showToast) {
                window.showToast(isFeatured ? 'Achievement removed from profile.' : 'Achievement featured on profile.', 'success');
            }
        } catch (err) {
            console.error('Failed to update featured achievements:', err);
            if (window.showToast) window.showToast('Failed to update featured achievements', 'error');
            setFeatured(featured);
        }
    };

    const handleClaim = async (ach) => {
        if (claiming) return;
        setClaiming(true);
        try {
            const res = await claimAchievement(ach.name);

            if (res.pendingRewards && res.pendingRewards.length > 0 && window.addNewRewards) {
                window.addNewRewards(res.pendingRewards);
            }
            if (res.titleUnlocked?.name && window.showToast) {
                window.showToast(`Title unlocked: ${res.titleUnlocked.name}`, 'success');
            }

            window.showToast('Reward claimed!', 'success');
            setAchievements((prev) =>
                prev.map((a) => (a.name === ach.name ? {...a, claimed: true} : a))
            );
        } catch (err) {
            console.error('Failed to claim reward:', err);
            window.showToast('Failed to claim reward', 'error');
        } finally {
            setClaiming(false);
        }
    };

    const featuredNames = useMemo(
        () => new Set(featured.map((item) => item.name)),
        [featured]
    );

    const categories = useMemo(() => {
        const set = new Set(achievements.map((ach) => ach.category || 'General'));
        const ordered = CATEGORY_ORDER.filter((cat) => set.has(cat));
        const remaining = [...set].filter((cat) => !CATEGORY_ORDER.includes(cat)).sort();
        return [...ordered, ...remaining];
    }, [achievements]);

    const filteredAchievements = useMemo(() => {
        const term = search.trim().toLowerCase();
        return achievements.filter((ach) => {
            const category = ach.category || 'General';
            if (categoryFilter !== 'all' && category !== categoryFilter) return false;
            if (term) {
                const nameMatch = ach.name.toLowerCase().includes(term);
                const descMatch = (ach.description || '').toLowerCase().includes(term);
                if (!nameMatch && !descMatch) return false;
            }
            if (viewMode === 'claimable') return ach.achieved && !ach.claimed;
            if (viewMode === 'completed') return ach.achieved;
            if (viewMode === 'in-progress') return !ach.achieved;
            if (viewMode === 'featured') return featuredNames.has(ach.name);
            return true;
        });
    }, [achievements, categoryFilter, featuredNames, search, viewMode]);

    const renderTitleReward = (title) => {
        if (!title) return null;
        const titleName = title.name || title.slug;
        if (!titleName) return null;
        const hasGradient = Boolean(title.gradient && String(title.gradient).trim());
        const effectSlug = normalizeTitleEffect(title?.effect);
        const effectClass = effectSlug ? ` title-effect title-effect-${effectSlug}` : '';
        const titleStyle = hasGradient
            ? { '--title-gradient': title.gradient }
            : { color: title.color || 'inherit' };
        const titleClassName = `reward-title-text${hasGradient ? ' gradient' : ''}${title.isAnimated ? ' animated' : ''}${effectClass}`;
        return (
            <span className="reward-title-tooltip">
                <span className={titleClassName} style={titleStyle}>
                    {titleName}
                </span>
                <span className="reward-title-hover">
                    <span className={titleClassName} style={titleStyle}>
                        {titleName}
                    </span>
                </span>
            </span>
        );
    };

    const isClaimable = (ach) => ach.achieved && !ach.claimed;

    const sortAchievements = (a, b) => {
        if (sortMode === 'name') {
            return a.name.localeCompare(b.name);
        }
        if (sortMode === 'progress') {
            const aRatio = a.requirement ? a.current / a.requirement : 0;
            const bRatio = b.requirement ? b.current / b.requirement : 0;
            return bRatio - aRatio;
        }
        if (sortMode === 'recent') {
            const aDate = a.dateEarned ? new Date(a.dateEarned).getTime() : 0;
            const bDate = b.dateEarned ? new Date(b.dateEarned).getTime() : 0;
            return bDate - aDate;
        }
        const aRank = isClaimable(a) ? 0 : a.achieved ? 2 : 1;
        const bRank = isClaimable(b) ? 0 : b.achieved ? 2 : 1;
        if (aRank !== bRank) return aRank - bRank;
        const aTier = Number.isFinite(a.tier) ? a.tier : 999;
        const bTier = Number.isFinite(b.tier) ? b.tier : 999;
        if (aTier !== bTier) return aTier - bTier;
        const aReq = a.requirement || 0;
        const bReq = b.requirement || 0;
        if (aReq !== bReq) return aReq - bReq;
        return a.name.localeCompare(b.name);
    };

    const groupedAchievements = useMemo(() => {
        const grouped = new Map();
        filteredAchievements.forEach((ach) => {
            const category = ach.category || 'General';
            if (!grouped.has(category)) grouped.set(category, []);
            grouped.get(category).push(ach);
        });
        grouped.forEach((items) => items.sort(sortAchievements));
        return grouped;
    }, [filteredAchievements, sortAchievements]);

    if (loading) return <LoadingSpinner/>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="page">
            {claiming && <LoadingSpinner/>}
            <h1>Achievements</h1>

            <div className="info-section section-card narrow">
                Earn achievements by completing various tasks. Claim an unlocked achievement to collect its reward.
            </div>

            <div className="achievements-toolbar">
                <div className="achievements-search">
                    <input
                        type="search"
                        value={search}
                        placeholder="Search achievements..."
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="achievements-filters">
                    <div className="filter-group">
                        <button className={`filter-button ${viewMode === 'all' ? 'active' : ''}`} onClick={() => setViewMode('all')}>All</button>
                        <button className={`filter-button ${viewMode === 'claimable' ? 'active' : ''}`} onClick={() => setViewMode('claimable')}>Claimable</button>
                        <button className={`filter-button ${viewMode === 'in-progress' ? 'active' : ''}`} onClick={() => setViewMode('in-progress')}>In Progress</button>
                        <button className={`filter-button ${viewMode === 'completed' ? 'active' : ''}`} onClick={() => setViewMode('completed')}>Completed</button>
                        <button className={`filter-button ${viewMode === 'featured' ? 'active' : ''}`} onClick={() => setViewMode('featured')}>Featured</button>
                    </div>
                    <div className="filter-group">
                        <label htmlFor="ach-category-filter">Category</label>
                        <select
                            id="ach-category-filter"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="all">All</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label htmlFor="ach-sort">Sort</label>
                        <select
                            id="ach-sort"
                            value={sortMode}
                            onChange={(e) => setSortMode(e.target.value)}
                        >
                            <option value="default">Default</option>
                            <option value="name">Name</option>
                            <option value="progress">Progress</option>
                            <option value="recent">Recently Earned</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="achievements-summary">
                Showing {filteredAchievements.length} of {achievements.length} achievements
            </div>

            {filteredAchievements.length > 0 ? (
                <div className="achievements-sections">
                    {categories
                        .filter((category) => groupedAchievements.has(category))
                        .map((category) => {
                            const items = groupedAchievements.get(category) || [];
                            const claimableCount = items.filter((ach) => isClaimable(ach)).length;
                            return (
                                <section key={category} className="achievements-section">
                                    <div className="achievements-section-header">
                                        <h2>{category}</h2>
                                        <span className="achievements-section-meta">
                                            {items.length} total{claimableCount ? `, ${claimableCount} claimable` : ''}
                                        </span>
                                    </div>
                                    <div className="achievements-grid">
                                        {items.map((ach) => {
                                            const reward = ach.reward || {};
                                            const rewardTitle = reward.title;
                                            const hasReward = reward.packs || reward.card || rewardTitle?.name || rewardTitle?.slug;
                                            const featuredActive = featuredNames.has(ach.name);
                                            return (
                                                <div
                                                    key={ach.key || ach.name}
                                                    className={`ach-tile ${ach.achieved ? 'achieved' : ''} ${isClaimable(ach) ? 'claimable' : ''}`}
                                                >
                                                    <div className="ach-header">
                                                        <div className="ach-title-row">
                                                            <h3>{ach.name}</h3>
                                                            {Number.isFinite(ach.tier) && (
                                                                <span className="ach-tier">Tier {ach.tier}</span>
                                                            )}
                                                        </div>
                                                        {featuredActive && <span className="ach-tag">Featured</span>}
                                                    </div>
                                                    <p className="ach-description">{ach.description}</p>
                                                    {hasReward && (
                                                        <div className="ach-reward-list">
                                                            {reward.packs ? (
                                                                <span className="reward-chip">
                                                                    {reward.packs} Pack{reward.packs > 1 ? 's' : ''}
                                                                </span>
                                                            ) : null}
                                                            {reward.card ? (
                                                                <span className="reward-chip">Random Card</span>
                                                            ) : null}
                                                            {rewardTitle ? (
                                                                <span className="reward-chip reward-title">
                                                                    Title: {renderTitleReward(rewardTitle)}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    )}
                                                    {ach.achieved ? (
                                                        <div className="ach-earned">
                                                            {ach.claimed ? (
                                                                'Reward claimed'
                                                            ) : (
                                                                <>Achieved on {ach.dateEarned ? new Date(ach.dateEarned).toLocaleDateString() : 'recently'}.</>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="ach-progress">
                                                                <div
                                                                    className="ach-progress-bar"
                                                                    style={{width: `${Math.min((ach.current / ach.requirement) * 100, 100)}%`}}
                                                                ></div>
                                                            </div>
                                                            <div className="ach-progress-text">
                                                                {ach.current} / {ach.requirement}
                                                            </div>
                                                        </>
                                                    )}
                                                    <div className="ach-actions">
                                                        {isClaimable(ach) ? (
                                                            <button
                                                                className="primary-button ach-claim-button"
                                                                onClick={() => handleClaim(ach)}
                                                                disabled={claiming}
                                                            >
                                                                Claim
                                                            </button>
                                                        ) : (
                                                            <span className="ach-status">
                                                                {ach.achieved ? 'Complete' : 'In progress'}
                                                            </span>
                                                        )}
                                                        {ach.achieved && (
                                                            <button
                                                                className={`feature-button ${featuredActive ? 'active' : ''}`}
                                                                onClick={() => toggleFeatured(ach)}
                                                            >
                                                                {featuredActive ? 'Unfeature' : 'Feature'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}
                </div>
            ) : (
                <p>No achievements to display.</p>
            )}
        </div>
    );
};

export default AchievementsPage;
