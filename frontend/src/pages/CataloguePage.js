import React, { useState, useEffect } from 'react';
import BaseCard from '../components/BaseCard';
import '../styles/CataloguePage.css';

const CataloguePage = () => {
  const [allCards, setAllCards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedRarity, setSelectedRarity] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // Fetch all catalogue cards (replace with your real API endpoint if needed)
  useEffect(() => {
    async function fetchCards() {
      try {
        const res = await fetch('/api/catalogue');
        const data = await res.json();
        setAllCards(data);
        setFilteredCards(data);
      } catch (err) {
        setAllCards([]);
        setFilteredCards([]);
      }
    }
    fetchCards();
  }, []);

  // Filter and sort logic
  useEffect(() => {
    let results = [...allCards];
    if (search) {
      results = results.filter(card =>
        card.name.toLowerCase().includes(search.toLowerCase()) ||
        card.description?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (selectedRarity) {
      results = results.filter(card => card.rarity === selectedRarity);
    }
    switch (sortBy) {
      case 'name':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'rarity':
        results.sort((a, b) => (a.rarity || '').localeCompare(b.rarity || ''));
        break;
      // Add more sorting as needed
      default:
        break;
    }
    setFilteredCards(results);
  }, [search, selectedRarity, sortBy, allCards]);

  // Card props mapping: adapt as needed for your BaseCard
  const getCardProps = (card) => ({
    name: card.name,
    description: card.description,
    image: card.image,
    rarity: card.rarity,
    mint: card.mint,
    // ...add any other BaseCard props your app needs
  });

  // Rarity values (adjust if you use different ones)
  const rarityOptions = ['Common', 'Rare', 'Epic', 'Legendary'];

  return (
    <div className="catalogue-page">
      <h1>Card Catalogue</h1>
      <div className="catalogue-description">
        Browse all available cards in the game. Filter by rarity, search by name, or just enjoy the art.
      </div>
      <div className="filters-container">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search cards..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="rarity-selector">
          <button
            className={`rarity-button${selectedRarity === '' ? ' active' : ''}`}
            onClick={() => setSelectedRarity('')}
          >
            All
          </button>
          {rarityOptions.map(rarity => (
            <button
              key={rarity}
              className={`rarity-button${selectedRarity === rarity ? ' active' : ''}`}
              onClick={() => setSelectedRarity(rarity)}
            >
              {rarity}
            </button>
          ))}
        </div>
        <div className="sort-box">
          <label htmlFor="sortBy">Sort by:</label>
          <select
            id="sortBy"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="name">Name</option>
            <option value="rarity">Rarity</option>
            {/* Add more options as needed */}
          </select>
        </div>
      </div>
      <div className="catalogue-grid">
        {filteredCards.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#bbb', marginTop: '40px' }}>
            No cards found.
          </div>
        ) : (
          filteredCards.map(card => (
            <div
              className="catalogue-card"
              key={card._id || card.name}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                transform: 'scale(0.5)',
                transformOrigin: 'top center',
                margin: 0,
                padding: 0,
              }}
            >
              <BaseCard {...getCardProps(card)} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CataloguePage;
