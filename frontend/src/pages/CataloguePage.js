// src/pages/CataloguePage.js
import React, { useState, useEffect } from 'react';
import { fetchCards } from '../utils/api';
import BaseCard from '../components/BaseCard';
import '../styles/CataloguePage.css';

// Same rarities as in CollectionPage, but with color codes
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
    // Local state for cards, loading, error
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter and sort states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRarity, setSelectedRarity] = useState('Basic');

    // For sorting: user picks the "sort by" field (we only have 'name' left, but let's keep the structure),
    // plus ascending or descending.
    const [sortOption, setSortOption] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');

    // 1) Fetch all cards from API
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

    // 2) Update search query
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

    // 5) Update ascending or descending
    const handleSortOrderChange = (e) => {
        setSortOrder(e.target.value);
    };

    // 6) Filter cards by search query only
    const filteredCards = cards.filter((card) =>
        card.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 7) Sort the filtered cards
    const sortedCards = [...filteredCards].sort((a, b) => {
        // Currently we only have "name" as a field, 
        // but let's keep the structure so you could add more fields later.
        if (sortOption === 'name') {
            return sortOrder === 'asc'
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name);
        }
        return 0;
    });

    if (loading) return <div className="catalogue-page">Loading cards...</div>;
    if (error) return <div className="catalogue-page">{error}</div>;

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
                        // If "Divine" is white, text should be black for contrast
                        const textColor = r.name === 'Divine' ? '#000' : '#fff';

                        return (
                            <button
                                key={r.name}
                                onClick={() => handleRarityChange(r.name)}
                                className={`rarity-button ${selectedRarity === r.name ? 'active' : ''}`}
                                style={{
                                    backgroundColor: r.color,
                                    color: textColor,
                                    border: '2px solid #fff' // add a little border
                                }}
                            >
                                {r.name}
                            </button>
                        );
                    })}
                </div>

                {/* Sort Section: choose field & order */}
                <div className="sort-box">
                    <label htmlFor="sortField">Sort by:</label>
                    <select id="sortField" value={sortOption} onChange={handleSortChange}>
                        <option value="name">Name</option>
                        {/* If you add more fields in the future, they can go here */}
                    </select>

                    <select id="sortOrder" value={sortOrder} onChange={handleSortOrderChange}>
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                    </select>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="catalogue-grid">
                {sortedCards.length > 0 ? (
                    sortedCards.map((card) => (
                        <div key={card._id} className="catalogue-card">
                            <BaseCard
                                name={card.name}
                                image={card.imageUrl}
                                description={card.flavorText}
                                // We pass the "selectedRarity" so the card uses that styling
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
