import React, { useState, useEffect } from 'react';
import { fetchUserProfile, fetchMyPacks } from '../utils/api';
import '../styles/DashboardPage.css';

const DashboardPage = () => {
    const [userData, setUserData] = useState(null);
    const [packCount, setPackCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUserData = async () => {
        try {
            setLoading(true);
            const userProfile = await fetchUserProfile();
            const userPacks = await fetchMyPacks();

            setUserData(userProfile);
            setPackCount(userPacks?.packs || 0);
        } catch (err) {
            console.error('Error fetching user data:', err.message);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    if (loading) {
        return <p className="loading-message">Loading...</p>;
    }

    if (error) {
        return <p className="error-message">{error}</p>;
    }

    return (
        <div className="dashboard">
            <h1>Dashboard</h1>
            <div className="dashboard-grid">
                <div className="info-section section-card">
                    <h2>Welcome, {userData?.username || 'User'}!</h2>
                    <p className="pack-count">Your Packs: {packCount}</p>
                    <p className="app-info">
                        This app is a trading card experience built for the Just Joe Show community.
                        Collect cards based on moments and events from the show, trade with others, and showcase your collection!
                    </p>
                    <p className="pack-opening-info">
                        Packs cannot be opened by users themselves. Instead, during live segments on the Just Joe Show,
                        packs are opened for you in front of a live audience, creating an engaging and thrilling community experience!
                    </p>
                    <div className="earning-info">
                        <h3>How to Earn Packs:</h3>
                        <ul>
                            <li>Earn 1 pack for your first login and signing into the app.</li>
                            <li>Earn 1 pack every time you subscribe to the show.</li>
                            <li>Earn 1 pack per gifted subscription to the show (e.g., 5 gifted earns 5 packs).</li>
                            <li>Earn 1 pack by redeeming 10,000 channel points.</li>
                        </ul>
                    </div>
                </div>
                <div className="twitch-section section-card">
                    <h2>Watch The Just Joe Show Live</h2>
                    <iframe
                        src="https://player.twitch.tv/?channel=just_joe_&parent=localhost"
                        title="Twitch Stream"
                        frameBorder="0"
                        allowFullScreen
                    ></iframe>
                    <p className="twitch-details">
                        Check out the Just Joe Show live or watch past streams to see the moments that inspired these collectible cards!
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
