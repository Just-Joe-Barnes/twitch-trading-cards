import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {fetchUserProfile, fetchWithAuth, searchCardsByName} from '../utils/api';
import UserTitle from '../components/UserTitle';
import '../styles/AdminActions.css';

const AdminActions = () => {
    const [newNote, setNewNote] = useState('');
    const [devNotes, setDevNotes] = useState(() => {
        const storedNotes = localStorage.getItem('devNotes');
        return storedNotes ? JSON.parse(storedNotes) : [];
    });
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [maintenanceLoading, setMaintenanceLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [packAmount, setPackAmount] = useState('');
    const [addAllAmount, setAddAllAmount] = useState('');
    const [isUserDropdownVisible, setUserDropdownVisible] = useState(false);
    const [achievements, setAchievements] = useState([]);
    const [newAchievement, setNewAchievement] = useState({
        name: '',
        description: '',
        threshold: 0,
        packs: 0,
        card: '',
        cardQuery: ''
    });
    const [newAchievementResults, setNewAchievementResults] = useState([]);

    const [notificationType, setNotificationType] = useState('General Announcement');
    const [notificationUser, setNotificationUser] = useState('');
    const [isNotificationUserDropdownVisible, setNotificationUserDropdownVisible] = useState(false);
    const [packLuckStatus, setPackLuckStatus] = useState({ weeklyCount: 0, overrideEnabled: false, overrideCount: 0 });
    const [packLuckOverrideInput, setPackLuckOverrideInput] = useState('');
    const [packLuckLoading, setPackLuckLoading] = useState(false);


    const navigate = useNavigate();

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const profile = await fetchUserProfile();
                if (!profile.isAdmin) {
                    navigate('/');
                } else {
                    setIsAdmin(true);
                }
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

        const fetchAchievements = async () => {
            try {
                const data = await fetchWithAuth('/api/admin/achievements');
                const mapped = (data.achievements || []).map(a => ({...a, cardQuery: a.card || '', cardResults: []}));
                setAchievements(mapped);
            } catch (err) {
                console.error('Fetch achievements failed:', err);
            }
        };


        const fetchMaintenanceStatus = async () => {
            try {
                const data = await fetchWithAuth('/api/settings/maintenance');
                setMaintenanceMode(data.maintenanceMode);
            } catch (err) {
                console.error('Failed to fetch maintenance status:', err);
                window.showToast('Could not load maintenance status.', 'error');
            } finally {
                setMaintenanceLoading(false);
            }
        };

        checkAdmin();
        fetchUsers();
        fetchAchievements();
        fetchMaintenanceStatus();
        fetchPackLuckStatus();
    }, [navigate]);

    const handleToggleMaintenanceMode = async () => {
        const newMode = !maintenanceMode;
        setMaintenanceLoading(true);
        try {
            await fetchWithAuth('/api/admin/settings/maintenance', {
                method: 'POST',
                body: JSON.stringify({ mode: newMode }),
            });
            setMaintenanceMode(newMode);
            window.showToast(`Maintenance mode turned ${newMode ? 'ON' : 'OFF'}.`, 'success');
        } catch (err) {
            window.showToast('Failed to update maintenance mode.', 'error');
        } finally {
            setMaintenanceLoading(false);
        }
    };

    const handleGivePacks = async (e) => {
        e.preventDefault();
        const userObj = users.find(u => u.username === selectedUser);
        if (!userObj) {
            window.showToast('User not found, please select a valid user.', 'error');
            return;
        }
        try {
            await fetchWithAuth('/api/admin/give-packs', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({userId: userObj._id, amount: Number(packAmount)}),
            });
            window.showToast(`Gave ${packAmount} packs to ${selectedUser}.`, 'success');
            setSelectedUser('');
            setPackAmount('');
        } catch {
            window.showToast('Error giving packs.', 'error');
        }
    };
    const handleAddPacksAll = async () => {
        try {
            await fetchWithAuth('/api/admin/add-packs', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({amount: Number(addAllAmount)}),
            });
            window.showToast(`Added ${addAllAmount} packs to all users.`, 'success');
            setAddAllAmount('');
        } catch {
            window.showToast('Error adding packs to all users.', 'error');
        }
    };
    const handleResetAllPacks = async () => {
        try {
            await fetchWithAuth('/api/admin/set-packs', {method: 'POST'});
            window.showToast("All users' packs reset to 6.", 'success');
        } catch {
            window.showToast('Error resetting packs.', 'error');
        }
    };
    const handleAchievementCardQueryChange = async (id, value) => {
        setAchievements(prev => prev.map(a => a._id === id ? {...a, cardQuery: value} : a));
        if (value) {
            const results = await searchCardsByName(value);
            setAchievements(prev => prev.map(a => a._id === id ? {...a, cardResults: results} : a));
        } else {
            setAchievements(prev => prev.map(a => a._id === id ? {...a, cardResults: []} : a));
        }
    };
    const handleSelectAchievementCard = (id, card) => {
        setAchievements(prev => prev.map(a => a._id === id ? {
            ...a,
            card: card._id,
            cardQuery: card.name,
            cardResults: []
        } : a));
    };
    const handleNewAchievementCardQueryChange = async (value) => {
        setNewAchievement({...newAchievement, cardQuery: value});
        if (value) {
            const results = await searchCardsByName(value);
            setNewAchievementResults(results);
        } else {
            setNewAchievementResults([]);
        }
    };
    const handleSelectNewAchievementCard = (card) => {
        setNewAchievement({...newAchievement, card: card._id, cardQuery: card.name});
        setNewAchievementResults([]);
    };
    const handleSaveAchievement = async (ach) => {
        try {
            await fetchWithAuth(`/api/admin/achievements/${ach._id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: ach.name,
                    description: ach.description,
                    threshold: Number(ach.threshold) || 0,
                    packs: Number(ach.packs) || 0,
                    card: ach.card || null,
                })
            });
            window.showToast('Achievement saved', 'success');
        } catch {
            window.showToast('Error saving achievement', 'error');
        }
    };
    const handleDeleteAchievement = async (id) => {
        try {
            await fetchWithAuth(`/api/admin/achievements/${id}`, {method: 'DELETE'});
            setAchievements(achievements.filter(a => a._id !== id));
        } catch {
            window.showToast('Error deleting achievement', 'error');
        }
    };
    const handleCreateAchievement = async () => {
        try {
            const res = await fetchWithAuth('/api/admin/achievements', {
                method: 'POST',
                body: JSON.stringify({
                    name: newAchievement.name,
                    description: newAchievement.description,
                    threshold: Number(newAchievement.threshold) || 0,
                    packs: Number(newAchievement.packs) || 0,
                    card: newAchievement.card || null,
                })
            });
            setAchievements([...achievements, {
                ...res.achievement,
                cardQuery: res.achievement.card || '',
                cardResults: []
            }]);
            setNewAchievement({name: '', description: '', threshold: 0, packs: 0, card: '', cardQuery: ''});
            setNewAchievementResults([]);
        } catch {
            window.showToast('Error creating achievement', 'error');
        }
    };


    const handleNotificationSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const userObj = notificationUser ? users.find(u => u.username === notificationUser) : null;

        if (notificationUser && !userObj) {
            window.showToast('Invalid user selected. Please choose a user from the list.', 'error');
            setLoading(false);
            return;
        }

        const payload = {
            type: notificationType,
            message,
            ...(userObj && { userId: userObj._id })
        };

        try {
            await fetchWithAuth('/api/admin/notifications', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            const successMessage = userObj
                ? `Notification sent to ${userObj.username}.`
                : 'Global notification sent to all users.';
            window.showToast(successMessage, 'success');

            setNotificationType('General Announcement');
            setMessage('');
            setNotificationUser('');

        } catch (err) {
            window.showToast('Error sending notification.', 'error');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleManualPayout = async () => {
        const confirmed = window.confirm("Are you sure you want to attempt a manual payout for LAST month? This will only proceed if it hasn't happened yet.");
        if (!confirmed) return;

        setLoading(true);
        try {
            const res = await fetchWithAuth('/api/admin/trigger-monthly-payout', {
                method: 'POST'
            });
            window.showToast(res.message, 'success');
        } catch (err) {
            const errMsg = err.message || 'Payout failed or already processed.';
            window.showToast(errMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchPackLuckStatus = async () => {
        try {
            const data = await fetchWithAuth('/api/admin/pack-luck');
            const weeklyCount = data?.weekly?.count ?? 0;
            const overrideEnabled = Boolean(data?.override?.enabled);
            const overrideCountValue = Number.isFinite(Number(data?.override?.count))
                ? Number(data.override.count)
                : null;

            setPackLuckStatus({
                weeklyCount,
                overrideEnabled,
                overrideCount: overrideCountValue ?? 0
            });

            const inputValue = overrideEnabled && overrideCountValue !== null
                ? overrideCountValue
                : weeklyCount;
            setPackLuckOverrideInput(String(inputValue));
        } catch (err) {
            console.error('Failed to fetch pack luck status:', err);
            if (window.showToast) {
                window.showToast('Could not load pack rigging status.', 'error');
            }
        }
    };

    const handleSetPackLuckOverride = async () => {
        if (packLuckOverrideInput === '') {
            if (window.showToast) {
                window.showToast('Override count must be a non-negative number.', 'error');
            }
            return;
        }

        const count = Number(packLuckOverrideInput);
        if (!Number.isFinite(count) || count < 0) {
            if (window.showToast) {
                window.showToast('Override count must be a non-negative number.', 'error');
            }
            return;
        }

        setPackLuckLoading(true);
        try {
            const res = await fetchWithAuth('/api/admin/pack-luck/override', {
                method: 'POST',
                body: JSON.stringify({ count })
            });
            if (window.showToast) {
                window.showToast(res.message || 'Pack luck override enabled.', 'success');
            }
            await fetchPackLuckStatus();
        } catch (err) {
            if (window.showToast) {
                window.showToast(err.message || 'Failed to set pack luck override.', 'error');
            }
        } finally {
            setPackLuckLoading(false);
        }
    };

    const handleClearPackLuckOverride = async () => {
        setPackLuckLoading(true);
        try {
            const res = await fetchWithAuth('/api/admin/pack-luck/clear', {
                method: 'POST'
            });
            if (window.showToast) {
                window.showToast(res.message || 'Pack luck override cleared.', 'success');
            }
            await fetchPackLuckStatus();
        } catch (err) {
            if (window.showToast) {
                window.showToast(err.message || 'Failed to clear pack luck override.', 'error');
            }
        } finally {
            setPackLuckLoading(false);
        }
    };

    const filteredUsers = selectedUser
        ? users.filter(u => u.username.toLowerCase().includes(selectedUser.toLowerCase()))
        : [];

    const notificationFilteredUsers = notificationUser
        ? users.filter(u => u.username.toLowerCase().includes(notificationUser.toLowerCase()))
        : [];

    const selectedUserObj = selectedUser && users.find(u => u.username === selectedUser);

    if (!isAdmin) {
        return <div style={{padding: '2rem', color: '#fff'}}>Not authorized</div>;
    }

    if (!users.length) {
        return <div style={{padding: '2rem', color: '#fff'}}>Loading...</div>;
    }

    return (
        <div className="page">
            {maintenanceMode && (<h1>Maintenance mode is ACTIVE</h1>)}
            <div className="admin-panel-grid">
                <section className="section-card">
                    <h2>Achievements</h2>
                    {achievements.map((ach) => (
                        <div key={ach._id} style={{
                            marginBottom: '1rem',
                            borderBottom: '1px solid var(--border-dark)',
                            paddingBottom: '1rem'
                        }}>
                            <input
                                type="text"
                                value={ach.name}
                                onChange={(e) => setAchievements(achievements.map(a => a._id === ach._id ? {
                                    ...a,
                                    name: e.target.value
                                } : a))}
                                placeholder="Name"
                            />
                            <input
                                type="text"
                                value={ach.description || ''}
                                onChange={(e) => setAchievements(achievements.map(a => a._id === ach._id ? {
                                    ...a,
                                    description: e.target.value
                                } : a))}
                                placeholder="Description"
                            />
                            <input
                                type="number"
                                value={ach.threshold || 0}
                                onChange={(e) => setAchievements(achievements.map(a => a._id === ach._id ? {
                                    ...a,
                                    threshold: e.target.value
                                } : a))}
                                placeholder="Threshold"
                            />
                            <input
                                type="number"
                                value={ach.packs || 0}
                                onChange={(e) => setAchievements(achievements.map(a => a._id === ach._id ? {
                                    ...a,
                                    packs: e.target.value
                                } : a))}
                                placeholder="Pack Reward Quantity"
                            />
                            <div style={{position: 'relative'}}>
                                <input
                                    type="text"
                                    className="search-bar"
                                    value={ach.cardQuery}
                                    onChange={(e) => handleAchievementCardQueryChange(ach._id, e.target.value)}
                                    placeholder="Search reward card..."
                                />
                                {ach.cardResults && ach.cardResults.length > 0 && (
                                    <ul className="search-dropdown">
                                        {ach.cardResults.map(card => (
                                            <li
                                                key={card._id}
                                                className="search-result-item"
                                                onMouseDown={() => handleSelectAchievementCard(ach._id, card)}
                                            >
                                                {card.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="button-group">
                                <button className="success-button" onClick={() => handleSaveAchievement(ach)}>Save
                                </button>
                                <button style={{marginLeft: '1rem'}}
                                        onClick={() => handleDeleteAchievement(ach._id)}>Delete
                                </button>
                            </div>
                        </div>
                    ))}

                    <h3>Add Achievement</h3>
                    <input
                        type="text"
                        value={newAchievement.name}
                        onChange={(e) => setNewAchievement({...newAchievement, name: e.target.value})}
                        placeholder="Name"
                    />
                    <input
                        type="text"
                        value={newAchievement.description}
                        onChange={(e) => setNewAchievement({...newAchievement, description: e.target.value})}
                        placeholder="Description"
                    />
                    <input
                        type="number"
                        value={newAchievement.threshold}
                        onChange={(e) => setNewAchievement({...newAchievement, threshold: e.target.value})}
                        placeholder="Threshold"
                    />
                    <input
                        type="number"
                        value={newAchievement.packs}
                        onChange={(e) => setNewAchievement({...newAchievement, packs: e.target.value})}
                        placeholder="Pack Reward Quantity"
                    />
                    <div style={{position: 'relative'}}>
                        <input
                            type="text"
                            className="search-bar"
                            value={newAchievement.cardQuery}
                            onChange={(e) => handleNewAchievementCardQueryChange(e.target.value)}
                            placeholder="Search reward card..."
                        />
                        {newAchievementResults.length > 0 && (
                            <ul className="search-dropdown">
                                {newAchievementResults.map(card => (
                                    <li
                                        key={card._id}
                                        className="search-result-item"
                                        onMouseDown={() => handleSelectNewAchievementCard(card)}
                                    >
                                        {card.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="button-group">
                        <button onClick={handleCreateAchievement}>Create</button>
                    </div>
                </section>

                <section className="section-card">
                    <h2>Send Notification</h2>
                    <form onSubmit={handleNotificationSubmit} className="aa-admin-actions-form">

                        <div className="aa-form-group" style={{ position: 'relative' }}>
                            <label>User (Optional):</label>
                            <input
                                type="text"
                                className="search-bar"
                                value={notificationUser}
                                onChange={e => setNotificationUser(e.target.value)}
                                placeholder="Search to send to a specific user..."
                                onFocus={() => setNotificationUserDropdownVisible(true)}
                                onBlur={() => setTimeout(() => setNotificationUserDropdownVisible(false), 200)}
                            />
                            {isNotificationUserDropdownVisible && notificationUser && notificationFilteredUsers.length > 0 && (
                                <ul className="search-dropdown">
                                    {notificationFilteredUsers.map(u => (
                                        <li
                                            key={u._id}
                                            className="search-result-item"
                                            onMouseDown={() => setNotificationUser(u.username)}
                                        >
                                            <UserTitle username={u.username} title={u.selectedTitle} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="aa-form-group">
                            <label>Type:</label>
                            <select value={notificationType} onChange={e => setNotificationType(e.target.value)} required>
                                <option>General Announcement</option>
                                <option>Trade Offer Received</option>
                                <option>Trade Update</option>
                                <option>New Market Offer</option>
                                <option>Listing Update</option>
                                <option>Collection Milestone</option>
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
                        <div className="button-group">
                            <button type="submit" disabled={loading}>
                                {loading ? 'Sending...' : 'Send Notification'}
                            </button>
                        </div>
                    </form>
                </section>

                <section className="section-card">
                    <h2>Monthly Payout Failsafe</h2>
                    <p style={{marginBottom:'1rem', color:'#aaa'}}>
                        Manually trigger the pack distribution for the <strong>previous</strong> month.
                        Safe to click: Checks if payout was already processed first.
                    </p>
                    <div className="button-group">
                        <button className="primary-button" onClick={handleManualPayout} disabled={loading}>
                            {loading ? 'Processing...' : 'Trigger Last Month Payout'}
                        </button>
                    </div>
                </section>

                <section className="section-card">
                    <h2>Pack Rigging Control</h2>
                    <p style={{marginBottom: '0.5rem', color: '#aaa'}}>
                        Live weekly count: <strong>{packLuckStatus.weeklyCount}</strong>
                    </p>
                    <p style={{marginBottom: '1rem', color: '#aaa'}}>
                        Override status: <strong>{packLuckStatus.overrideEnabled ? `ON (${packLuckStatus.overrideCount})` : 'OFF'}</strong>
                    </p>
                    <div className="aa-form-group">
                        <label>Override Weekly Count:</label>
                        <input
                            type="number"
                            min="0"
                            value={packLuckOverrideInput}
                            onChange={(e) => setPackLuckOverrideInput(e.target.value)}
                        />
                    </div>
                    <div className="button-group">
                        <button className="primary-button" onClick={handleSetPackLuckOverride} disabled={packLuckLoading}>
                            {packLuckLoading ? 'Saving...' : 'Set Rig Level'}
                        </button>
                        <button className="secondary-button" onClick={handleClearPackLuckOverride} disabled={packLuckLoading}>
                            Use Live Weekly Count
                        </button>
                    </div>
                </section>

                <section className="section-card">
                    <h2>Manage User Packs</h2>
                    <form onSubmit={handleGivePacks} className="aa-admin-packs-form" style={{position: 'relative'}}>
                        <div className="aa-form-group" style={{position: 'relative'}}>
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
                                            <UserTitle username={u.username} title={u.selectedTitle} />
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
                        <div className="aa-form-group">
                            <label>Add Packs to All:</label>
                            <input
                                type="number"
                                min="1"
                                value={addAllAmount}
                                onChange={e => setAddAllAmount(e.target.value)}
                            />
                        </div>
                        <div className="button-group vertical">
                            <button className="primary-button" type="submit" disabled={loading}>
                                <i className="fa-solid fa-user"/> {loading ? 'Giving...' : 'Give Packs'}
                            </button>
                            <button className="secondary-button" type="button" disabled={loading}
                                    onClick={handleAddPacksAll}>
                                <i className="fa-solid fa-users"/> {loading ? 'Adding...' : 'Give To All'}
                            </button>
                            <button className="reject-button" type="button" disabled={loading} onClick={async () => {
                                const confirmed = window.confirm('Are you sure you want to reset ALL users\' packs to 6? This cannot be undone.');
                                if (!confirmed) return;
                                setLoading(true);
                                try {
                                    await handleResetAllPacks();
                                } finally {
                                    setLoading(false);
                                }
                            }}>
                                <i className="fa-solid fa-recycle"/> {loading ? 'Resetting...' : 'Reset All Packs to 6'}
                            </button>
                        </div>
                    </form>
                </section>

                <section className="section-card">
                    <h2>User Profile</h2>
                    <div style={{position: 'relative'}}>
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
                                            <UserTitle username={u.username} title={u.selectedTitle} />
                                        </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {selectedUserObj && (
                        <div className="user-profile-info">
                            <p><strong>Username:</strong> <UserTitle username={selectedUserObj.username} title={selectedUserObj.selectedTitle} /></p>
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

                <section className="section-card">
                    <h2>Dev Notes</h2>
                    <div className="aa-admin-actions-form">
                        <div className="aa-form-group">
                            <label>Add Note:</label>
                            <input
                                type="text"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Enter a note..."
                            />
                            <div className="button-group">
                                <button
                                    onClick={() => {
                                        if (!newNote.trim()) return;
                                        const updated = [...devNotes, newNote.trim()];
                                        setDevNotes(updated);
                                        localStorage.setItem('devNotes', JSON.stringify(updated));
                                        setNewNote('');
                                    }}
                                >
                                    Add Note
                                </button>
                            </div>
                        </div>
                        <ul style={{listStyle: 'none', padding: 0, maxHeight: '240px', overflowY: 'auto'}}>
                            {devNotes.map((note, idx) => (
                                <li key={idx} style={{
                                    marginBottom: '1rem',
                                    background: 'var(--surface-darker)',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',

                                }}>
                                    <span>{note}</span>
                                    <button
                                        onClick={() => {
                                            const updated = devNotes.filter((_, i) => i !== idx);
                                            setDevNotes(updated);
                                            localStorage.setItem('devNotes', JSON.stringify(updated));
                                        }}
                                        className="reject-button sm"
                                        style={{marginLeft: 'auto'}}
                                    >
                                        Delete
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className={`section-card ${maintenanceMode && 'maintenance-mode'}`}>
                    <h2>App Settings</h2>
                    <div className="setting-row">
                        <div className="setting-info">
                            <label htmlFor="maintenance-switch">Maintenance Mode</label>
                            <p className="description">
                                When ON, only admins can access the app.
                            </p>
                        </div>
                        <div className="setting-control">
                            <label className="switch-container">
                                <input
                                    type="checkbox"
                                    id="maintenance-switch"
                                    checked={maintenanceMode}
                                    onChange={handleToggleMaintenanceMode}
                                    disabled={maintenanceLoading}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminActions;
