// src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';
import { searchUsers, fetchUserProfile } from '../utils/api';
import NotificationDropdown from './NotificationDropdown';

const Navbar = ({ isAdmin }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState({});
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Close menu on navigation
    useEffect(() => {
        const handleRouteChange = () => setMobileMenuOpen(false);
        window.addEventListener('popstate', handleRouteChange);
        return () => window.removeEventListener('popstate', handleRouteChange);
    }, []);

    // Prevent background scroll when menu open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [mobileMenuOpen]);

    // Fetch logged-in user data including profile picture
    useEffect(() => {
        const fetchUsername = async () => {
            try {
                const profile = await fetchUserProfile();
                setLoggedInUser(profile);
            } catch (error) {
                console.error('Error fetching user profile:', error.message);
            }
        };
        fetchUsername();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleSearchChange = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.length > 1) {
            try {
                const results = await searchUsers(query);
                setSearchResults(results);
                setIsDropdownVisible(true);
            } catch (error) {
                console.error('Error fetching search results:', error.message);
            }
        } else {
            setSearchResults([]);
            setIsDropdownVisible(false);
        }
    };

    const handleSearchSelect = (username) => {
        setSearchQuery('');
        setIsDropdownVisible(false);
        navigate(`/profile/${username}`);
        setMobileMenuOpen(false);
    };

    // All links used in both desktop and mobile menus
    const links = [
        { to: '/dashboard', label: 'Dashboard' },
        { to: `/collection/${loggedInUser.username || ''}`, label: 'Collection' },
        { to: `/profile/${loggedInUser.username || ''}`, label: 'My Profile' },
        { to: '/trading', label: 'Trading' },
        ...(isAdmin
            ? [
                  { to: '/admin-dashboard', label: 'Admin Dashboard' },
                  { to: '/admin/actions', label: 'Admin Actions' },
              ]
            : []),
        { to: '/market', label: 'Market' },
        { to: '/catalogue', label: 'Catalogue' },
    ];

    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <img src="/images/NedsDecksLogo.png" alt="Ned's Decks" />
            </div>

            <div className="navbar-search">
                <div className="search-wrapper">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search for users..."
                        className="search-bar"
                    />
                    {isDropdownVisible && (
                        <ul className="search-dropdown">
                            {searchResults.length > 0 ? (
                                searchResults.map((user) => (
                                    <li
                                        key={user._id}
                                        onClick={() => handleSearchSelect(user.username)}
                                        className="search-result-item"
                                    >
                                        {user.username}
                                    </li>
                                ))
                            ) : (
                                <li className="no-results">No users found</li>
                            )}
                        </ul>
                    )}
                </div>
            </div>

            {/* Hamburger for mobile */}
            <button
                className="navbar-hamburger"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label="Toggle menu"
            >
                <span />
                <span />
                <span />
            </button>

            {/* Desktop links */}
            <ul className="navbar-links">
                {links.map((link) => (
                    <li key={link.to}>
                        <NavLink
                            to={link.to}
                            className="nav-link"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {link.label}
                        </NavLink>
                    </li>
                ))}
                <li>
                    <button className="logout-button" onClick={handleLogout}>
                        Logout
                    </button>
                </li>
            </ul>

            {/* Mobile overlay */}
            {mobileMenuOpen && (
                <div className="navbar-mobile-overlay" onClick={() => setMobileMenuOpen(false)}>
                    <ul
                        className="navbar-mobile-links"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {links.map((link) => (
                            <li key={link.to}>
                                <NavLink
                                    to={link.to}
                                    className="nav-link"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {link.label}
                                </NavLink>
                            </li>
                        ))}
                        <li>
                            <button className="logout-button" onClick={handleLogout}>
                                Logout
                            </button>
                        </li>
                    </ul>
                </div>
            )}

            {loggedInUser._id && (
                <div className="navbar-notifications">
                    <NotificationDropdown
                        profilePic={loggedInUser.twitchProfilePic || '/images/defaultProfile.png'}
                        userId={loggedInUser._id}
                    />
                </div>
            )}
        </nav>
    );
};

export default Navbar;
