// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CollectionPage from './pages/CollectionPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import Navbar from './components/Navbar';
import ProfilePage from './pages/ProfilePage';
import TradingPage from './pages/TradingPage';
import PendingTrades from './pages/PendingTrades';
import DebugTradePage from './pages/DebugTradePage';
import CataloguePage from './pages/CataloguePage';
import LoadingSpinner from './components/LoadingSpinner';
import MarketPage from './pages/MarketPage';
import CreateListingPage from './pages/CreateListingPage';
import MarketListingDetails from './pages/MarketListingDetails';
import 'normalize.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleTokenFromURL = () => {
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');
            if (token) {
                localStorage.setItem('token', token);
                window.history.replaceState({}, document.title, '/dashboard');
            }
        };

        const fetchUserData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                // First, validate the token (returns minimal data)
                const validateResponse = await fetch(`${API_BASE_URL}/api/auth/validate`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!validateResponse.ok) {
                    throw new Error(`Token validation failed with status ${validateResponse.status}`);
                }
                // Then, fetch the full user profile
                const profileResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!profileResponse.ok) {
                    throw new Error(`Profile fetch failed with status ${profileResponse.status}`);
                }
                const profileData = await profileResponse.json();
                setUser(profileData);
            } catch (error) {
                console.error('[App.js] Error fetching user data:', error.message);
                localStorage.removeItem('token');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        handleTokenFromURL();
        fetchUserData();
    }, []);

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <Router>
            {user && <Navbar isAdmin={user?.isAdmin} />}
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/dashboard"
                    element={user ? <DashboardPage user={user} /> : <Navigate to="/login" />}
                />
                <Route path="/collection/:username" element={<CollectionPage />} />
                <Route
                    path="/collection"
                    element={user ? <CollectionPage user={user} /> : <Navigate to="/login" />}
                />
                <Route
                    path="/admin-dashboard"
                    element={user?.isAdmin ? <AdminDashboardPage user={user} /> : <Navigate to="/login" />}
                />
                <Route path="/profile/:username" element={<ProfilePage />} />
                <Route
                    path="/trading"
                    element={user ? <TradingPage userId={user._id} /> : <Navigate to="/login" />}
                />
                <Route
                    path="/trades/pending"
                    element={user ? <PendingTrades userId={user._id} /> : <Navigate to="/login" />}
                />
                <Route path="/debug-trade" element={<DebugTradePage />} />
                <Route path="/catalogue" element={<CataloguePage />} />
                {/* Protected Market routes – admin only */}
                <Route path="/market" element={<MarketPage />} />
                <Route path="/market/create" element={<CreateListingPage />} />
                <Route path="/market/listing/:id" element={<MarketListingDetails />} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </Router>
    );
};

export default App;
