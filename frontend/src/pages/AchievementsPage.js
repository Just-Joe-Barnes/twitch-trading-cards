import React, {useEffect, useState} from 'react';
import {fetchAchievements, claimAchievement, fetchFeaturedAchievements, updateFeaturedAchievements} from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/AchievementsPage.css';

const AchievementsPage = () => {
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [claiming, setClaiming] = useState(false);
    const [featured, setFeatured] = useState([]);
    const [showAchieved] = useState(() => {
        const storedValue = localStorage.getItem("showAchieved");
        return storedValue !== null ? JSON.parse(storedValue) : true;
    });

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
        localStorage.setItem("showAchieved", JSON.stringify(showAchieved));
    }, [showAchieved]);

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

            // --- THIS IS THE FIX ---
            // We now get 'pendingRewards' which is an ARRAY of *new* rewards.
            // We must call 'addNewRewards' (defined in App.js) to ADD them to the queue.
            if (res.pendingRewards && res.pendingRewards.length > 0 && window.addNewRewards) {
                window.addNewRewards(res.pendingRewards);
            }
            // --- END FIX ---

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

    if (loading) return <LoadingSpinner/>;
    if (error) return <div className="error">{error}</div>;

    const filteredAchievements = showAchieved
        ? achievements
        : achievements.filter(ach => !ach.achieved);

    return (
        <div className="page">
            {claiming && <LoadingSpinner/>}
            <h1>Achievements</h1>

            <div className="info-section section-card narrow">
                Earn achievements by completing various tasks. Click on an unlocked
                achievement to claim your reward.
            </div>

            <div className="achievements-grid">
                {filteredAchievements.length > 0 ? (
                    filteredAchievements.map((ach, idx) => (
                        <div
                            key={idx}
                            className={`ach-tile ${ach.achieved ? 'achieved' : ''} ${ach.achieved && !ach.claimed ? 'claimable' : ''}`}
                            onClick={() => ach.achieved && !ach.claimed && handleClaim(ach)}
                        >
                            {ach.achieved && (
                                <div
                                    className="feature-star"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFeatured(ach);
                                    }}
                                >
                                    {featured.some((f) => f.name === ach.name) ? '★' : '☆'}
                                </div>
                            )}
                            <h3>{ach.name}</h3>
                            <p>{ach.description}</p>
                            {ach.reward && (
                                <div className="ach-reward">
                                    Reward:{' '}
                                    {ach.reward.packs ? `${ach.reward.packs} Pack` : 'Random Card'}
                                </div>
                            )}
                            {ach.achieved ? (
                                <div className="ach-earned">
                                    {ach.claimed ? (
                                        'Reward claimed'
                                    ) : (
                                        <>Achieved on {new Date(ach.dateEarned).toLocaleDateString()} - Click to claim!</>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="ach-progress">
                                        <div
                                            className="ach-progress-bar"
                                            style={{width: `${(ach.current / ach.requirement) * 100}%`}}
                                        ></div>
                                    </div>
                                    <div className="ach-progress-text">
                                        {ach.current} / {ach.requirement}
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                ) : (
                    <p>No achievements to display.</p>
                )}
            </div>
        </div>
    );
};

export default AchievementsPage;

