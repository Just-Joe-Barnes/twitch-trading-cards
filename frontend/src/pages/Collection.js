import React, { useEffect, useState } from "react";
import "../styles/CardStyles.css";

const Collection = () => {
    const [cards, setCards] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCollection = async () => {
            try {
                const userId = localStorage.getItem("userId");
                if (!userId) throw new Error("User ID not found");

                const response = await fetch(`/api/collection/user/${userId}`);
                if (!response.ok) throw new Error("Failed to fetch collection");

                const data = await response.json();
                setCards(data.cards || []);
            } catch (err) {
                setError(err.message);
            }
        };

        fetchCollection();
    }, []);

    if (error) return <div className="error">{`Error: ${error}`}</div>;
    if (!cards.length)
        return <div className="error">No cards found in your collection.</div>;

    return (
        <div className="card-container">
            {cards.map((card, index) => (
                <div
                    className={`card card-${card.rarity.toLowerCase()}`}
                    key={index}
                    id={`card-${index}`}
                >
                    <div className="card-overlay"></div>
                    <div className="card-header">{card.name}</div>
                    <div className="card-image">
                        <img src={card.imageUrl} alt={card.name} />
                    </div>
                    <div className="card-details">{card.flavorText || "No description available"}</div>
                    <div className="card-mint">{`${card.mintNumber}/${card.totalCopies}`}</div>
                </div>
            ))}
        </div>
    );
};

export default Collection;
