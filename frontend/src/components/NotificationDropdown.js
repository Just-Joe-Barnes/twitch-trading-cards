// src/components/NotificationDropdown.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/NotificationDropdown.css';
import { fetchWithAuth } from '../utils/api';

const NotificationDropdown = ({ profilePic, userId }) => {
    const [notifications, setNotifications] = useState([]);

    // Fetch notifications on mount
    const fetchNotifications = async () => {
        try {
            const data = await fetchWithAuth('/api/notifications', { method: 'GET' });
            setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error.message);
        }
    };

    // Mark all as read when dropdown opens
    const handleDropdownOpen = async () => {
        try {
            await fetchWithAuth('/api/notifications/read', { method: 'PUT' });
            // Refresh notifications
            fetchNotifications();
        } catch (error) {
            console.error('Error marking notifications as read:', error.message);
        }
    };

    // Delete an individual notification
    const handleDelete = async (notificationId) => {
        try {
            await fetchWithAuth(`/api/notifications/${notificationId}`, { method: 'DELETE' });
            setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
        } catch (error) {
            console.error('Error deleting notification:', error.message);
        }
    };

    // Delete all notifications
    const handleClearAll = async () => {
        try {
            await fetchWithAuth('/api/notifications/clear', { method: 'DELETE' });
            setNotifications([]);
        } catch (error) {
            console.error('Error clearing notifications:', error.message);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    return (
        <div className="notification-dropdown" onMouseEnter={handleDropdownOpen}>
            <button className="notification-icon">
                <img src={profilePic} alt="Profile" className="notification-profile-pic" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                    <span className="notification-badge">{notifications.filter(n => !n.isRead).length}</span>
                )}
            </button>
            <div className="notification-menu">
                {notifications.length > 0 ? (
                    <>
                        <ul>
                            {notifications.map((n) => (
                                <li key={n._id} className={`notification-item ${n.isRead ? 'read' : 'unread'}`}>
                                    <Link to={n.link || '#'}>
                                        <span>{n.message}</span>
                                    </Link>
                                    <button className="delete-notification" onClick={() => handleDelete(n._id)}>
                                        ×
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <button className="clear-all-btn" onClick={handleClearAll}>
                            Clear All
                        </button>
                    </>
                ) : (
                    <p className="no-notifications">No notifications</p>
                )}
            </div>
        </div>
    );
};

export default NotificationDropdown;
