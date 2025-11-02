import React, {useState, useEffect, useRef} from 'react';
import {NavLink, useNavigate, useLocation} from 'react-router-dom';
import '../styles/Navbar.css';
import {searchUsers, fetchUserProfile} from '../utils/api';
// Make sure you've created these two new component files
import UserDropdown from './UserDropdown';
import NotificationBell from './NotificationBell';

const Navbar = ({isAdmin, isMaintenanceMode}) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const location = useLocation();
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState({});
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
    const navbarRef = useRef(null);
    const desktopDropdownRef = useRef(null);
    const mobileDropdownRef = useRef(null);

    const [activeIndex, setActiveIndex] = useState(-1);
    const [activeDropdown, setActiveDropdown] = useState(null);

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

    useEffect(() => {
        handleClearSearch();
        setActiveDropdown(null);
    }, [location.pathname]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (navbarRef.current && !navbarRef.current.contains(event.target)) {
                setActiveDropdown(null);
                handleClearSearch();
            }
        };
        // This existing logic will correctly close either dropdown now
        if (activeDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeDropdown]);

    useEffect(() => {
        const dropdownRef = isMobile ? mobileDropdownRef : desktopDropdownRef;
        if (activeIndex < 0 || !dropdownRef.current) return;
        const activeItem = dropdownRef.current.children[activeIndex];
        if (activeItem) {
            activeItem.scrollIntoView({
                block: 'nearest',
            });
        }
    }, [activeIndex, isMobile]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const toggleMenu = () => {
        setActiveDropdown(prev => (prev === 'main' ? null : 'main'));
    };

    const toggleUserDropdown = () => {
        setActiveDropdown(prev => (prev === 'user' ? null : 'user'));
    };

    // ADDED: A toggle function for the notification bell
    const toggleNotificationDropdown = () => {
        setActiveDropdown(prev => (prev === 'notifications' ? null : 'notifications'));
    };

    // ... (search handler functions remain unchanged) ...
    const handleSearchChange = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        setActiveIndex(-1);
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
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prevIndex) =>
                prevIndex < searchResults.length - 1 ? prevIndex + 1 : prevIndex
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && searchResults[activeIndex]) {
                handleSearchSelect(searchResults[activeIndex].username);
            }
        } else if (e.key === 'Escape') {
            handleClearSearch();
        }
    };
    const handleSearchSelect = (username) => {
        setSearchQuery('');
        setSearchResults([]);
        setIsDropdownVisible(false);
        setActiveIndex(-1);
        navigate(`/profile/${username}`);
    };
    const handleClearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setIsDropdownVisible(false);
        setActiveIndex(-1);
    };


    return (
        <nav className="navbar" ref={navbarRef}>
            {/* ... Burger Button and Logo ... */}
            <button
                className="burger-button"
                aria-expanded={activeDropdown === 'main'}
                aria-controls="primary-navigation"
                onClick={toggleMenu}
            >
                <span className="burger-bar"></span>
                <span className="burger-bar"></span>
                <span className="burger-bar"></span>
            </button>

            <div className="navbar-logo" onClick={() => navigate('/dashboard')} style={{cursor: 'pointer'}}>
                <img src="/images/logo-horizontal.png" alt="Ned's Decks"/>
            </div>

            {!isMobile && (
                <div className="navbar-search">
                    <div className="search-wrapper">
                        <input
                            type="search"
                            id="desktop-search-bar"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Search for users..."
                            className="search-bar"
                            autoComplete="off"
                        />
                        {isDropdownVisible && (
                            <ul className="search-dropdown" ref={desktopDropdownRef}>
                                {searchResults.length > 0 ? (
                                    searchResults.map((user, index) => (
                                        <li
                                            key={user._id}
                                            onClick={() => handleSearchSelect(user.username)}
                                            className={`search-result-item ${index === activeIndex ? 'active' : ''}`}
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

            {/* ... Maintenance Mode Banner ... */}
            {isMaintenanceMode && (
                <strong style={{backgroundColor: 'red', padding: '0.4rem 2rem', position: 'absolute', top: '8px', left: '44%'}}>MAINTENANCE MODE ACTIVE</strong>
            )}

            {/* ... Primary Navigation Links ... */}
            <ul id="primary-navigation" className={`navbar-links ${activeDropdown === 'main' ? 'open' : ''}`}>
                {/* ... your NavLink items ... */}
                <li><NavLink to={`/collection/${loggedInUser.username}`} className="nav-link" onClick={() => { setActiveDropdown(null); handleClearSearch(); }}>My Collection</NavLink></li>
                <li><NavLink to="/trading" className={({ isActive }) =>
                    isActive || location.pathname.startsWith('/trades')
                        ? "nav-link active"
                        : "nav-link"
                } onClick={() => { setActiveDropdown(null); handleClearSearch(); }}>Trading</NavLink></li>
                <li><NavLink to="/achievements" className="nav-link" style={{position: "relative"}} onClick={() => { setActiveDropdown(null); handleClearSearch(); }}>Achievements</NavLink></li>
                <li><NavLink to="/grading" className="nav-link" onClick={() => { setActiveDropdown(null); handleClearSearch(); }}>Card Grading</NavLink></li>
                <li><NavLink to="/community" className="nav-link" style={{position: "relative"}} onClick={() => { setActiveDropdown(null); handleClearSearch(); }}>Community</NavLink></li>
                <li><NavLink to="/market" className="nav-link" onClick={() => { setActiveDropdown(null); handleClearSearch(); }}>Market</NavLink></li>
                <li><NavLink to="/catalogue" className="nav-link" onClick={() => { setActiveDropdown(null); handleClearSearch(); }}>Catalogue</NavLink></li>

                {isMobile && (
                    <li className="mobile-search-item">
                        <div className="search-wrapper mobile-search-wrapper">
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Search for users..."
                                className="search-bar"
                                autoComplete="off"
                            />
                            {isDropdownVisible && (
                                <ul className="search-dropdown mobile-search-dropdown" ref={mobileDropdownRef}>
                                    {searchResults.length > 0 ? (
                                        searchResults.map((user, index) => (
                                            <li
                                                key={user._id}
                                                onClick={() => {
                                                    handleSearchSelect(user.username);
                                                    setActiveDropdown(null);
                                                }}
                                                className={`search-result-item ${index === activeIndex ? 'active' : ''}`}
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

            {/* UPDATED: Container for user actions */}
            <div className="navbar-user-actions">
                {loggedInUser._id && (
                    <>
                        <NotificationBell
                            userId={loggedInUser._id}
                            isOpen={activeDropdown === 'notifications'}
                            onToggle={toggleNotificationDropdown}
                        />
                        <UserDropdown
                            profilePic={loggedInUser.twitchProfilePic || '/images/defaultProfile.png'}
                            username={loggedInUser.username}
                            onLogout={handleLogout}
                            isAdmin={isAdmin}
                            isOpen={activeDropdown === 'user'}
                            onToggle={toggleUserDropdown}
                        />
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
