import React, { useEffect, useState, useRef } from 'react';
import {Link} from 'react-router-dom';
import '../styles/NotificationDropdown.css';
import { fetchWithAuth, API_BASE_URL } from '../utils/api';
import io from 'socket.io-client';

const NotificationDropdown = ({ profilePic, userId, username, onLogout, isAdmin, isOpen, onToggle }) => {
    const [notifications, setNotifications] = useState([]);
    const dropdownRef = useRef(null);
    const socketRef = useRef(null);
    const [keyCounter, setKeyCounter] = useState(0);

    useEffect(() => {
        if (!userId) {
            return;
        }
        socketRef.current = io(API_BASE_URL, {
            transports: ['websocket'],
        });

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
        const fetchNotifications = async () => {
            try {
                const data = await fetchWithAuth('/api/notifications', { method: 'GET' });
                setNotifications(data);
            } catch (error) {
                console.error('Error fetching notifications:', error.message);
            }
        };
        fetchNotifications();
    }, []);

    const markNotificationsAsRead = async () => {
        try {
            await fetchWithAuth('/api/notifications/read', { method: 'PUT' });
            setNotifications(prev =>
                prev.map(n => ({ ...n, isRead: true }))
            );
        } catch (error) {
            console.error('Error marking notifications as read:', error.message);
        }
    };

    const toggleDropdown = () => {
        if (!isOpen) {
            markNotificationsAsRead();
        }
        onToggle();
    };

    const handleDelete = async (notificationId) => {
        try {
            await fetchWithAuth(`/api/notifications/${notificationId}`, { method: 'DELETE' });
            setNotifications(prev => prev.filter(n => n._id !== notificationId));
            setKeyCounter(prev => prev + 1);
        } catch (error) {
            console.error('Error deleting notification:', error.message);
        }
    };

    const handleClearAll = async () => {
        try {
            await fetchWithAuth('/api/notifications/clear', { method: 'DELETE' });
            setNotifications([]);
        } catch (error) {
            console.error('Error clearing notifications:', error.message);
        }
    };

    return (
        <div className="notification-dropdown" ref={dropdownRef}>
            <button className="notification-icon" onClick={toggleDropdown}>
                <span className="navbar-username">{username}</span>
                <img src={profilePic} alt="Profile" className={notifications.filter(n => !n.isRead).length > 0 ? 'notification-profile-pic pulse' : 'notification-profile-pic'} />
                {notifications.filter(n => !n.isRead).length > 0 && (
                    <span className="notification-indicator pulse"></span>
                )}
            </button>
            {isOpen && (
                <div className="notification-menu">
                    <div className="profile-actions">
                        <Link to={`/profile/${username}`} onClick={onToggle} className="profile-action">My Profile</Link>
                        {isAdmin && (
                            <>
                                <Link to="/admin-dashboard" onClick={onToggle} className="profile-action admin-action" > Admin Dashboard </Link>
                                <Link to="/admin/actions" onClick={onToggle} className="profile-action admin-action" > Admin Actions </Link>
                            </>
                        )}
                        <button className="profile-action" onClick={() => { onLogout(); onToggle(); }}>Logout</button>
                    </div>
                    <hr className="profile-divider" />
                    {notifications.length > 0 ? (
                        <>
                            <ul>
                                {notifications.map((n) => (
                                    <li
                                        key={`${n._id}-${keyCounter}`}
                                        className={`notification-item ${n.isRead ? 'read' : 'unread'}`}
                                    >
                                        <Link to={n.link || '#'} onClick={onToggle}>
                                            <span>{n.message}</span>
                                        </Link>
                                        <button
                                            className="delete-notification"
                                            onClick={() => handleDelete(n._id)}
                                        >
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
