// src/pages/CreateListingPage.js
import React, { useState, useEffect } from 'react';
import { fetchUserCollection, fetchUserProfile, API_BASE_URL } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import BaseCard from '../components/BaseCard';
import { useNavigate } from 'react-router-dom';
import "../styles/CreateListingPage.css";

const CreateListingPage = () => {
    const [collection, setCollection] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCollection = async () => {
            try {
                const profile = await fetchUserProfile();
                const data = await fetchUserCollection(profile._id);
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
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/listings`, {
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
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="create-listing-page">
            <h1 className="page-title">Create a Market Listing</h1>
            <p className="page-subtitle">Select a card from your collection to list:</p>

            <div className="create-listing-layout">
                {/* Collection Section */}
                <div className="collection-section">
                    <h2>Your Collection</h2>
                    <div className="collection-grid">
                        {collection.length === 0 ? (
                            <p>No available cards to list.</p>
                        ) : (
                            collection.map((card) => (
                                <div
                                    key={card._id}
                                    className={`listing-card-item ${selectedCard?._id === card._id ? 'selected' : ''}`}
                                    onClick={() => handleCardSelect(card)}
                                >
                                    <BaseCard
                                        name={card.name}
                                        image={card.imageUrl}
                                        description={card.flavorText}
                                        rarity={card.rarity}
                                        mintNumber={card.mintNumber}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Listing Preview Section */}
                <div className="preview-section">
                    <h2>Listing Preview</h2>
                    {selectedCard ? (
                        <div className="listing-preview-container">
                            <BaseCard
                                name={selectedCard.name}
                                image={selectedCard.imageUrl}
                                description={selectedCard.flavorText}
                                rarity={selectedCard.rarity}
                                mintNumber={selectedCard.mintNumber}
                            />
                            <button
                                className="list-card-button"
                                onClick={handleListCard}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Listing...' : 'List This Card'}
                            </button>
                        </div>
                    ) : (
                        <p>Select a card to preview.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateListingPage;
