import React, { useState, useEffect } from 'react';
import { fetchCards } from '../utils/api';
import BaseCard from '../components/BaseCard';
import '../styles/CataloguePage.css';

const CataloguePage = () => {
    // Local state for cards, loading status, and error messages
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter and sort states
    const [searchQuery, setSearchQuery] = useState('');
    // Rarity options (do not include "All" because we use the rarity button
    // solely to re-style the cards)
    const rarities = ['Basic', 'Common', 'Standard', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Unique', 'Divine'];
    const [selectedRarity, setSelectedRarity] = useState('Basic');
    const [sortOption, setSortOption] = useState('name');

    // Fetch all cards from the API
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

    // Update search query state as the user types
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    // Update the selected rarity filter (which affects the styling of every card)
    const handleRarityChange = (rarity) => {
        setSelectedRarity(rarity);
    };

    // Update the sort option (by name or rarity)
    const handleSortChange = (e) => {
        setSortOption(e.target.value);
    };

    // Filter cards by search query only; we show all cards so that the selected rarity
    // re-styles each card rather than filtering some out.
    const filteredCards = cards.filter((card) =>
        card.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort the filtered cards based on the chosen sort option
    const sortedCards = [...filteredCards].sort((a, b) => {
        if (sortOption === 'name') {
            return a.name.localeCompare(b.name);
        } else if (sortOption === 'rarity') {
            // Define a custom order for rarities
            const order = ['Basic', 'Common', 'Standard', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Unique', 'Divine'];
            const rarityA =
                a.rarities && a.rarities[0] ? a.rarities[0].rarity : '';
            const rarityB =
                b.rarities && b.rarities[0] ? b.rarities[0].rarity : '';
            return order.indexOf(rarityA) - order.indexOf(rarityB);
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
                {/* Rarity Selector (displayed on its own row below the search box) */}
                <div className="rarity-selector">
                    {rarities.map((rarity) => (
                        <button
                            key={rarity}
                            className={`rarity-button ${selectedRarity === rarity ? 'active' : ''}`}
                            onClick={() => handleRarityChange(rarity)}
                        >
                            {rarity}
                        </button>
                    ))}
                </div>
                {/* Sort Dropdown */}
                <div className="sort-box">
                    <label htmlFor="sort">Sort by:</label>
                    <select id="sort" value={sortOption} onChange={handleSortChange}>
                        <option value="name">Name</option>
                        <option value="rarity">Rarity</option>
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
                                // Pass the selected rarity so that the BaseCard styling updates accordingly
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
