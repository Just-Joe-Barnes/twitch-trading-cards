import React, {useState} from 'react';
import {NavLink} from "react-router-dom";
import '../styles/NavAdmin.css';

const NavAdmin = () => {
    // State to manage the menu's open/closed state on mobile
    const [isOpen, setIsOpen] = useState(false);

    // Function to close the menu after a link is clicked
    const closeMenu = () => {
        setIsOpen(false);
    };

    return (
        <>
            {/* The hamburger button for mobile */}
            <button
                className="nav-admin-toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                ☰
            </button>

            {/* The main navigation menu */}
            <div className={`nav-admin ${isOpen ? 'open' : ''}`}>
                <NavLink to="/admin/" onClick={closeMenu}>Actions Home</NavLink>
                <NavLink to="/admin/cardmanagement" onClick={closeMenu}>Card Management</NavLink>
                <NavLink to="/admin/card-ownership" onClick={closeMenu}>Card Ownership</NavLink>
                <NavLink to="/admin/trades" onClick={closeMenu}>Trades</NavLink>
                <NavLink to="/admin/packs" onClick={closeMenu}>Pack Management</NavLink>
                <NavLink to="/admin/events" onClick={closeMenu}>Event Management</NavLink>
                <NavLink to="/admin/logs" onClick={closeMenu}>Logs</NavLink>
                <NavLink to="/admin/cardaudit" onClick={closeMenu}>Card Audit</NavLink>
            </div>
        </>
    );
};

export default NavAdmin;
