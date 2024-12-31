import React from "react";
import "../styles/LoginPage.css"; // Ensure this exists and styles the login page

const LoginPage = () => {
    const handleLogin = () => {
        // Redirect user to the backend Twitch login route
        window.location.href = "/api/auth/twitch";
    };

    return (
        <div className="login-container">
            <h1>Welcome to Twitch Trading Cards</h1>
            <button onClick={handleLogin} className="login-button">
                Login with Twitch
            </button>
        </div>
    );
};

export default LoginPage;
