// src/pages/CataloguePage.js
import React, { useState, useEffect } from 'react';
import { fetchCards } from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner';
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

const API_AVAILABILITY_URL = '/api/cards/availability';

const CataloguePage = () => {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Availability state
    const [availability, setAvailability] = useState([]);

    // Search, rarity, and sorting states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRarity, setSelectedRarity] = useState('Basic');
    const [sortOption, setSortOption] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [now, setNow] = useState(new Date());

    // Fetch all cards
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

    // Fetch availability data from backend
    const fetchAvailability = async () => {
        try {
            const response = await fetch(API_AVAILABILITY_URL);
            const data = await response.json();
            setAvailability(data.availability);
        } catch (err) {
            console.error('Error fetching card availability:', err);
        }
    };

    // Timer for limited cards countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Fetch cards & availability on load
    useEffect(() => {
        fetchCatalogue();
        fetchAvailability();
    }, []);

    const handleSearchChange = (e) => setSearchQuery(e.target.value);
    const handleRarityChange = (rarityName) => setSelectedRarity(rarityName);
    const handleSortChange = (e) => setSortOption(e.target.value);
    const handleSortOrderChange = (e) => setSortOrder(e.target.value);

    // Get remaining count for a card by name and rarity
    const getRemaining = (cardName, rarity) => {
        const found = availability.find(
            (item) => item.name === cardName && item.rarity === rarity
        );
        return found ? found.remaining : null;
    };

    // (Your card filtering logic unchanged)
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
    if (error) return <div className="catalogue-page">{error}</div>;

    // Display a badge or small box with the remaining count
    const RemainingBadge = ({ remaining }) =>
        remaining !== null && remaining !== undefined ? (
            <div className="remaining-badge">
                {remaining} remaining
            </div>
        ) : null;

    return (
        <div className="catalogue-page">
            <h1>Card Catalogue</h1>
            <p className="catalogue-description">
                Explore our complete collection of trading cards. Use the search box to
                find cards by name, and click on the rarity buttons below to preview each
                card in a different style.
            </p>

            <div className="filters-container">
                {/* Search Box */}
                <div className="search-box">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search cards..."
                    />
                </div>

                {/* Rarity Selector */}
                <div className="rarity-selector">
                    {rarityData.map((r) => {
                        // If "Divine" is white, set text color to black for contrast.
                        const textColor = r.name === 'Divine' ? '#000' : '#fff';

                        return (
                            <button
                                key={r.name}
                                onClick={() => handleRarityChange(r.name)}
                                className={`rarity-button ${selectedRarity === r.name ? 'active' : ''}`}
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

                {/* Sort Section */}
                <div className="sort-box">
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
            <div className="catalogue-grid">
                {activeLimitedCards.length > 0 ? (
                    activeLimitedCards.map((card) => {
                        const to = card.availableTo ? new Date(card.availableTo) : null;
                        const timeLeft = to ? to - now : null;
                        const seconds = timeLeft ? Math.floor(timeLeft / 1000) % 60 : null;
                        const minutes = timeLeft ? Math.floor(timeLeft / (1000 * 60)) % 60 : null;
                        const hours = timeLeft ? Math.floor(timeLeft / (1000 * 60 * 60)) % 24 : null;
                        const days = timeLeft ? Math.floor(timeLeft / (1000 * 60 * 60 * 24)) : null;
                        // Remaining copies for current rarity
                        const remaining = getRemaining(card.name, selectedRarity);

                        return (
                            <div key={card._id} className="catalogue-card" style={{ position: 'relative' }}>
                                <div style={{ position: 'relative' }}>
                                    <BaseCard
                                        name={card.name}
                                        image={card.imageUrl}
                                        description={card.flavorText}
                                        rarity={selectedRarity}
                                        mintNumber={card.mintNumber}
                                    />
                                    <RemainingBadge remaining={remaining} />
                                    {to && timeLeft > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '5px',
                                            left: '5px',
                                            backgroundColor: 'rgba(0,0,0,0.7)',
                                            color: '#fff',
                                            padding: '4px 6px',
                                            borderRadius: '6px',
                                            fontSize: '0.8rem'
                                        }}>
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
            <div className="catalogue-grid">
                {limitedCards.length > 0 ? (
                    limitedCards.map((card) => {
                        const from = card.availableFrom ? new Date(card.availableFrom) : null;
                        const to = card.availableTo ? new Date(card.availableTo) : null;
                        const now = new Date();
                        let status = 'Always Available';
                        if (from && now < from) status = 'Upcoming';
                        else if (to && now > to) status = 'Expired';
                        else status = 'Active';
                        // Remaining copies for current rarity
                        const remaining = getRemaining(card.name, selectedRarity);

                        return (
                            <div key={card._id} className="catalogue-card" style={{ position: 'relative' }}>
                                <div style={{ position: 'relative' }}>
                                    <BaseCard
                                        name={card.name}
                                        image={card.imageUrl}
                                        description={card.flavorText}
                                        rarity={selectedRarity}
                                        mintNumber={card.mintNumber}
                                    />
                                    <RemainingBadge remaining={remaining} />
                                    <div style={{
                                        position: 'absolute',
                                        top: '5px',
                                        left: '5px',
                                        backgroundColor: 'rgba(0,0,0,0.7)',
                                        color: '#fff',
                                        padding: '4px 6px',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem'
                                    }}>
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
            <div className="catalogue-grid">
                {sortedCards.length > 0 ? (
                    sortedCards.map((card) => {
                        // Remaining copies for current rarity
                        const remaining = getRemaining(card.name, selectedRarity);

                        return (
                            <div key={card._id} className="catalogue-card">
                                <BaseCard
                                    name={card.name}
                                    image={card.imageUrl}
                                    description={card.flavorText}
                                    rarity={selectedRarity}
                                    mintNumber={card.mintNumber}
                                />
                                <RemainingBadge remaining={remaining} />
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
