import React from 'react';
import './Collection.css';

const CollectionPage = () => {
    const fakeCards = [
        { id: 1, name: 'Dragon', rarity: 'Common', mintNumber: 1, totalCopies: 500 },
        { id: 2, name: 'Phoenix', rarity: 'Rare', mintNumber: 12, totalCopies: 100 },
        { id: 3, name: 'Griffin', rarity: 'Uncommon', mintNumber: 8, totalCopies: 300 },
    ];

    return (
        <div className="collection-container">
            <h1>Your Collection</h1>
            <div className="cards-grid">
                {fakeCards.map(card => (
                    <div className="card" key={card.id}>
                        <h2>{card.name}</h2>
                        <p>Rarity: {card.rarity}</p>
                        <p>
                            Mint Number: {card.mintNumber}/{card.totalCopies}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CollectionPage;
