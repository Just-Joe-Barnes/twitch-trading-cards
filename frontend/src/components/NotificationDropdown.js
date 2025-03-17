// /src/components/NotificationDropdown.js
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/NotificationDropdown.css';
import { fetchWithAuth } from '../utils/api';

const NotificationDropdown = ({ profilePic, userId }) => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Fetch notifications on mount
    const fetchNotifications = async () => {
        try {
            const data = await fetchWithAuth('/api/notifications', { method: 'GET' });
            setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error.message);
        }
    };

    // Mark notifications as read when opening the dropdown
    const markNotificationsAsRead = async () => {
        try {
            await fetchWithAuth('/api/notifications/read', { method: 'PUT' });
            // Refresh notifications
            fetchNotifications();
        } catch (error) {
            console.error('Error marking notifications as read:', error.message);
        }
    };

    // Toggle the dropdown open/closed
    const toggleDropdown = () => {
        setIsOpen(prev => {
            // If opening, mark notifications as read
            if (!prev) {
                markNotificationsAsRead();
            }
            return !prev;
        });
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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, []);

    return (
        <div className="notification-dropdown" ref={dropdownRef}>
            <button className="notification-icon" onClick={toggleDropdown}>
                <img src={profilePic} alt="Profile" className="notification-profile-pic" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                    <span className="notification-badge">
                        {notifications.filter(n => !n.isRead).length}
                    </span>
                )}
            </button>
            {isOpen && (
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
            )}
        </div>
    );
};

export default NotificationDropdown;
