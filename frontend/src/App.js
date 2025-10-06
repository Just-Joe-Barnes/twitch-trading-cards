import React, {useState, useEffect, lazy, Suspense} from 'react';
import {BrowserRouter as Router, Route, Routes, Navigate} from 'react-router-dom';
import {io} from 'socket.io-client';
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
import AdminEventsPage from "./pages/AdminEvents";
import EventRewardModal from "./components/EventRewardModal";
import CardManagement from "./pages/AdminCardManagement";
import AdminTrades from "./pages/AdminTrades";
import AdminLogs from "./pages/AdminLogs";
import AdminActionsLayout from "./components/AdminActionsLayout";
import BountyBoardPage from "./pages/BountyBoardPage";
import AdminGiftPage from "./pages/AdminGift";

const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
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
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState([]);
    const [inspectedCard, setInspectedCard] = useState(null);
    const [currentReward, setCurrentReward] = useState(null);
    const [rewardQueue, setRewardQueue] = useState([]);

    // --- NEW --- Logout handler to clear state and local storage
    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null); // This is the key change to force a re-render
    };

    const showToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts((prev) => [...prev, {id, message, type}]);
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    useEffect(() => {
        window.showToast = showToast;
        window.inspectCard = (card) => setInspectedCard(card);
    }, []);

    useEffect(() => {
        const canShowReward = !isMaintenanceMode || (user && user.isAdmin);

        if (!currentReward && rewardQueue.length > 0 && canShowReward) {
            const nextReward = rewardQueue[0];
            const remainingRewards = rewardQueue.slice(1);

            setCurrentReward(nextReward);
            setRewardQueue(remainingRewards);
        }
    }, [currentReward, rewardQueue, user, isMaintenanceMode]);

    useEffect(() => {
        if (user?._id) {
            const socket = io(API_BASE_URL, { transports: ['websocket'] });

            socket.emit('join', user._id);
            console.log(`[Socket] Joining room for user ${user._id}`);

            // --- NEW: Listen for maintenance mode changes ---
            socket.on('maintenanceStatusChanged', (data) => {
                console.log('[Socket] Maintenance status updated:', data.maintenanceMode);
                setIsMaintenanceMode(data.maintenanceMode);
            });

            return () => {
                console.log('[Socket] Disconnecting...');
                socket.disconnect();
            };
        }
    }, [user]);

    useEffect(() => {
        const initializeApp = async () => {
            try {
                // 1. Fetch maintenance status first
                const maintenanceResponse = await fetch(`${API_BASE_URL}/api/settings/maintenance`);
                if (!maintenanceResponse.ok) {
                    console.error('Failed to fetch maintenance status.');
                    // Decide on a fallback, e.g., default to NOT maintenance mode
                    setIsMaintenanceMode(false);
                } else {
                    const data = await maintenanceResponse.json();
                    setIsMaintenanceMode(data.maintenanceMode);
                }

                // 2. Then, fetch user data (your existing logic)
                const token = localStorage.getItem('token');
                if (!token) {
                    return; // No user to fetch, we're done
                }
                const validateResponse = await fetch(`${API_BASE_URL}/api/auth/validate`, {
                    method: 'POST',
                    headers: {Authorization: `Bearer ${token}`},
                });
                if (!validateResponse.ok) throw new Error(`Token validation failed`);

                const profileResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                    method: 'GET',
                    headers: {Authorization: `Bearer ${token}`},
                });
                if (!profileResponse.ok) throw new Error(`Profile fetch failed`);

                const profileData = await profileResponse.json();
                if (profileData.pendingEventReward && profileData.pendingEventReward.length > 0) {
                    setRewardQueue(profileData.pendingEventReward);
                }
                setUser(profileData);
            } catch (error) {
                console.error('[App.js] Error initializing app:', error.message);
                handleLogout(); // Clear state on any failure
            } finally {
                setLoading(false); // Set loading to false after ALL initial data is fetched
            }
        };

        const handleTokenFromURL = () => {
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');
            if (token) {
                localStorage.setItem('token', token);
                window.history.replaceState({}, document.title, '/dashboard');
            }
        };

        handleTokenFromURL();
        initializeApp();
    }, []); // Empty dependency array ensures this runs only once on mount


    if (loading) {
        return <LoadingSpinner/>;
    }

    if (isMaintenanceMode && user && !user.isAdmin) {
        return (
            <>
                <Router>
                    <Suspense fallback={<LoadingSpinner />}>
                        <Routes>
                            <Route path="*" element={<MaintenancePage onLogout={handleLogout} />} />
                        </Routes>
                    </Suspense>
                </Router>
                <ScrollToTopButton/>
            </>
        );
    }

    return (
        <>
            <Router>
                <Suspense fallback={<LoadingSpinner/>}>
                    {user && <ConditionalNavbar user={user} isMaintenanceMode={isMaintenanceMode}/>}
                    <Routes>
                        {/* --- MODIFICATION --- Pass handleLogout to LoginPage so it can update state */}
                        <Route path="/login" element={<LoginPage onLoginSuccess={setUser} />} />
                        <Route path="/kitchensink" element={<KitchenSink/>}/>
                        <Route
                            path="/dashboard"
                            element={user ? <DashboardPage user={user}/> : <Navigate to="/login"/>}
                        />
                        <Route path="/collection/:username" element={<CollectionPage/>}/>
                        <Route
                            path="/collection"
                            element={user ? <CollectionPage user={user}/> : <Navigate to="/login"/>}
                        />
                        <Route path="/profile/:username" element={<ProfilePage/>}/>
                        <Route
                            path="/trading"
                            element={user ? <TradingPage userId={user._id}/> : <Navigate to="/login"/>}
                        />
                        <Route
                            path="/trades/pending"
                            element={user ? <PendingTrades userId={user._id}/> : <Navigate to="/login"/>}
                        />
                        <Route
                            path="/bounty"
                            element={user ? <BountyBoardPage userId={user._id} username={user.username}/> : <Navigate to="/login"/>}
                        />
                        <Route
                            path="/achievements"
                            element={user ? <AchievementsPage/> : <Navigate to="/login"/>}
                        />
                        <Route
                            path="/grading"
                            element={user ? <CardGradingPage/> : <Navigate to="/login"/>}
                        />
                        <Route path="/catalogue" element={<CataloguePage user={user}/>}/>
                        <Route path="/market" element={<MarketPage/>}/>
                        <Route path="/market/create" element={<CreateListingPage/>}/>
                        <Route path="/market/listing/:id" element={<MarketListingDetails/>}/>
                        <Route path="/leaderboard" element={<LeaderboardPage/>}/>
                        <Route
                            path="/admin-dashboard"
                            element={(user?.isAdmin) ? <AdminDashboardPage user={user}/> : <Navigate to="/login"/>}
                        />
                        <Route path="/admin" element={<AdminActionsLayout/>}>
                            <Route index element={user?.isAdmin ? <AdminActions user={user}/> : <Navigate to="/login"/>} />
                            <Route path="packs" element={user?.isAdmin ? <AdminPacksPage/> : <Navigate to="/login"/>} />
                            <Route path="card-ownership" element={user?.isAdmin ? <AdminCardOwnershipPage user={user}/> : <Navigate to="/login"/>} />
                            <Route path="events" element={user?.isAdmin ? <AdminEventsPage user={user}/> : <Navigate to="/login"/>} />
                            <Route path="gift" element={user?.isAdmin ? <AdminGiftPage user={user}/> : <Navigate to="/login"/>} />
                            <Route path="cardmanagement" element={user?.isAdmin ? <CardManagement user={user}/> : <Navigate to="/login"/>} />
                            <Route path="logs" element={user?.isAdmin ? <AdminLogs user={user}/> : <Navigate to="/login"/>} />
                            <Route path="cards/:id" element={<CardEditor/>}/>
                            <Route path="cardaudit" element={<AdminCardAudit/>}/>
                            <Route path="trades" element={<AdminTrades/>}/>
                        </Route>
                        <Route path="/stream-overlay/:userId" element={<StreamOverlayPage/>}/>
                        <Route path="/" element={<Navigate to="/dashboard"/>}/>
                        <Route path="*" element={<NotFoundPage/>}/>
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
            <CardInspector card={inspectedCard} onClose={() => setInspectedCard(null)}/>
            {currentReward && (
                <EventRewardModal
                    reward={currentReward}
                    message={currentReward.message}
                    onClose={() => setCurrentReward(null)}
                />
            )}
            <ScrollToTopButton/>
        </>
    );
};

export default App;
