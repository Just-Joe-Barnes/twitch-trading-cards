import React from 'react';
import '../styles/App.css';
import {Link} from "react-router-dom";

const NotFoundPage = ({ onLogout }) => {
    return (
        <div className="page centered" style={{ textAlign: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <img src="/images/404.png" alt="Ned's Decks" width="256px" style={{textAlign: 'center', marginTop: '1rem', marginLeft: 'auto', marginRight: 'auto'}} />
            <div className="section-card" style={{ maxWidth: '600px' }}>

                <h1>404 - Page Not Found</h1>
                <p>Oops! The page you're looking for doesn't exist.</p>
                <Link to="/dashboard" className="back-link">Return to Dashboard</Link>
            </div>
        </div>
    );
};

export default NotFoundPage;
