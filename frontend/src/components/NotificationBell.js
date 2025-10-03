import React, { useEffect, useState, useRef } from 'react';
// MODIFIED: Import useNavigate for programmatic navigation
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth, API_BASE_URL } from '../utils/api';
import io from 'socket.io-client';
import '../styles/NotificationBell.css';

const NotificationBell = ({ userId, isOpen, onToggle }) => {
    const [notifications, setNotifications] = useState([]);
    const dropdownRef = useRef(null);
    const socketRef = useRef(null);
    // ADDED: Initialize the navigate function
    const navigate = useNavigate();

    // ... (useEffect hooks remain the same) ...
    useEffect(() => {
        if (!userId) return;
        const fetchNotifications = async () => {
            try {
                const data = await fetchWithAuth('/api/notifications');
                setNotifications(data);
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };
        fetchNotifications();
        socketRef.current = io(API_BASE_URL, { transports: ['websocket'] });
        socketRef.current.emit('join', userId);
        socketRef.current.on('notification', (newNotification) => {
            setNotifications(prev => [newNotification, ...prev]);
        });
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [userId]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onToggle();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onToggle]);


    // ADDED: New handler for clicking a single notification
    const handleNotificationClick = async (notification) => {
        // Only make an API call if it's unread
        if (!notification.isRead) {
            try {
                // This is a new backend endpoint you will need to create
                await fetchWithAuth(`/api/notifications/${notification._id}/read`, { method: 'PUT' });
                // Update the state locally for an instant UI change
                setNotifications(prevNotifications =>
                    prevNotifications.map(n =>
                        n._id === notification._id ? { ...n, isRead: true } : n
                    )
                );
            } catch (error) {
                console.error('Error marking notification as read:', error);
                // We can still proceed with navigation even if the API call fails
            }
        }

        // Close the dropdown and navigate if a link exists
        if (notification.link && notification.link !== '#') {
            onToggle();
            navigate(notification.link);
        }
    };

    // ... (markAllAsRead, handleDelete, handleDeleteAll remain the same) ...
    const markAllAsRead = async () => {
        try {
            await fetchWithAuth('/api/notifications/read', { method: 'PUT' });
            setNotifications(prev =>
                prev.map(n => ({ ...n, isRead: true }))
            );
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    };
    const handleDelete = async (notificationId) => {
        try {
            await fetchWithAuth(`/api/notifications/${notificationId}`, { method: 'DELETE' });
            setNotifications(prev => prev.filter(n => n._id !== notificationId));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };
    const handleDeleteAll = async () => {
        try {
            await fetchWithAuth('/api/notifications/clear', { method: 'DELETE' });
            setNotifications([]);
        } catch (error) {
            console.error('Error deleting all notifications:', error);
        }
    };


    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="notification-bell" ref={dropdownRef}>
            <button className="icon-button" onClick={onToggle}>
                <i className="fas fa-bell"></i>
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-menu">
                    <div className="notification-header">
                        <div className="notification-actions">
                            <button onClick={markAllAsRead} disabled={unreadCount === 0} title="Mark all as read"><i className="fas fa-envelope-open"></i></button>
                            <h3>Notifications</h3>
                            <button onClick={handleDeleteAll} disabled={notifications.length === 0} title="Delete all notifications"><i className="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <hr className="notification-divider" />
                    {notifications.length > 0 ? (
                        <ul className="notification-list">
                            {notifications.map((n) => (
                                <li
                                    key={n._id}
                                    className={`notification-item ${n.isRead ? 'read' : 'unread'}`}
                                >
                                    <div
                                        className="notification-content"
                                        onClick={() => handleNotificationClick(n)}
                                        role="button"
                                        tabIndex="0"
                                    >
                                        <p>{n.message}</p>
                                        <span className="notification-time">{new Date(n.createdAt).toLocaleString()}</span>
                                    </div>
                                    <button
                                        className="delete-notification-btn"
                                        onClick={() => handleDelete(n._id)}
                                        title="Delete notification"
                                    >
                                        <i className="fas fa-xs fa-trash"></i>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="no-notifications">You have no notifications.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
