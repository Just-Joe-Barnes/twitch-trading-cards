import React from 'react';
import '../styles/App.css';

const MaintenancePage = ({ onLogout }) => {
    return (
        <div className="page centered" style={{ textAlign: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <img src="/images/threat.png" alt="Ned's Decks" width="256px" style={{textAlign: 'center', marginTop: '1rem', marginLeft: 'auto', marginRight: 'auto'}} />
            <div className="section-card" style={{ maxWidth: '600px' }}>
                <h1>🚧 Under Maintenance 🚧</h1>
                <p>
                    The app is currently undergoing scheduled maintenance and is temporarily unavailable.
                </p>
                <p>
                    We'll be back online shortly. Thank you for your patience!
                </p>

                <button className="primary-button" style={{ marginTop: '1rem' }} onClick={onLogout}>
                    Logout
                </button>
            </div>
        </div>
    );
};

export default MaintenancePage;
