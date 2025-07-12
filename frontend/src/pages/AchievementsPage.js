import React, { useEffect, useState } from 'react';
import { fetchAchievements, claimAchievement, fetchFeaturedAchievements, updateFeaturedAchievements } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/AchievementsPage.css';

const AchievementsPage = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [featured, setFeatured] = useState([]);

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

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="achievements-page">
      {claiming && <LoadingSpinner />}
      <h1>Achievements</h1>
      <p className="ach-description">
        Earn achievements by completing various tasks. Click on an unlocked
        achievement to claim your reward.
      </p>
      <div className="achievements-grid">
        {achievements.map((ach, idx) => (
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
