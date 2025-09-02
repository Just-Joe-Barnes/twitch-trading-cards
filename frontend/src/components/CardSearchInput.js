import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';
import '../styles/AdminDashboardPage.css';
import BaseCard from "./BaseCard";

const CardSearchInput = ({ onCardSelect, initialCardId = null, displayRarity= 'Basic' }) => {
    const [allCards, setAllCards] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);

    // On component mount, fetch all card definitions
    useEffect(() => {
        const fetchAllCards = async () => {
            try {
                const res = await fetchWithAuth('/api/admin/cards');
                const all = [];
                // Flatten the grouped card structure into a single array
                Object.values(res.groupedCards || {}).forEach(cards => all.push(...cards));
                // Create a unique list of cards based on name
                const uniqueCards = Array.from(new Map(all.map(card => [card.name, card])).values());
                setAllCards(uniqueCards);

                // If an initial card ID is provided (for editing an event), find and set it
                if (initialCardId) {
                    const initialCard = uniqueCards.find(c => c._id === initialCardId);
                    if (initialCard) {
                        setSelectedCard(initialCard);
                        // We don't need to call onCardSelect here, as the parent form already has the ID
                    }
                }
            } catch (error) {
                console.error('Error fetching cards for search:', error);
            }
        };
        fetchAllCards();
    }, [initialCardId]);

    const handleSearchChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (!term) {
            setSuggestions([]);
            return;
        }
        const lower = term.toLowerCase();
        const filtered = allCards.filter(c => c.name.toLowerCase().includes(lower));
        setSuggestions(filtered.slice(0, 10)); // Limit to 10 suggestions
    };

    const handleSelectSuggestion = (card) => {
        setSearchTerm('');
        setSuggestions([]);
        setSelectedCard(card);
        onCardSelect(card); // Pass the selected card object to the parent component
    };

    const clearSelection = () => {
        setSelectedCard(null);
        setSearchTerm('');
        onCardSelect(null); // Inform parent that the selection is cleared
    };

    if (selectedCard) {
        return (
            <div className="selected-card-display">
                <div className="card-tile">
                    <div style={{height: '200px'}}>
                        <BaseCard
                            name={selectedCard.name}
                            description={selectedCard.description}
                            image={selectedCard.imageUrl}
                            rarity={displayRarity}
                            miniCard={true}
                        />
                    </div>
                    <div className="actions">
                        <button type="button" className="secondary-button sm" onClick={clearSelection} style={{ marginLeft: '1rem' }}>
                            Change
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="search-container">
            <input
                type="search"
                placeholder="Search for a card by name..."
                value={searchTerm}
                onChange={handleSearchChange}
                required
            />
            {suggestions.length > 0 && (
                <ul className="suggestions-list">
                    {suggestions.map(card => (
                        <li key={card._id} onClick={() => handleSelectSuggestion(card)}>
                            <img src={card.imageUrl} alt={card.name} />
                            {card.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default CardSearchInput;
