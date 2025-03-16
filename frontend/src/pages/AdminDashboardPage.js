// src/pages/AdminDashboardPage.js
import React, { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '../utils/api';
import BaseCard from '../components/BaseCard';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDashboardPage.css';

/*
  AdminDashboardPage: 
  - Lists users with unopened packs.
  - Allows the admin to open a pack for a selected user.
  - Plays a pack-opening animation overlay (removed immediately after it ends).
  - Reveals cards sequentially (fade-in), each face down by default.
  - One-way flip: clicking a face-down card flips it to face up (and locks it).
  - Hover glow appears only when the card is face down.
  - The card container is forced to 300x450, so front & back align perfectly.
*/

const AdminDashboardPage = ({ user }) => {
    const navigate = useNavigate();

    // Users & search
    const [usersWithPacks, setUsersWithPacks] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Internal loading state (no spinner displayed)
    const [loading, setLoading] = useState(true);
    // Controls the pack-opening overlay
    const [isOpeningAnimation, setIsOpeningAnimation] = useState(false);

    // Cards & reveal states
    const [openedCards, setOpenedCards] = useState([]);
    // revealedCards: fade-in => false = hidden, true = visible
    const [revealedCards, setRevealedCards] = useState([]);
    // faceDownCards: true => back showing, false => front showing
    const [faceDownCards, setFaceDownCards] = useState([]);

    // For sequential reveal
    const [sequentialRevealStarted, setSequentialRevealStarted] = useState(false);
    const fallbackTimerRef = useRef(null);

    // Rarity color map for hover glow
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

    // On mount, verify admin and fetch users
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

    // Toggle selection of user
    const toggleUserSelection = (u) => {
        setSelectedUser((prev) => (prev?._id === u._id ? null : u));
    };

    // Open pack for selected user
    // - Cards start face down, revealedCards are false
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
            setRevealedCards(Array(newCards.length).fill(false)); // fade-in
            setFaceDownCards(Array(newCards.length).fill(true));  // all face down

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

    // Immediately remove overlay and start reveal on video end
    const handleVideoEnd = () => {
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
            fallbackTimerRef.current = setTimeout(() => {
                console.log('Fallback: revealing all cards after 4s');
                setRevealedCards(Array(openedCards.length).fill(true));
                setIsOpeningAnimation(false);
            }, 4000);
            return () => clearTimeout(fallbackTimerRef.current);
        }
    }, [openedCards, revealedCards, sequentialRevealStarted]);

    // One-way flip: if faceDownCards[i] is still true, flip it to false
    // Once flipped, further clicks do nothing
    const handleFlipCard = (i) => {
        // Only flip if the card is still face down
        if (!faceDownCards[i]) return;
        setFaceDownCards((prev) => {
            const updated = [...prev];
            updated[i] = false; // now face up
            return updated;
        });
    };

    // Reset everything
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

                {/* Card Rarity Key Section */}
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

                {/* Opened Cards Section */}
                <div className="opened-cards">
                    <h2>Opened Cards</h2>
                    <div className="cards-container">
                        {openedCards.map((card, i) => {
                            // Determine face-down or face-up class
                            const flipClass = faceDownCards[i] ? 'face-down' : 'face-up';
                            // Determine fade-in
                            const visibilityClass = revealedCards[i] ? 'visible' : 'hidden';

                            return (
                                <div
                                    key={i}
                                    className={`card-wrapper ${visibilityClass} ${flipClass}`}
                                    onClick={() => handleFlipCard(i)}
                                    style={{ '--rarity-color': getRarityColor(card.rarity) }}
                                >
                                    <div className="card-content">
                                        <div className="card-inner">
                                            {/* The forced back (300x450) */}
                                            <div className="card-back">
                                                <img
                                                    src="/images/card-back-placeholder.png"
                                                    alt="Card Back"
                                                />
                                            </div>
                                            {/* The front as BaseCard (unchanged) */}
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
