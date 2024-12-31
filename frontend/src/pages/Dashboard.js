// File: frontend/src/pages/Dashboard.js

import React, { useEffect, useState } from 'react';
import { get } from '../utils/api';
import '../styles/Dashboard.css';

const Dashboard = () => {
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await get('/dashboard');
                setUserData(response);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            }
        };

        fetchData();
    }, []);

    if (!userData) {
        return <div>Loading...</div>;
    }

    return (
        <div className="dashboard">
            <h1>Welcome to the Dashboard</h1>
            <p>Username: {userData.username}</p>
            <p>Packs Available: {userData.packs}</p>
            <h2>Your Cards:</h2>
            <div className="card-container">
                {userData.cards.map((card, index) => (
                    <div className={`card ${card.rarity.toLowerCase()}`} key={index}>
                        <h3 className="card-title">{card.name}</h3>
                        <img src={card.imageUrl} alt={card.name} className="card-image" />
                        <div className="card-details">                           
                            <div className="card-flavor-text">{card.flavorText}</div>
                            <p className="card-mint">
                                {card.mintNumber}/{card.totalCopies}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;
