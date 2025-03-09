// src/pages/CreateListingPage.js
import React, { useState, useEffect } from 'react';
import { fetchUserCollection } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import BaseCard from '../components/BaseCard';
import { useNavigate } from 'react-router-dom';
import "../styles/CreateListingPage.css";

const CreateListingPage = () => {
    const [collection, setCollection] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Fetch user collection on mount.
    useEffect(() => {
        const fetchCollection = async () => {
            try {
                // Assume you store token so you know your own collection.
                // You may need to adjust this if your API requires user id.
                const data = await fetchUserCollection();
                setCollection(data.cards || []);
            } catch (error) {
                console.error("Error fetching collection:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCollection();
    }, []);

    const handleCardSelect = (card) => {
        setSelectedCard(card);
    };

    const handleListCard = async () => {
        if (!selectedCard) return;
        try {
            const res = await fetch('/api/market/listings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ card: selectedCard }),
            });
            if (res.ok) {
                alert('Card listed on the market successfully!');
                navigate('/market');
            } else {
                const errorData = await res.json();
                alert(`Error: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Error listing card:', error);
            alert('Error listing card');
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="create-listing-page">
            <h1>Create New Listing</h1>
            <p>Select a card from your collection to list on the market:</p>
            <div className="cards-grid">
                {collection.map((card) => (
                    <div
                        key={card._id}
                        className={`card-wrapper ${selectedCard && selectedCard._id === card._id ? 'selected' : ''}`}
                        onClick={() => handleCardSelect(card)}
                    >
                        <BaseCard
                            name={card.name}
                            image={card.imageUrl}
                            rarity={card.rarity}
                            description={card.flavorText}
                            mintNumber={card.mintNumber}
                        />
                    </div>
                ))}
            </div>
            {selectedCard && (
                <div className="listing-preview">
                    <h2>Listing Preview</h2>
                    <BaseCard
                        name={selectedCard.name}
                        image={selectedCard.imageUrl}
                        rarity={selectedCard.rarity}
                        description={selectedCard.flavorText}
                        mintNumber={selectedCard.mintNumber}
                    />
                    <button onClick={handleListCard}>List This Card</button>
                </div>
            )}
        </div>
    );
};

export default CreateListingPage;
