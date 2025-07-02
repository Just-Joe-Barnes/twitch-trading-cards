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
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 480 : false);

    // Fetch logged-in user data including profile picture
    useEffect(() => {
        const fetchUsername = async () => {
            try {
                const profile = await fetchUserProfile();
                console.log('Fetched profile:', profile);
                setLoggedInUser(profile);
            } catch (error) {
                console.error('Error fetching user profile:', error.message);
            }
        };
        fetchUsername();
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 480);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const toggleMenu = () => {
        setMenuOpen(prev => !prev);
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
    };

    return (
        <nav className="navbar">
            <button
                className="burger-button"
                aria-expanded={menuOpen}
                aria-controls="primary-navigation"
                onClick={toggleMenu}
            >
                <span className="burger-bar"></span>
                <span className="burger-bar"></span>
                <span className="burger-bar"></span>
            </button>

            <div className="navbar-logo" onClick={() => navigate('/dashboard')} style={{cursor: 'pointer'}}>
                <img src="/images/NedsDecksLogo.png" alt="Ned's Decks" />
            </div>

            {!isMobile && (
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
            )}

            <ul
                id="primary-navigation"
                className={`navbar-links ${menuOpen ? 'open' : ''}`}
            >
                <li>
                    <NavLink
                        to={`/collection/${loggedInUser.username}`}
                        className="nav-link"
                        onClick={() => setMenuOpen(false)}
                    >
                        Collection
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/trading"
                        className="nav-link"
                        onClick={() => setMenuOpen(false)}
                    >
                        Trading
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/achievements"
                        className="nav-link"
                        onClick={() => setMenuOpen(false)}
                    >
                        Achievements
                    </NavLink>
                </li>
                {isAdmin && (
                    <>
                        <li>
                            <NavLink
                                to="/admin-dashboard"
                                className="nav-link"
                                onClick={() => setMenuOpen(false)}
                            >
                                Admin Dashboard
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/actions"
                                className="nav-link"
                                onClick={() => setMenuOpen(false)}
                            >
                                Admin Actions
                            </NavLink>
                        </li>
                    </>
                )}
                <li>
                    <NavLink
                        to="/market"
                        className="nav-link"
                        onClick={() => setMenuOpen(false)}
                    >
                        Market
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/catalogue"
                        className="nav-link"
                        onClick={() => setMenuOpen(false)}
                    >
                        Catalogue
                    </NavLink>
                </li>
                {isMobile && (
                    <li className="mobile-search">
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
                                                onClick={() => {
                                                    handleSearchSelect(user.username);
                                                    setMenuOpen(false);
                                                }}
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
                    </li>
                )}
            </ul>

            {/* Render NotificationDropdown only when loggedInUser._id is available */}
            {loggedInUser._id && (
                <div className="navbar-notifications">
                    <span className="navbar-username">{loggedInUser.username}</span>
                    <NotificationDropdown
                        profilePic={loggedInUser.twitchProfilePic || '/images/defaultProfile.png'}
                        userId={loggedInUser._id}
                        username={loggedInUser.username}
                        onLogout={handleLogout}
                    />
                </div>
            )}
        </nav>
    );
};

export default Navbar;
