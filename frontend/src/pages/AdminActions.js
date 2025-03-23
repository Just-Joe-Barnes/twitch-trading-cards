// src/pages/AdminActions.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserProfile, fetchWithAuth } from '../utils/api';
import '../styles/AdminActions.css';

const AdminActions = () => {
    const [notificationType, setNotificationType] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [packAmount, setPackAmount] = useState('');
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
                const res = await fetchWithAuth('/api/admin/users');
                const data = await res.json();
                setUsers(data);
            } catch (err) {
                console.error('Fetch users failed:', err);
            }
        };
        checkAdmin();
        fetchUsers();
    }, [navigate]);

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
        try {
            await fetchWithAuth('/api/admin/give-packs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUser, amount: Number(packAmount) }),
            });
            setStatus(`Gave ${packAmount} packs to user.`);
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

    return (
        <div className="aa-admin-actions-page">
            <h1>Admin Actions</h1>

            {/* Notification Panel */}
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

            {/* Packs Management Panel */}
            <section className="aa-admin-packs-section">
                <h2>Manage User Packs</h2>
                <form onSubmit={handleGivePacks} className="aa-admin-packs-form">
                    <div className="aa-form-group">
                        <label>User:</label>
                        <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} required>
                            <option value="" disabled>Select a user</option>
                            {users.map(u => (
                                <option key={u._id} value={u._id}>{u.username}</option>
                            ))}
                        </select>
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
                    <button type="button" onClick={handleResetAllPacks}>Reset All Packs to 6</button>
                </form>
            </section>

            {status && <p className="aa-status-message">{status}</p>}
        </div>
    );
};

export default AdminActions;
