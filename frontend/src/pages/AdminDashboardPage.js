import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/api';
import BaseCard from '../components/BaseCard';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDashboardPage.css';

const AdminDashboardPage = ({ user }) => {
    const navigate = useNavigate();
    const [usersWithPacks, setUsersWithPacks] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [openedCards, setOpenedCards] = useState([]);
    const [revealedCards, setRevealedCards] = useState([]);
    const [isOpeningAnimation, setIsOpeningAnimation] = useState(false);

    const cardRarities = [
        { rarity: 'Basic', color: '#a0a0a0', maxMint: 1000 },
        { rarity: 'Common', color: '#78c2ad', maxMint: 800 },
        { rarity: 'Standard', color: '#4a90e2', maxMint: 600 },
        { rarity: 'Uncommon', color: '#9068be', maxMint: 400 },
        { rarity: 'Rare', color: '#e5a228', maxMint: 300 },
        { rarity: 'Epic', color: '#ff4500', maxMint: 200 },
        { rarity: 'Legendary', color: '#72f1fc', maxMint: 100 },
        { rarity: 'Mythic', color: 'hotpink', maxMint: 50 },
        { rarity: 'Unique', color: 'black', maxMint: 10 },
        { rarity: 'Divine', color: 'white', maxMint: 1 },
    ];

    useEffect(() => {
        if (!user?.isAdmin) {
            console.warn('Access denied: Admins only.');
            navigate('/login');
            return;
        }

        const fetchUsersWithPacks = async () => {
            try {
                setLoading(true);
                const data = await fetchWithAuth('/api/packs/usersWithPacks');
                setUsersWithPacks(data.users || []);
            } catch (error) {
                console.error('Error fetching users with unopened packs:', error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUsersWithPacks();
    }, [user, navigate]);

    const openPackForUser = async () => {
        if (!selectedUser) return;

        try {
            setLoading(true);
            setIsOpeningAnimation(true);

            const response = await fetchWithAuth(`/api/packs/admin/openPacksForUser/${selectedUser._id}`, {
                method: 'POST',
            });

            const { newCards } = response;
            console.log('New cards received:', newCards);
            setOpenedCards(newCards);
            setRevealedCards(Array(newCards.length).fill(false));

            setUsersWithPacks((prev) =>
                prev.map((u) =>
                    u._id === selectedUser._id ? { ...u, packs: u.packs - 1 } : u
                )
            );
        } catch (error) {
            console.error('Error opening pack for user:', error.message);
            setIsOpeningAnimation(false);
        } finally {
            setLoading(false);
        }
    };

    // This function now simply logs when the video ends.
    const handleVideoEnd = () => {
        console.log("Pack opening video ended.");
        // The reveal logic is now handled by the useEffect below.
    };

    // useEffect to trigger card reveal after openedCards and isOpeningAnimation update.
    useEffect(() => {
        if (openedCards.length > 0 && isOpeningAnimation) {
            console.log("Triggering card reveal via useEffect.");
            console.log("Number of cards to reveal:", openedCards.length);
            // Wait a short delay to ensure state is fully updated.
            const revealDelay = 200; // 200ms delay before starting reveal
            setTimeout(() => {
                openedCards.forEach((_, index) => {
                    setTimeout(() => {
                        setRevealedCards((prev) => {
                            const updated = [...prev];
                            updated[index] = true;
                            console.log(`Revealed card ${index}`);
                            return updated;
                        });
                    }, index * 1000); // 1 second delay between each card
                });
                setIsOpeningAnimation(false);
            }, revealDelay);
        }
    }, [openedCards, isOpeningAnimation]);

    // Manual fallback button to trigger card reveal if needed
    const manualReveal = () => {
        console.log("Manual reveal triggered");
        // If needed, we can force the reveal via the same useEffect logic.
        setIsOpeningAnimation(true);
    };

    const toggleUserSelection = (u) => {
        setSelectedUser((prev) => (prev?._id === u._id ? null : u));
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
                        onLoadedData={() => console.log("Pack opening video loaded")}
                        onError={(e) => console.error("Pack opening video error:", e)}
                        onEnded={() => setTimeout(handleVideoEnd, 500)}
                    />
                    <button
                        onClick={manualReveal}
                        style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1100 }}
                    >
                        Reveal Cards Manually
                    </button>
                </div>
            )}

            <div className="grid-container">
                {/* Users with Packs Section */}
                <div className="users-with-packs">
                    <h2>Users with Packs</h2>
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Unopened Packs</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usersWithPacks.map((u) => (
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
                        {cardRarities.map((rarity) => (
                            <div key={rarity.rarity} className="rarity-item">
                                <span
                                    className="color-box"
                                    style={{ backgroundColor: rarity.color }}
                                ></span>
                                <span className="rarity-text">
                                    {rarity.rarity} {rarity.maxMint === 1 ? "#1" : `(#/${rarity.maxMint})`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Opened Cards Section */}
                <div className="opened-cards">
                    <h2>Opened Cards</h2>
                    <div className="cards-container">
                        {openedCards.map((card, index) => (
                            <div
                                key={index}
                                className={`card-wrapper ${revealedCards[index] ? 'fade-in' : 'hidden'}`}
                            >
                                <BaseCard
                                    name={card.name}
                                    image={card.imageUrl}
                                    description={card.flavorText}
                                    rarity={card.rarity}
                                    mintNumber={card.mintNumber}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;
