import React from "react";
import "../styles/CardStyles.css";

const TradingCard = ({ card }) => {
    const rarityClass = `card-rarity-${card.rarity.toLowerCase()}`;

    return (
        <div className={`card ${rarityClass}`}>
            <div className="card-header">{card.name}</div>
            <div
                className="card-image"
                style={{ backgroundImage: `url(${card.imageUrl})` }}
            ></div>
            <div className="card-content">
                <div className="flavor-text">{card.flavorText}</div>
                <div>
                    Mint: {card.mintNumber} / {card.totalCopies}
                </div>
            </div>
            <div className="card-footer">Rarity: {card.rarity}</div>
        </div>
    );
};

export default TradingCard;
