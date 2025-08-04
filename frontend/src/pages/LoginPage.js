import React, { useEffect } from 'react';
import '../styles/LoginPage.css';

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
                        Login with Twitch to start collecting and building your deck today!
                    </span>
                </p>

                <br/>
                <button onClick={handleLogin}>Login with Twitch</button>
            </div>
        </div>
    );
};

export default LoginPage;
