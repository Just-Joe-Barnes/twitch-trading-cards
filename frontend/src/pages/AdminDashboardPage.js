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
    // faceDownCards: true = show back, false = show front
    const [faceDownCards, setFaceDownCards] = useState([]);

    // For sequential reveal
    const revealIndexRef = useRef(0);
    const [sequentialRevealStarted, setSequentialRevealStarted] = useState(false);

    // For fallback timer if no reveal starts
    const fallbackTimerRef = useRef(null);

    // Rarity color mapping
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
        const found = cardRarities.find(
            (r) => r.rarity.toLowerCase() === rarity.toLowerCase()
        );
        return found ? found.color : '#fff';
    };

    // On mount, verify admin and fetch data
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

    // Filter user list by search
    const filteredUsers = usersWithPacks.filter((u) =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleUserSelection = (u) => {
        setSelectedUser((prev) => (prev?._id === u._id ? null : u));
    };

    // Open pack for the selected user
    // All cards start hidden (revealedCards) and face down
    const openPackForUser = async () => {
        if (!selectedUser) return;
        setLoading(true);
        setIsOpeningAnimation(true);
        setOpenedCards([]);
        setRevealedCards([]);
        setFaceDownCards([]);
        setSequentialRevealStarted(false);
        try {
            const res = await fetchWithAuth(
                `/api/packs/admin/openPacksForUser/${selectedUser._id}`,
                { method: 'POST' }
            );
            const { newCards } = res;
            console.log('New cards:', newCards);
            setOpenedCards(newCards);
            setRevealedCards(Array(newCards.length).fill(false)); // fade in
            setFaceDownCards(Array(newCards.length).fill(true));  // show back
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
        }
    };

    // Reveal cards sequentially
    const revealCardSequentially = (index) => {
        if (index >= openedCards.length) {
            setIsOpeningAnimation(false);
            return;
        }
        setTimeout(() => {
            setRevealedCards((prev) => {
                const updated = [...prev];
                updated[index] = true;
                console.log(`Card ${index} revealed`);
                return updated;
            });
            revealCardSequentially(index + 1);
        }, 1000);
    };

    // On video end, start sequential reveal
    const handleVideoEnd = () => {
        if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
        }
        console.log('Video ended. Starting sequential reveal...');
        setSequentialRevealStarted(true);
        revealCardSequentially(0);
    };

    // Fallback if 4s pass with no reveal
    useEffect(() => {
        if (
            openedCards.length > 0 &&
            !revealedCards.some(Boolean) &&
            !sequentialRevealStarted
        ) {
            fallbackTimerRef.current = setTimeout(() => {
                console.log('Fallback: revealing all cards after 4s');
                setRevealedCards(Array(openedCards.length).fill(true));
                setIsOpeningAnimation(false);
            }, 4000);
            return () => clearTimeout(fallbackTimerRef.current);
        }
    }, [openedCards, revealedCards, sequentialRevealStarted]);

    // Flip card on click: faceDown => faceUp, or vice versa
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

    // Show spinner if loading, no cards, and not animating
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
                                <span className="color-box" style={{ backgroundColor: r.color }} />
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
                                {/* 
                  .card-content is forced to 300x450 so the front & back 
                  have a consistent size & flip from center 
                */}
                                <div className="card-content">
                                    <div className="card-inner">
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
                                            <img
                                                src="/images/card-back-placeholder.png"
                                                alt="Card Back"
                                            />
                                        </div>
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
