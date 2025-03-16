// src/pages/AdminDashboardPage.js
import React, { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '../utils/api';
import BaseCard from '../components/BaseCard';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDashboardPage.css';

/*
  AdminDashboardPage:
  - Lists users with unopened packs.
  - Allows admin to open a pack for a selected user.
  - Plays pack-opening animation, then reveals cards sequentially.
  - Each card is face down initially (back placeholder).
  - Hovering a face-down card shows a glow (rarity color).
  - Clicking a face-down card flips it face up (one-way).
  - The front (BaseCard) is unaltered, but we remove any default margin 
    only on this page and only when the card is face up.
  - We also allow overflow for the face-up card so edges won't be clipped 
    if there's a 3D effect or slight scale on hover.
*/

const AdminDashboardPage = ({ user }) => {
    const navigate = useNavigate();

    // Basic state for user list, selection, search
    const [usersWithPacks, setUsersWithPacks] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // We track loading internally, but no spinner is displayed on this page
    const [loading, setLoading] = useState(true);
    // Controls the pack-opening overlay
    const [isOpeningAnimation, setIsOpeningAnimation] = useState(false);

    // Cards from opened pack
    const [openedCards, setOpenedCards] = useState([]);
    // revealedCards: false = hidden, true = visible (for sequential fade-in)
    const [revealedCards, setRevealedCards] = useState([]);
    // faceDownCards: false = face up, true = face down (back)
    const [faceDownCards, setFaceDownCards] = useState([]);

    // For sequential reveal & fallback
    const [sequentialRevealStarted, setSequentialRevealStarted] = useState(false);
    const fallbackTimerRef = useRef(null);

    // Rarity map for hover glow
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

    // On mount, verify admin & fetch user list
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

    // Toggle user selection
    const toggleUserSelection = (u) => {
        setSelectedUser((prev) => (prev?._id === u._id ? null : u));
    };

    // Open a pack for the selected user
    // - Resets states
    // - All cards start face down
    // - revealedCards are false until sequential fade-in
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
            setFaceDownCards(Array(newCards.length).fill(true));  // face down

            // Decrement user’s pack count
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

    // Reveal cards one by one (fade-in)
    const revealCardSequentially = (index) => {
        if (index >= openedCards.length) {
            setIsOpeningAnimation(false);
            return;
        }
        setTimeout(() => {
            setRevealedCards((prev) => {
                const updated = [...prev];
                updated[index] = true;
                return updated;
            });
            revealCardSequentially(index + 1);
        }, 1000);
    };

    // Immediately remove overlay & start reveal on video end
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

    // One-way flip: if faceDownCards[i] is true, flip it to false on click
    // Once flipped, further clicks do nothing
    const handleFlipCard = (i) => {
        if (!faceDownCards[i]) return; // already face up
        setFaceDownCards((prev) => {
            const updated = [...prev];
            updated[i] = false; // face up
            return updated;
        });
    };

    // Reset all states
    const handleResetPack = () => {
        console.log('Resetting pack state');
        setOpenedCards([]);
        setRevealedCards([]);
        setFaceDownCards([]);
        setIsOpeningAnimation(false);
    };

    return (
        <div className="dashboard-container">
            {/* If animation is playing, show the overlay */}
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

                {/* Selected User -> Open Pack Section */}
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
                            // fade-in class
                            const visibilityClass = revealedCards[i] ? 'visible' : 'hidden';
                            // face-down or face-up
                            const flipClass = faceDownCards[i] ? 'face-down' : 'face-up';

                            return (
                                <div
                                    key={i}
                                    className={`card-wrapper ${visibilityClass} ${flipClass}`}
                                    style={{ '--rarity-color': getRarityColor(card.rarity) }}
                                    onClick={() => handleFlipCard(i)}
                                >
                                    <div className="card-content">
                                        <div className="card-inner">
                                            {/* Back forced 300x450 */}
                                            <div className="card-back">
                                                <img
                                                    src="/images/card-back-placeholder.png"
                                                    alt="Card Back"
                                                />
                                            </div>
                                            {/* Front (BaseCard). We remove default margin from 
                          CardComponents only on this page, face up. */}
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
