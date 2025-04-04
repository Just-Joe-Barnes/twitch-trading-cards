// frontend/src/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { fetchUserProfile, fetchMyPacks } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner'; // Import your spinner

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
        // Instead of plain text, display the spinner.
        return <LoadingSpinner />;
    }

    if (error) {
        return <p className="text-red-500">{error}</p>;
    }

    // Multiple parent parameters for local dev and Netlify
    const twitchIframeSrc =
        'https://player.twitch.tv/?channel=just_joe_' +
        '&parent=localhost' +               // for local dev
        '&parent=nedsdecks.netlify.app';     // your live Netlify domain

    return (
        <div className="bg-gray-100 min-h-screen py-8 font-sans">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl font-semibold mb-4 text-gray-800">Dashboard</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-2 text-gray-700">Welcome, {userData?.username || 'User'}!</h2>
                        <p className="text-gray-600 mb-4">Your Packs: {packCount}</p>
                        <p className="text-gray-700 mb-4">
                            This app is a trading card experience built for the Just Joe Show community.
                            Collect cards based on moments and events from the show, trade with others, and showcase your collection!
                        </p>
                        <p className="text-gray-700 mb-4">
                            Packs cannot be opened by users themselves. Instead, during live segments on the Just Joe Show,
                            packs are opened for you in front of a live audience, creating an engaging and thrilling community experience!
                        </p>
                        <div className="mt-4">
                            <h3 className="text-lg font-semibold mb-2 text-gray-700">How to Earn Packs:</h3>
                            <ul className="list-disc pl-5 text-gray-700">
                                <li>Earn 1 pack for your first login and signing into the app.</li>
                                <li>Earn 1 pack every time you subscribe to the show.</li>
                                <li>Earn 1 pack per gifted subscription to the show (e.g., 5 gifted earns 5 packs).</li>
                                <li>Earn 1 pack by redeeming 10,000 channel points.</li>
                            </ul>
                        </div>
                    </div>
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-2 text-gray-700">Watch The Just Joe Show Live</h2>
                        <div className="aspect-w-16 aspect-h-9">
                            <iframe
                                src={twitchIframeSrc}
                                title="Twitch Stream"
                                frameBorder="0"
                                allow="autoplay; fullscreen"
                                allowFullScreen
                            />
                        </div>
                        <p className="text-gray-700 mt-4">
                            Check out the Just Joe Show live or watch past streams to see the moments that inspired these collectible cards!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
