// src/components/NotificationDropdown.js
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/NotificationDropdown.css';
import { fetchWithAuth, API_BASE_URL } from '../utils/api';
import io from 'socket.io-client';

const NotificationDropdown = ({ profilePic, userId }) => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const socketRef = useRef(null);

    // Establish the socket connection on mount
    useEffect(() => {
        if (!userId) return; // Do not connect if userId is not available

        // Create the socket connection to the backend
        socketRef.current = io(API_BASE_URL, {
            transports: ['websocket'],
        });

        // Join the room corresponding to this user so that the server can target notifications
        socketRef.current.emit('join', userId);

        // Listen for incoming notifications
        socketRef.current.on('notification', (newNotification) => {
            console.log("Received new notification via socket:", newNotification);
            // Prepend the new notification so that it's visible immediately
            setNotifications((prev) => [newNotification, ...prev]);
        });

        // Clean up the socket connection when the component unmounts
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [userId]);

    // Fetch notifications on component mount
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

    // Mark notifications as read when the dropdown opens
    const markNotificationsAsRead = async () => {
        try {
            await fetchWithAuth('/api/notifications/read', { method: 'PUT' });
            // Locally update notifications to mark them as read
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, isRead: true }))
            );
        } catch (error) {
            console.error('Error marking notifications as read:', error.message);
        }
    };

    const toggleDropdown = () => {
        setIsOpen((prev) => {
            if (!prev) {
                // When opening, mark as read
                markNotificationsAsRead();
            }
            return !prev;
        });
    };

    const handleDelete = async (notificationId) => {
        try {
            await fetchWithAuth(`/api/notifications/${notificationId}`, { method: 'DELETE' });
            setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
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

    // Close dropdown if clicking outside
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

    return (
        <div className="notification-dropdown" ref={dropdownRef}>
            <button className="notification-icon" onClick={toggleDropdown}>
                <img src={profilePic} alt="Profile" className="notification-profile-pic" />
                {/* Show a red circle indicator only if there are unread notifications */}
                {notifications.filter(n => !n.isRead).length > 0 && (
                    <span className="notification-indicator"></span>
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
