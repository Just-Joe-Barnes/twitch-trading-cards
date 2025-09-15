import React, {useState} from 'react';
import {fetchWithAuth} from '../utils/api';

const PacksManagement = ({ users }) => {
    const [selectedUser, setSelectedUser] = useState('');
    const [packAmount, setPackAmount] = useState('');
    const [addAllAmount, setAddAllAmount] = useState('');
    const [isUserDropdownVisible, setUserDropdownVisible] = useState(false);
    const [loading, setLoading] = useState(false);


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

    const filteredUsers = selectedUser
        ? users.filter(u => u.username.toLowerCase().includes(selectedUser.toLowerCase()))
        : [];

    const selectedUserObj = selectedUser && users.find(u => u.username === selectedUser);


    return (
        <section className="section-card">
            <h2>Manage User Packs</h2>
            <form onSubmit={handleGivePacks} className="aa-admin-packs-form" style={{position: 'relative'}}>
                {/* ... (Your existing JSX for the Packs Management section) ... */}
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
    );
};

export default PacksManagement;
