import React, {useEffect, useState, useRef, useCallback} from 'react';
import {fetchWithAuth} from '../utils/api';
import BaseCard from '../components/BaseCard';
import {useNavigate} from 'react-router-dom';
import '../styles/AdminDashboardPage.css';
import moment from 'moment';
import {getRarityColor, rarities} from "../constants/rarities";

const AdminDashboardPage = ({user}) => {
    const navigate = useNavigate();

    // User list state
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('active');
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // --- NEW: State for keyboard navigation ---
    const [focusedUserIndex, setFocusedUserIndex] = useState(null);
    const rowRefs = useRef({});

    // Loading & animation states
    const [loading, setLoading] = useState(true);
    const [waitingOnPack, setWaitingOnPack] = useState(false);
    const [isOpeningAnimation, setIsOpeningAnimation] = useState(false);
    const [packAnimationDone, setPackAnimationDone] = useState(false);
    const [cardsLoaded, setCardsLoaded] = useState(false);

    const [showDebugControls, setShowDebugControls] = useState(false);

    // Cards state
    const [openedCards, setOpenedCards] = useState([]);
    const [revealedCards, setRevealedCards] = useState([]);
    const [faceDownCards, setFaceDownCards] = useState([]);

    // Pack counter forces remounting of the video element each time
    const [packCounter, setPackCounter] = useState(0);

    // Pack types
    const [packTypes, setPackTypes] = useState([]);
    const [selectedPackTypeId, setSelectedPackTypeId] = useState('');
    const [forceModifier, setForceModifier] = useState(false);

    const [sessionCounts, setSessionCounts] = useState({});

    // --- MODIFIED: Wrapped in useCallback for stable reference ---
    const openPackForUser = useCallback(async () => {
        if (!selectedUser) return;
        setPackAnimationDone(false);
        setCardsLoaded(false);
        setPackCounter((prev) => prev + 1);
        setLoading(true);
        setIsOpeningAnimation(true);
        setOpenedCards([]);
        setRevealedCards([]);
        setFaceDownCards([]);
        setWaitingOnPack(true);

        try {
            const res = await fetchWithAuth(
                `/api/packs/admin/openPacksForUser/${selectedUser._id}`,
                {
                    method: 'POST',
                    body: JSON.stringify({templateId: selectedPackTypeId, forceModifier})
                }
            );
            const {newCards} = res;
            setOpenedCards(newCards);
            setRevealedCards(Array(newCards.length).fill(false));
            setFaceDownCards(Array(newCards.length).fill(true));
            setCardsLoaded(true);
            updateSessionCount(selectedUser._id);
            setUsers((prev) =>
                prev.map((u) =>
                    u._id === selectedUser._id ? {...u, packs: u.packs - 1} : u
                )
            );
            if (packAnimationDone) {
                revealAllCards(newCards.length);
            }
        } catch (err) {
            console.error('Error opening pack:', err);
            setIsOpeningAnimation(false);
        } finally {
            setLoading(false);
        }
    }, [selectedUser, selectedPackTypeId, forceModifier, packAnimationDone]);


    // Fetch users with packs
    const fetchData = async () => {
        if (!user?.isAdmin) {
            console.warn('Access denied: Admins only.');
            navigate('/login');
            return;
        }
        setLoading(true);
        try {
            const activeMinutesParam = activeFilter === 'active' ? '&activeMinutes=30' : '';
            const data = await fetchWithAuth(`/api/admin/users-activity?${activeMinutesParam}`);
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users with activity:', err);
        } finally {
            setLoading(false);
        }
    };

    // On mount fetch packs and when filter changes, fetch users once
    useEffect(() => {
        fetchData();
    }, [user, navigate, activeFilter]);

    useEffect(() => {
        try {
            const storedSession = localStorage.getItem('packOpeningSession');
            if (storedSession) {
                setSessionCounts(JSON.parse(storedSession));
            }
        } catch (error) {
            console.error('Failed to parse session data from localStorage', error);
            localStorage.removeItem('packOpeningSession');
        }
    }, []);

    useEffect(() => {
        const fetchPacks = async () => {
            try {
                const res = await fetchWithAuth('/api/admin/packs');
                setPackTypes(res.packs || []);
                if (res.packs && res.packs.length > 0 && !selectedPackTypeId) {
                    setSelectedPackTypeId(res.packs[0]._id);
                }
            } catch (err) {
                console.error('Error fetching packs:', err);
            }
        };
        fetchPacks();
    }, []);

    // Poll every 30 seconds for updates
    useEffect(() => {
        const intervalId = setInterval(() => {
            fetchData();
        }, 30000);

        return () => clearInterval(intervalId);
    }, [user, navigate, activeFilter]);


    const updateSessionCount = useCallback((userId) => {
        setSessionCounts(prevCounts => {
            const newCounts = { ...prevCounts, [userId]: (prevCounts[userId] || 0) + 1 };

            localStorage.setItem('packOpeningSession', JSON.stringify(newCounts));

            return newCounts;
        });
    }, []);


    const handleResetSession = () => {
        localStorage.removeItem('packOpeningSession');
        setSessionCounts({});
        if (window.showToast) {
            window.showToast('Session counter has been reset.', 'info');
        }
    };

    const handleAddPacksAllActiveUsers = async () => {
        try {
            await fetchWithAuth('/api/admin/add-packs-active', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({amount: Number(2)}),
            });

            await fetchData();
            window.showToast(`Added 2 packs to all active users.`, 'success');
        } catch {
            window.showToast('Error adding packs to all active users.', 'error');
        }
    };

    const filteredUsers = users.filter((u) =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSort = (column) => {
        if (column === sortColumn) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (!sortColumn) return 0;
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        if (sortColumn === 'username') {
            return sortDirection === 'asc'
                ? String(aValue).localeCompare(String(bValue), undefined, {sensitivity: 'base'})
                : String(bValue).localeCompare(String(aValue), undefined, {sensitivity: 'base'});
        }
        if (sortColumn === 'lastActive') {
            const dateA = new Date(aValue);
            const dateB = new Date(bValue);
            return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        }
        if (sortColumn === 'preferredPack') {
            const nameA = aValue?.name || '';
            const nameB = bValue?.name || '';
            return sortDirection === 'asc'
                ? nameA.localeCompare(nameB)
                : nameB.localeCompare(nameA);
        }
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // --- MODIFIED: Wrapped in useCallback for stable reference ---
    const toggleUserSelection = useCallback((u) => {
        setSelectedUser((prev) => (prev?._id === u._id ? null : u));
        setSelectedPackTypeId(u.preferredPack?._id || '67f68591c7560fa1a75f142c')
    }, []);

    // Debug open pack without affecting inventory
    const openDebugPackForUser = async () => {
        if (!selectedUser) return;
        setPackAnimationDone(false);
        setCardsLoaded(false);
        setPackCounter((prev) => prev + 1);
        setLoading(true);
        setIsOpeningAnimation(true);
        setOpenedCards([]);
        setRevealedCards([]);
        setFaceDownCards([]);
        setWaitingOnPack(true);

        try {
            const res = await fetchWithAuth(
                `/api/packs/admin/debugOpenPack/${selectedUser._id}`,
                {
                    method: 'POST',
                    body: JSON.stringify({templateId: selectedPackTypeId, forceModifier})
                }
            );
            const {newCards} = res;
            setOpenedCards(newCards);
            setRevealedCards(Array(newCards.length).fill(false));
            setFaceDownCards(Array(newCards.length).fill(true));
            setCardsLoaded(true);
            updateSessionCount(selectedUser._id);
            if (packAnimationDone) {
                revealAllCards(newCards.length);
            }
        } catch (err) {
            console.error('Error debugging pack:', err);
            setIsOpeningAnimation(false);
        } finally {
            setLoading(false);
        }
    };

    // Helper to reveal cards one by one with delay
    const revealAllCards = async (count) => {
        for (let i = 0; i < count; i++) {
            setRevealedCards((prev) => {
                const updated = [...prev];
                updated[i] = true;
                return updated;
            });
            await new Promise((resolve) => setTimeout(resolve, 300));
        }
    };

    const handleVideoEnd = () => {
        setIsOpeningAnimation(false);
        setPackAnimationDone(true);
    };

    const handleFlipCard = (i) => {
        if (!faceDownCards[i]) return;
        setFaceDownCards((prev) => {
            const updated = [...prev];
            updated[i] = false;
            return updated;
        });
    };

    useEffect(() => {
        if (packAnimationDone && cardsLoaded && openedCards.length > 0) {
            if (document.readyState === 'complete') {
                revealAllCards(openedCards.length);
            } else {
                window.addEventListener('load', () => {
                    revealAllCards(openedCards.length);
                }, {once: true});
            }
        }
    }, [packAnimationDone, cardsLoaded, openedCards.length]);

    const handleFilterChange = (filter) => {
        setActiveFilter(filter);
    };

    // --- NEW: Effect to handle keyboard navigation ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedUserIndex(prev => {
                    const nextIndex = prev === null ? 0 : prev + 1;
                    return nextIndex >= sortedUsers.length ? sortedUsers.length - 1 : nextIndex;
                });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedUserIndex(prev => (prev === null || prev === 0 ? 0 : prev - 1));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (focusedUserIndex !== null && sortedUsers[focusedUserIndex]) {
                    const focusedUser = sortedUsers[focusedUserIndex];
                    if (selectedUser?._id === focusedUser._id && selectedUser.packs > 0) {
                        openPackForUser();
                    } else {
                        toggleUserSelection(focusedUser);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [sortedUsers, focusedUserIndex, selectedUser, toggleUserSelection, openPackForUser]);

    // --- NEW: Effect to scroll the focused user into view ---
    useEffect(() => {
        if (focusedUserIndex !== null && sortedUsers[focusedUserIndex]) {
            const userId = sortedUsers[focusedUserIndex]._id;
            const rowEl = rowRefs.current[userId];
            if (rowEl) {
                rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [focusedUserIndex, sortedUsers]);

    // --- NEW: Effect to reset focus when filters change ---
    useEffect(() => {
        setFocusedUserIndex(null);
    }, [searchQuery, activeFilter, sortColumn, sortDirection]);

    return (
        <div className="page full">
            {isOpeningAnimation && (
                <div className="pack-opening-overlay">
                    <video
                        key={packCounter}
                        className="pack-opening-video"
                        src="/animations/packopening.mp4"
                        autoPlay
                        playsInline
                        controls={false}
                        onEnded={handleVideoEnd}
                    />
                </div>
            )}

            <div className="top-section">
                <div className="grid-container">
                    <div className="section-card cam">
                        <button onClick={handleResetSession} className="secondary-button sm">
                            <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '8px' }}></i>
                            Reset Session
                        </button>
                        <button onClick={handleAddPacksAllActiveUsers} className="secondary-button sm">
                            <i className="fa-solid fa-cards" style={{ marginRight: '8px' }}></i>
                            Add 2 packs
                        </button>
                    </div>
                    <div className="section-card">
                        <div className="heading">
                            <div className="users-filter-container">
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <div className="button-group">
                                    <button
                                        className={`primary-button sm ${activeFilter === 'all' ? 'active' : ''}`}
                                        onClick={() => handleFilterChange('all')}
                                    >
                                        All Users
                                    </button>
                                    <button
                                        className={`primary-button sm ${activeFilter === 'active' ? 'active' : ''}`}
                                        onClick={() => handleFilterChange('active')}
                                    >
                                        Active in Last 30 Minutes
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="users-table">
                                <thead>
                                <tr>
                                    <th onClick={() => handleSort('username')}>Username</th>
                                    <th onClick={() => handleSort('packs')}>Unopened Packs</th>
                                    <th onClick={() => handleSort('preferredPack')}>Preferred Pack</th>
                                    <th onClick={() => handleSort('lastActive')}>Last Active</th>
                                </tr>
                                </thead>
                                <tbody>
                                {sortedUsers.map((u, index) => (
                                    <tr
                                        key={u._id}
                                        // --- MODIFIED: Added ref and classes for keyboard nav ---
                                        ref={el => rowRefs.current[u._id] = el}
                                        className={`${selectedUser?._id === u._id ? 'selected' : ''} ${focusedUserIndex === index ? 'focused' : ''}`}
                                        onClick={() => {
                                            toggleUserSelection(u);
                                            setFocusedUserIndex(index);
                                        }}
                                    >
                                        <td>{u.username}</td>
                                        <td>{u.packs}</td>
                                        <td>{u.preferredPack ? (u.preferredPack.name || u.preferredPack.type || 'Unnamed') : '-'}</td>
                                        <td>{u.lastActive ? moment(u.lastActive).fromNow() : 'Never'}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="section-card" style={{position: 'relative'}}>
                        {selectedUser && (
                            <>
                                <h2>Open Pack for {selectedUser.username}</h2>
                                <img src={selectedUser.twitchProfilePic} className="userpic" alt="Profile"/>
                                <div className="session-counter" style={{marginBottom: '.4rem', textTransform: 'uppercase', opacity: '0.4', letterSpacing: '2px', fontSize: '.7rem', textAlign: 'center'}}>
                                    Packs opened this session: <strong>{sessionCounts[selectedUser._id] || 0}</strong>
                                </div>
                                <select
                                    className="pack-type-select"
                                    value={selectedPackTypeId}
                                    onChange={(e) => setSelectedPackTypeId(e.target.value)}
                                >
                                    {packTypes.map((p) => (
                                        <option key={p._id} value={p._id}>
                                            {p.name || p.type || 'Unnamed'}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={openPackForUser}
                                    className="primary-button xl"
                                    disabled={loading || isOpeningAnimation || selectedUser.packs <= 0}
                                >
                                    {loading ? 'Opening...' : (<span>Open Pack <i className="fa-solid fa-cards-blank" /></span>)}
                                </button>
                                {showDebugControls && (
                                    <div className="debug-card">
                                        <label style={{marginLeft: '1rem'}}>
                                            <input
                                                type="checkbox"
                                                checked={forceModifier}
                                                onChange={(e) => setForceModifier(e.target.checked)}
                                            />
                                            Force Random Modifier
                                        </label>
                                        <button
                                            onClick={openDebugPackForUser}
                                            disabled={loading || isOpeningAnimation}
                                            style={{marginLeft: '0.5rem'}}
                                            className="secondary-button"
                                        >
                                            {loading && isOpeningAnimation ? 'Opening...' : 'Debug Pack'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div>
                        <div className="section-card">
                            <h2 onClick={() => (setShowDebugControls(!showDebugControls))}>Card Rarity Key</h2>
                            <div className="rarity-key admin">
                                {rarities.map((r) => {
                                    return (
                                        <span
                                            key={r.name}
                                            className="rarity-item no-hover"
                                            style={{"--item-color": r.color}}
                                        >
                                        {r.name}
                                    </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                {waitingOnPack && (
                    <div className="opened-cards">
                        <div className="cards-container">
                            {openedCards.length === 0 && (
                                <>
                                    Ripping Packs...
                                    <img src="/animations/loadingspinner.gif" alt="Loading..."
                                         className="spinner-image"/>
                                </>
                            )}
                            {openedCards.map((card, i) => {
                                const visibleClass = revealedCards[i] ? 'visible' : '';
                                const flipClass = faceDownCards[i] ? 'face-down' : 'face-up';
                                return (
                                    <div
                                        key={i}
                                        className={`card-wrapper ${visibleClass} ${flipClass}`}
                                        style={{
                                            '--rarity-color': getRarityColor(card.rarity),
                                            transitionDelay: `${i * 0.2}s`
                                        }}
                                        onClick={() => handleFlipCard(i)}
                                    >
                                        <div className="card-content">
                                            <div className="card-inner">
                                                <div className="card-back">
                                                    <img
                                                        src="/images/card-back-placeholder.png"
                                                        alt="Card Back"
                                                    />
                                                </div>
                                                <div className="card-front">
                                                    <BaseCard
                                                        name={card.name}
                                                        image={card.imageUrl}
                                                        description={card.flavorText}
                                                        rarity={card.rarity}
                                                        mintNumber={card.mintNumber}
                                                        modifier={card.modifier}
                                                        lore={card.lore}
                                                        loreAuthor={card.loreAuthor}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
        ;
};

export default AdminDashboardPage;
