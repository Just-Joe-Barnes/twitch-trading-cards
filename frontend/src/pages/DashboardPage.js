// frontend/src/DashboardPage.js
import React, {useState, useEffect} from 'react';
import {fetchUserProfile} from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import UserTitle from '../components/UserTitle';
import '../styles/DashboardPage.css';

const CHANNEL_POINTS_COST = parseInt(
    process.env.REACT_APP_CHANNEL_POINTS_COST || '5000',
    10
);
const TIKTOK_COINS_PER_PACK = parseInt(
    process.env.REACT_APP_TIKTOK_COINS_PER_PACK || '200',
    10
);
const YOUTUBE_SUPERCHAT_PACK_USD = parseFloat(
    process.env.REACT_APP_YOUTUBE_SUPERCHAT_PACK_USD || '5'
);
const TUTORIAL_STORAGE_KEY = 'nedsdecks_tutorial_v1_seen';

const DashboardPage = () => {
    const [userData, setUserData] = useState(null);
    const [packCount, setPackCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showTutorial, setShowTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            const userProfile = await fetchUserProfile();

            setUserData(userProfile);
            setPackCount(userProfile?.packs || 0);
            const hasSeen = localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
            if (!hasSeen) {
                setShowTutorial(true);
            }
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

    const tutorialSteps = [
        {
            title: 'Welcome to Ned’s Decks',
            body: 'Collect trading cards inspired by the Just Joe Show. Build sets, trade with the community, and show off your collection.',
        },
        {
            title: 'Earn Packs',
            body: 'Packs come from Twitch/YouTube subs, YouTube Super Chats, TikTok gifts, and channel point redemptions.',
        },
        {
            title: 'Live Pack Opens',
            body: 'Packs are opened for you on stream during live segments, so the community gets to share the moment.',
        },
        {
            title: 'Achievements',
            body: 'Complete achievements to earn extra packs, cards, and titles. Check the Achievements tab for progress.',
        },
        {
            title: 'Monthly Community Goals',
            body: 'Hit monthly goals together to unlock perks and bonus packs for everyone. See the Community page for targets.',
        },
        {
            title: 'Card Grading',
            body: 'Submit cards for grading to boost their prestige. Graded cards are slabbed and shown in your collection.',
        },
        {
            title: 'Trading & Market',
            body: 'Swap cards with other collectors or list them on the market to complete your collection.',
        },
        {
            title: 'Link Your Accounts',
            body: 'Connect Twitch, YouTube, and TikTok so all rewards land in one place.',
        },
    ];

    const closeTutorial = () => {
        setShowTutorial(false);
        localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    };

    const handleTutorialNext = () => {
        if (tutorialStep >= tutorialSteps.length - 1) {
            closeTutorial();
            return;
        }
        setTutorialStep((step) => step + 1);
    };

    const handleTutorialBack = () => {
        setTutorialStep((step) => Math.max(0, step - 1));
    };

    const twitchIframeSrc =
        'https://player.twitch.tv/?channel=just_joe_' +
        '&parent=localhost' +
        '&parent=nedsdecks.netlify.app';

    return (
        <div className="dashboard">
            <h1>Dashboard</h1>
            <div className="dashboard-grid">
                <div className="info-section section-card">
                    <h2>
                        Welcome, <UserTitle username={userData?.username || 'User'} title={userData?.selectedTitle} />!
                    </h2>
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
                                Twitch/YouTube memberships: 3 packs for tier 1, 6 packs for tier 2, and 12 packs for tier 3.
                            </li>
                            <li>
                                YouTube Super Chats: {YOUTUBE_SUPERCHAT_PACK_USD} USD per pack (rounded down).
                            </li>
                            <li>
                                TikTok gifts: {TIKTOK_COINS_PER_PACK} coins per pack (coins carry over to the next pack).
                            </li>
                            <li>
                                Gifted subscriptions award packs to the gifter and each recipient based on the same tier values.
                            </li>
                            <li>
                                Earn 1 pack by redeeming {CHANNEL_POINTS_COST.toLocaleString()} channel points.
                            </li>
                        </ul>
                    </div>
                    <button
                        type="button"
                        className="tutorial-trigger"
                        onClick={() => {
                            setTutorialStep(0);
                            setShowTutorial(true);
                        }}
                    >
                        View quick tour
                    </button>
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
            {showTutorial && (
                <div className="tutorial-overlay" onClick={closeTutorial}>
                    <div className="tutorial-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="tutorial-header">
                            <span className="tutorial-step">Step {tutorialStep + 1} of {tutorialSteps.length}</span>
                            <button type="button" className="tutorial-skip" onClick={closeTutorial}>
                                Skip
                            </button>
                        </div>
                        <h2>{tutorialSteps[tutorialStep].title}</h2>
                        <p>{tutorialSteps[tutorialStep].body}</p>
                        <div className="tutorial-actions">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={handleTutorialBack}
                                disabled={tutorialStep === 0}
                            >
                                Back
                            </button>
                            <button type="button" className="primary-button" onClick={handleTutorialNext}>
                                {tutorialStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
