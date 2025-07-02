import React, { useEffect, useState } from 'react';
import { fetchAchievements, claimAchievement } from '../utils/api';
import '../styles/AchievementsPage.css';

const AchievementsPage = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAchievements();
        setAchievements(data.achievements || []);
      } catch (err) {
        console.error('Failed to load achievements:', err);
        setError('Failed to load achievements');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleClaim = async (ach) => {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await claimAchievement(ach.name);
      if (res.card) {
        const { name, imageUrl, flavorText, rarity, mintNumber, modifier } = res.card;
        window.inspectCard({
          name,
          image: imageUrl,
          description: flavorText,
          rarity,
          mintNumber,
          modifier,
        });
      }
      window.showToast('Reward claimed!', 'success');
      setAchievements((prev) =>
        prev.map((a) => (a.name === ach.name ? { ...a, claimed: true } : a))
      );
    } catch (err) {
      console.error('Failed to claim reward:', err);
      window.showToast('Failed to claim reward', 'error');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="achievements-page">
      <h1>Achievements</h1>
      <div className="achievements-grid">
        {achievements.map((ach, idx) => (
          <div
            key={idx}
            className={`ach-tile ${ach.achieved ? 'achieved' : ''} ${ach.achieved && !ach.claimed ? 'claimable' : ''}`}
            onClick={() => ach.achieved && !ach.claimed && handleClaim(ach)}
          >
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
                    style={{ width: `${(ach.current / ach.requirement) * 100}%` }}
                  ></div>
                </div>
                <div className="ach-progress-text">
                  {ach.current} / {ach.requirement}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AchievementsPage;
