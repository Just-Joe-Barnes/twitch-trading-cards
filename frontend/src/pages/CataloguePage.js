// src/pages/CataloguePage.js
import React, { useState, useEffect } from 'react';
import { fetchCards } from '../utils/api';
import BaseCard from '../components/BaseCard';
import '../styles/CataloguePage.css';

// Same rarities as in CollectionPage, but now with color codes
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

const CataloguePage = () => {
    // Local state for cards, loading status, and errors
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter and sort states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRarity, setSelectedRarity] = useState('Basic');
    // Only "name" remains as a valid sort option
    const [sortOption, setSortOption] = useState('name');

    // 1) Fetch all cards from the API
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

    useEffect(() => {
        fetchCatalogue();
    }, []);

    // 2) Update search query as user types
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    // 3) Update selected rarity (for styling, not filtering)
    const handleRarityChange = (rarityName) => {
        setSelectedRarity(rarityName);
    };

    // 4) Update the sort option
    const handleSortChange = (e) => {
        setSortOption(e.target.value);
    };

    // 5) Filter cards by search query only
    const filteredCards = cards.filter((card) =>
        card.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 6) Sort the filtered cards based on the chosen option
    const sortedCards = [...filteredCards].sort((a, b) => {
        if (sortOption === 'name') {
            return a.name.localeCompare(b.name);
        }
        return 0;
    });

    if (loading) return <div className="catalogue-page">Loading cards...</div>;
    if (error) return <div className="catalogue-page">{error}</div>;

    return (
        <div className="catalogue-page">
            <h1>Card Catalogue</h1>
            <p className="catalogue-description">
                Explore our complete collection of trading cards. Use the search box to find cards by name, and click on the rarity buttons below to preview each card in a different style.
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
                    {rarityData.map((r) => (
                        <button
                            key={r.name}
                            // The button color matches the rarity color
                            style={{ backgroundColor: r.color }}
                            className={`rarity-button ${selectedRarity === r.name ? 'active' : ''}`}
                            onClick={() => handleRarityChange(r.name)}
                        >
                            {r.name}
                        </button>
                    ))}
                </div>

                {/* Sort Dropdown (no "Rarity" option) */}
                <div className="sort-box">
                    <label htmlFor="sort">Sort by:</label>
                    <select id="sort" value={sortOption} onChange={handleSortChange}>
                        <option value="name">Name</option>
                        {/* Removed <option value="rarity">Rarity</option> */}
                    </select>
                </div>
            </div>

            <div className="catalogue-grid">
                {sortedCards.length > 0 ? (
                    sortedCards.map((card) => (
                        <div key={card._id} className="catalogue-card">
                            <BaseCard
                                name={card.name}
                                image={card.imageUrl}
                                description={card.flavorText}
                                // We pass the "selectedRarity" so that the card uses that styling
                                rarity={selectedRarity}
                                mintNumber={card.mintNumber}
                            />
                        </div>
                    ))
                ) : (
                    <div>No cards found.</div>
                )}
            </div>
        </div>
    );
};

export default CataloguePage;
