// src/pages/AdminActions.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserProfile, fetchWithAuth } from '../utils/api';
import '../styles/AdminActions.css';

const AdminActions = () => {
    const [type, setType] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('');
    const navigate = useNavigate();

    // Ensure that only admins can access this page.
    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const profile = await fetchUserProfile();
                if (!profile.isAdmin) {
                    navigate('/');
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
                navigate('/');
            }
        };
        checkAdmin();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Prepare payload without link or extra fields.
            const payload = {
                type,
                message
            };

            const response = await fetchWithAuth('/api/admin/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (response.ok) {
                setStatus('Notification sent successfully.');
                // Clear fields on success
                setType('');
                setMessage('');
            } else {
                setStatus('Failed to send notification: ' + data.message);
            }
        } catch (error) {
            console.error('Error sending notification:', error);
            setStatus('Error sending notification.');
        }
    };

    return (
        <div className="aa-admin-actions-page">
            <h1>Admin Actions</h1>
            <form onSubmit={handleSubmit} className="aa-admin-actions-form">
                <div className="aa-form-group">
                    <label>Type:</label>
                    <input
                        type="text"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        placeholder="e.g. General Update"
                        required
                    />
                </div>
                <div className="aa-form-group">
                    <label>Message:</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Enter the notification message"
                        required
                    />
                </div>
                <button type="submit">Send Notification</button>
            </form>
            {status && <p className="aa-status-message">{status}</p>}
        </div>
    );
};

export default AdminActions;
