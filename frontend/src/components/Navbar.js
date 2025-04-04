// src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { searchUsers, fetchUserProfile } from '../utils/api';
import NotificationDropdown from './NotificationDropdown';

const Navbar = ({ isAdmin }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState({});

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
    };

    return (
        <nav className="bg-gray-800 p-4 flex items-center justify-between text-white font-sans">
            <div className="flex items-center">
                <img src="/images/NedsDecksLogo.png" alt="Ned's Decks" className="h-8 w-auto" />
            </div>

            <div className="flex items-center">
                <div className="mr-4">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search for users..."
                        className="bg-gray-700 text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {isDropdownVisible && (
                        <ul className="absolute bg-gray-700 text-white rounded-md shadow-lg mt-1 py-1 z-10">
                            {searchResults.length > 0 ? (
                                searchResults.map((user) => (
                                    <li
                                        key={user._id}
                                        onClick={() => handleSearchSelect(user.username)}
                                        className="px-4 py-2 hover:bg-gray-600 cursor-pointer"
                                    >
                                        {user.username}
                                    </li>
                                ))
                            ) : (
                                <li className="px-4 py-2">No users found</li>
                            )}
                        </ul>
                    )}
                </div>

                <ul className="flex items-center space-x-4">
                    <li>
                        <NavLink to="/dashboard" className="hover:text-gray-300">
                            Dashboard
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to={`/collection/${loggedInUser.username}`} className="hover:text-gray-300">
                            Collection
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to={`/profile/${loggedInUser.username}`} className="hover:text-gray-300">
                            My Profile
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/trading" className="hover:text-gray-300">
                            Trading
                        </NavLink>
                    </li>
                    {isAdmin && (
                        <>
                            <li>
                                <NavLink to="/admin-dashboard" className="hover:text-gray-300">
                                    Admin Dashboard
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/admin/actions" className="hover:text-gray-300">
                                    Admin Actions
                                </NavLink>
                            </li>
                        </>
                    )}
                    <li>
                        <NavLink to="/market" className="hover:text-gray-300">
                            Market
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/catalogue" className="hover:text-gray-300">
                            Catalogue
                        </NavLink>
                    </li>
                    <li>
                        <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={handleLogout}>
                            Logout
                        </button>
                    </li>
                </ul>
            </div>

            {/* Render NotificationDropdown only when loggedInUser._id is available */}
            {loggedInUser._id && (
                <div className="ml-4">
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
