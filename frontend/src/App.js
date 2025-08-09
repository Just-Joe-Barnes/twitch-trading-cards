import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import LoadingSpinner from './components/LoadingSpinner';
import Toast from './components/Toast';
import CardInspector from './components/CardInspector';
import 'normalize.css';
import './styles/App.css';
import './styles/DevelopmentNotice.css';
import KitchenSink from "./pages/__tests__/KitchenSink";
import ScrollToTopButton from "./components/ScrollToTopButton";
import AdminCardAudit from "./pages/AdminCardAudit";
import LeaderboardPage from "./pages/__tests__/LeaderboardPage";
import AdminCardOwnershipPage from "./pages/AdminCardOwnershipPage";
import StreamOverlayPage from "./pages/StreamOverlayPage";
import ConditionalNavbar from "./components/ConditionalNavbar";

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CollectionPage = lazy(() => import('./pages/CollectionPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminPacksPage = lazy(() => import('./pages/AdminPacksPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const TradingPage = lazy(() => import('./pages/TradingPage'));
const PendingTrades = lazy(() => import('./pages/PendingTrades'));
const CataloguePage = lazy(() => import('./pages/CataloguePage'));
const MarketPage = lazy(() => import('./pages/MarketPage'));
const CreateListingPage = lazy(() => import('./pages/CreateListingPage'));
const MarketListingDetails = lazy(() => import('./pages/MarketListingDetails'));
const AdminActions = lazy(() => import('./pages/AdminActions'));
const CardGradingPage = lazy(() => import('./pages/CardGradingPage'));
const CardEditor = lazy(() => import('./components/CardEditor'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState([]);
    const [inspectedCard, setInspectedCard] = useState(null);
    const [showNotice, setShowNotice] = useState(false);

    const handleAcceptNotice = () => {
        localStorage.setItem('developmentNoticeAccepted', 'true');
        setShowNotice(false);
    };

    const showToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    useEffect(() => {
        window.showToast = showToast;
        window.inspectCard = (card) => setInspectedCard(card);
    }, []);

    useEffect(() => {
        if (user) {
            const noticeAccepted = localStorage.getItem('developmentNoticeAccepted');
            if (!noticeAccepted) {
                setShowNotice(true);
            }
        }
    }, [user]);

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
                const validateResponse = await fetch(`${API_BASE_URL}/api/auth/validate`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!validateResponse.ok) {
                    throw new Error(`Token validation failed with status ${validateResponse.status}`);
                }
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
        <>
            {showNotice && (
                <div className="notice-overlay">
                    <div className="notice-modal">
                        <h2>A Quick Note on Early Access</h2>
                        <p>Ned's Decks is currently in early access and changing every week! We want to ensure we create a great experience to accompany The Just Joe Show for both desktop and mobile users before we hit the big "go" button.</p>
                        <p>Upon full release, ALL COLLECTIONS, PACKS, and ACHIEVEMENTS will be totally reset so that all users can start from the same point. Thank you for being a part of early testing for Ned's Decks!</p>
                        <p className="notice-signature">Thanks, Joe.</p>
                        <button className="primary-button" onClick={handleAcceptNotice}>Awh ok!</button>
                    </div>
                </div>
            )}
            <Router>
                <Suspense fallback={<LoadingSpinner />}>
                    {user && <ConditionalNavbar user={user} />}
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/kitchensink" element={<KitchenSink />} />
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
                            element={(user?.isAdmin) ? <AdminDashboardPage user={user} /> : <Navigate to="/login" />}
                        />
                        <Route
                            path="/admin/packs"
                            element={user?.isAdmin ? <AdminPacksPage /> : <Navigate to="/login" />}
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
                        <Route
                            path="/achievements"
                            element={user ? <AchievementsPage /> : <Navigate to="/login" />}
                        />
                        <Route
                            path="/admin/actions"
                            element={user?.isAdmin ? <AdminActions user={user} /> : <Navigate to="/login" />}
                        />
                        <Route
                            path="/admin/card-ownership"
                            element={user?.isAdmin ? <AdminCardOwnershipPage user={user} /> : <Navigate to="/login" />}
                        />
                        <Route
                            path="/grading"
                            element={user ? <CardGradingPage /> : <Navigate to="/login" />}
                        />
                        <Route path="/catalogue" element={<CataloguePage />} />
                        <Route path="/market" element={<MarketPage />} />
                        <Route path="/market/create" element={<CreateListingPage />} />
                        <Route path="/market/listing/:id" element={<MarketListingDetails />} />
                        <Route path="/admin/cards/:id" element={<CardEditor />} />
                        <Route path="/admin/cardaudit" element={<AdminCardAudit />} />
                        <Route path="/leaderboard" element={<LeaderboardPage />} />
                        <Route path="/stream-overlay/:userId" element={<StreamOverlayPage />} />
                        <Route path="/" element={<Navigate to="/dashboard" />} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </Suspense>
            </Router>
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
            <CardInspector card={inspectedCard} onClose={() => setInspectedCard(null)} />
            <ScrollToTopButton />
        </>
    );
};

export default App;
