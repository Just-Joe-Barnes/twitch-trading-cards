import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UserTitle from './UserTitle';
import '../styles/UserDropdown.css';

const UserDropdown = ({ profilePic, username, selectedTitle, onLogout, isAdmin, isOpen, onToggle }) => {
    const dropdownRef = useRef(null);

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


    return (
        <div className="user-dropdown" ref={dropdownRef}>
            <button className="user-dropdown-toggle" onClick={onToggle}>
                <span className="navbar-username">
                    <UserTitle username={username} title={selectedTitle} />
                </span>
                <img src={profilePic} alt="Profile" className="profile-pic" />
            </button>

            {isOpen && (
                <div className="user-menu">
                    <Link to={`/profile/${username}`} onClick={onToggle} className="menu-item">My Profile</Link>
                    <Link to="/account" onClick={onToggle} className="menu-item">Account Options</Link>
                    {isAdmin && (
                        <>
                            <Link to="/admin-dashboard" onClick={onToggle} className="menu-item">Admin Dashboard</Link>
                            <Link to="/admin/" onClick={onToggle} className="menu-item">Admin Actions</Link>
                        </>
                    )}
                    <hr className="menu-divider" />
                    <button className="menu-item logout-btn" onClick={() => { onLogout(); onToggle(); }}>Logout</button>
                </div>
            )}
        </div>
    );
};

export default UserDropdown;
