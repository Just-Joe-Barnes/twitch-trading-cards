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

    const defaultFormState = {
        packId: '',
        name: '',
        animationUrl: '/animations/packopening.mp4',
    };

    const [form, setForm] = useState(defaultFormState);

    const isEditing = !!form.packId;

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

    const handleClearForm = () => {
        setForm(defaultFormState);
        setSelectedCardIds([]);
        setSearchTerm('');
        setSuggestions([]);
    };

    const handleSave = async () => {
        const isCreatingNew = !form.packId;
        try {
            const payload = {
                packId: form.packId,
                name: form.name,
                animationUrl: form.animationUrl,
                cardPool: selectedCardIds,
            };

            const res = await fetchWithAuth('/api/admin/upsert-pack', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            window.showToast(res.message || 'Pack saved', 'success');
            fetchPacks();

            if (isCreatingNew && res.pack) {
                setForm({
                    packId: res.pack._id,
                    name: res.pack.name,
                    animationUrl: res.pack.animationUrl || defaultFormState.animationUrl,
                });
            }

        } catch (error) {
            console.error('Error saving pack:', error);
            window.showToast('Error saving pack', 'error');
        }
    };

    const handleLoadPack = (pack) => {
        setForm({
            packId: pack._id,
            name: pack.name || '',
            animationUrl: pack.animationUrl || '/animations/packopening.mp4',
        });
        setSelectedCardIds(pack.cardPool || []);
    };

    return (
        <div className="page">
            <style>
                {`
                .admin-packs-layout {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }

                .pack-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    max-height: 70vh;
                    overflow-y: auto;
                }

                .pack-list-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: var(--surface-dark);
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                    margin-bottom: 8px;
                    cursor: pointer;
                    border: 2px solid transparent;
                    transition: border-color 0.2s ease, background-color 0.2s ease;
                }

                .pack-list-item:hover {
                    background: var(--surface-light);
                }

                .pack-list-item.selected {
                    border-color: var(--primary-color);
                    background: var(--surface-light);
                }

                .pack-list-item-details strong {
                    font-size: 1.1rem;
                }

                .pack-list-item-details .pack-id,
                .pack-list-item-details .pack-video {
                    font-size: 0.8em;
                    color: #888;
                }

                .pack-list-item-details .pack-video {
                     color: #aaa;
                     margin-top: 4px;
                }

                .delete-button {
                    background: #e32232;
                    color: #fff;
                    border: none;
                    border-radius: 6px;
                    padding: 0.4rem 0.8rem;
                    cursor: pointer;
                    margin-left: 1rem;
                }

                @media (max-width: 900px) {
                    .admin-packs-layout {
                        grid-template-columns: 1fr;
                    }
                }
            `}
            </style>

            <div className="admin-packs-layout">
                <div className="section-card">
                    <h2>{isEditing ? `Edit Pack: ${form.name}` : 'Create New Pack'}</h2>

                    <div className="form-group">
                        <label htmlFor="name">Pack Name</label>
                        <input id="name" name="name" placeholder="Pack Name" value={form.name} onChange={handleChange} />
                    </div>

                    <div className="form-group">
                        <label htmlFor="animationUrl">Animation Video Path</label>
                        <input
                            id="animationUrl"
                            name="animationUrl"
                            placeholder="e.g., /animations/pack.mp4"
                            value={form.animationUrl}
                            onChange={handleChange}
                        />
                    </div>


                    <h3>Card Pool</h3>
                    <div className="form-group">
                        <label htmlFor="cardSearch">Add Cards by Name</label>
                        <input
                            id="cardSearch"
                            type="text"
                            placeholder="Search cards..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                    </div>

                    {suggestions.length > 0 && (
                        <ul className="suggestions-list">
                            {suggestions.map(card => (
                                <li key={card._id} onClick={() => handleSelectCard(card)}>
                                    <img src={card.imageUrl} alt={card.name} style={{ width: '40px', verticalAlign: 'middle', marginRight: '8px' }} /> {card.name}
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="card-tile-grid">
                        {selectedCardIds.map(id => {
                            const card = allCards.find(c => c._id === id);
                            return card ? (
                                <div key={id} className="card-tile">
                                    <BaseCard
                                        name={card.name}
                                        image={card.imageUrl}
                                        rarity={card.rarities?.[0]?.rarity}
                                        description={card.flavorText}
                                        modifier={card.modifier}
                                        miniCard={true}
                                    />
                                    <div className="actions">
                                        <button className="secondary-button sm" onClick={() => handleRemoveCard(id)}>Remove</button>
                                    </div>
                                </div>
                            ) : null;
                        })}
                    </div>

                    <div className="form-actions">
                        <button className="primary-button" onClick={handleSave}>
                            {isEditing ? 'Save Changes' : 'Create Pack'}
                        </button>
                        {isEditing && (
                            <button className="secondary-button" onClick={handleClearForm}>
                                Clear (New Pack)
                            </button>
                        )}
                    </div>
                </div>

                <div className="section-card">
                    <h2>Existing Packs</h2>
                    <ul className="pack-list">
                        {packs.map((pack) => (
                            <li
                                key={pack._id}
                                className={form.packId === pack._id ? 'selected pack-list-item' : 'pack-list-item'}
                                onClick={() => handleLoadPack(pack)}
                            >
                                <div className="pack-list-item-details">
                                    <strong>{pack.name || 'Unnamed Pack'}</strong>
                                    <div className="pack-id">{pack._id}</div>
                                    <div className="pack-video">
                                        {pack.animationUrl || 'No video set'}
                                    </div>
                                </div>
                                <button
                                    className="delete-button"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!window.confirm(`Delete "${pack.name}"? This is permanent.`)) return;
                                        try {
                                            await fetchWithAuth(`/api/admin/packs/${pack._id}`, { method: 'DELETE' });
                                            window.showToast('Pack deleted', 'success');
                                            fetchPacks();
                                            handleClearForm();
                                        } catch (err) {
                                            console.error('Error deleting pack:', err);
                                            window.showToast('Error deleting pack', 'error');
                                        }
                                    }}
                                >
                                    Delete
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminPacksPage;
