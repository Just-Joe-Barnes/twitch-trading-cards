// src/pages/AdminDashboardPage.js
import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/api';
import BaseCard from '../components/BaseCard';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/AdminDashboardPage.css';

const AdminDashboardPage = ({ user }) => {
    const navigate = useNavigate();

    const [usersWithPacks, setUsersWithPacks] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [loading, setLoading] = useState(true);
    const [isOpeningAnimation, setIsOpeningAnimation] = useState(false);
    const [openedCards, setOpenedCards] = useState([]);
    const [flippedCards, setFlippedCards] = useState([]); // new flipped state for each card

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

    // Helper: get rarity color based on card rarity (case-insensitive)
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

    const openPackForUser = async () => {
        if (!selectedUser) return;
        setLoading(true);
        setIsOpeningAnimation(true);
        // Reset card states
        setOpenedCards([]);
        setFlippedCards([]);
        try {
            const res = await fetchWithAuth(`/api/packs/admin/openPacksForUser/${selectedUser._id}`, {
                method: 'POST',
            });
            const { newCards } = res;
            console.log('New cards:', newCards);
            setOpenedCards(newCards);
            // Initially, none of the cards are flipped (face down)
            setFlippedCards(Array(newCards.length).fill(false));
            // Decrement the selected user's pack count.
            setUsersWithPacks(prev =>
                prev.map(u => (u._id === selectedUser._id ? { ...u, packs: u.packs - 1 } : u))
            );
        } catch (err) {
            console.error('Error opening pack:', err);
            setIsOpeningAnimation(false);
        } finally {
            setLoading(false);
            // Hide the opening animation overlay once loading is done.
            setIsOpeningAnimation(false);
        }
    };

    // Toggle the flipped state for card at index i
    const toggleFlip = (i) => {
        setFlippedCards(prev => {
            const updated = [...prev];
            updated[i] = !updated[i];
            return updated;
        });
    };

    // For this new design, when the pack-opening video ends, we simply hide the overlay.
    const handleVideoEnd = () => {
        console.log('Video ended. Displaying face-down cards.');
        setIsOpeningAnimation(false);
    };

    const handleResetPack = () => {
        console.log('Resetting pack state');
        setOpenedCards([]);
        setFlippedCards([]);
        setIsOpeningAnimation(false);
    };

    // Show spinner only if still loading and no pack is opened yet.
    if (loading && openedCards.length === 0) return <LoadingSpinner />;

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

                {/* Card Rarity Key */}
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

                {/* Opened Cards Section (Flippable Cards) */}
                <div className="opened-cards">
                    <h2>Opened Cards</h2>
                    <div className="cards-container">
                        {openedCards.map((card, i) => (
                            <div
                                key={i}
                                className={`flip-card ${flippedCards[i] ? 'flipped' : ''}`}
                                onClick={() => toggleFlip(i)}
                            >
                                <div className="flip-card-inner">
                                    <div className="flip-card-front">
                                        <BaseCard
                                            name={card.name}
                                            image={card.imageUrl}
                                            description={card.flavorText}
                                            rarity={card.rarity}
                                            mintNumber={card.mintNumber}
                                        />
                                    </div>
                                    <div className="flip-card-back">
                                        {/* Placeholder for card back */}
                                        <img src="/images/card-back-placeholder.png" alt="Card Back" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {openedCards.length > 0 && (
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
