// src/components/FlipCard.js
import React, { useState } from 'react';
import BaseCard from './BaseCard';
import '../styles/FlipCard.css';

const FlipCard = ({ card }) => {
    const [flipped, setFlipped] = useState(false);

    const handleClick = () => {
        setFlipped(!flipped);
    };

    return (
        <div className="flip-card" onClick={handleClick}>
            <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
                <div className="flip-card-front">
                    <BaseCard
                        name={card.name}
                        image={card.imageUrl}
                        description={card.flavorText}
                        rarity={card.rarity}
                        mintNumber={card.mintNumber}
                    />
                </div>
                <div className="flip-card-back">
                    <img
                        src="/images/card-back-placeholder.png"
                        alt="Card Back"
                        style={{ width: '300px', height: '450px', objectFit: 'cover' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default FlipCard;
