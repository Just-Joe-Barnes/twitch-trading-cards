// src/components/FlippingCard.js
import React from 'react';
import BaseCard from './BaseCard';
import '../styles/FlippingCard.css';

const FlippingCard = ({ card, isFaceDown, isRevealed, rarityColor, onFlip }) => {
    return (
        <div
            className={`card ${isRevealed ? 'visible' : 'hidden'} ${isFaceDown ? 'face-down' : 'face-up'}`}
            style={{ '--rarity-color': rarityColor }}
            onClick={onFlip}
        >
            <div className="card-inner">
                <div className="card-face card-back">
                    <img src="/images/card-back-placeholder.png" alt="Card Back" />
                </div>
                <div className="card-face card-front">
                    <div className="basecard-wrapper">
                        <BaseCard
                            name={card.name}
                            image={card.imageUrl}
                            description={card.flavorText}
                            rarity={card.rarity}
                            mintNumber={card.mintNumber}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlippingCard;
