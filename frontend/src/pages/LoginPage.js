// src/pages/LoginPage.js
import React, { useEffect } from 'react';

const LoginPage = () => {
    // Redirect to Twitch authentication endpoint using environment variable
    const handleLogin = () => {
        window.location.href = `${process.env.REACT_APP_API_BASE_URL}/api/auth/twitch`;
    };

    // Check if a token is present in the URL; if so, save it and redirect to the dashboard
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
            localStorage.setItem('token', token);
            window.location.href = '/dashboard';
        }
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            <div className="bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
                <h1 className="text-3xl mb-6">
                    Welcome to <span className="text-pink-300">Ned's Decks</span>
                </h1>
                <p className="mb-4">
                    <span className="text-pink-300">Ned's Decks</span> is the ultimate trading card experience for fans of the{' '}
                    <span className="text-pink-300">Just Joe Show</span>. Collect unique cards inspired by unforgettable moments,
                    beloved characters, and epic events from the stream.
                </p>
                <p className="mb-4">
                    Whether you're collecting your favorite moments, trading with the community, or showing off your collection,{' '}
                    <span className="text-pink-300">Ned's Decks</span> is your portal to reliving the highlights of the{' '}
                    <span className="text-pink-300">Just Joe Show</span>.
                </p>
                <p className="mb-6 font-semibold">
                    <span className="text-sky-300">Login with Twitch to start collecting and building your deck today!</span>
                </p>
                <button
                    className="bg-purple-500 hover:bg-purple-600 active:bg-purple-700 transition-colors rounded-lg py-2 px-8 text-lg"
                    onClick={handleLogin}
                >
                    Login with Twitch
                </button>
            </div>
        </div>
    );
};

export default LoginPage;
