import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';
import '../styles/AdminDashboardPage.css';
import BaseCard from "./BaseCard";

const CardSearchInput = ({ onCardSelect, initialCardId = null, displayRarity = 'Basic' }) => {
    const [allCards, setAllCards] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);


    useEffect(() => {
        const fetchAllCards = async () => {
            try {
                const res = await fetchWithAuth('/api/admin/cards');
                const all = [];
                Object.values(res.groupedCards || {}).forEach(cards => all.push(...cards));
                const uniqueCards = Array.from(new Map(all.map(card => [card.name, card])).values());
                setAllCards(uniqueCards);
            } catch (error) {
                console.error('Error fetching cards for search:', error);
            }
        };
        fetchAllCards();
    }, []);

    useEffect(() => {
        if (initialCardId && allCards.length > 0) {
            const initialCard = allCards.find(c => c._id === initialCardId);
            if (initialCard) {
                setSelectedCard(initialCard);
            }
        } else {
            setSelectedCard(null);
        }
    }, [initialCardId, allCards]);

    const handleSearchChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (!term) {
            setSuggestions([]);
            return;
        }
        const lower = term.toLowerCase();
        const filtered = allCards.filter(c => c.name.toLowerCase().includes(lower));
        setSuggestions(filtered.slice(0, 10));
    };

    const handleSelectSuggestion = (card) => {
        setSearchTerm('');
        setSuggestions([]);
        onCardSelect(card);
    };

    const clearSelection = () => {
        onCardSelect(null);
    };

    if (selectedCard) {
        return (
            <div className="selected-card-display">
                <div className="card-tile">
                        <BaseCard
                            name={selectedCard.name}
                            description={selectedCard.description}
                            image={selectedCard.imageUrl}
                            rarity={displayRarity}
                        />
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
