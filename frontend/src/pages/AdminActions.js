// src/pages/AdminActions.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserProfile, fetchWithAuth, searchCardsByName } from '../utils/api';
import BaseCard from '../components/BaseCard';
import '../styles/AdminActions.css';

const AdminActions = () => {
    // New Card creation state
    const [newCardTitle, setNewCardTitle] = useState('');
    const [newCardFlavor, setNewCardFlavor] = useState('');
    const [newCardImage, setNewCardImage] = useState('');
    const [alwaysAvailable, setAlwaysAvailable] = useState(true);
    const [availableFrom, setAvailableFrom] = useState('');
    const [availableTo, setAvailableTo] = useState('');

    // Notification panel state
    const [notificationType, setNotificationType] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('');
    // Packs management state
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [packAmount, setPackAmount] = useState('');
    const [isUserDropdownVisible, setUserDropdownVisible] = useState(false);
    // Card Search Tool state
    const [cardSearchQuery, setCardSearchQuery] = useState('');
    const [cardSearchResults, setCardSearchResults] = useState([]);
    const [selectedCardDetails, setSelectedCardDetails] = useState(null);

    // Pack management state


    const navigate = useNavigate();

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const profile = await fetchUserProfile();
                if (!profile.isAdmin) navigate('/');
            } catch {
                navigate('/');
            }
        };

        const fetchUsers = async () => {
            try {
                const data = await fetchWithAuth('/api/admin/users');
                setUsers(data);
            } catch (err) {
                console.error('Fetch users failed:', err);
            }
        };

        checkAdmin();
        fetchUsers();
    }, [navigate]);

    // Filter users for pack management
    const filteredUsers = selectedUser
        ? users.filter(u => u.username.toLowerCase().includes(selectedUser.toLowerCase()))
        : [];

    const handleNotificationSubmit = async (e) => {
        e.preventDefault();
        try {
            await fetchWithAuth('/api/admin/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: notificationType, message }),
            });
            setStatus('Notification sent successfully.');
            setNotificationType('');
            setMessage('');
        } catch {
            setStatus('Error sending notification.');
        }
    };

    const handleGivePacks = async (e) => {
        e.preventDefault();
        const userObj = users.find(u => u.username === selectedUser);
        if (!userObj) {
            setStatus('User not found, please select a valid user.');
            return;
        }
        try {
            await fetchWithAuth('/api/admin/give-packs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userObj._id, amount: Number(packAmount) }),
            });
            setStatus(`Gave ${packAmount} packs to ${selectedUser}.`);
            setSelectedUser('');
            setPackAmount('');
        } catch {
            setStatus('Error giving packs.');
        }
    };

    const handleResetAllPacks = async () => {
        try {
            await fetchWithAuth('/api/admin/set-packs', { method: 'POST' });
            setStatus("All users' packs reset to 6.");
        } catch {
            setStatus('Error resetting packs.');
        }
    };

    const selectedUserObj = selectedUser && users.find(u => u.username === selectedUser);

    // --- Card Search Tool functions ---
    const handleCardSearchInput = (e) => {
        setCardSearchQuery(e.target.value);
    };

    // Debounced effect to fetch card search results
    useEffect(() => {
        const fetchCardResults = async () => {
            if (cardSearchQuery.length > 0) {
                const results = await searchCardsByName(cardSearchQuery);
                setCardSearchResults(results);
            } else {
                setCardSearchResults([]);
            }
        };

        const timer = setTimeout(() => {
            fetchCardResults();
        }, 300);
        return () => clearTimeout(timer);
    }, [cardSearchQuery]);

    const handleSelectCard = (card) => {
        setSelectedCardDetails(card);
        setCardSearchQuery(card.name);
        setCardSearchResults([]);
    };

    return (
        <div className="aa-admin-actions-page">
            <h1 className="page-title">Admin Actions</h1>
            <div className="aa-admin-panels" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>

            {/* Create New Card Panel */}
            <section className="aa-panel" style={{ gridColumn: 'span 3' }}>
                <h2>Create New Card</h2>
                <div className="aa-admin-actions-form">
                    <div className="aa-form-group">
                        <label>Card Title:</label>
                        <input
                            type="text"
                            value={newCardTitle}
                            onChange={(e) => setNewCardTitle(e.target.value)}
                            placeholder="Enter card title"
                        />
                    </div>
                    <div className="aa-form-group">
                        <label>Flavor Text:</label>
                        <textarea
                            value={newCardFlavor}
                            onChange={(e) => setNewCardFlavor(e.target.value)}
                            placeholder="Enter flavor text"
                        />
                    </div>
                    <div className="aa-form-group">
                        <label>Image URL:</label>
                        <input
                            type="text"
                            value={newCardImage}
                            onChange={(e) => setNewCardImage(e.target.value)}
                            placeholder="Enter image URL or upload below"
                        />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const formData = new FormData();
                                formData.append('image', file);
                                try {
                                    const res = await fetch('/api/admin/upload', {
                                        method: 'POST',
                                        body: formData,
                                    });
                                    const data = await res.json();
                                    if (data.imageUrl) {
                                        setNewCardImage(data.imageUrl);
                                        window.showToast('Image uploaded', 'success');
                                    } else {
                                        window.showToast('Upload failed', 'error');
                                    }
                                } catch {
                                    window.showToast('Upload error', 'error');
                                }
                            }}
                        />
                    </div>

                    <div className="aa-form-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={alwaysAvailable}
                            onChange={(e) => setAlwaysAvailable(e.target.checked)}
                          />
                          Always Available
                        </label>
                    </div>

                    {!alwaysAvailable && (
                      <>
                        <div className="aa-form-group">
                          <label>Available From:</label>
                          <input
                            type="datetime-local"
                            value={availableFrom}
                            onChange={(e) => setAvailableFrom(e.target.value)}
                          />
                        </div>
                        <div className="aa-form-group">
                          <label>Available To:</label>
                          <input
                            type="datetime-local"
                            value={availableTo}
                            onChange={(e) => setAvailableTo(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    <button
                        onClick={async () => {
                            try {
                                const defaultRarities = [
                                  { rarity: 'Common', remainingCopies: 1000, availableMintNumbers: Array.from({length: 1000}, (_, i) => i + 1) },
                                  { rarity: 'Rare', remainingCopies: 100, availableMintNumbers: Array.from({length: 100}, (_, i) => i + 1) },
                                  { rarity: 'Epic', remainingCopies: 10, availableMintNumbers: Array.from({length: 10}, (_, i) => i + 1) },
                                ];
                                await fetchWithAuth('/api/admin/cards', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        name: newCardTitle,
                                        flavorText: newCardFlavor,
                                        imageUrl: newCardImage,
                                        rarities: defaultRarities,
                                        availableFrom: alwaysAvailable ? null : availableFrom || null,
                                        availableTo: alwaysAvailable ? null : availableTo || null
                                    }),
                                });
                                window.showToast('Card created successfully', 'success');
                                setNewCardTitle('');
                                setNewCardFlavor('');
                                setNewCardImage('');
                            } catch {
                                window.showToast('Error creating card', 'error');
                            }
                        }}
                    >
                        Save Card
                    </button>
                    <h3>Live Preview</h3>
                    <BaseCard
                        name={newCardTitle}
                        description={newCardFlavor}
                        image={newCardImage}
                        rarity="Common"
                    />
                </div>
            </section>
                {/* Notification Panel */}
                <section className="aa-panel">
                    <h2>Send Notification</h2>
                    <form onSubmit={handleNotificationSubmit} className="aa-admin-actions-form">
                        <div className="aa-form-group">
                            <label>Type:</label>
                            <select value={notificationType} onChange={e => setNotificationType(e.target.value)} required>
                                <option value="" disabled>Select notification type</option>
                                <option>Trade Offer Received</option>
                                <option>Trade Update</option>
                                <option>New Market Offer</option>
                                <option>Listing Update</option>
                                <option>Collection Milestone</option>
                                <option>General Announcement</option>
                            </select>
                        </div>
                        <div className="aa-form-group">
                            <label>Message:</label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Enter notification message"
                                required
                            />
                        </div>
                        <button type="submit">Send Notification</button>
                    </form>
                </section>

                {/* Packs Management Panel */}
                <section className="aa-panel">
                    <h2>Manage User Packs</h2>
                    <form onSubmit={handleGivePacks} className="aa-admin-packs-form" style={{ position: 'relative' }}>
                        <div className="aa-form-group" style={{ position: 'relative' }}>
                            <label>User:</label>
                            <input
                                type="text"
                                className="search-bar"
                                value={selectedUser}
                                onChange={e => setSelectedUser(e.target.value)}
                                placeholder="Search for a user..."
                                required
                                onFocus={() => setUserDropdownVisible(true)}
                                onBlur={() => setTimeout(() => setUserDropdownVisible(false), 150)}
                            />
                            {isUserDropdownVisible && selectedUser && filteredUsers.length > 0 && (
                                <ul className="search-dropdown">
                                    {filteredUsers.map(u => (
                                        <li
                                            key={u._id}
                                            className="search-result-item"
                                            onMouseDown={() => setSelectedUser(u.username)}
                                        >
                                            {u.username}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {selectedUserObj && (
                                <div className="user-packs-info">
                                    Current packs: {selectedUserObj.packs}
                                </div>
                            )}
                        </div>
                        <div className="aa-form-group">
                            <label>Packs to Give:</label>
                            <input
                                type="number"
                                min="1"
                                value={packAmount}
                                onChange={e => setPackAmount(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit">Give Packs</button>
                        <button type="button" className="aa-reset-button" onClick={handleResetAllPacks}>
                            Reset All Packs to 6
                        </button>
                    </form>
                </section>

                {/* Card Search Tool Panel */}
                <section className="aa-panel">
                    <h2>Card Search Tool</h2>
                    <div className="aa-admin-actions-form">
                        <div className="aa-form-group" style={{ position: 'relative' }}>
                            <label>Card Name:</label>
                            <input
                                type="text"
                                className="search-bar"
                                value={cardSearchQuery}
                                onChange={handleCardSearchInput}
                                placeholder="Search for a card..."
                            />
                            {cardSearchResults.length > 0 && (
                                <ul className="search-dropdown">
                                    {cardSearchResults.map(card => (
                                        <li
                                            key={card._id}
                                            className="search-result-item"
                                            onMouseDown={() => handleSelectCard(card)}
                                        >
                                            {card.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        {selectedCardDetails && (
                            <div className="card-details">
                                <h3>{selectedCardDetails.name}</h3>
                                {selectedCardDetails.rarities && selectedCardDetails.rarities.map((r, idx) => (
                                    <div key={idx} className="rarity-info">
                                        <strong>{r.rarity}:</strong> {r.remainingCopies} copies remaining
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <div className="aa-admin-panels">
            {/* User Profile Viewer */}
            <section className="aa-panel">
                <h2>User Profile</h2>
                <div style={{ position: 'relative' }}>
                  <input
                      type="text"
                      placeholder="Search username..."
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="search-bar"
                      onFocus={() => setUserDropdownVisible(true)}
                      onBlur={() => setTimeout(() => setUserDropdownVisible(false), 150)}
                  />
                  {isUserDropdownVisible && selectedUser && filteredUsers.length > 0 && (
                      <ul className="search-dropdown">
                          {filteredUsers.map(u => (
                              <li
                                  key={u._id}
                                  className="search-result-item"
                                  onMouseDown={() => setSelectedUser(u.username)}
                              >
                                  {u.username}
                              </li>
                          ))}
                      </ul>
                  )}
                </div>
                {selectedUserObj && (
                    <div className="user-profile-info">
                        <p><strong>Username:</strong> {selectedUserObj.username}</p>
                        <p><strong>Packs:</strong> {selectedUserObj.packs}</p>
                        <p><strong>XP:</strong> {selectedUserObj.xp || 0}</p>
                        <p><strong>Level:</strong> {selectedUserObj.level || 1}</p>
                        <h4>Achievements:</h4>
                        <ul>
                            {(selectedUserObj.achievements || []).map((a, idx) => (
                                <li key={idx}>
                                    <strong>{a.name}</strong>: {a.description}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>

            {/* Card Availability Editor */}
            <section className="aa-panel">
                <h2>Card Availability</h2>

                <div style={{ position: 'relative' }}>
                  <input
                      type="text"
                      placeholder="Search card name..."
                      value={cardSearchQuery}
                      onChange={handleCardSearchInput}
                      className="search-bar"
                  />
                  {cardSearchResults.length > 0 && (
                      <ul className="search-dropdown">
                          {cardSearchResults.map(card => (
                              <li
                                  key={card._id}
                                  className="search-result-item"
                                  onMouseDown={() => handleSelectCard(card)}
                              >
                                  {card.name}
                              </li>
                          ))}
                      </ul>
                  )}
                </div>

                {selectedCardDetails && (
                    <div className="card-availability-editor" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginTop: '1rem' }}>
                        <div style={{ flex: '1 1 300px', minWidth: '300px' }}>
                            <h3>{selectedCardDetails.name}</h3>
                            <label>Available From:</label>
                            <input
                                type="datetime-local"
                                value={selectedCardDetails.availableFrom ? new Date(selectedCardDetails.availableFrom).toISOString().slice(0, 16) : ''}
                                onChange={(e) => setSelectedCardDetails({ ...selectedCardDetails, availableFrom: e.target.value })}
                            />
                            <label>Available To:</label>
                            <input
                                type="datetime-local"
                                value={selectedCardDetails.availableTo ? new Date(selectedCardDetails.availableTo).toISOString().slice(0, 16) : ''}
                                onChange={(e) => setSelectedCardDetails({ ...selectedCardDetails, availableTo: e.target.value })}
                            />
                            <label>Series:</label>
                            <input
                                type="text"
                                value={selectedCardDetails.series || ''}
                                onChange={(e) => setSelectedCardDetails({ ...selectedCardDetails, series: e.target.value })}
                            />
                            <button
                                onClick={async () => {
                                    try {
                                        await fetchWithAuth('/api/admin/update-card-availability', {
                                            method: 'POST',
                                            body: JSON.stringify({
                                                cardId: selectedCardDetails._id,
                                                availableFrom: selectedCardDetails.availableFrom,
                                                availableTo: selectedCardDetails.availableTo,
                                                series: selectedCardDetails.series,
                                            }),
                                        });
                                        window.showToast('Card availability updated', 'success');
                                    } catch {
                                        window.showToast('Error updating card availability', 'error');
                                    }
                                }}
                            >
                                Save Availability
                            </button>
                        </div>
                        <div style={{ flex: '1 1 300px', minWidth: '300px' }}>
                            <h3>Card Preview</h3>
                            <BaseCard
                                name={selectedCardDetails.name}
                                image={selectedCardDetails.imageUrl}
                                rarity={selectedCardDetails.rarity || (selectedCardDetails.rarities && selectedCardDetails.rarities[0]?.rarity)}
                                description={selectedCardDetails.flavorText}
                                mintNumber={selectedCardDetails.mintNumber}
                            />
                        </div>
                    </div>
                )}
            </section>

            {/* Pack Management Panel */}
            <section className="aa-panel">
                <h2>Pack Management</h2>
                <p>For full pack management with card search and multi-select, please use the dedicated Pack Management page:</p>
                <a href="/admin/packs" className="aa-button">Go to Pack Management</a>
            </section>
            </div>

            {status && <p className="aa-status-message">{status}</p>}
        </div>
    );
};

export default AdminActions;
