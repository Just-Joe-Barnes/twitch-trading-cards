import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/api';
import '../styles/AdminDashboardPage.css';

const AdminPacksPage = () => {
  const [packs, setPacks] = useState([]);
  const [form, setForm] = useState({
    packId: '',
    type: '',
    series: '',
    availableFrom: '',
    availableTo: '',
    cardPool: '',
  });

  const fetchPacks = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/packs');
      setPacks(res.packs || []);
    } catch (error) {
      console.error('Error fetching packs:', error);
    }
  };

  useEffect(() => {
    fetchPacks();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        cardPool: form.cardPool.split(',').map(s => s.trim()).filter(Boolean),
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
        <textarea name="cardPool" placeholder="Card IDs (comma separated)" value={form.cardPool} onChange={handleChange} />
        <button onClick={handleSave}>Save Pack</button>
      </div>

      <div className="section">
        <h2>Existing Packs</h2>
        <ul>
          {packs.map((pack) => (
            <li key={pack._id}>
              <strong>{pack.type}</strong> - {pack.series} - {pack._id}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminPacksPage;
