// frontend/src/pages/MarketPage.js
import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Link } from 'react-router-dom';
import { rarities } from '../constants/rarities';
import { io } from 'socket.io-client';

const MarketPage = () => {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRarity, setSelectedRarity] = useState('');
    const [sortOption, setSortOption] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const listingsPerPage = 9; // Adjust as needed

    const fetchListings = async (page = 1) => {
        try {
            const res = await fetchWithAuth(`/api/market/listings?page=${page}&limit=${listingsPerPage}`);
            setListings(res.listings);
            setCurrentPage(res.page);
            setTotalPages(res.pages);
        } catch (err) {
            console.error('Error fetching market listings:', err);
            setError('Error fetching listings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchListings(currentPage);

        const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
            transports: ['websocket'],
        });

        socket.on('connect', () => {
            console.log('Connected to Socket.io server');
        });

        socket.on('market:newListing', (newListing) => {
            console.log('Received new listing:', newListing);
            setListings((prev) => [newListing, ...prev]);
        });

        return () => {
            socket.disconnect();
        };
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

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setLoading(true);
            fetchListings(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setLoading(true);
            fetchListings(currentPage + 1);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="p-6 bg-gray-950 min-h-screen text-gray-100">{error}</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto bg-gray-950 min-h-screen text-gray-100 rounded-xl shadow">
            <h1 className="text-3xl text-center mb-2">Market</h1>
            <p className="text-center text-lg mb-6 text-gray-300">
                Welcome to the market! Here you can list your cards for trade offers and view offers from other users.
                Browse listings, filter by card name or rarity, and make an offer on the ones you like.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-6">
                <input
                    type="text"
                    placeholder="Search listings by card name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="p-2 rounded bg-gray-800 border border-gray-700 placeholder-gray-400"
                />
                <select
                    value={selectedRarity}
                    onChange={(e) => setSelectedRarity(e.target.value)}
                    className="p-2 rounded bg-gray-800 border border-gray-700"
                >
                    <option value="">All Rarities</option>
                    {rarities.map((r) => (
                        <option key={r.name} value={r.name}>
                            {r.name}
                        </option>
                    ))}
                </select>
                <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="p-2 rounded bg-gray-800 border border-gray-700"
                >
                    <option value="name">Name</option>
                    <option value="rarity">Rarity</option>
                </select>
                <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="p-2 rounded bg-gray-800 border border-gray-700"
                >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                </select>
            </div>
            <div className="flex justify-center mb-6">
                <Link to="/market/create">
                    <button className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded">Create New Listing</button>
                </Link>
            </div>
            <div className="grid gap-8 grid-cols-[repeat(auto-fit,minmax(280px,1fr))] mb-8">
                {sortedListings.length > 0 ? (
                    sortedListings.map((listing) => (
                        <div key={listing._id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col justify-between hover:border-purple-500 hover:shadow-lg transition">
                            <div className="flex justify-center">
                                <BaseCard
                                    name={listing.card.name}
                                    image={listing.card.imageUrl}
                                    rarity={listing.card.rarity}
                                    description={listing.card.flavorText}
                                    mintNumber={listing.card.mintNumber}
                                />
                            </div>
                            <p className="mt-2 text-sm">Listed by: {listing.owner.username}</p>
                            <p className="text-sm text-cyan-400">Offers: {listing.offers ? listing.offers.length : 0}</p>
                            <Link to={`/market/listing/${listing._id}`}>
                                <button className="mt-4 w-full bg-purple-600 hover:bg-purple-500 text-white p-2 rounded">View &amp; Make Offer</button>
                            </Link>
                        </div>
                    ))
                ) : (
                    <p>No listings found.</p>
                )}
            </div>
            <div className="flex justify-center mb-4 space-x-2">
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed" onClick={handlePreviousPage} disabled={currentPage === 1}>
                    Previous
                </button>
                <span style={{ margin: '0 1rem' }}>
                    Page {currentPage} of {totalPages}
                </span>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleNextPage} disabled={currentPage === totalPages}>
                    Next
                </button>
            </div>
        </div>
    );
};

export default MarketPage;
