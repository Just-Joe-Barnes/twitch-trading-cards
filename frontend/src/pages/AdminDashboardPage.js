// src/pages/AdminDashboardPage.js
import React, { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '../utils/api';
import BaseCard from '../components/BaseCard';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/AdminDashboardPage.css';

const AdminDashboardPage = ({ user }) => {
    const navigate = useNavigate();

    // Data for users and packs
    const [usersWithPacks, setUsersWithPacks] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Loading & animation states
    const [loading, setLoading] = useState(true);
    const [isOpeningAnimation, setIsOpeningAnimation] = useState(false);

    // Cards from the opened pack
    const [openedCards, setOpenedCards] = useState([]);
    // revealedCards: controls sequential fade-in; false = hidden, true = visible
    const [revealedCards, setRevealedCards] = useState([]);
    // faceDownCards: true = show card back, false = show front
    const [faceDownCards, setFaceDownCards] = useState([]);

    // For sequential reveal
    const revealIndexRef = useRef(0);

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
    const getRarityColor = (rarity) => {
        const found = cardRarities.find((r) => r.rarity.toLowerCase() === rarity.toLowerCase());
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

    const filteredUsers = usersWithPacks.filter((u) =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleUserSelection = (u) => {
        setSelectedUser((prev) => (prev?._id === u._id ? null : u));
    };

    // Open a pack for the selected user
    // All cards start hidden (revealedCards = false) and face down
    const openPackForUser = async () => {
        if (!selectedUser) return;
        setLoading(true);
        setIsOpeningAnimation(true);
        setOpenedCards([]);
        setRevealedCards([]);
        setFaceDownCards([]);
        try {
            const res = await fetchWithAuth(`/api/packs/admin/openPacksForUser/${selectedUser._id}`, {
                method: 'POST',
            });
            const { newCards } = res;
            console.log('New cards:', newCards);
            setOpenedCards(newCards);
            setRevealedCards(Array(newCards.length).fill(false));  // fade-in
            setFaceDownCards(Array(newCards.length).fill(true));   // back showing
            revealIndexRef.current = 0;
            // Decrement user's pack count
            setUsersWithPacks((prev) =>
                prev.map((u) =>
                    u._id === selectedUser._id ? { ...u, packs: u.packs - 1 } : u
                )
            );
        } catch (err) {
            console.error('Error opening pack:', err);
            setIsOpeningAnimation(false);
        } finally {
            setLoading(false);
            // Keep the overlay until video ends
        }
    };

    // Reveal cards sequentially (fade in)
    const revealCardsSequentially = (index = 0) => {
        if (index < openedCards.length) {
            setTimeout(() => {
                setRevealedCards((prev) => {
                    const updated = [...prev];
                    updated[index] = true;
                    return updated;
                });
                revealCardsSequentially(index + 1);
            }, 1000); // 1 second per card
        }
    };

    // When the pack-opening video ends, hide overlay & start fade-in
    const handleVideoEnd = () => {
        console.log('Pack opening animation ended. Starting sequential fade-in...');
        setIsOpeningAnimation(false);
        revealCardsSequentially();
    };

    // Flip a card on click: if faceDown => faceUp, else faceDown
    const handleFlipCard = (i) => {
        setFaceDownCards((prev) => {
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
                        onEnded={handleVideoEnd}
                        onLoadedData={() => console.log('Video loaded')}
                        onError={(e) => console.error('Video error:', e)}
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
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Unopened Packs</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((u) => (
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

                {/* Card Rarity Key */}
                <div className="card-rarity-key">
                    <h2>Card Rarity Key</h2>
                    <div className="rarity-list">
                        {cardRarities.map((r) => (
                            <div key={r.rarity} className="rarity-item">
                                <span
                                    className="color-box"
                                    style={{ backgroundColor: r.color }}
                                />
                                <span className="rarity-text">{r.rarity}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Opened Cards */}
                <div className="opened-cards">
                    <h2>Opened Cards</h2>
                    <div className="cards-container">
                        {openedCards.map((card, i) => (
                            <div
                                key={i}
                                className={`card-wrapper ${revealedCards[i] ? 'visible' : 'hidden'} ${faceDownCards[i] ? 'face-down' : 'face-up'
                                    }`}
                                style={{ '--rarity-color': getRarityColor(card.rarity) }}
                                onClick={() => handleFlipCard(i)}
                            >
                                <div className="card-content">
                                    {/* Debugging: front border */}
                                    <div className="card-front-debug card-front">
                                        <BaseCard
                                            name={card.name}
                                            image={card.imageUrl}
                                            description={card.flavorText}
                                            rarity={card.rarity}
                                            mintNumber={card.mintNumber}
                                        />
                                    </div>
                                    {/* Debugging: back border */}
                                    <div className="card-back-debug card-back">
                                        <img
                                            src="/images/card-back-placeholder.png"
                                            alt="Card Back"
                                        />
                                    </div>
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
