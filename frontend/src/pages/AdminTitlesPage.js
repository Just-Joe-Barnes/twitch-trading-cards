import React, { useEffect, useMemo, useState } from 'react';
import { fetchWithAuth } from '../utils/api';
import UserTitle from '../components/UserTitle';
import '../styles/AdminActions.css';

const emptyTitle = {
    name: '',
    slug: '',
    description: '',
    color: '',
    gradient: '',
    isAnimated: false,
    effect: ''
};

const AdminTitlesPage = () => {
    const [titles, setTitles] = useState([]);
    const [newTitle, setNewTitle] = useState(emptyTitle);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedTitleId, setSelectedTitleId] = useState('');
    const [setActiveOnGrant, setSetActiveOnGrant] = useState(true);
    const [isUserDropdownVisible, setUserDropdownVisible] = useState(false);

    const grantableTitles = useMemo(
        () => titles.filter((title) => !title.isVirtual),
        [titles]
    );

    const loadData = async () => {
        try {
            const [titleRes, userRes] = await Promise.all([
                fetchWithAuth('/api/admin/titles', { method: 'GET' }),
                fetchWithAuth('/api/admin/users', { method: 'GET' })
            ]);
            setTitles(titleRes.titles || []);
            setUsers(userRes || []);
        } catch (err) {
            console.error('Error loading titles:', err);
            if (window.showToast) {
                window.showToast('Failed to load titles.', 'error');
            }
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleUpdateTitle = async (title) => {
        try {
            const res = await fetchWithAuth(`/api/admin/titles/${title._id}`, {
                method: 'PUT',
                body: JSON.stringify(title)
            });
            const updated = res.title;
            setTitles((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
            if (window.showToast) {
                window.showToast('Title updated.', 'success');
            }
        } catch (err) {
            console.error('Error updating title:', err);
            if (window.showToast) {
                window.showToast(err.message || 'Failed to update title.', 'error');
            }
        }
    };

    const handleDeleteTitle = async (titleId) => {
        if (!window.confirm('Delete this title? This cannot be undone.')) {
            return;
        }
        try {
            await fetchWithAuth(`/api/admin/titles/${titleId}`, { method: 'DELETE' });
            setTitles((prev) => prev.filter((t) => t._id !== titleId));
            if (window.showToast) {
                window.showToast('Title deleted.', 'success');
            }
        } catch (err) {
            console.error('Error deleting title:', err);
            if (window.showToast) {
                window.showToast(err.message || 'Failed to delete title.', 'error');
            }
        }
    };

    const handleCreateTitle = async () => {
        if (!newTitle.name.trim()) {
            if (window.showToast) {
                window.showToast('Title name is required.', 'error');
            }
            return;
        }
        try {
            const res = await fetchWithAuth('/api/admin/titles', {
                method: 'POST',
                body: JSON.stringify(newTitle)
            });
            setTitles((prev) => [res.title, ...prev]);
            setNewTitle(emptyTitle);
            if (window.showToast) {
                window.showToast('Title created.', 'success');
            }
        } catch (err) {
            console.error('Error creating title:', err);
            if (window.showToast) {
                window.showToast(err.message || 'Failed to create title.', 'error');
            }
        }
    };

    const handleCreateFromPreset = async (title) => {
        try {
            await fetchWithAuth('/api/admin/titles', {
                method: 'POST',
                body: JSON.stringify({
                    name: title.name,
                    slug: title.slug,
                    description: title.description || '',
                    color: title.color || '',
                    gradient: title.gradient || '',
                    isAnimated: Boolean(title.isAnimated),
                    effect: title.effect || ''
                })
            });
            if (window.showToast) {
                window.showToast('Title created from achievement preset.', 'success');
            }
            await loadData();
        } catch (err) {
            console.error('Error creating title from preset:', err);
            if (window.showToast) {
                window.showToast(err.message || 'Failed to create title from preset.', 'error');
            }
        }
    };

    const filteredUsers = useMemo(() => {
        if (!selectedUser) return [];
        const lower = selectedUser.toLowerCase();
        return users.filter((u) => u.username.toLowerCase().includes(lower));
    }, [selectedUser, users]);

    const selectedUserObj = useMemo(
        () => users.find((u) => u.username === selectedUser),
        [selectedUser, users]
    );

    useEffect(() => {
        if (selectedUserObj?.selectedTitle?._id) {
            setSelectedTitleId(selectedUserObj.selectedTitle._id);
        } else if (selectedUser) {
            setSelectedTitleId('');
        }
    }, [selectedUser, selectedUserObj]);

    const handleGrantTitle = async () => {
        if (!selectedUserObj || !selectedTitleId) {
            if (window.showToast) {
                window.showToast('Select a user and title first.', 'error');
            }
            return;
        }
        try {
            await fetchWithAuth('/api/admin/titles/grant', {
                method: 'POST',
                body: JSON.stringify({
                    userId: selectedUserObj._id,
                    titleId: selectedTitleId,
                    setActive: setActiveOnGrant
                })
            });
            if (window.showToast) {
                window.showToast('Title granted.', 'success');
            }
            await loadData();
        } catch (err) {
            console.error('Error granting title:', err);
            if (window.showToast) {
                window.showToast(err.message || 'Failed to grant title.', 'error');
            }
        }
    };

    const handleRevokeTitle = async () => {
        if (!selectedUserObj || !selectedTitleId) {
            if (window.showToast) {
                window.showToast('Select a user and title first.', 'error');
            }
            return;
        }
        try {
            await fetchWithAuth('/api/admin/titles/revoke', {
                method: 'POST',
                body: JSON.stringify({
                    userId: selectedUserObj._id,
                    titleId: selectedTitleId
                })
            });
            if (window.showToast) {
                window.showToast('Title revoked.', 'success');
            }
            await loadData();
        } catch (err) {
            console.error('Error revoking title:', err);
            if (window.showToast) {
                window.showToast(err.message || 'Failed to revoke title.', 'error');
            }
        }
    };

    return (
        <div className="page">
            <div className="admin-panel-grid">
                <section className="section-card">
                    <h2>Titles</h2>
                    {titles.length === 0 && <p>No titles yet.</p>}
                    {titles.map((title) => (
                        <div key={title._id} style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-dark)', paddingBottom: '1rem' }}>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <UserTitle username="Preview" title={title} />
                                {title.isVirtual && (
                                    <div style={{ marginTop: '0.35rem', color: 'var(--brand-secondary)', fontSize: '0.85rem' }}>
                                        Achievement preset (not yet created)
                                    </div>
                                )}
                            </div>
                            <input
                                type="text"
                                value={title.name}
                                onChange={(e) => setTitles((prev) => prev.map((t) => t._id === title._id ? { ...t, name: e.target.value } : t))}
                                placeholder="Title name"
                                disabled={title.isVirtual}
                            />
                            <input
                                type="text"
                                value={title.slug || ''}
                                onChange={(e) => setTitles((prev) => prev.map((t) => t._id === title._id ? { ...t, slug: e.target.value } : t))}
                                placeholder="Slug (auto if empty)"
                                disabled={title.isVirtual}
                            />
                            <input
                                type="text"
                                value={title.description || ''}
                                onChange={(e) => setTitles((prev) => prev.map((t) => t._id === title._id ? { ...t, description: e.target.value } : t))}
                                placeholder="Description"
                                disabled={title.isVirtual}
                            />
                            <input
                                type="text"
                                value={title.color || ''}
                                onChange={(e) => setTitles((prev) => prev.map((t) => t._id === title._id ? { ...t, color: e.target.value } : t))}
                                placeholder="Color (hex or css color)"
                                disabled={title.isVirtual}
                            />
                            <input
                                type="text"
                                value={title.gradient || ''}
                                onChange={(e) => setTitles((prev) => prev.map((t) => t._id === title._id ? { ...t, gradient: e.target.value } : t))}
                                placeholder="Gradient (ex: linear-gradient(...))"
                                disabled={title.isVirtual}
                            />
                            <input
                                type="text"
                                value={title.effect || ''}
                                onChange={(e) => setTitles((prev) => prev.map((t) => t._id === title._id ? { ...t, effect: e.target.value } : t))}
                                placeholder="Effect (future use)"
                                disabled={title.isVirtual}
                            />
                            <div className="button-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(title.isAnimated)}
                                        onChange={(e) => setTitles((prev) => prev.map((t) => t._id === title._id ? { ...t, isAnimated: e.target.checked } : t))}
                                        disabled={title.isVirtual}
                                    />
                                    Animated Gradient
                                </label>
                            </div>
                            <div className="button-group">
                                {title.isVirtual ? (
                                    <button className="success-button" onClick={() => handleCreateFromPreset(title)}>Create Title</button>
                                ) : (
                                    <>
                                        <button className="success-button" onClick={() => handleUpdateTitle(title)}>Save</button>
                                        <button className="reject-button" onClick={() => handleDeleteTitle(title._id)}>Delete</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </section>

                <section className="section-card">
                    <h2>Add Title</h2>
                    <input
                        type="text"
                        value={newTitle.name}
                        onChange={(e) => setNewTitle({ ...newTitle, name: e.target.value })}
                        placeholder="Title name"
                    />
                    <input
                        type="text"
                        value={newTitle.slug}
                        onChange={(e) => setNewTitle({ ...newTitle, slug: e.target.value })}
                        placeholder="Slug (optional)"
                    />
                    <input
                        type="text"
                        value={newTitle.description}
                        onChange={(e) => setNewTitle({ ...newTitle, description: e.target.value })}
                        placeholder="Description"
                    />
                    <input
                        type="text"
                        value={newTitle.color}
                        onChange={(e) => setNewTitle({ ...newTitle, color: e.target.value })}
                        placeholder="Color (hex or css color)"
                    />
                    <input
                        type="text"
                        value={newTitle.gradient}
                        onChange={(e) => setNewTitle({ ...newTitle, gradient: e.target.value })}
                        placeholder="Gradient (ex: linear-gradient(...))"
                    />
                    <input
                        type="text"
                        value={newTitle.effect}
                        onChange={(e) => setNewTitle({ ...newTitle, effect: e.target.value })}
                        placeholder="Effect (future use)"
                    />
                    <div className="button-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                checked={Boolean(newTitle.isAnimated)}
                                onChange={(e) => setNewTitle({ ...newTitle, isAnimated: e.target.checked })}
                            />
                            Animated Gradient
                        </label>
                    </div>
                    <div className="button-group">
                        <button onClick={handleCreateTitle}>Create</button>
                    </div>
                </section>

                <section className="section-card">
                    <h2>Grant / Revoke</h2>
                    <div className="aa-form-group" style={{ position: 'relative' }}>
                        <label>User</label>
                        <input
                            type="text"
                            className="search-bar"
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            placeholder="Search user..."
                            onFocus={() => setUserDropdownVisible(true)}
                            onBlur={() => setTimeout(() => setUserDropdownVisible(false), 200)}
                        />
                        {isUserDropdownVisible && selectedUser && filteredUsers.length > 0 && (
                            <ul className="search-dropdown">
                                {filteredUsers.map((u) => (
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
                        <p style={{ marginTop: '0.5rem' }}>
                            Current: <UserTitle username={selectedUserObj.username} title={selectedUserObj.selectedTitle} />
                        </p>
                    )}
                    <div className="aa-form-group">
                        <label>Title</label>
                        <select value={selectedTitleId} onChange={(e) => setSelectedTitleId(e.target.value)}>
                            <option value="">Select a title</option>
                            {grantableTitles.map((t) => (
                                <option key={t._id} value={t._id}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="aa-form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                checked={setActiveOnGrant}
                                onChange={(e) => setSetActiveOnGrant(e.target.checked)}
                            />
                            Set active when granting
                        </label>
                    </div>
                    <div className="button-group">
                        <button className="success-button" onClick={handleGrantTitle}>Grant</button>
                        <button className="reject-button" onClick={handleRevokeTitle}>Revoke</button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminTitlesPage;
