import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import "./styles/App.css"; // Ensure this is correctly imported

const App = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch("/api/auth/user", {
                    credentials: "include",
                });
                if (response.ok) {
                    const userData = await response.json();
                    setUser(userData);
                } else {
                    console.error("Failed to fetch user data.");
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };

        fetchUser();
    }, []);

    return (
        <Router>
            <Routes>
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<DashboardPage user={user} />} />
            </Routes>
        </Router>
    );
};

export default App;
