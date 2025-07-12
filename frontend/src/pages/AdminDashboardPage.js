// src/pages/AdminDashboardPage.js
import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/api';
import BaseCard from '../components/BaseCard';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDashboardPage.css';
import moment from 'moment';

const AdminDashboardPage = ({ user }) => {
    const navigate = useNavigate();

    // User list state
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Loading & animation states
    const [loading, setLoading] = useState(true);
    const [isOpeningAnimation, setIsOpeningAnimation] = useState(false);
    const [packAnimationDone, setPackAnimationDone] = useState(false);
    const [cardsLoaded, setCardsLoaded] = useState(false);

    // Cards state
    const [openedCards, setOpenedCards] = useState([]);
    // revealedCards: an array of booleans; false = not revealed, true = revealed
    const [revealedCards, setRevealedCards] = useState([]);
    // faceDownCards: true = card is face down; false = flipped up
    const [faceDownCards, setFaceDownCards] = useState([]);

    // Pack counter forces remounting of the video element each time
    const [packCounter, setPackCounter] = useState(0);

    // Pack types
    const [packTypes, setPackTypes] = useState([]);
    const [selectedPackTypeId, setSelectedPackTypeId] = useState('');
    const [forceModifier, setForceModifier] = useState(false);

    // Rarity color mapping
    const cardRarities = {
        Basic: '#8D8D8D',
        Common: '#64B5F6',
        Standard: '#66BB6A',
        Uncommon: '#1976D2',
        Rare: '#AB47BC',
        Epic: '#FFA726',
        Legendary: '#e32232',
        Mythic: 'hotpink',
        Unique: 'black',
        Divine: 'white',
    };
    const getRarityColor = (rarity) => cardRarities[rarity] || '#fff';

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

    // Poll every 10 seconds for updates
    useEffect(() => {
        const intervalId = setInterval(() => {
            fetchData();
        }, 10000); // 10 seconds

        return () => clearInterval(intervalId);
    }, [user, navigate, activeFilter]);

    // Filter users by search query
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
                ? String(aValue).localeCompare(String(bValue), undefined, { sensitivity: 'base' })
                : String(bValue).localeCompare(String(aValue), undefined, { sensitivity: 'base' });
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

        if (aValue < bValue) {
            return sortDirection === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortDirection === 'asc' ? 1 : -1;
        }

        return 0;
    });

    const toggleUserSelection = (u) => {
        setSelectedUser((prev) => (prev?._id === u._id ? null : u));
    };

    // Open a pack for the selected user
    const openPackForUser = async () => {
        if (!selectedUser) return;
        // Reset reveal index for new pack
        setPackAnimationDone(false);
        setCardsLoaded(false);
        // Force remount video by updating packCounter
        setPackCounter((prev) => prev + 1);
        setLoading(true);
        setIsOpeningAnimation(true);
        setOpenedCards([]);
        setRevealedCards([]);
        setFaceDownCards([]);

        try {
            const res = await fetchWithAuth(
                `/api/packs/admin/openPacksForUser/${selectedUser._id}`,
                {
                    method: 'POST',
                    body: JSON.stringify({ templateId: selectedPackTypeId, forceModifier })
                }
            );
            const { newCards } = res;
            console.log('New cards:', newCards);
            setOpenedCards(newCards);
            setRevealedCards(Array(newCards.length).fill(false));
            setFaceDownCards(Array(newCards.length).fill(true));
            setCardsLoaded(true);

            // Decrement the user's pack count
            setUsers((prev) =>
                prev.map((u) =>
                    u._id === selectedUser._id ? { ...u, packs: u.packs - 1 } : u
                )
            );

            // If animation already done, reveal cards now
            if (packAnimationDone) {
                revealAllCards(newCards.length);
            }
        } catch (err) {
            console.error('Error opening pack:', err);
            setIsOpeningAnimation(false);
        } finally {
            setLoading(false);
        }
    };

    // Helper to reveal cards one by one with delay
    const revealAllCards = async (count) => {
        console.log('Starting sequential reveal of', count, 'cards');
        for (let i = 0; i < count; i++) {
            setRevealedCards((prev) => {
                const updated = [...prev];
                updated[i] = true;
                console.log('Revealed card index', i);
                return updated;
            });
            await new Promise((resolve) => setTimeout(resolve, 300));
        }
        console.log('Finished sequential reveal');
    };

    // When the video ends, reveal all cards if cards are loaded
    const handleVideoEnd = () => {
        console.log('handleVideoEnd triggered');
        setIsOpeningAnimation(false);
        setPackAnimationDone(true);
    };

    // Flip card on click: if the card is still face down, flip it up
    const handleFlipCard = (i) => {
        if (!faceDownCards[i]) return;
        setFaceDownCards((prev) => {
            const updated = [...prev];
            updated[i] = false;
            return updated;
        });
    };

    // Reset pack state
    const handleResetPack = () => {
        console.log('Resetting pack state');
        setOpenedCards([]);
        setRevealedCards([]);
        setFaceDownCards([]);
        setIsOpeningAnimation(false);
        setPackAnimationDone(false);
        setCardsLoaded(false);
    };

    // When both animation and cards are ready, reveal cards
    useEffect(() => {
        if (packAnimationDone && cardsLoaded && openedCards.length > 0) {
            if (document.readyState === 'complete') {
                revealAllCards(openedCards.length);
            } else {
                window.addEventListener('load', () => {
                    revealAllCards(openedCards.length);
                }, { once: true });
            }
        }
    }, [packAnimationDone, cardsLoaded, openedCards.length]);

    const handleFilterChange = (filter) => {
        setActiveFilter(filter);
    };

    return (
        <div className="dashboard-container">
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

            <div className="grid-container">
                {/* Users with Packs */}
                <div className="users-with-packs">
                    <h2>Users with Packs</h2>
                    <div className="users-search">
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="users-search-input"
                        />
                    </div>
                    <div className="users-filter">
                        <button
                            className={activeFilter === 'all' ? 'active' : ''}
                            onClick={() => handleFilterChange('all')}
                        >
                            All Users
                        </button>
                        <button
                            className={activeFilter === 'active' ? 'active' : ''}
                            onClick={() => handleFilterChange('active')}
                        >
                            Active in Last 30 Minutes
                        </button>
                    </div>
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
                            {sortedUsers.map((u) => (
                                <tr
                                    key={u._id}
                                    className={selectedUser?._id === u._id ? 'selected' : ''}
                                    onClick={() => toggleUserSelection(u)}
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

                {/* Pack Opening Section */}
                <div className="selected-user-section">
                    {selectedUser && (
                        <>
                            <h2>Open Pack for {selectedUser.username}</h2>
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
                            <label style={{ marginLeft: '1rem' }}>
                                <input
                                    type="checkbox"
                                    checked={forceModifier}
                                    onChange={(e) => setForceModifier(e.target.checked)}
                                />
                                Force Random Modifier
                            </label>
                            <button
                                onClick={openPackForUser}
                                disabled={loading || isOpeningAnimation || selectedUser.packs <= 0}
                            >
                                {loading ? 'Opening...' : 'Open Pack'}
                            </button>
                        </>
                    )}
                </div>

                {/* Card Rarity Key */}
                <div className="card-rarity-key">
                    <h2>Card Rarity Key</h2>
                    <div className="rarity-list">
                        {Object.entries(cardRarities).map(([rarity, color]) => (
                            <div key={rarity} className="rarity-item">
                                <span className="color-box" style={{ backgroundColor: color }} />
                                <span className="rarity-text">{rarity}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Opened Cards */}
                <div className="opened-cards">
                    <h2>Opened Cards</h2>
                    <div className="cards-container">
                        {openedCards.map((card, i) => {
                            const visibleClass = revealedCards[i] ? 'visible' : '';
                            const flipClass = faceDownCards[i] ? 'face-down' : 'face-up';
                            return (
                                <div
                                    key={i}
                                    className={`card-wrapper ${visibleClass} ${flipClass}`}
                                    style={{ '--rarity-color': getRarityColor(card.rarity), transitionDelay: `${i * 0.2}s` }}
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
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {openedCards.length > 0 && !isOpeningAnimation && (
                        <button
                            onClick={handleResetPack}
                            style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', fontSize: '1rem' }}
                        >
                            Open Another Pack
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;
