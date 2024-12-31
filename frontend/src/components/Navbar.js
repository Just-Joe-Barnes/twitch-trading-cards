import React from "react";
import "../styles/Navbar.css";

const Navbar = () => {
    return (
        <nav className="navbar">
            <div className="logo">Twitch Trading Cards</div>
            <ul className="nav-links">
                <li><a href="/dashboard">Dashboard</a></li>
                <li><a href="/collection">Card Collection</a></li>
                <li><a href="/packs">Open Packs</a></li>
                <li><a href="/logout">Logout</a></li>
            </ul>
        </nav>
    );
};

export default Navbar;
