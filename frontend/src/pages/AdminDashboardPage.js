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

    // Cards state
    const [openedCards, setOpenedCards] = useState([]);
    // revealedCards: an array of booleans; false = not revealed, true = revealed
    const [revealedCards, setRevealedCards] = useState([]);
    // faceDownCards: true = card is face down; false = flipped up
    const [faceDownCards, setFaceDownCards] = useState([]);

    // currentRevealIndex controls how many cards are revealed
    const [currentRevealIndex, setCurrentRevealIndex] = useState(0);
    // Pack counter forces remounting of the video element each time
    const [packCounter, setPackCounter] = useState(0);

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

    // On mount: verify admin & fetch users with packs
    useEffect(() => {
        if (!user?.isAdmin) {
            console.warn('Access denied: Admins only.');
            navigate('/login');
            return;
        }
        const fetchData = async () => {
            setLoading(true);
            try {
                const activeMinutesParam = activeFilter === 'active' ? '&activeMinutes=15' : '';
                const data = await fetchWithAuth(`/api/admin/users-activity?${activeMinutesParam}`);
                setUsers(data || []);
            } catch (err) {
                console.error('Error fetching users with activity:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
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
        if (sortColumn) {
            const aValue = a[sortColumn];
            const bValue = b[sortColumn];

            if (aValue < bValue) {
                return sortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortDirection === 'asc' ? 1 : -1;
            }
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
        setCurrentRevealIndex(0);
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
                { method: 'POST' }
            );
            const { newCards } = res;
            console.log('New cards:', newCards);
            setOpenedCards(newCards);
            setRevealedCards(Array(newCards.length).fill(true)); // Reveal all cards initially
            setFaceDownCards(Array(newCards.length).fill(true));

            // Decrement the user's pack count
            setUsers((prev) =>
                prev.map((u) =>
                    u._id === selectedUser._id ? { ...u, packs: u.packs - 1 } : u
                )
            );
        } catch (err) {
            console.error('Error opening pack:', err);
            setIsOpeningAnimation(false);
        } finally {
            setLoading(false);
        }
    };

    // When currentRevealIndex changes, update revealedCards so that all cards
    // with index < currentRevealIndex are marked as revealed.
    useEffect(() => {
        if (openedCards.length > 0) {
            setRevealedCards((prev) => {
                const updated = [...prev];
                // Ensure updated array has the same length as openedCards
                while (updated.length < openedCards.length) {
                    updated.push(false);
                }
                for (let i = 0; i < openedCards.length; i++) {
                    updated[i] = i < currentRevealIndex;
                }
                return updated;
            });
        }
    }, [currentRevealIndex, openedCards]);

    // When the video ends, reveal all cards immediately
    const handleVideoEnd = () => {
        console.log('handleVideoEnd triggered');
        setIsOpeningAnimation(false);
        setCurrentRevealIndex(openedCards.length);
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
        setCurrentRevealIndex(0);
    };

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
                            Active in Last 15 Minutes
                        </button>
                    </div>
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('username')}>Username</th>
                                <th onClick={() => handleSort('packs')}>Unopened Packs</th>
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
                            const revealClass = revealedCards[i] ? 'revealed' : '';
                            const flipClass = faceDownCards[i] ? 'face-down' : 'face-up';
                            return (
                                <div
                                    key={i}
                                    className={`card-wrapper ${revealClass} ${flipClass}`}
                                    style={{ '--rarity-color': getRarityColor(card.rarity) }}
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
