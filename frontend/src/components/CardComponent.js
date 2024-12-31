import React from 'react';
import '../styles/CardComponent.css';


const CardComponent = ({ card }) => {
    return (
        <div className="card">
            <img src={card.imageUrl} alt={card.name} />
            <h3>{card.name}</h3>
            <p>Rarity: {card.rarity}</p>
            <p>Mint Number: {card.mintNumber}</p>
        </div>
    );
};

export default CardComponent;
