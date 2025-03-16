// src/pages/CreateListingPage.js
import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/api';
import BaseCard from '../components/BaseCard';
import { useNavigate } from 'react-router-dom';
import '../styles/CreateListingPage.css';

/*
  Create Listing Page:
  - Fetches user's collection & displays cards in a grid format.
  - Allows users to select a card to list.
  - Shows a preview of the listing before confirming.
  - Posts the listing to the market on submit.
  - Improved UI for selection, preview, and submission.
*/

const CreateListingPage = ({ user }) => {
    const navigate = useNavigate();
    const [collection, setCollection] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Fetch user's collection on mount
    useEffect(() => {
        const fetchCollection = async () => {
            try {
                const data = await fetchWithAuth('/api/collection');
                setCollection(data.cards || []);
            } catch (error) {
                console.error('Error fetching collection:', error);
                setErrorMessage('Failed to load your collection.');
            }
        };
        fetchCollection();
    }, []);

    // Handles card selection
    const handleSelectCard = (card) => {
        setSelectedCard(card);
    };

    // Submit the listing
    const handleSubmitListing = async () => {
        if (!selectedCard) {
            setErrorMessage('Please select a card to list.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        try {
            const res = await fetchWithAuth('/api/market/listings', {
                method: 'POST',
                body: JSON.stringify({ card: selectedCard }),
            });

            if (!res || !res._id) {
                throw new Error('Invalid response from server.');
            }

            navigate('/market');
        } catch (error) {
            console.error('Error creating listing:', error);
            setErrorMessage('Failed to create listing. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="create-listing-container">
            <h2>Create a Market Listing</h2>
            <p>Select a card from your collection to list.</p>

            {/* Collection Grid */}
            <div className="collection-grid">
                {collection.length === 0 ? (
                    <p>You have no available cards to list.</p>
                ) : (
                    collection.map((card) => (
                        <div
                            key={card._id}
                            className={`card-item ${selectedCard?._id === card._id ? 'selected' : ''}`}
                            onClick={() => handleSelectCard(card)}
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

            {/* Selected Card Preview */}
            {selectedCard && (
                <div className="listing-preview">
                    <h3>Listing Preview</h3>
                    <div className="preview-card">
                        <BaseCard
                            name={selectedCard.name}
                            image={selectedCard.imageUrl}
                            description={selectedCard.flavorText}
                            rarity={selectedCard.rarity}
                            mintNumber={selectedCard.mintNumber}
                        />
                    </div>
                </div>
            )}

            {/* Submit Button */}
            <button
                className="submit-button"
                onClick={handleSubmitListing}
                disabled={isSubmitting || !selectedCard}
            >
                {isSubmitting ? 'Submitting...' : 'List This Card'}
            </button>

            {/* Error Message */}
            {errorMessage && <p className="error-message">{errorMessage}</p>}
        </div>
    );
};

export default CreateListingPage;
