import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/api';
import BaseCard from '../components/BaseCard';
import '../styles/AdminDashboardPage.css';

const AdminPacksPage = () => {
  const [packs, setPacks] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [form, setForm] = useState({
    packId: '',
    name: '',
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
    setSuggestions(filtered.slice(0, 10));
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
        packId: form.packId,
        name: form.name,
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
      name: pack.name || '',
    });
    setSelectedCardIds(pack.cardPool || []);
  };

  return (
    <div className="page">

      <div className="section-card">
        <h2>Create / Update Pack</h2>
        <input name="packId" placeholder="Leave blank to create a new pack" value={form.packId} onChange={handleChange} />
        <input name="name" placeholder="Pack Name" value={form.name} onChange={handleChange} />

        <button
          onClick={() => {
            setForm({ packId: '', name: '' });
            setSelectedCardIds([]);
          }}
        >
          New Pack
        </button>

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
              <div key={id} style={{ display: 'inline-block', margin: '5px' }}>
                <BaseCard
                  name={card.name}
                  image={card.imageUrl}
                  rarity={card.rarities?.[0]?.rarity}
                  description={card.flavorText}
                  modifier={card.modifier}
                />
                <button onClick={() => handleRemoveCard(id)}>Remove</button>
              </div>
            ) : null;
          })}
        </div>

        <button onClick={handleSave}>Save / Create Pack</button>
      </div>

      <div className="section-card">
        <h2>Existing Packs (Click to Edit)</h2>
        <ul>
{packs.map((pack) => (
            <li
              key={pack._id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--surface-dark)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '8px',
                cursor: 'pointer'
              }}
              onClick={() => handleLoadPack(pack)}
            >
              <div>
                <strong>{pack.name || 'Unnamed Pack'}</strong>
                <div style={{ fontSize: '0.8em', color: '#888' }}>{pack._id}</div>
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!window.confirm('Delete this pack?')) return;
                  try {
                    await fetchWithAuth(`/api/admin/packs/${pack._id}`, { method: 'DELETE' });
                    window.showToast('Pack deleted', 'success');
                    fetchPacks();
                  } catch (err) {
                    console.error('Error deleting pack:', err);
                    window.showToast('Error deleting pack', 'error');
                  }
                }}
                style={{
                  background: '#e32232',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.4rem 0.8rem',
                  cursor: 'pointer',
                  marginLeft: '1rem'
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminPacksPage;
