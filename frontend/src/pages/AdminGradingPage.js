import React, { useEffect, useState } from 'react';
import { fetchWithAuth, gradeCard } from '../utils/api';
import BaseCard from '../components/BaseCard';
import { rarities } from '../constants/rarities';
import '../styles/AdminGradingPage.css';

const AdminGradingPage = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [rarityFilter, setRarityFilter] = useState('All');
    const [sortOption, setSortOption] = useState('name');
    const [showSlabbedOnly, setShowSlabbedOnly] = useState(false);

    const [gradingCard, setGradingCard] = useState(null);
    const [revealGrade, setRevealGrade] = useState(false);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const data = await fetchWithAuth('/api/admin/users');
                setUsers(data);
            } catch (err) {
                console.error('Error fetching users', err);
            }
        };
        loadUsers();
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

    const handleGrade = async (cardId) => {
        try {
            await gradeCard(selectedUser, cardId);
            const data = await fetchWithAuth(`/api/users/${selectedUser}/collection`);
            setCards(data.cards || []);
            const graded = (data.cards || []).find(c => c._id === cardId);
            if (graded) {
                setGradingCard(graded);
                setRevealGrade(false);
            }
        } catch (err) {
            console.error('Error grading card', err);
        }
    };

    const rarityRank = rarities.reduce((acc, r, idx) => {
        acc[r.name] = idx;
        return acc;
    }, {});

    const filteredCards = cards
        .filter(card => card.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .filter(card => rarityFilter === 'All' || card.rarity === rarityFilter)
        .filter(card => (showSlabbedOnly ? card.slabbed : true));

    const sortedCards = [...filteredCards].sort((a, b) => {
        if (sortOption === 'mint') {
            return a.mintNumber - b.mintNumber;
        }
        if (sortOption === 'rarity') {
            return rarityRank[a.rarity] - rarityRank[b.rarity];
        }
        // default name sort
        return a.name.localeCompare(b.name);
    });

    const hasSlabbed = cards.some(card => card.slabbed);

    return (
        <div className="admin-grading-page">
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
                        <option value="mint">Mint #</option>
                        <option value="rarity">Rarity</option>
                    </select>
                </div>
            )}

            <div className="grading-layout">
                <div className="collection-section">
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
                                    <button onClick={() => handleGrade(card._id)} data-testid={`grade-btn-${card._id}`}>Grade</button>
                                )}
                                {card.slabbed && <span>Grade: {card.grade}</span>}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="reveal-zone">
                    {gradingCard ? (
                        <div className="grading-area" data-testid="grading-area">
                            <h3>Graded Card</h3>
                            <div
                                className={`card-wrapper ${revealGrade ? 'face-up' : 'face-down'}`}
                                onClick={() => setRevealGrade(r => !r)}
                                style={{ '--rarity-color': 'white' }}
                                data-testid="graded-card-wrapper"
                            >
                                <div className="card-content">
                                    <div className="card-inner">
                                        <div className="card-back">
                                            <img src="/images/card-back-placeholder.png" alt="Card Back" />
                                        </div>
                                        <div className="card-front">
                                            <BaseCard
                                                name={gradingCard.name}
                                                image={gradingCard.imageUrl}
                                                description={gradingCard.flavorText}
                                                rarity={gradingCard.rarity}
                                                mintNumber={gradingCard.mintNumber}
                                                modifier={gradingCard.modifier}
                                                grade={gradingCard.grade}
                                                slabbed={gradingCard.slabbed}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grading-area" data-testid="grading-area">
                            <p>Select a card to grade</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminGradingPage;
