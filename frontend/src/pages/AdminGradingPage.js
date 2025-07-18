import React, { useEffect, useState } from 'react';
import { fetchWithAuth, gradeCard, completeGrading, revealGradedCard, fetchUserProfile } from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { rarities } from '../constants/rarities';
import { getRarityColor } from '../constants/rarityColors';
import '../styles/AdminGradingPage.css';

const AdminGradingPage = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [gradingLoading, setGradingLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [rarityFilter, setRarityFilter] = useState('All');
    const [sortOption, setSortOption] = useState('acquiredAt');
    const [order, setOrder] = useState('desc');
    const [showSlabbedOnly, setShowSlabbedOnly] = useState(false);

    const [selectedCard, setSelectedCard] = useState(null);
    const [revealedCards, setRevealedCards] = useState({});

    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const profile = await fetchUserProfile();
                setSelectedUser(profile._id);
                const userData = await fetchWithAuth(`/api/users/${profile._id}/collection`);
                setCards(userData.cards || []);

                const data = await fetchWithAuth('/api/admin/users');
                setUsers(data);
            } catch (err) {
                console.error('Error initializing grading page', err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const handleSelectUser = async (e) => {
        const id = e.target.value;
        setSelectedUser(id);
        if (!id) return;
        setLoading(true);
        try {
            const data = await fetchWithAuth(`/api/users/${id}/collection`);
            setCards(data.cards || []);
        } catch (err) {
            console.error('Error fetching collection', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCard = (card) => {
        setSelectedCard(card);
    };

    const handleGrade = async () => {
        if (!selectedCard) return;
        setGradingLoading(true);
        try {
            await gradeCard(selectedUser, selectedCard._id);
            const data = await fetchWithAuth(`/api/users/${selectedUser}/collection`);
            setCards(data.cards || []);
            setSelectedCard(null);
        } catch (err) {
            console.error('Error grading card', err);
        } finally {
            setGradingLoading(false);
        }
    };

    const handleOverride = async (cardId) => {
        setGradingLoading(true);
        try {
            await completeGrading(selectedUser, cardId);
            const data = await fetchWithAuth(`/api/users/${selectedUser}/collection`);
            setCards(data.cards || []);
        } catch (err) {
            console.error('Error completing grading', err);
        } finally {
            setGradingLoading(false);
        }
    };

    const handleDone = async (cardId) => {
        setGradingLoading(true);
        try {
            await revealGradedCard(selectedUser, cardId);
            const data = await fetchWithAuth(`/api/users/${selectedUser}/collection`);
            setCards(data.cards || []);
            setRevealedCards(prev => {
                const copy = { ...prev };
                delete copy[cardId];
                return copy;
            });
        } catch (err) {
            console.error('Error marking grading done', err);
        } finally {
            setGradingLoading(false);
        }
    };

    const toggleReveal = (cardId) => {
        setRevealedCards((prev) => ({
            ...prev,
            [cardId]: !prev[cardId],
        }));
    };

    const rarityRank = rarities.reduce((acc, r, idx) => {
        acc[r.name] = idx;
        return acc;
    }, {});

    // Cards with a gradingRequestedAt timestamp stay in the in-process
    // section even after being slabbed so the grade can be revealed.
    const inProcessCards = cards.filter(c => c.gradingRequestedAt);

    const collectionCards = cards.filter(c => !c.gradingRequestedAt);

    const filteredCards = collectionCards
        .filter(card => card.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .filter(card => rarityFilter === 'All' || card.rarity === rarityFilter)
        .filter(card => (showSlabbedOnly ? card.slabbed : !card.slabbed));

    const sortedCards = [...filteredCards].sort((a, b) => {
        let result = 0;
        if (sortOption === 'mintNumber') {
            result = a.mintNumber - b.mintNumber;
        } else if (sortOption === 'rarity') {
            result = rarityRank[a.rarity] - rarityRank[b.rarity];
        } else if (sortOption === 'acquiredAt') {
            result = new Date(a.acquiredAt) - new Date(b.acquiredAt);
        } else {
            result = a.name.localeCompare(b.name);
        }
        return order === 'asc' ? result : -result;
    });

    const hasSlabbed = cards.some(card => card.slabbed);

    return (
        <div className="admin-grading-page">
            {gradingLoading && <LoadingSpinner />}
            <h2>Admin Card Grading</h2>
            <label>
                Select User:
                <select value={selectedUser} onChange={handleSelectUser} data-testid="user-select">
                    <option value="">-- choose user --</option>
                    {users.map(u => (
                        <option key={u._id} value={u._id}>{u.username}</option>
                    ))}
                </select>
            </label>

            {selectedUser && (
                <div className="grading-controls">
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        data-testid="search-input"
                    />
                    <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value)} data-testid="rarity-select">
                        <option value="All">All Rarities</option>
                        {rarities.map(r => (
                            <option key={r.name} value={r.name}>{r.name}</option>
                        ))}
                    </select>
                    <label className="slab-toggle">
                        <input
                            type="checkbox"
                            checked={showSlabbedOnly}
                            onChange={e => setShowSlabbedOnly(e.target.checked)}
                            data-testid="slab-toggle"
                        />
                        Show Slabbed Only
                    </label>
                    <select value={sortOption} onChange={e => setSortOption(e.target.value)} data-testid="sort-select">
                        <option value="name">Name</option>
                        <option value="mintNumber">Mint Number</option>
                        <option value="rarity">Rarity</option>
                        <option value="acquiredAt">Acquisition Date</option>
                    </select>
                    <select value={order} onChange={e => setOrder(e.target.value)} data-testid="order-select">
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                    </select>
                </div>
            )}

            <div className="grading-layout">
                {!selectedCard && (
                    <>
                        {inProcessCards.length > 0 && (
                            <div className="inprocess-section" data-testid="inprocess-list">
                                <h3>Grading In Progress</h3>
                                <div className="grading-card-list">
                                    {inProcessCards.map(card => {
                                        const end = new Date(card.gradingRequestedAt).getTime() + 24 * 60 * 60 * 1000;
                                        const diff = end - Date.now();
                                        const seconds = Math.max(Math.floor(diff / 1000) % 60, 0);
                                        const minutes = Math.max(Math.floor(diff / (1000 * 60)) % 60, 0);
                                        const hours = Math.max(Math.floor(diff / (1000 * 60 * 60)) % 24, 0);
                                        const days = Math.max(Math.floor(diff / (1000 * 60 * 60 * 24)), 0);

                                        if (card.slabbed) {
                                            const faceUp = revealedCards[card._id];
                                            return (
                                                <div key={card._id} className="grading-card-item slabbed">
                                                    <div
                                                        className={`card-wrapper ${faceUp ? 'face-up' : 'face-down'}`}
                                                        onClick={() => toggleReveal(card._id)}
                                                        style={{ '--rarity-color': getRarityColor(card.rarity) }}
                                                    >
                                                        <div className="card-content">
                                                            <div className="card-inner">
                                                                <div className="card-back">
                                                                    <img src="/images/card-back-placeholder.png" alt="Card Back" />
                                                                    <div className="slab-back-overlay" style={{ '--slab-color': getRarityColor(card.rarity) }} />
                                                                </div>
                                                                <div className="card-front">
                                                                    <BaseCard
                                                                        name={card.name}
                                                                        image={card.imageUrl}
                                                                        description={card.flavorText}
                                                                        rarity={card.rarity}
                                                                        mintNumber={card.mintNumber}
                                                                        modifier={card.modifier}
                                                                        grade={card.grade}
                                                                        slabbed={card.slabbed}
                                                                        interactive={faceUp}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {faceUp && (
                                                        <button className="done-btn" onClick={() => handleDone(card._id)}>
                                                            Done
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={card._id} className="grading-card-item">
                                                <BaseCard
                                                    name={card.name}
                                                    image={card.imageUrl}
                                                    description={card.flavorText}
                                                    rarity={card.rarity}
                                                    mintNumber={card.mintNumber}
                                                    modifier={card.modifier}
                                                    slabbed={false}
                                                />
                                                <div className="grading-timeleft-badge">
                                                    {days}d {hours}h {minutes}m {seconds}s
                                                </div>
                                                <button onClick={() => handleOverride(card._id)}>Override</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div className="collection-section" data-testid="collection-list">
                            {loading && <p>Loading cards...</p>}
                            <div className={`grading-card-list ${hasSlabbed ? 'slabbed' : ''}`}>
                                {sortedCards.map(card => (
                                    <div key={card._id} className={`grading-card-item ${card.slabbed ? 'slabbed' : ''}`}>
                                        <BaseCard
                                            name={card.name}
                                            image={card.imageUrl}
                                            description={card.flavorText}
                                            rarity={card.rarity}
                                            mintNumber={card.mintNumber}
                                            modifier={card.modifier}
                                            grade={card.grade}
                                            slabbed={card.slabbed}
                                        />
                                        {!card.slabbed && (
                                            <button onClick={() => handleSelectCard(card)} data-testid={`select-btn-${card._id}`}>Select</button>
                                        )}
                                        {card.slabbed && <span>Grade: {card.grade}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
                {selectedCard && (
                    <div className="reveal-zone" data-testid="selected-card-area">
                        <div className="grading-area">
                            <BaseCard
                                name={selectedCard.name}
                                image={selectedCard.imageUrl}
                                description={selectedCard.flavorText}
                                rarity={selectedCard.rarity}
                                mintNumber={selectedCard.mintNumber}
                                modifier={selectedCard.modifier}
                                grade={selectedCard.grade}
                                slabbed={selectedCard.slabbed}
                            />
                            {!selectedCard.slabbed && (
                                <button onClick={handleGrade} data-testid="grade-btn">Grade Card</button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminGradingPage;
