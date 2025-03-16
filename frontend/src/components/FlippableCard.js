import React, { useState } from 'react';
import BaseCard from './BaseCard';
import './FlippableCard.css';

const rarityGlowMap = {
    Basic: '#8D8D8D',
    Common: '#64B5F6',
    Standard: '#66BB6A',
    Uncommon: '#1976D2',
    Rare: '#AB47BC',
    Epic: '#FFA726',
    Legendary: '#e32232',
    Mythic: 'hotpink',
    Unique: 'black',
    Divine: 'white',
};

const FlippableCard = ({ card, revealed }) => {
    const [flipped, setFlipped] = useState(false);

    const handleClick = () => {
        if (revealed && !flipped) {
            setFlipped(true);
        }
    };

    const glowColor = rarityGlowMap[card.rarity] || '#fff';

    return (
        <div className={`flippable-card ${flipped ? 'flipped' : ''}`} onClick={handleClick}>
            <div className="card-inner">
                <div className="card-front">
                    <BaseCard {...card} />
                </div>
                <div className="card-back" style={{ border: `4px solid ${glowColor}` }}>
                    {/* You can replace this with your own card back design/image */}
                    <img src="/path/to/card-back.png" alt="Card Back" />
                </div>
            </div>
        </div>
    );
};

export default FlippableCard;
