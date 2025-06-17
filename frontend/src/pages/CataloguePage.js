// src/pages/CataloguePage.js
import React, { useState, useEffect } from 'react';
import { fetchCards } from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { modifiers } from '../constants/modifiers';
import '../styles/CataloguePage.css';

const rarityData = [
    { name: 'Basic', color: '#8D8D8D' },
    { name: 'Common', color: '#64B5F6' },
    { name: 'Standard', color: '#66BB6A' },
    { name: 'Uncommon', color: '#1976D2' },
    { name: 'Rare', color: '#AB47BC' },
    { name: 'Epic', color: '#FFA726' },
    { name: 'Legendary', color: '#e32232' },
    { name: 'Mythic', color: 'hotpink' },
    { name: 'Unique', color: 'black' },
    { name: 'Divine', color: 'white' },
];

const API_AVAILABILITY_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://neds-decks.onrender.com/api/cards/availability'
    : 'http://localhost:5000/api/cards/availability';

const CataloguePage = () => {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [availability, setAvailability] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRarity, setSelectedRarity] = useState('Basic');
    const [selectedModifier, setSelectedModifier] = useState('None');
    const [sortOption, setSortOption] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchCatalogue = async () => {
        try {
            const response = await fetchCards({});
            setCards(response.cards);
        } catch (err) {
            console.error('Error fetching cards:', err.message);
            setError('Failed to load cards.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailability = async () => {
        try {
            const response = await fetch(API_AVAILABILITY_URL);
            const data = await response.json();
            setAvailability(data.availability);
        } catch (err) {
            console.error('Error fetching card availability:', err);
        }
    };

    useEffect(() => {
        fetchCatalogue();
        fetchAvailability();
    }, []);

    const handleSearchChange = (e) => setSearchQuery(e.target.value);
    const handleRarityChange = (rarityName) => setSelectedRarity(rarityName);
    const handleModifierChange = (name) => setSelectedModifier(name);
    const handleSortChange = (e) => setSortOption(e.target.value);
    const handleSortOrderChange = (e) => setSortOrder(e.target.value);

    const getRemaining = (cardName, rarity) => {
        const found = availability.find(
            (item) => item.name === cardName && item.rarity === rarity
        );
        return found ? found.remaining : null;
    };

    const limitedCards = cards.filter(card =>
        card.availableFrom || card.availableTo
    );
    const alwaysAvailableCards = cards.filter(card =>
        !card.availableFrom && !card.availableTo
    );
    const activeLimitedCards = limitedCards.filter(card => {
        const from = card.availableFrom ? new Date(card.availableFrom) : null;
        const to = card.availableTo ? new Date(card.availableTo) : null;
        return (!from || from <= now) && (!to || to >= now);
    });
    const filteredCards = alwaysAvailableCards.filter((card) =>
        card.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const sortedCards = [...filteredCards].sort((a, b) => {
        if (sortOption === 'name') {
            return sortOrder === 'asc'
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name);
        }
        return 0;
    });

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="cata-page">{error}</div>;

    const RemainingBadge = ({ remaining }) =>
        remaining !== null && remaining !== undefined ? (
            <div className="cata-overlay-badge cata-remaining-badge">
                {remaining} remaining
            </div>
        ) : null;

    return (
        <div className="cata-page">
            <h1>Card Catalogue</h1>
            <p className="cata-description">
                Explore our complete collection of trading cards. Use the search box to
                find cards by name, and click on the rarity buttons below to preview each
                card in a different style.
            </p>

            <div className="cata-rarity-selector">
                {rarityData.map((r) => {
                    const textColor = r.name === 'Divine' ? '#000' : '#fff';
                    return (
                        <button
                            key={r.name}
                            onClick={() => handleRarityChange(r.name)}
                            className={`cata-rarity-button ${selectedRarity === r.name ? 'active' : ''}`}
                            style={{
                                backgroundColor: r.color,
                                color: textColor,
                                padding: '8px 12px',
                                border: '2px solid #888',
                            }}
                        >
                            {r.name}
                        </button>
                    );
                })}
            </div>

            <div className="cata-modifier-selector">
                {modifiers.map((m) => {
                    const textColor = m.text || '#fff';
                    return (
                        <button
                            key={m.name}
                            onClick={() => handleModifierChange(m.name)}
                            className={`cata-modifier-button ${selectedModifier === m.name ? 'active' : ''}`}
                            style={{
                                backgroundColor: m.color,
                                color: textColor,
                                padding: '8px 12px',
                                border: '2px solid #888',
                            }}
                        >
                            {m.name}
                        </button>
                    );
                })}
            </div>

            <div className="cata-filters-container">
                <div className="cata-search-box">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search cards..."
                    />
                </div>
                <div className="cata-sort-box">
                    <label htmlFor="sortField">Sort by:</label>
                    <select id="sortField" value={sortOption} onChange={handleSortChange}>
                        <option value="name">Name</option>
                    </select>
                    <select id="sortOrder" value={sortOrder} onChange={handleSortOrderChange}>
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                    </select>
                </div>
            </div>

            {/* Limited Time Cards */}
            <h2>Limited Time Cards</h2>
            <div className="cata-grid">
                {activeLimitedCards.length > 0 ? (
                    activeLimitedCards.map((card) => {
                        const to = card.availableTo ? new Date(card.availableTo) : null;
                        const timeLeft = to ? to - now : null;
                        const seconds = timeLeft ? Math.floor(timeLeft / 1000) % 60 : null;
                        const minutes = timeLeft ? Math.floor(timeLeft / (1000 * 60)) % 60 : null;
                        const hours = timeLeft ? Math.floor(timeLeft / (1000 * 60 * 60)) % 24 : null;
                        const days = timeLeft ? Math.floor(timeLeft / (1000 * 60 * 60 * 24)) : null;
                        const remaining = getRemaining(card.name, selectedRarity);

                        return (
                            <div key={card._id} className="cata-card">
                                <div className="cata-card-inner">
                                    <BaseCard
                                        name={card.name}
                                        image={card.imageUrl}
                                        description={card.flavorText}
                                        rarity={selectedRarity}
                                        mintNumber={card.mintNumber}
                                        modifier={selectedModifier === 'None' ? null : selectedModifier}
                                    />
                                    <RemainingBadge remaining={remaining} />
                                    {to && timeLeft > 0 && (
                                        <div className="cata-overlay-badge cata-timeleft-badge">
                                            Ends in: {days}d {hours}h {minutes}m {seconds}s
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div>No limited time cards currently available.</div>
                )}
            </div>

            {/* All Limited Cards */}
            <h2>All Limited Cards (Past, Present, Future)</h2>
            <div className="cata-grid">
                {limitedCards.length > 0 ? (
                    limitedCards.map((card) => {
                        const from = card.availableFrom ? new Date(card.availableFrom) : null;
                        const to = card.availableTo ? new Date(card.availableTo) : null;
                        const now = new Date();
                        let status = 'Always Available';
                        if (from && now < from) status = 'Upcoming';
                        else if (to && now > to) status = 'Expired';
                        else status = 'Active';
                        const remaining = getRemaining(card.name, selectedRarity);

                        return (
                            <div key={card._id} className="cata-card">
                                <div className="cata-card-inner">
                                    <BaseCard
                                        name={card.name}
                                        image={card.imageUrl}
                                        description={card.flavorText}
                                        rarity={selectedRarity}
                                        mintNumber={card.mintNumber}
                                        modifier={selectedModifier === 'None' ? null : selectedModifier}
                                    />
                                    <RemainingBadge remaining={remaining} />
                                    <div className="cata-overlay-badge cata-timeleft-badge">
                                        {status}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div>No limited cards found.</div>
                )}
            </div>

            {/* All Cards */}
            <h2>All Cards</h2>
            <div className="cata-grid">
                {sortedCards.length > 0 ? (
                    sortedCards.map((card) => {
                        const remaining = getRemaining(card.name, selectedRarity);

                        return (
                            <div key={card._id} className="cata-card">
                                <div className="cata-card-inner">
                                    <BaseCard
                                        name={card.name}
                                        image={card.imageUrl}
                                        description={card.flavorText}
                                        rarity={selectedRarity}
                                        mintNumber={card.mintNumber}
                                        modifier={selectedModifier === 'None' ? null : selectedModifier}
                                    />
                                    <RemainingBadge remaining={remaining} />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div>No cards found.</div>
                )}
            </div>
        </div>
    );
};

export default CataloguePage;
