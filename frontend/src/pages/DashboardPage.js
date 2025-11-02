// frontend/src/DashboardPage.js
import React, {useState, useEffect} from 'react';
import {fetchUserProfile} from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/DashboardPage.css';

const CHANNEL_POINTS_COST = parseInt(
    process.env.REACT_APP_CHANNEL_POINTS_COST || '5000',
    10
);

const DashboardPage = () => {
    const [userData, setUserData] = useState(null);
    const [packCount, setPackCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUserData = async () => {
        try {
            setLoading(true);
            const userProfile = await fetchUserProfile();

            setUserData(userProfile);
            setPackCount(userProfile?.packs || 0);
        } catch (err) {
            console.error('Error fetching user data:', err.message);
            setError(err.message || 'Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    if (loading) {
        return <LoadingSpinner/>;
    }

    if (error) {
        return <p className="error-message">{error}</p>;
    }

    const twitchIframeSrc =
        'https://player.twitch.tv/?channel=just_joe_' +
        '&parent=localhost' +
        '&parent=nedsdecks.netlify.app';

    return (
        <div className="dashboard">
            <h1>Dashboard</h1>
            <div className="dashboard-grid">
                <div className="info-section section-card">
                    <h2>Welcome, {userData?.username || 'User'}!</h2>
                    <h3>Your Packs: {packCount}</h3>

                    <p className="app-info">
                        This app is a trading card experience built for the Just Joe Show community.
                        Collect cards based on moments and events from the show, trade with others, and showcase your
                        collection!
                    </p>
                    <p className="pack-opening-info">
                        Packs cannot be opened by users themselves. Instead, during live segments on the Just Joe Show,
                        packs are opened for you in front of a live audience, creating an engaging and thrilling
                        community experience!
                    </p>
                    <div className="earning-info">
                        <h3>How to Earn Packs:</h3>
                        <ul>
                            <li>Earn 1 pack for your first login and signing into the app.</li>
                            <li>
                                Earn packs when you subscribe: 3 packs for tier 1,
                                6 packs for tier 2, and 12 packs for tier 3.
                            </li>
                            <li>
                                Gifted subscriptions award packs to the gifter and
                                each recipient based on the same tier values.
                            </li>
                            <li>
                                Earn 1 pack by redeeming{' '}
                                {CHANNEL_POINTS_COST.toLocaleString()} channel
                                points.
                            </li>
                        </ul>
                    </div>
                </div>
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
    );
};

export default DashboardPage;
