import React, {useEffect, useState, useRef, useCallback} from 'react';
import {fetchWithAuth} from '../utils/api';
import BaseCard from '../components/BaseCard';
import {useNavigate} from 'react-router-dom';
import '../styles/AdminDashboardPage.css';
import moment from 'moment';
import {getRarityColor, rarities} from "../constants/rarities";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const AdminDashboardPage = ({user}) => {
    const navigate = useNavigate();

    const boopSoundRef = useRef(new Audio('/sounds/boop.wav'));
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('active');
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    const [activeTab, setActiveTab] = useState('raffle');
    const [isRolling, setIsRolling] = useState(false);
    const [highlightedUserId, setHighlightedUserId] = useState(null);
    const [raffleWinner, setRaffleWinner] = useState(null);

    const [focusedUserIndex, setFocusedUserIndex] = useState(null);
    const [countdown, setCountdown] = useState(3);

    const rowRefs = useRef({});

    const [loading, setLoading] = useState(true);
    const [waitingOnPack, setWaitingOnPack] = useState(false);
    const [isOpeningAnimation, setIsOpeningAnimation] = useState(false);
    const [packAnimationDone, setPackAnimationDone] = useState(false);
    const [cardsLoaded, setCardsLoaded] = useState(false);

    const [showDebugControls, setShowDebugControls] = useState(false);

    const [openedCards, setOpenedCards] = useState([]);
    const [revealedCards, setRevealedCards] = useState([]);
    const [faceDownCards, setFaceDownCards] = useState([]);

    const [packCounter, setPackCounter] = useState(0);

    const [packTypes, setPackTypes] = useState([]);
    const [selectedPackTypeId, setSelectedPackTypeId] = useState('');
    const [forceModifier, setForceModifier] = useState(false);

    const [sessionCounts, setSessionCounts] = useState({});

    const [isQueuePaused, setIsQueuePaused] = useState(true);
    const [queueCount, setQueueCount] = useState(0);
    const [weeklySubCount, setWeeklySubCount] = useState(0);
    const [packLuckOverride, setPackLuckOverride] = useState({ enabled: false, count: null, weeklyCount: 0 });

    const [currentVideoUrl, setCurrentVideoUrl] = useState('/animations/packopening.mp4');

    const updateSessionCount = useCallback((userId) => {
        setSessionCounts(prevCounts => {
            const newCounts = {...prevCounts, [userId]: (prevCounts[userId] || 0) + 1};

            localStorage.setItem('packOpeningSession', JSON.stringify(newCounts));

            return newCounts;
        });
    }, []);

    const triggerPackOpening = useCallback(async (userToOpenFor) => {
        if (!userToOpenFor) return;

        const packIdToOpen = userToOpenFor._id === selectedUser?._id
            ? selectedPackTypeId
            : userToOpenFor.preferredPack?._id || (packTypes.length > 0 ? packTypes[0]._id : '');

        if (!packIdToOpen) {
            if (window.showToast) window.showToast("No pack type available to open.", 'error');
            return;
        }

        const packToOpen = packTypes.find(p => p._id === packIdToOpen);
        const videoUrl = packToOpen?.animationUrl || '/animations/packopening.mp4';
        setCurrentVideoUrl(videoUrl);

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
                `/api/packs/admin/openPacksForUser/${userToOpenFor._id}`,
                {
                    method: 'POST',
                    body: JSON.stringify({ templateId: packIdToOpen, forceModifier })
                }
            );
            const {newCards} = res;
            setOpenedCards(newCards);
            setRevealedCards(Array(newCards.length).fill(false));
            setFaceDownCards(Array(newCards.length).fill(true));
            setCardsLoaded(true);
            updateSessionCount(userToOpenFor._id);
            setUsers((prev) =>
                prev.map((u) =>
                    u._id === userToOpenFor._id ? {...u, packs: u.packs - 1} : u
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
    }, [selectedUser, selectedPackTypeId, forceModifier, packAnimationDone, packTypes, updateSessionCount]);


    const fetchData = async () => {
        if (!user?.isAdmin) {
            console.warn('Access denied: Admins only.');
            navigate('/login');
            return;
        }
        setLoading(true);
        try {
            const activeMinutesParam = activeFilter === 'active' ? '&activeMinutes=45' : '';
            const data = await fetchWithAuth(`/api/admin/users-activity?${activeMinutesParam}`);
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users with activity:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchQueueStatus = async () => {
        try {
            const status = await fetchWithAuth('/api/admin/queues/status');
            setIsQueuePaused(status.isPaused);
            setQueueCount(status.queue.length);
        } catch (err) {
            console.error('Error fetching queue status:', err);
        }
    };

    const fetchCommunityStats = async () => {
        try {
            const data = await fetchWithAuth('/api/admin/pack-luck');
            const weeklyCount = data?.weekly?.count ?? 0;
            const overrideEnabled = Boolean(data?.override?.enabled);
            const overrideCount = Number.isFinite(Number(data?.override?.count))
                ? Number(data.override.count)
                : null;
            setPackLuckOverride({ enabled: overrideEnabled, count: overrideCount, weeklyCount });
            setWeeklySubCount(overrideEnabled && overrideCount !== null ? overrideCount : weeklyCount);
        } catch (err) {
            console.error('Error fetching pack luck status:', err);
            try {
                const data = await fetchWithAuth('/api/community/stats');
                const weeklyCount = data?.weekly?.count ?? 0;
                setWeeklySubCount(weeklyCount);
                setPackLuckOverride({ enabled: false, count: null, weeklyCount });
            } catch (fallbackErr) {
                console.error('Error fetching community stats:', fallbackErr);
            }
        }
    };

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
        fetchQueueStatus();
        fetchCommunityStats();
    }, []);

    useEffect(() => {
        const intervalId = setInterval(() => {
            fetchData();
            fetchCommunityStats();
        }, 30000);

        const intervalIdQueue = setInterval(() => {
            fetchQueueStatus();
        }, 5000);

        return () => {clearInterval(intervalId);clearInterval(intervalIdQueue);}
    }, [user, navigate, activeFilter]);


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

    const handlePauseQueue = async () => {
        try {
            await fetchWithAuth('/api/admin/queues/pause', { method: 'POST' });
            await fetchQueueStatus();
            if (window.showToast) window.showToast('Queue paused.', 'info');
        } catch (err) {
            console.error('Error pausing queue:', err);
            if (window.showToast) window.showToast('Error pausing queue.', 'error');
        }
    };

    const handleResumeQueue = async () => {
        try {
            await fetchWithAuth('/api/admin/queues/resume', { method: 'POST' });
            await fetchQueueStatus();
            if (window.showToast) window.showToast('Queue resumed.', 'success');
        } catch (err) {
            console.error('Error resuming queue:', err);
            if (window.showToast) window.showToast('Error resuming queue.', 'error');
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

    const toggleUserSelection = useCallback((u) => {
        setSelectedUser((prev) => (prev?._id === u._id ? null : u));
        setSelectedPackTypeId(u.preferredPack?._id || (packTypes.length > 0 ? packTypes[0]._id : ''));
    }, [packTypes]);

    const raffleUsers = users.filter(u => u.packs > 0);

    const handleRoll = async () => {
        const eligibleRaffleUsers = raffleUsers.filter(u => !sessionCounts[u._id]);

        if (isRolling || eligibleRaffleUsers.length === 0) return;
        setIsRolling(true);
        setHighlightedUserId(null);
        setRaffleWinner(null);

        if (eligibleRaffleUsers.length === 1) {
            const singleWinner = eligibleRaffleUsers[0];
            setHighlightedUserId(singleWinner._id);

            const boopSound = boopSoundRef.current;
            if (boopSound) {
                boopSound.playbackRate = 1.2;
                boopSound.currentTime = 0;
                boopSound.play();
            }
            await sleep(1500);

            setRaffleWinner(singleWinner);
            setIsRolling(false);
            return;
        }

        const winner = eligibleRaffleUsers[Math.floor(Math.random() * eligibleRaffleUsers.length)];

        let animationLength;
        let endDelay = 500;
        const userCount = eligibleRaffleUsers.length;

        if (userCount <= 3) {
            animationLength = Math.floor(Math.random() * 4) + 4;
            endDelay = 250;
        } else if (userCount <= 10) {
            animationLength = Math.floor(Math.random() * 6) + 10;
        } else if (userCount <= 25) {
            animationLength = Math.floor(Math.random() * 11) + 15;
        } else {
            animationLength = Math.floor(Math.random() * 11) + 25;
        }

        const animationSequence = [];
        for (let i = 0; i < animationLength; i++) {
            animationSequence.push(eligibleRaffleUsers[Math.floor(Math.random() * eligibleRaffleUsers.length)]);
        }

        const startDelay = 75;
        const totalSteps = animationSequence.length;

        for (let i = 0; i < totalSteps; i++) {
            const userToHighlight = animationSequence[i];
            setHighlightedUserId(userToHighlight._id);

            const boopSound = boopSoundRef.current;
            if (boopSound) {
                boopSound.playbackRate = Math.random() * .4 + 1;
                boopSound.volume = 0.4;
                boopSound.currentTime = 0;
                boopSound.play();
            }

            const progress = i / (totalSteps - 1);
            const easedProgress = Math.pow(progress, 2);
            const currentDelay = startDelay + (easedProgress * (endDelay - startDelay));

            await sleep(currentDelay);
        }


        const boopSound = boopSoundRef.current;
        if (boopSound) {
            boopSound.playbackRate = Math.random() * (1.2 - 0.1) + 0.3;
            boopSound.currentTime = 0;
            boopSound.play();
        }
        setHighlightedUserId(winner._id);
        await sleep(1000);

        setRaffleWinner(winner);
        setIsRolling(false);
    };

    const handleConfirmWinner = useCallback(() => {
        if (raffleWinner) {
            setSelectedUser(raffleWinner);
            triggerPackOpening(raffleWinner);
        }
        setRaffleWinner(null);
    }, [raffleWinner, triggerPackOpening]);

    useEffect(() => {
        if (raffleWinner) {
            setCountdown(3);
            const timerId = setInterval(() => {
                setCountdown(prevCountdown => {
                    if (prevCountdown <= 1) {
                        clearInterval(timerId);
                        handleConfirmWinner();
                        return 0;
                    }
                    return prevCountdown - 1;
                });
            }, 1000);
            return () => clearInterval(timerId);
        }
    }, [raffleWinner, handleConfirmWinner]);


    const openDebugPackForUser = async () => {
        if (!selectedUser) return;

        const packToOpen = packTypes.find(p => p._id === selectedPackTypeId);
        const videoUrl = packToOpen?.animationUrl || '/animations/packopening.mp4';
        setCurrentVideoUrl(videoUrl);

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
                        triggerPackOpening(selectedUser);
                    } else {
                        toggleUserSelection(focusedUser);
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [sortedUsers, focusedUserIndex, selectedUser, toggleUserSelection, triggerPackOpening]);

    useEffect(() => {
        if (focusedUserIndex !== null && sortedUsers[focusedUserIndex]) {
            const userId = sortedUsers[focusedUserIndex]._id;
            const rowEl = rowRefs.current[userId];
            if (rowEl) {
                rowEl.scrollIntoView({behavior: 'smooth', block: 'nearest'});
            }
        }
    }, [focusedUserIndex, sortedUsers]);

    useEffect(() => {
        setFocusedUserIndex(null);
    }, [searchQuery, activeFilter, sortColumn, sortDirection]);

    const CurrentPackLuckIndicator = ({ count }) => {
        const cards = ['grey', 'grey', 'grey', 'grey', 'grey'];
        if (count < 15) {
            cards[0] = 'rare';
        } else if (count < 30) {
            cards[0] = 'epic';
        } else if (count < 45) {
            cards[0] = 'rare';
            cards[1] = 'rare';
        } else if (count < 60) {
            cards[0] = 'epic';
            cards[1] = 'rare';
        } else if (count < 100) {
            cards[0] = 'epic';
            cards[1] = 'epic';
        } else {
            cards[0] = 'legendary';
        }

        return (
            <div className="pack-luck-container">
                {cards.map((color, index) => (
                    <div key={index} className={`luck-card ${color}`}>
                        <span>?</span>
                    </div>
                ))}
            </div>
        );
    };


    const raffleGridRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const resizeObserver = new ResizeObserver(entries => {
            if (entries && entries.length > 0) {
                const { width, height } = entries[0].contentRect;
                setContainerSize({ width, height });
            }
        });

        if (raffleGridRef.current) {
            resizeObserver.observe(raffleGridRef.current);
        }

        return () => resizeObserver.disconnect();
    }, [activeTab]);

    const count = raffleUsers.length;
    let cols = 1;
    let rows = 1;

    if (count > 0 && containerSize.width > 0) {
        const aspectRatio = containerSize.width / containerSize.height;
        rows = Math.max(1, Math.round(Math.sqrt(count / aspectRatio))) +1 ;
        cols = Math.ceil(count / rows);
    }

    const totalSessionPacks = Object.values(sessionCounts).reduce((total, count) => total + count, 0);

    return (
        <div className="page full">
            {raffleWinner && (
                <div className="winner-modal-overlay">
                    <div className="winner-modal-content">
                        <img src={raffleWinner.twitchProfilePic} alt={raffleWinner.username}/>
                        <p>Ripping a pack for...</p>
                        <h1>
                            {raffleWinner.username}<br/>
                            <span style={{margin: 0, padding: 0, fontSize: '0.8rem'}}>Packs Remaining ({raffleWinner.packs - 1})</span>
                        </h1>

                        <button className="primary-button lg" onClick={handleConfirmWinner}>
                            Open Pack! ({countdown})
                        </button>
                    </div>
                </div>
            )}
            {isOpeningAnimation && (
                <div className="pack-opening-overlay">
                    <video
                        key={packCounter}
                        className="pack-opening-video"
                        src={currentVideoUrl}
                        autoPlay
                        playsInline
                        controls={false}
                        onEnded={handleVideoEnd}
                    />
                </div>
            )}

            <div className="top-section">
                <div className={`grid-container ${activeTab}`}>
                    <div className="section-card cam">
                        <button onClick={handleResetSession} className="secondary-button sm">
                            <i className="fa-solid fa-arrows-rotate" style={{marginRight: '8px'}}></i>
                            Reset Session
                        </button>
                        <button onClick={handleAddPacksAllActiveUsers} className="secondary-button sm">
                            <i className="fa-solid fa-cards" style={{marginRight: '8px'}}></i>
                            Add 2 packs
                        </button>

                        {isQueuePaused ? (
                            <button onClick={handleResumeQueue} className="secondary-button sm success">
                                <i className="fa-solid fa-play" style={{marginRight: '8px'}}></i>
                                Resume Queue
                            </button>
                        ) : (
                            <button onClick={handlePauseQueue} className="secondary-button sm warning">
                                <i className="fa-solid fa-pause" style={{marginRight: '8px'}}></i>
                                Pause Queue
                            </button>
                        )}
                        <div className="session-pack-counter">
                            Packs in Queue: <strong>{queueCount}</strong>
                        </div>

                        <div className="session-pack-counter">
                            Session Packs: <strong>{totalSessionPacks}</strong>
                        </div>
                        <div className="session-pack-counter">
                            Raffle Users: <strong>{raffleUsers.length}</strong>
                        </div>
                    </div>
                    <div className="section-card">
                        <div className="tabs">
                            <button className={activeTab === 'raffle' ? 'active' : ''}
                                    onClick={() => setActiveTab('raffle')}>
                                Random
                            </button>
                            <button className={activeTab === 'list' ? 'active' : ''}
                                    onClick={() => setActiveTab('list')}>
                                User List
                            </button>
                        </div>
                        {activeTab === 'raffle' ? (
                            <div className="raffle-container">
                                <div ref={raffleGridRef} className={`raffle-grid ${isRolling ? 'rolling' : ''}`} style={{ '--grid-cols': cols, '--grid-rows': rows}}>
                                    {raffleUsers.map(u => (
                                        <div key={u._id}
                                             className={`raffle-user ${highlightedUserId === u._id ? 'highlighted' : ''} ${sessionCounts[u._id] ? 'has-opened-pack' : ''}`}>
                                            <img src={u.twitchProfilePic} alt={u.username}/>
                                            <span className="raffle-username">{u.username}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="raffle-controls">
                                    <button onClick={handleRoll} className="primary-button xl roll-button"
                                            disabled={isRolling || isOpeningAnimation || raffleUsers.filter(u => !sessionCounts[u._id]).length === 0}>
                                        {isRolling ? 'Rolling...' : (isOpeningAnimation ? 'Opening...' : 'Open Pack')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
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
                            </>
                        )}
                    </div>

                    {activeTab === 'list' && (
                        <>
                            <div className="section-card" style={{position: 'relative'}}>
                                {!selectedUser && (
                                    <>
                                        <h3>Rip a pack..</h3>
                                        <p>Choose a user in the list to the left to begin!</p>
                                    </>
                                )}
                                {activeTab === 'list' && selectedUser && (
                                    <>
                                        <h2>Open Pack for {selectedUser.username}</h2>
                                        <img src={selectedUser.twitchProfilePic} className="userpic" alt="Profile"/>
                                        <div className="session-counter" style={{
                                            marginBottom: '.4rem',
                                            textTransform: 'uppercase',
                                            opacity: '0.4',
                                            letterSpacing: '2px',
                                            fontSize: '.7rem',
                                            textAlign: 'center'
                                        }}>
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
                                            onClick={() => triggerPackOpening(selectedUser)}
                                            className="primary-button xl"
                                            disabled={loading || isOpeningAnimation || selectedUser.packs <= 0}
                                        >
                                            {loading ? 'Opening...' : (
                                                <span>Open Pack <i className="fa-solid fa-cards-blank"/></span>)}
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
                                        {(!selectedUser && activeTab === 'list') &&
                                            <p>Select a user from the list to open a pack.</p>}
                                    </>
                                )}
                            </div>
                        </>
                    )}

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
                              <div className="current-reward">
                                  <h3 className="tiny">
                                      Current Rigged Pack Luck
                                  </h3>
                                  <CurrentPackLuckIndicator count={weeklySubCount} />
                                  <div className={`pack-luck-override ${packLuckOverride.enabled ? 'on' : 'off'}`}>
                                      {packLuckOverride.enabled
                                          ? `Override ON (${packLuckOverride.count ?? weeklySubCount})`
                                          : 'Override OFF'}
                                  </div>
                              </div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                {waitingOnPack && (
                    <div className="opened-cards" style={{padding: activeTab === 'raffle' ? '2rem 5rem 5rem 5rem' : '7rem'}}>
                        {activeTab === 'raffle' && selectedUser && (
                            <h1 style={{marginTop: '0', padding: '0'}}>{selectedUser.username}</h1>
                        )}
                        <div className="cards-container">
                            {openedCards.length === 0 && (
                                <>
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
