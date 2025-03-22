// src/pages/AdminActions.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserProfile, fetchWithAuth } from '../utils/api';
import '../styles/AdminActions.css';

const AdminActions = () => {
    const [notificationType, setNotificationType] = useState('');
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
            // Prepare payload with the selected type and message.
            const payload = {
                type: notificationType,
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
                setNotificationType('');
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
                    <select
                        value={notificationType}
                        onChange={(e) => setNotificationType(e.target.value)}
                        required
                    >
                        <option value="" disabled>
                            Select notification type
                        </option>
                        <option value="Trade Offer Received">Trade Offer Received</option>
                        <option value="Trade Update">Trade Update</option>
                        <option value="New Market Offer">New Market Offer</option>
                        <option value="Listing Update">Listing Update</option>
                        <option value="Collection Milestone">Collection Milestone</option>
                        <option value="General Announcement">General Announcement</option>
                    </select>
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
