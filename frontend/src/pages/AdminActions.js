import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {fetchUserProfile, fetchWithAuth, searchCardsByName} from '../utils/api';
import '../styles/AdminActions.css';
import NavAdmin from "../components/NavAdmin";

const AdminActions = () => {
    const [newNote, setNewNote] = useState('');
    const [devNotes, setDevNotes] = useState(() => {
        const storedNotes = localStorage.getItem('devNotes');
        return storedNotes ? JSON.parse(storedNotes) : [];
    });
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);

    // Notification panel state
    const [notificationType, setNotificationType] = useState('');
    const [message, setMessage] = useState('');
    // Packs management state
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [packAmount, setPackAmount] = useState('');
    const [addAllAmount, setAddAllAmount] = useState('');
    const [isUserDropdownVisible, setUserDropdownVisible] = useState(false);

    // Achievements state
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

    // Pack management state


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

        checkAdmin();
        fetchUsers();
        fetchAchievements();
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
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({type: notificationType, message}),
            });
            window.showToast('Notification sent successfully.', 'success');
            setNotificationType('');
            setMessage('');
        } catch {
            window.showToast('Error sending notification.', 'error');
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

    const selectedUserObj = selectedUser && users.find(u => u.username === selectedUser);

    // Achievement card search helpers
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

    if (!isAdmin) {
        return <div style={{padding: '2rem', color: '#fff'}}>Not authorized</div>;
    }

    if (!users.length) {
        return <div style={{padding: '2rem', color: '#fff'}}>Loading...</div>;
    }

    return (
        <div className="page">
            <h1>Admin Actions</h1>

            <NavAdmin/>

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


                {/* Notification Panel */}
                <section className="section-card">
                    <h2>Send Notification</h2>
                    <form onSubmit={handleNotificationSubmit} className="aa-admin-actions-form">
                        <div className="aa-form-group">
                            <label>Type:</label>
                            <select value={notificationType} onChange={e => setNotificationType(e.target.value)}
                                    required>
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
                        <div className="button-group">
                            <button type="submit" disabled={loading}>
                                {loading ? 'Sending...' : 'Send Notification'}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Packs Management Panel */}
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

                {/* User Profile Viewer */}
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

                {/* Dev Notes To-Do List */}
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
            </div>
        </div>
    );
};

export default AdminActions;
