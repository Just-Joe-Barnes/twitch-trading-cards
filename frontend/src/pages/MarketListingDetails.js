// frontend/src/pages/MarketListingDetails.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/MarketListingDetails.css';

const MarketListingDetails = () => {
    const { id } = useParams();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [offerMessage, setOfferMessage] = useState('');
    const [offeredCardsInput, setOfferedCardsInput] = useState(''); // comma-separated card IDs
    const [offeredPacks, setOfferedPacks] = useState('');
    const [offerError, setOfferError] = useState('');
    const [offerSuccess, setOfferSuccess] = useState('');

    useEffect(() => {
        const fetchListing = async () => {
            try {
                const res = await fetchWithAuth(`/api/market/listings/${id}`);
                setListing(res);
            } catch (error) {
                console.error('Error fetching listing:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchListing();
    }, [id]);

    const handleOfferSubmit = async (e) => {
        e.preventDefault();
        setOfferError('');
        setOfferSuccess('');
        // Parse offeredCards input (comma-separated)
        const offeredCards = offeredCardsInput
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        try {
            const res = await fetchWithAuth(`/api/market/listings/${id}/offers`, {
                method: 'POST',
                body: JSON.stringify({
                    message: offerMessage,
                    offeredCards,
                    offeredPacks: Number(offeredPacks) || 0,
                }),
            });
            if (res.message === 'Offer submitted successfully') {
                setOfferSuccess('Offer submitted successfully!');
                setOfferMessage('');
                setOfferedCardsInput('');
                setOfferedPacks('');
                // Refresh listing to show updated offers
                const updated = await fetchWithAuth(`/api/market/listings/${id}`);
                setListing(updated);
            } else {
                setOfferError('Failed to submit offer.');
            }
        } catch (error) {
            console.error('Error making offer:', error);
            setOfferError('Error making offer.');
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!listing) return <div>Listing not found.</div>;

    return (
        <div className="market-listing-details">
            <h1>{listing.card.name}</h1>
            <BaseCard
                name={listing.card.name}
                image={listing.card.imageUrl}
                rarity={listing.card.rarity}
                description={listing.card.flavorText}
                mintNumber={listing.card.mintNumber}
            />
            <p className="listing-owner">Listed by: {listing.owner.username}</p>
            <hr />
            <h2>Make an Offer</h2>
            <form onSubmit={handleOfferSubmit} className="offer-form">
                <div className="form-group">
                    <label htmlFor="offerMessage">Message:</label>
                    <textarea
                        id="offerMessage"
                        value={offerMessage}
                        onChange={(e) => setOfferMessage(e.target.value)}
                        placeholder="Enter your message..."
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="offeredCards">Offered Card IDs (comma-separated):</label>
                    <input
                        id="offeredCards"
                        type="text"
                        value={offeredCardsInput}
                        onChange={(e) => setOfferedCardsInput(e.target.value)}
                        placeholder="e.g., 60f7c2...,60f7c2..."
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="offeredPacks">Offered Packs:</label>
                    <input
                        id="offeredPacks"
                        type="number"
                        value={offeredPacks}
                        onChange={(e) => setOfferedPacks(e.target.value)}
                        placeholder="0"
                    />
                </div>
                <button type="submit">Submit Offer</button>
            </form>
            {offerError && <p className="error">{offerError}</p>}
            {offerSuccess && <p className="success">{offerSuccess}</p>}
            <hr />
            <h2>Existing Offers</h2>
            {listing.offers && listing.offers.length > 0 ? (
                <ul className="offers-list">
                    {listing.offers.map((offer) => (
                        <li key={offer._id} className="offer-item">
                            <p><strong>Offer by:</strong> {offer.offerer}</p>
                            <p><strong>Message:</strong> {offer.message}</p>
                            {offer.offeredCards && offer.offeredCards.length > 0 && (
                                <p><strong>Offered Cards:</strong> {offer.offeredCards.join(', ')}</p>
                            )}
                            <p><strong>Packs Offered:</strong> {offer.offeredPacks}</p>
                            <p><em>{new Date(offer.createdAt).toLocaleString()}</em></p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No offers yet.</p>
            )}
        </div>
    );
};

export default MarketListingDetails;
