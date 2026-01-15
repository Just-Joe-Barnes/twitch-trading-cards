import React, { useEffect } from 'react';
import '../styles/LoginPage.css';

const LoginPage = () => {
    const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

    const handleLogin = (provider) => () => {
        window.location.href = `${apiBaseUrl}/api/auth/${provider}`;
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
        <div className="login-container">
            <div className="login-box">
                <h1>
                    <small>Welcome to</small> <br/>
                    <img src="/images/logo.png" alt="Ned's Decks" width="40%" />
                </h1>
                <p className="intro-text">
                    <span className="pink-text">Ned's Decks</span> is the ultimate trading card experience for fans of the{' '}
                    <span className="pink-text">Just Joe Show</span>. Collect unique cards inspired by unforgettable moments,{' '}
                    beloved characters, and epic events from the stream.
                </p>
                <p className="intro-text">
                    Whether you're collecting your favorite moments, trading with the community, or showing off your collection,{' '}
                    <span className="pink-text">Ned's Decks</span> is your portal to reliving the highlights of the{' '}
                    <span className="pink-text">Just Joe Show</span>.
                </p>
                <p className="cta-text">
                    <span className="blue-text">
                        Login with Twitch, YouTube, or TikTok to start collecting and building your deck today!
                    </span>
                </p>

                <div className="login-buttons">
                    <button onClick={handleLogin('twitch')}>Login with Twitch</button>
                    <button onClick={handleLogin('youtube')}>Login with YouTube</button>
                    <button onClick={handleLogin('tiktok')}>Login with TikTok</button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
