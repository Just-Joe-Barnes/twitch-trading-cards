// src/pages/MarketPage.js
import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Link } from 'react-router-dom';
import { rarities } from '../constants/rarities';
import '../styles/MarketPage.css';

const MarketPage = () => {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRarity, setSelectedRarity] = useState('');
    const [sortOption, setSortOption] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');

    const fetchListings = async () => {
        try {
            const res = await fetchWithAuth('/api/market/listings');
            setListings(res.listings);
        } catch (err) {
            console.error('Error fetching market listings:', err);
            setError('Error fetching listings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchListings();
    }, []);

    const filteredListings = listings.filter((listing) => {
        const card = listing.card;
        return (
            card.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            (selectedRarity ? card.rarity.toLowerCase() === selectedRarity.toLowerCase() : true)
        );
    });

    const sortedListings = [...filteredListings].sort((a, b) => {
        const cardA = a.card;
        const cardB = b.card;
        if (sortOption === 'name') {
            return sortOrder === 'asc'
                ? cardA.name.localeCompare(cardB.name)
                : cardB.name.localeCompare(cardA.name);
        } else if (sortOption === 'rarity') {
            const rarityA = rarities.findIndex(r => r.name.toLowerCase() === cardA.rarity.toLowerCase());
            const rarityB = rarities.findIndex(r => r.name.toLowerCase() === cardB.rarity.toLowerCase());
            return sortOrder === 'asc' ? rarityA - rarityB : rarityB - rarityA;
        }
        return 0;
    });

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="market-page-error">{error}</div>;

    return (
        <div className="market-page">
            <h1>Market</h1>
            <div className="market-controls">
                <input
                    type="text"
                    placeholder="Search listings by card name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select value={selectedRarity} onChange={(e) => setSelectedRarity(e.target.value)}>
                    <option value="">All Rarities</option>
                    {rarities.map((r) => (
                        <option key={r.name} value={r.name}>
                            {r.name}
                        </option>
                    ))}
                </select>
                <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                    <option value="name">Name</option>
                    <option value="rarity">Rarity</option>
                </select>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                </select>
            </div>
            <Link to="/market/create">
                <button className="create-listing-button">Create New Listing</button>
            </Link>
            <div className="listings-grid">
                {sortedListings.length > 0 ? (
                    sortedListings.map((listing) => (
                        <div key={listing._id} className="listing-card">
                            <BaseCard
                                name={listing.card.name}
                                image={listing.card.imageUrl}
                                rarity={listing.card.rarity}
                                description={listing.card.flavorText}
                                mintNumber={listing.card.mintNumber}
                            />
                            <p className="listing-owner">Listed by: {listing.owner.username}</p>
                            <Link to={`/market/listing/${listing._id}`}>
                                <button className="view-listing-button">View & Make Offer</button>
                            </Link>
                        </div>
                    ))
                ) : (
                    <p>No listings found.</p>
                )}
            </div>
        </div>
    );
};

export default MarketPage;
