// src/pages/AdminActions.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserProfile, fetchWithAuth } from '../utils/api';
import '../styles/AdminActions.css';

const AdminActions = () => {
    // Notification panel state
    const [notificationType, setNotificationType] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('');
    // Packs management state
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [packAmount, setPackAmount] = useState('');
    const [isUserDropdownVisible, setUserDropdownVisible] = useState(false);
    // Card search state
    const [cardSearchQuery, setCardSearchQuery] = useState('');
    const [cardSearchResults, setCardSearchResults] = useState([]);
    const [selectedCardDetails, setSelectedCardDetails] = useState(null);

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
                // fetchWithAuth already returns parsed JSON
                const data = await fetchWithAuth('/api/admin/users');
                setUsers(data);
            } catch (err) {
                console.error('Fetch users failed:', err);
            }
        };
        checkAdmin();
        fetchUsers();
    }, [navigate]);

    // Filter users based on the current input (for packs tool)
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
        // Match the username to get the user ID
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

    // --- New Card Search Tool functions ---
    const handleCardSearch = async (e) => {
        const query = e.target.value;
        setCardSearchQuery(query);
        if (query.length > 1) {
            try {
                const res = await fetchWithAuth(`/api/cards/search?name=${encodeURIComponent(query)}`);
                if (res.cards) {
                    setCardSearchResults(res.cards);
                } else {
                    setCardSearchResults([]);
                }
            } catch (error) {
                console.error('Error searching cards:', error);
                setCardSearchResults([]);
            }
        } else {
            setCardSearchResults([]);
        }
    };

    const handleSelectCard = (card) => {
        setSelectedCardDetails(card);
        setCardSearchQuery(card.name);
        setCardSearchResults([]);
    };

    return (
        <div className="aa-admin-actions-page">
            <h1 className="page-title">Admin Actions</h1>
            <div className="aa-admin-panels">
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
                                onFocus={() => {}}
                            />
                            {filteredUsers.length > 0 && (
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
                                onChange={handleCardSearch}
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
            {status && <p className="aa-status-message">{status}</p>}
        </div>
    );
};

export default AdminActions;
