import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/api';
import '../styles/AdminDashboardPage.css';

const AdminPacksPage = () => {
  const [packs, setPacks] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [form, setForm] = useState({
    packId: '',
    type: '',
    series: '',
    availableFrom: '',
    availableTo: '',
  });

  const fetchPacks = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/packs');
      setPacks(res.packs || []);
    } catch (error) {
      console.error('Error fetching packs:', error);
    }
  };

  const fetchCards = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/cards');
      const all = [];
      Object.values(res.groupedCards || {}).forEach(cards => {
        all.push(...cards);
      });
      setAllCards(all);
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  useEffect(() => {
    fetchPacks();
    fetchCards();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (!term) {
      setSuggestions([]);
      return;
    }
    const lower = term.toLowerCase();
    const filtered = allCards.filter(c => c.name.toLowerCase().includes(lower) && !selectedCardIds.includes(c._id));
    setSuggestions(filtered.slice(0, 10)); // limit suggestions
  };

  const handleSelectCard = (card) => {
    setSelectedCardIds(prev => [...prev, card._id]);
    setSearchTerm('');
    setSuggestions([]);
  };

  const handleRemoveCard = (cardId) => {
    setSelectedCardIds(prev => prev.filter(id => id !== cardId));
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        cardPool: selectedCardIds,
      };

      const res = await fetchWithAuth('/api/admin/upsert-pack', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      window.showToast(res.message || 'Pack saved', 'success');
      fetchPacks();
    } catch (error) {
      console.error('Error saving pack:', error);
      window.showToast('Error saving pack', 'error');
    }
  };

  const handleLoadPack = (pack) => {
    setForm({
      packId: pack._id,
      type: pack.type || '',
      series: pack.series || '',
      availableFrom: pack.availableFrom ? new Date(pack.availableFrom).toISOString().slice(0, 16) : '',
      availableTo: pack.availableTo ? new Date(pack.availableTo).toISOString().slice(0, 16) : '',
    });
    setSelectedCardIds(pack.cardPool || []);
  };

  return (
    <div className="dashboard-container">
      <h1>Admin Pack Management</h1>

      <div className="section">
        <h2>Create / Update Pack Type</h2>
        <input name="packId" placeholder="Pack ID (leave blank to create new)" value={form.packId} onChange={handleChange} />
        <input name="type" placeholder="Type (e.g., Base, Event, Premium)" value={form.type} onChange={handleChange} />
        <input name="series" placeholder="Series (e.g., Series 1)" value={form.series} onChange={handleChange} />
        <input name="availableFrom" placeholder="Available From (ISO date)" value={form.availableFrom} onChange={handleChange} />
        <input name="availableTo" placeholder="Available To (ISO date)" value={form.availableTo} onChange={handleChange} />

        <h3>Add Cards by Name</h3>
        <input
          type="text"
          placeholder="Search cards..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        {suggestions.length > 0 && (
          <ul className="suggestions-list">
            {suggestions.map(card => (
              <li key={card._id} onClick={() => handleSelectCard(card)} style={{ cursor: 'pointer' }}>
                <img src={card.imageUrl} alt={card.name} style={{ width: '40px', verticalAlign: 'middle' }} /> {card.name}
              </li>
            ))}
          </ul>
        )}

        <div className="selected-cards">
          {selectedCardIds.map(id => {
            const card = allCards.find(c => c._id === id);
            return card ? (
              <div key={id} style={{ display: 'inline-block', margin: '5px', border: '1px solid #ccc', padding: '5px' }}>
                <img src={card.imageUrl} alt={card.name} style={{ width: '60px', height: '80px', display: 'block' }} />
                <span>{card.name}</span>
                <button onClick={() => handleRemoveCard(id)}>Remove</button>
              </div>
            ) : null;
          })}
        </div>

        <button onClick={handleSave}>Save Pack</button>
      </div>

      <div className="section">
        <h2>Existing Packs (Click to Edit)</h2>
        <ul>
          {packs.map((pack) => (
            <li key={pack._id} style={{ cursor: 'pointer' }} onClick={() => handleLoadPack(pack)}>
              <strong>{pack.type}</strong> - {pack.series} - {pack._id}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminPacksPage;
