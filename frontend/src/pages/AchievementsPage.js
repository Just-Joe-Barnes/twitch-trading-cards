import React, { useEffect, useState } from 'react';
import { fetchAchievements } from '../utils/api';
import '../styles/AchievementsPage.css';

const AchievementsPage = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="achievements-page">
      <h1>Achievements</h1>
      <div className="achievements-grid">
        {achievements.map((ach, idx) => (
          <div key={idx} className={`ach-tile ${ach.achieved ? 'achieved' : ''}`}>
            <h3>{ach.name}</h3>
            <p>{ach.description}</p>
            <div className="ach-progress">
              <div
                className="ach-progress-bar"
                style={{ width: `${(ach.current / ach.requirement) * 100}%` }}
              ></div>
            </div>
            <div className="ach-progress-text">
              {ach.current} / {ach.requirement}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AchievementsPage;
