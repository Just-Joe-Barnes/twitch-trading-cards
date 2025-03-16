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

    // Fetch user profile & collection on mount.
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
        <div className="create-listing-container">
            <h1>Create a Market Listing</h1>
            <p>Select a card from your collection to list:</p>

            {/* Collection Grid */}
            <div className="collection-grid">
                {collection.length === 0 ? (
                    <p>You have no available cards to list.</p>
                ) : (
                    collection.map((card) => (
                        <div
                            key={card._id}
                            className={`card-item ${selectedCard?._id === card._id ? 'selected' : ''}`}
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

            {/* Listing Preview */}
            {selectedCard && (
                <div className="listing-preview">
                    <h2>Listing Preview</h2>
                    <div className="preview-card">
                        <BaseCard
                            name={selectedCard.name}
                            image={selectedCard.imageUrl}
                            description={selectedCard.flavorText}
                            rarity={selectedCard.rarity}
                            mintNumber={selectedCard.mintNumber}
                        />
                    </div>
                    <button
                        className="submit-button"
                        onClick={handleListCard}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Submitting...' : 'List This Card'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default CreateListingPage;
