// src/pages/AdminCataloguePage.js
import React, { useState, useEffect } from 'react';
import { fetchCards, fetchWithAuth } from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner'; // Import spinner component
import '../styles/CataloguePage.css';
import { useNavigate } from 'react-router-dom';

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

const AdminCataloguePage = ({ user }) => {
    const navigate = useNavigate();
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Search, rarity, and sorting states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRarity, setSelectedRarity] = useState('Basic');
    const [sortOption, setSortOption] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');

    // Modifier state
    const [selectedModifier, setSelectedModifier] = useState('');
    const [modifiers, setModifiers] = useState([]);

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

    const fetchModifiers = async () => {
        try {
            const data = await fetchWithAuth('/api/modifiers', { method: 'GET' });
            setModifiers(data);
        } catch (error) {
            console.error('Error fetching modifiers:', error.message);
            setError('Failed to load modifiers.');
        }
    };

    useEffect(() => {
        if (!user?.isAdmin) {
            console.warn('Access denied: Admins only.');
            navigate('/login');
            return;
        }
        Promise.all([fetchCatalogue(), fetchModifiers()]).then(() => setLoading(false));
    }, [user, navigate]);

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleRarityChange = (rarityName) => {
        setSelectedRarity(rarityName);
    };

    const handleSortChange = (e) => {
        setSortOption(e.target.value);
    };

    const handleSortOrderChange = (e) => {
        setSortOrder(e.target.value);
    };

    const handleModifierChange = (modifierId) => {
        setSelectedModifier(modifierId);
    };

    // Filter then sort
    const filteredCards = cards.filter((card) =>
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

    return (
        <div className="catalogue-page">
            <h1>Admin Card Catalogue</h1>
            <p className="catalogue-description">
                Explore our complete collection of trading cards. Use the search box to
                find cards by name, and click on the rarity buttons below to preview each
                card in a different style.
            </p>
            <RainbowHoloSquare />

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
                                    padding: '8px 12px', // smaller buttons
                                    border: '2px solid #888', // gray border
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

                {/* Modifier Selector */}
                <div className="modifier-selector">
                    <label htmlFor="modifier">Modifier:</label>
                    <select id="modifier" value={selectedModifier} onChange={(e) => handleModifierChange(e.target.value)}>
                        <option value="">None</option>
                        {modifiers.map(modifier => (
                            <option key={modifier._id} value={modifier._id}>{modifier.name}</option>
                        ))}
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
                                rarity={selectedRarity}
                                mintNumber={card.mintNumber}
                                modifier={selectedModifier}
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

export default AdminCataloguePage;
