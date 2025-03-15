// src/pages/AdminDashboardPage.js
import React, { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '../utils/api';
import BaseCard from '../components/BaseCard';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/AdminDashboardPage.css';

const AdminDashboardPage = ({ user }) => {
    const navigate = useNavigate();

    // Admin & pack data
    const [usersWithPacks, setUsersWithPacks] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Loading & animation states
    const [loading, setLoading] = useState(true);
    const [isOpeningAnimation, setIsOpeningAnimation] = useState(false);

    // Card states
    const [openedCards, setOpenedCards] = useState([]);
    // revealedCards: controls sequential fade-in; false = hidden, true = visible.
    const [revealedCards, setRevealedCards] = useState([]);
    // faceDownCards: true = card shows its back (face down), false = card front is visible.
    const [faceDownCards, setFaceDownCards] = useState([]);

    // For sequential reveal timing
    const fallbackTimerRef = useRef(null);
    const [sequentialRevealStarted, setSequentialRevealStarted] = useState(false);

    const cardRarities = [
        { rarity: 'Basic', color: '#8D8D8D' },
        { rarity: 'Common', color: '#64B5F6' },
        { rarity: 'Standard', color: '#66BB6A' },
        { rarity: 'Uncommon', color: '#1976D2' },
        { rarity: 'Rare', color: '#AB47BC' },
        { rarity: 'Epic', color: '#FFA726' },
        { rarity: 'Legendary', color: '#e32232' },
        { rarity: 'Mythic', color: 'hotpink' },
        { rarity: 'Unique', color: 'black' },
        { rarity: 'Divine', color: 'white' },
    ];

    // Returns the glow color for the card's rarity.
    const getRarityColor = (rarity) => {
        const found = cardRarities.find(r => r.rarity.toLowerCase() === rarity.toLowerCase());
        return found ? found.color : '#fff';
    };

    useEffect(() => {
        if (!user?.isAdmin) {
            console.warn('Access denied: Admins only.');
            navigate('/login');
            return;
        }
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await fetchWithAuth('/api/packs/usersWithPacks');
                setUsersWithPacks(data.users || []);
            } catch (err) {
                console.error('Error fetching packs:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, navigate]);

    const filteredUsers = usersWithPacks.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleUserSelection = (u) => {
        setSelectedUser(prev => (prev?._id === u._id ? null : u));
    };

    // Open a pack for the selected user.
    // When a pack is opened, all cards are loaded with their back showing (face down)
    // and hidden until they fade in sequentially.
    const openPackForUser = async () => {
        if (!selectedUser) return;
        setLoading(true);
        setIsOpeningAnimation(true);
        setOpenedCards([]);
        setRevealedCards([]);
        setFaceDownCards([]);
        setSequentialRevealStarted(false);
        try {
            const res = await fetchWithAuth(`/api/packs/admin/openPacksForUser/${selectedUser._id}`, {
                method: 'POST',
            });
            const { newCards } = res;
            console.log('New cards:', newCards);
            setOpenedCards(newCards);
            setRevealedCards(Array(newCards.length).fill(false));
            setFaceDownCards(Array(newCards.length).fill(true));
        } catch (err) {
            console.error('Error opening pack:', err);
            setIsOpeningAnimation(false);
        } finally {
            setLoading(false);
            // Keep the animation overlay until the video ends.
        }
    };

    // Sequentially fade in each card (set revealedCards[i] to true) one at a time.
    const revealCardSequentially = (index = 0) => {
        if (index < openedCards.length) {
            setTimeout(() => {
                setRevealedCards(prev => {
                    const updated = [...prev];
                    updated[index] = true;
                    return updated;
                });
                revealCardSequentially(index + 1);
            }, 1000); // 1 second delay per card; adjust if needed
        }
    };

    // When the pack-opening video ends, start the sequential fade-in.
    const handleVideoEnd = () => {
        if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
        }
        console.log('Video ended. Starting sequential fade-in...');
        setSequentialRevealStarted(true);
        revealCardSequentially();
        setIsOpeningAnimation(false);
    };

    // Flip a card on click: toggle its faceDown state.
    const handleFlipCard = (i) => {
        setFaceDownCards(prev => {
            const updated = [...prev];
            updated[i] = !updated[i];
            return updated;
        });
    };

    const handleResetPack = () => {
        console.log('Resetting pack state');
        setOpenedCards([]);
        setRevealedCards([]);
        setFaceDownCards([]);
        setIsOpeningAnimation(false);
    };

    if (loading && openedCards.length === 0 && !isOpeningAnimation) {
        return <LoadingSpinner />;
    }

    return (
        <div className="dashboard-container">
            {isOpeningAnimation && (
                <div className="pack-opening-overlay">
                    <video
                        className="pack-opening-video"
                        src="/animations/packopening.mp4"
                        autoPlay
                        playsInline
                        controls={false}
                        onEnded={() => setTimeout(handleVideoEnd, 500)}
                        onLoadedData={() => console.log('Video loaded')}
                        onError={(e) => console.error('Video error:', e)}
                    />
                </div>
            )}
            <div className="grid-container">
                {/* Users with Packs Section */}
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
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Unopened Packs</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(u => (
                                <tr
                                    key={u._id}
                                    className={selectedUser?._id === u._id ? 'selected' : ''}
                                    onClick={() => toggleUserSelection(u)}
                                >
                                    <td>{u.username}</td>
                                    <td>{u.packs}</td>
                                    <td>{u.packs > 0 ? 'Available' : 'No packs'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Open Pack Section */}
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

                {/* Card Rarity Key Section */}
                <div className="card-rarity-key">
                    <h2>Card Rarity Key</h2>
                    <div className="rarity-list">
                        {cardRarities.map(r => (
                            <div key={r.rarity} className="rarity-item">
                                <span className="color-box" style={{ backgroundColor: r.color }} />
                                <span className="rarity-text">{r.rarity}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Opened Cards Section */}
                <div className="opened-cards">
                    <h2>Opened Cards</h2>
                    <div className="cards-container">
                        {openedCards.map((card, i) => (
                            <div
                                key={i}
                                className={`card-wrapper ${revealedCards[i] ? 'visible' : 'hidden'} ${faceDownCards[i] ? 'face-down' : 'face-up'}`}
                                style={{ '--rarity-color': getRarityColor(card.rarity) }}
                                onClick={() => handleFlipCard(i)}
                            >
                                <div className="card-front">
                                    <BaseCard
                                        name={card.name}
                                        image={card.imageUrl}
                                        description={card.flavorText}
                                        rarity={card.rarity}
                                        mintNumber={card.mintNumber}
                                    />
                                </div>
                                <div className="card-back">
                                    <img src="/images/card-back-placeholder.png" alt="Card Back" />
                                </div>
                            </div>
                        ))}
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
