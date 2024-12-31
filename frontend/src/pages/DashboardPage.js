import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import "../styles/DashboardPage.css";

const DashboardPage = () => {
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch("/api/auth/user", { credentials: "include" });
                if (response.ok) {
                    const userData = await response.json();
                    setUser(userData);
                } else {
                    setError("Unauthorized. Please log in.");
                }
            } catch (err) {
                setError("Failed to fetch user data.");
            }
        };

        fetchUser();
    }, []);

    if (error) {
        return <div className="dashboard-container"><h2>{error}</h2></div>;
    }

    if (!user) {
        return <div className="dashboard-container"><h2>Loading user data...</h2></div>;
    }

    return (
        <div className="dashboard-container">
            <Navbar />
            <div className="profile-card">
                <img className="profile-picture" src={user.profileImage} alt="User Profile" />
                <h2>Welcome, {user.displayName}</h2>
            </div>
            <div className="user-details">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Broadcaster Type:</strong> {user.broadcasterType || "N/A"}</p>
                <p><strong>Account Created:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
        </div>
    );
};

export default DashboardPage;
