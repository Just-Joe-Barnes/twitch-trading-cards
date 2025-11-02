import React, { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from "../utils/api";
import '../styles/CommunityPage.css';

const GoalProgressBar = ({ label, count, goals, type, packsToAward=0 }) => {
    const maxGoal = goals[goals.length - 1];
    const percentage = Math.min((count / maxGoal) * 100, 100);

    return (
        <div className="goal-progress-bar">
            <h2>{label}</h2>
            {type === 'weekly' ?
                (<p>Time to rig the drops! As the community hits each goal, all packs opened for the rest of the week (<i>resets on Monday</i>) will have boosted luck. This guarantees minimum card rarities. Higher tiers = better guaranteed cards!</p>)
                :
                (<p>Hit these goals to earn free packs for the whole community! Each tier unlocks one bonus pack for everyone. Stay active this month (just by logging in!) and you'll receive <strong>{packsToAward} bonus pack{packsToAward !== 1 ? 's' : ''}</strong> at the start of next month!</p>)
            }
            <div className="progress-bar-container">
                <div
                    className="progress-bar-filler"
                    style={{ width: `${percentage}%` }}
                >
                    <span className="progress-bar-label">{count}</span>
                </div>
            </div>
            <div className={`goal-markers ` + type }>
                <div
                    key="startmarker"
                    className={`goal-marker`}
                    style={{ left: `0;` }}
                >
                    <span className="goal-marker-dot"></span>
                    <div className="goal-marker-label">
                        <span className="goal-marker-label-number">0</span>
                        {type === 'weekly' && <GoalPackLuckIndicator goal={0} />}
                    </div>
                </div>
                {goals.map((goal, index) => {
                    const goalMet = count >= goal;
                    const markerLeft = Math.min((goal / maxGoal) * 100, 100);
                    return (
                        <div
                            key={index}
                            className={`goal-marker ${goalMet ? 'met' : ''}`}
                            style={{ left: `${markerLeft}%` }}
                        >
                            <span className="goal-marker-dot"></span>
                            <div className="goal-marker-label"> {/* MODIFIED: Now a div */ }
                                <span className="goal-marker-label-number">{goal}</span>
                                {type === 'weekly' && <GoalPackLuckIndicator goal={goal} />}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const calculatePacksToAward = (subCount, goals) => {
    let packsToAward = 0;
    for (let i = 0; i < goals.length; i++) {
        if (subCount >= goals[i]) {
            packsToAward = i + 1;
        } else {
            break;
        }
    }
    return packsToAward;
};

const GoalPackLuckIndicator = ({ goal }) => {
    const cards = ['grey', 'grey', 'grey', 'grey', 'grey'];
    switch (goal) {
        case 15: // Tier 1 (15-29)
            cards[0] = 'epic';
            break;
        case 30: // Tier 2 (30-44)
            cards[0] = 'rare';
            cards[1] = 'rare';
            break;
        case 45: // Tier 3 (45+)
            cards[0] = 'epic';
            cards[1] = 'rare';
            break;
        case 60: // Tier 4 (45+)
            cards[0] = 'epic';
            cards[1] = 'epic';
            break;
        default:
            cards[0] = 'rare';
    }

    return (
        <div className="goal-luck-container">
            {cards.map((color, index) => (
                <div key={index} className={`goal-luck-card ${color}`}>
                    <span>?</span>
                </div>
            ))}
        </div>
    );
};

const CurrentPackLuckIndicator = ({ count }) => {
    const cards = ['grey', 'grey', 'grey', 'grey', 'grey'];
    if (count < 15) {
        cards[0] = 'rare';
    } else if (count < 30) {
        cards[0] = 'epic';
    } else if (count < 45) {
        cards[0] = 'rare';
        cards[1] = 'rare';
    } else if (count < 60) {
        cards[0] = 'epic';
        cards[1] = 'rare';
    } else {
        cards[0] = 'epic';
        cards[1] = 'epic';
    }

    return (
        <div className="pack-luck-container">
            {cards.map((color, index) => (
                <div key={index} className={`luck-card ${color}`}>
                    <span>?</span>
                </div>
            ))}
        </div>
    );
};

const CommunityPage = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Your goals
    const weeklyGoals = [15, 30, 45, 60];
    const monthlyGoals = [25, 50, 75, 100, 150, 200, 250, 300, 350, 400];

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchWithAuth('/api/community/stats');
            setStats(data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to fetch community stats.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="section section-card" style={{ textAlign: 'center' }}>
                    <p>Loading community goals...</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className="section section-card error-message">
                    <p>Error: {error}</p>
                </div>
            );
        }

        const weeklyCount = stats?.weekly?.count ?? 0;
        const monthlyCount = stats?.monthly?.count ?? 0;

        const packsToAward = calculatePacksToAward(monthlyCount, monthlyGoals);

        return (
            <>
                <div className="section section-card">
                    <GoalProgressBar
                        label="Weekly Rigged Packs Sub Goal"
                        count={weeklyCount}
                        goals={weeklyGoals}
                        type="weekly"
                    />
                    <div className="current-reward">
                        <h3 className="tiny">
                            Current Rigged Pack Luck
                        </h3>
                        <CurrentPackLuckIndicator count={weeklyCount} />
                    </div>
                </div>
                <div className="section section-card">
                    <GoalProgressBar
                        label="Monthly Community Reward Goal"
                        count={monthlyCount}
                        goals={monthlyGoals}
                        packsToAward={packsToAward}
                        type="monthly"
                    />
                    <div className="current-reward packs">
                        <h3 className="tiny">
                            Next Months Reward <br/>
                            <strong>+{packsToAward} bonus pack{packsToAward !== 1 ? 's' : ''}</strong>
                        </h3>

                    </div>
                </div>
            </>
        );
    };

    const twitchIframeSrc =
        'https://player.twitch.tv/?channel=just_joe_' +
        '&parent=localhost' +
        '&parent=nedsdecks.netlify.app';

    return (
        <div className="page">
            <h1>The Just Joe Show Community Hub</h1>

            <div className="section-card">
                Welcome to the Community Hub! Let's smash some goals together. Every subscription helps level up the whole community, unlocking community-wide luck boosts and scoring free packs for all!
            </div>

            <div className="columns">
                <div className="column">
                    {renderContent()}

                    <p style={{fontSize: '0.8rem', opacity: '0.5', textAlign: 'center'}}>
                        Goals are subject to change as and when it is deemed necessary.
                    </p>
                </div>
                <div className="column">
                    <div className="twitch-section section-card">
                        <h2>Watch The Just Joe Show Live</h2>
                        <iframe
                            src={twitchIframeSrc}
                            title="Twitch Stream"
                            frameBorder="0"
                            allow="autoplay; fullscreen"
                            allowFullScreen
                        />
                        <p className="twitch-details">
                            Check out the Just Joe Show live or watch past streams to see the moments that inspired these
                            collectible cards!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunityPage;

