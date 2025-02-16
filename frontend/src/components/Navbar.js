// src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';
import { searchUsers, fetchUserProfile } from '../utils/api';

const Navbar = ({ isAdmin }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [loggedInUsername, setLoggedInUsername] = useState('');

    // Fetch the logged-in user's username on component mount
    useEffect(() => {
        const fetchUsername = async () => {
            try {
                const profile = await fetchUserProfile();
                setLoggedInUsername(profile.username);
            } catch (error) {
                console.error('Error fetching logged-in user profile:', error.message);
            }
        };

        fetchUsername();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token'); // Clear the token
        navigate('/login'); // Redirect to login
    };

    const handleSearchChange = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.length > 1) {
            try {
                const results = await searchUsers(query); // Fetch matching usernames
                setSearchResults(results);
                setIsDropdownVisible(true); // Show the dropdown
            } catch (error) {
                console.error('Error fetching search results:', error.message);
            }
        } else {
            setSearchResults([]);
            setIsDropdownVisible(false); // Hide the dropdown if query is too short
        }
    };

    const handleSearchSelect = (username) => {
        setSearchQuery(''); // Clear the search bar
        setIsDropdownVisible(false); // Hide the dropdown
        navigate(`/profile/${username}`); // Redirect to the selected user's profile
    };

    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <h1>Ned's Decks</h1>
            </div>

            <div className="navbar-search">
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

            <ul className="navbar-links">
                <li>
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        Dashboard
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to={`/collection/${loggedInUsername}`}
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        Collection
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to={`/profile/${loggedInUsername}`}
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        My Profile
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/trading"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        Trading
                    </NavLink>
                </li>
                {isAdmin && (
                    <li>
                        <NavLink
                            to="/admin-dashboard"
                            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                        >
                            Admin Dashboard
                        </NavLink>
                    </li>
                )}
                {/* New Catalogue page link */}
                <li>
                    <NavLink
                        to="/catalogue"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        Catalogue
                    </NavLink>
                </li>
                <li>
                    <button className="logout-button" onClick={handleLogout}>
                        Logout
                    </button>
                </li>
            </ul>
        </nav>
    );
};

export default Navbar;
