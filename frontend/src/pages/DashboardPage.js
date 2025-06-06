// frontend/src/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { fetchUserProfile, fetchMyPacks } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner'; // Import your spinner
// Styling now handled with Tailwind classes

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
            setError(err.message || 'Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    if (loading) {
        // Instead of plain text, display the spinner.
        return <LoadingSpinner />;
    }

    if (error) {
        return <p className="text-center text-xl text-red-400 mt-8">{error}</p>;
    }

    // Multiple parent parameters for local dev and Netlify
    const twitchIframeSrc =
        'https://player.twitch.tv/?channel=just_joe_' +
        '&parent=localhost' +               // for local dev
        '&parent=nedsdecks.netlify.app';     // your live Netlify domain

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 py-16 px-6">
            <h1
                className="text-center text-4xl font-medium mb-12 relative after:content-[''] after:absolute after:-bottom-2 after:left-1/2 after:-translate-x-1/2 after:w-32 after:h-0.5 after:bg-pink-400 after:rounded"
            >
                Dashboard
            </h1>
            <div
                className="grid gap-8 max-w-screen-xl mx-auto [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]"
            >
                <div className="bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-lg">
                    <h2 className="text-pink-400 text-center text-2xl mb-4">
                        Welcome, {userData?.username || 'User'}!
                    </h2>
                    <p className="text-center text-xl mb-4">Your Packs: {packCount}</p>
                    <p className="mb-4">
                        This app is a trading card experience built for the Just Joe Show community. Collect cards based on moments and events from the show, trade with others, and showcase your collection!
                    </p>
                    <p className="mb-4">
                        Packs cannot be opened by users themselves. Instead, during live segments on the Just Joe Show, packs are opened for you in front of a live audience, creating an engaging and thrilling community experience!
                    </p>
                    <div className="mb-4">
                        <h3 className="text-pink-400 mb-2 text-lg">How to Earn Packs:</h3>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>Earn 1 pack for your first login and signing into the app.</li>
                            <li>Earn 1 pack every time you subscribe to the show.</li>
                            <li>Earn 1 pack per gifted subscription to the show (e.g., 5 gifted earns 5 packs).</li>
                            <li>Earn 1 pack by redeeming 10,000 channel points.</li>
                        </ul>
                    </div>
                </div>
                <div className="bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-lg">
                    <h2 className="text-pink-400 text-center text-2xl mb-4">Watch The Just Joe Show Live</h2>
                    <iframe
                        src={twitchIframeSrc}
                        title="Twitch Stream"
                        frameBorder="0"
                        allow="autoplay; fullscreen"
                        allowFullScreen
                        className="w-full h-[350px] rounded-2xl border border-gray-700 shadow-md"
                    />
                    <p className="text-center text-cyan-300 mt-4">
                        Check out the Just Joe Show live or watch past streams to see the moments that inspired these collectible cards!
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
