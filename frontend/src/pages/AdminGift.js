// src/pages/AdminGiftPage.js

import React, { useState, useEffect } from 'react';
import CardSearchInput from "../components/CardSearchInput";
import { fetchWithAuth } from "../utils/api";
import '../styles/AdminEventsPage.css';
import '../styles/AdminActions.css';
import UserTitle from '../components/UserTitle';

const rarities = [
    'Basic', 'Common', 'Standard', 'Uncommon', 'Rare',
    'Epic', 'Legendary', 'Mythic', 'Unique', 'Divine', 'Event'
];

const GiftForm = ({
                      formData,
                      onFormChange,
                      onCardSelect,
                      onSubmit,
                      isLoading,
                      apiResponse,
                      users,
                      isUserDropdownVisible,
                      setUserDropdownVisible
                  }) => {

    const filteredUsers = formData.username
        ? users.filter(u => u.username.toLowerCase().includes(formData.username.toLowerCase()))
        : [];

    const handleUserSelect = (username) => {
        onFormChange({ target: { name: 'username', value: username } });
    };

    return (
        <div className="section-card">
            <h2>🎁 Send a Gift to a User</h2>
            <p className="subtitle">Directly grant a card, packs, or XP to any user.</p>
            <form className="add-event-form" onSubmit={onSubmit}>
                <div className="form-column">
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label htmlFor="username">Target Username</label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={onFormChange}
                            placeholder="Search for a user..."
                            required
                            autoComplete="off"
                            onFocus={() => setUserDropdownVisible(true)}
                            onBlur={() => setTimeout(() => setUserDropdownVisible(false), 200)}
                        />
                        {isUserDropdownVisible && formData.username && filteredUsers.length > 0 && (
                            <ul className="search-dropdown">
                                {filteredUsers.map(user => (
                                    <li
                                        key={user._id}
                                        className="search-result-item"
                                        onMouseDown={() => handleUserSelect(user.username)}
                                    >
                                        <UserTitle username={user.username} title={user.selectedTitle} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="form-group">
                        <label htmlFor="message">Message to Recipient</label>
                        <textarea
                            id="message"
                            name="message"
                            value={formData.message}
                            onChange={onFormChange}
                            placeholder="This message will appear in the user's popup."
                            rows="3"
                        />
                    </div>
                </div>

                <div className="form-column">
                    <div className="form-group">
                        <label htmlFor="rewardType">Reward Type</label>
                        <select name="rewardType" value={formData.rewardType} onChange={onFormChange}>
                            <option value="CARD">Specific Card</option>
                            <option value="PACK">Packs</option>
                            <option value="XP">XP</option>
                        </select>
                    </div>

                    {formData.rewardType === 'CARD' ? (
                        <div className="form-group">
                            <label htmlFor="rewardValue">Reward Card</label>
                            <CardSearchInput
                                onCardSelect={onCardSelect}
                                initialCardId={formData.rewardValue}
                                displayRarity={formData.rarity}
                            />
                        </div>
                    ) : (
                        <div className="form-group">
                            <label htmlFor="rewardValue">Amount</label>
                            <input
                                name="rewardValue"
                                type="number"
                                value={formData.rewardValue}
                                onChange={onFormChange}
                                placeholder={formData.rewardType === 'PACK' ? 'Number of packs' : 'Amount of XP'}
                                required
                            />
                        </div>
                    )}

                    {formData.rewardType === 'CARD' && (
                        <div className="form-group">
                            <label htmlFor="rarity">Rarity</label>
                            <select name="rarity" value={formData.rarity} onChange={onFormChange}>
                                <option value="Random">Random (from available rarities on this card)</option>
                                {rarities.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="form-footer">
                    {apiResponse.message && (
                        <div className={`api-response ${apiResponse.type}`}>
                            {apiResponse.message}
                        </div>
                    )}
                    <button type="submit" className="primary-button lg" disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send Gift'}
                    </button>
                </div>
            </form>
        </div>
    );
};


const AdminGiftPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [apiResponse, setApiResponse] = useState({ type: '', message: '' });

    const [users, setUsers] = useState([]);
    const [isUserDropdownVisible, setUserDropdownVisible] = useState(false);

    const initialFormData = {
        username: '',
        rewardType: 'CARD',
        rewardValue: '',
        rarity: 'Random',
        message: 'A gift from the admin team!',
    };
    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const data = await fetchWithAuth('/api/admin/users');
                setUsers(data);
            } catch (err) {
                console.error("Failed to fetch users:", err);
                setApiResponse({ type: 'error', message: 'Could not load user list.' });
            }
        };
        loadUsers();
    }, []);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCardSelection = (selectedCard) => {
        setFormData(prev => ({
            ...prev,
            rewardValue: selectedCard ? selectedCard._id : ''
        }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission

        const rewardDescription = formData.rewardType === 'CARD'
            ? `the selected card`
            : `${formData.rewardValue} ${formData.rewardType}(s)`;

        if (!window.confirm(`Are you sure you want to send ${rewardDescription} to the user "${formData.username}"?`)) {
            return;
        }

        setIsLoading(true);
        setApiResponse({ type: '', message: '' });

        const payload = {
            username: formData.username,
            rewardType: formData.rewardType,
            message: formData.message,
            rewardDetails: {},
        };

        if (formData.rewardType === 'XP' || formData.rewardType === 'PACK') {
            payload.rewardDetails.amount = parseInt(formData.rewardValue, 10);
        } else if (formData.rewardType === 'CARD') {
            payload.rewardDetails.cardId = formData.rewardValue;
            payload.rewardDetails.rarity = formData.rarity;
        }

        const userExists = users.some(u => u.username === payload.username);
        if (!userExists) {
            setApiResponse({ type: 'error', message: 'Invalid user. Please select a user from the dropdown.' });
            setIsLoading(false);
            return;
        }

        if ((payload.rewardType === 'PACK' || payload.rewardType === 'XP') && (!payload.rewardDetails.amount || payload.rewardDetails.amount <= 0)) {
            setApiResponse({ type: 'error', message: 'Please enter a valid amount.' });
            setIsLoading(false);
            return;
        }
        if (payload.rewardType === 'CARD' && !payload.rewardDetails.cardId) {
            setApiResponse({ type: 'error', message: 'Please select a card.' });
            setIsLoading(false);
            return;
        }

        try {
            const result = await fetchWithAuth('/api/admin/grant-gift', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            setApiResponse({ type: 'success', message: result.message });
            setFormData(initialFormData); // Reset form state

        } catch (error) {
            const errorMessage = error.message || 'An unknown error occurred.';
            setApiResponse({ type: 'error', message: `Failed to send gift: ${errorMessage}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setApiResponse({ type: '', message: '' }), 5000);
        }
    };

    return (
        <div className="page">
            <GiftForm
                formData={formData}
                onFormChange={handleFormChange}
                onCardSelect={handleCardSelection}
                onSubmit={handleFormSubmit}
                isLoading={isLoading}
                apiResponse={apiResponse}
                users={users}
                isUserDropdownVisible={isUserDropdownVisible}
                setUserDropdownVisible={setUserDropdownVisible}
            />
        </div>
    );
};

export default AdminGiftPage;
