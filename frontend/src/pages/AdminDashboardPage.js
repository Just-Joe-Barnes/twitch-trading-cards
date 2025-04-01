// src/pages/AdminDashboardPage.js
import React, { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '../utils/api';
import BaseCard from '../components/BaseCard';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDashboardPage.css';

/*
  AdminDashboardPage:
  - Lists users with unopened packs
  - Plays pack-opening animation
  - Cards appear face down (300x450 forced for the back)
  - The front can exceed 300x450 in face-up mode; we allow overflow on the wrapper
  - One-way flip: once face-up, further clicks do nothing
  - Glow on face-down hover only
  - No spinner or extra delay after the animation
*/

const AdminDashboardPage = ({ user }) => {
    const navigate = useNavigate();

    // Basic user list states
    const [usersWithPacks, setUsersWithPacks] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Internal loading (no spinner displayed)
    const [loading, setLoading] = useState(true);
    // Pack-opening overlay
    const [isOpeningAnimation, setIsOpeningAnimation] = useState(false);

    // Cards & reveal states
    const [openedCards, setOpenedCards] = useState([]);
    // revealedCards => false means not revealed, true means revealed
    const [revealedCards, setRevealedCards] = useState([]);
    // faceDownCards => true means card is still face down, false means flipped up
    const [faceDownCards, setFaceDownCards] = useState([]);

    // For sequential reveal
    const [sequentialRevealStarted, setSequentialRevealStarted] = useState(false);
    const fallbackTimerRef = useRef(null);

    // Pack counter to force video re-mounting each time
    const [packCounter, setPackCounter] = useState(0);

    // Rarity => color map for glow
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

    // On mount, verify admin & fetch user data
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

    // Open a pack for the selected user
    // - All cards start not revealed and face down
    const openPackForUser = async () => {
        if (!selectedUser) return;
        // Clear any leftover fallback timer from previous pack
        if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
        }
        // Increment pack counter to force video re-mount
        setPackCounter(prev => prev + 1);

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
            setRevealedCards(Array(newCards.length).fill(false)); // not revealed yet
            setFaceDownCards(Array(newCards.length).fill(true));  // still face down

            // Decrement the user's pack count
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
        console.log('revealCardSequentially called with index', index);
        if (index >= openedCards.length) {
            console.log('All cards revealed.');
            setIsOpeningAnimation(false);
            return;
        }
        setTimeout(() => {
            setRevealedCards((prev) => {
                const updated = [...prev];
                updated[index] = true;
                console.log(`Card ${index} revealed`, updated);
                return updated;
            });
            revealCardSequentially(index + 1);
        }, 1000);
    };

    // Immediately remove overlay & start reveal when video ends
    const handleVideoEnd = () => {
        console.log('handleVideoEnd triggered');
        console.log('Video ended. Starting sequential reveal...');
        setIsOpeningAnimation(false);
        setSequentialRevealStarted(true);
        revealCardSequentially(0);
    };

    // Fallback: if no card is revealed after 4s, reveal them all
    useEffect(() => {
        if (
            openedCards.length > 0 &&
            !revealedCards.some(Boolean) &&
            !sequentialRevealStarted
        ) {
            console.log('Fallback timer set to reveal cards after 4s');
            fallbackTimerRef.current = setTimeout(() => {
                console.log('Fallback: revealing all cards after 4s');
                setRevealedCards(Array(openedCards.length).fill(true));
                setIsOpeningAnimation(false);
            }, 4000);
            return () => {
                console.log('Fallback timer cleared');
                clearTimeout(fallbackTimerRef.current);
            };
        }
    }, [openedCards, revealedCards, sequentialRevealStarted]);

    // One-way flip on click
    const handleFlipCard = (i) => {
        if (!faceDownCards[i]) return; // already face up
        setFaceDownCards((prev) => {
            const updated = [...prev];
            updated[i] = false; // flip card up
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
    };

    return (
        <div className="dashboard-container">
            {isOpeningAnimation && (
                <div className="pack-opening-overlay">
                    <video
                        key={packCounter} // forces remount on each new pack
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
                            // Add 'revealed' class if the card is revealed
                            const revealClass = revealedCards[i] ? 'revealed' : '';
                            // Maintain face-down/face-up class as before
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
