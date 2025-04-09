import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/api';
import '../styles/AdminDashboardPage.css';

const AdminPacksPage = () => {
  const [packs, setPacks] = useState([]);
  const [groupedCards, setGroupedCards] = useState({});
  const [selectedCards, setSelectedCards] = useState({});
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
      setGroupedCards(res.groupedCards || {});
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

  const handleCardToggle = (rarity, cardId) => {
    setSelectedCards((prev) => {
      const current = prev[rarity] || [];
      if (current.includes(cardId)) {
        return { ...prev, [rarity]: current.filter((id) => id !== cardId) };
      } else {
        return { ...prev, [rarity]: [...current, cardId] };
      }
    });
  };

  const handleSave = async () => {
    try {
      const cardPool = Object.values(selectedCards).flat();

      const payload = {
        ...form,
        cardPool,
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

    // Map flat cardPool array to rarity groups
    const newSelected = {};
    Object.entries(groupedCards).forEach(([rarity, cards]) => {
      newSelected[rarity] = cards
        .filter((card) => (pack.cardPool || []).includes(card._id))
        .map((card) => card._id);
    });
    setSelectedCards(newSelected);
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

        <h3>Select Cards by Rarity</h3>
        {Object.keys(groupedCards).length === 0 && <p>Loading cards...</p>}
        {Object.entries(groupedCards).map(([rarity, cards]) => (
          <div key={rarity} className="rarity-group">
            <h4>{rarity}</h4>
            <div className="card-list">
              {cards.map((card) => (
                <label key={card._id} style={{ display: 'inline-block', margin: '5px' }}>
                  <input
                    type="checkbox"
                    checked={(selectedCards[rarity] || []).includes(card._id)}
                    onChange={() => handleCardToggle(rarity, card._id)}
                  />
                  <img src={card.imageUrl} alt={card.name} style={{ width: '60px', height: '80px', display: 'block' }} />
                  <span>{card.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

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
