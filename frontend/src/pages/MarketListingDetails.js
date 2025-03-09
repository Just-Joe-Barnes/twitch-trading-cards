// frontend/src/pages/MarketListingDetails.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import BaseCard from '../components/BaseCard';
import { fetchWithAuth } from '../utils/api';
import '../styles/MarketListingDetails.css'; // Create this file for custom styles if needed

const MarketListingDetails = () => {
    const { id } = useParams();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchListing = async () => {
            try {
                const res = await fetchWithAuth(`/api/market/listings/${id}`);
                setListing(res);
            } catch (err) {
                console.error('Error fetching market listing details:', err);
                setError('Failed to load listing details.');
            } finally {
                setLoading(false);
            }
        };
        fetchListing();
    }, [id]);

    if (loading) return <LoadingSpinner />;
    if (error) return <div>{error}</div>;
    if (!listing) return <div>No listing found.</div>;

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
            <p>Listed by: {listing.owner.username}</p>
            {/* Add further details and offer functionality as needed */}
        </div>
    );
};

export default MarketListingDetails;
