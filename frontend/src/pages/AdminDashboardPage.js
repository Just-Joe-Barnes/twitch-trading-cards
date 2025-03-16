// src/pages/AdminDashboardPage.js
import React, { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import FlippableBaseCard from '../components/FlippableBaseCard';
import '../styles/AdminDashboardPage.css';

const AdminDashboardPage = ({ user }) => {
    const navigate = useNavigate();

    // Data for users & packs
    const [usersWithPacks, setUsersWithPacks] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // No spinners on this page
    const [loading, setLoading] = useState(true);
    const [isOpeningAnimation, setIsOpeningAnimation] = useState(false);

    // Cards
    const [openedCards, setOpenedCards] = useState([]);
    const [revealedCards, setRevealedCards] = useState([]);
    const [sequentialRevealStarted, setSequentialRevealStarted] = useState(false);
    const fallbackTimerRef = useRef(null);

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

    // On mount, verify admin & fetch
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

    const openPackForUser = async () => {
        if (!selectedUser) return;
        setLoading(true);
        setIsOpeningAnimation(true);
        setSequentialRevealStarted(false);
        setOpenedCards([]);
        setRevealedCards([]);
        try {
            const res = await fetchWithAuth(
                `/api/packs/admin/openPacksForUser/${selectedUser._id}`,
                { method: 'POST' }
            );
            const { newCards } = res;
            console.log('New cards:', newCards);
            setOpenedCards(newCards);
            setRevealedCards(Array(newCards.length).fill(false));
            // Decrement pack count
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

    // Remove black screen delay => call handleVideoEnd immediately
    const handleVideoEnd = () => {
        if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
        }
        console.log('Video ended. Starting sequential reveal...');
        setSequentialRevealStarted(true);
        revealCardSequentially(0);
    };

    // Fallback after 4s if no reveal started
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

    const handleResetPack = () => {
        console.log('Resetting pack state');
        setOpenedCards([]);
        setRevealedCards([]);
        setIsOpeningAnimation(false);
    };

    // If loading & no cards => show nothing
    if (loading && openedCards.length === 0) return null;

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
                        onEnded={handleVideoEnd}  // No extra delay
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
                                className={`card-wrapper ${revealedCards[i] ? 'visible' : 'hidden'}`}
                            >
                                {/* Each card starts face-down and can be clicked to flip */}
                                <FlippableBaseCard card={card} />
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
