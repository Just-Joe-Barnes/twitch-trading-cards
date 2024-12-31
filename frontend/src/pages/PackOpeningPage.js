import React, { useState } from 'react';
import { apiRequest } from '../utils/api';

const PacksPage = () => {
    const [cards, setCards] = useState([]);

    const openPack = async () => {
        try {
            const response = await apiRequest('/packs/open', 'POST', { userId: 'your_user_id' }); // Replace with dynamic user ID
            setCards(response.cards);
        } catch (error) {
            console.error('Error opening pack:', error);
        }
    };

    return (
        <div>
            <h1>Open Your Packs</h1>
            <button onClick={openPack}>Open Pack</button>
            <div className="cards-container">
                {cards.map((card, index) => (
                    <div key={index} className={`card ${card.rarity.toLowerCase()}`}>
                        <h2>{card.name}</h2>
                        <img src={card.imageUrl} alt={card.name} />
                        <p>{card.flavorText}</p>
                        <p>{card.mintNumber}/{card.totalCopies}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PacksPage;
