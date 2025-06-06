// src/pages/CreateListingPage.js
import React, { useState, useEffect } from 'react';
import { fetchUserCollection, fetchUserProfile, API_BASE_URL } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import BaseCard from '../components/BaseCard';
import { useNavigate } from 'react-router-dom';

/*
  CreateListingPage:
  - Fetches the logged-in user's collection.
  - Provides filtering and sorting options:
      � Search by card name.
      � Filter by rarity.
      � Sort by name, mint number, rarity, or acquisition date.
  - Displays the collection in a fixed grid:
      � 4 cards per row.
      � Fixed container height (showing about 2 rows; vertical scrolling if more).
  - The collection container appears above a listing preview container.
  - An instructional paragraph explains the page.
  - When a card is selected, it is highlighted and a listing preview appears.
  - The user can then click the "List This Card" button to submit the listing.
*/

const CreateListingPage = () => {
    const [collection, setCollection] = useState([]);
    const [filteredCollection, setFilteredCollection] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter/sort states
    const [search, setSearch] = useState('');
    const [rarityFilter, setRarityFilter] = useState('');
    const [sortOption, setSortOption] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');

    const navigate = useNavigate();

    // Fetch user profile and collection on mount
    useEffect(() => {
        const fetchCollection = async () => {
            try {
                const profile = await fetchUserProfile();
                const data = await fetchUserCollection(profile._id);
                setCollection(data.cards || []);
                setFilteredCollection(data.cards || []);
            } catch (error) {
                console.error("Error fetching collection:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCollection();
    }, []);

    // Update filtered collection whenever filters or collection change
    useEffect(() => {
        let filtered = [...collection];

        // Search filter by name
        if (search) {
            filtered = filtered.filter(card =>
                card.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Rarity filter
        if (rarityFilter) {
            filtered = filtered.filter(
                card => card.rarity.toLowerCase() === rarityFilter.toLowerCase()
            );
        }

        // Sorting logic
        filtered.sort((a, b) => {
            if (sortOption === 'mintNumber') {
                const aNum = parseInt(a.mintNumber, 10);
                const bNum = parseInt(b.mintNumber, 10);
                return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
            } else if (sortOption === 'name') {
                return sortOrder === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            } else if (sortOption === 'rarity') {
                // Using a fixed ordering array for rarities
                const rarityOrder = ['basic', 'common', 'standard', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'unique', 'divine'];
                const aIndex = rarityOrder.indexOf(a.rarity.toLowerCase());
                const bIndex = rarityOrder.indexOf(b.rarity.toLowerCase());
                return sortOrder === 'asc' ? aIndex - bIndex : bIndex - aIndex;
            } else if (sortOption === 'acquiredAt') {
                // Assuming each card has an acquiredAt property (ISO date string)
                return sortOrder === 'asc'
                    ? new Date(a.acquiredAt) - new Date(b.acquiredAt)
                    : new Date(b.acquiredAt) - new Date(a.acquiredAt);
            }
            return 0;
        });

        setFilteredCollection(filtered);
    }, [collection, search, rarityFilter, sortOption, sortOrder]);

    // Handle card selection
    const handleCardSelect = (card) => {
        setSelectedCard(card);
    };

    // Submit the selected card as a new listing
    const handleListCard = async () => {
        if (!selectedCard) return;
        setIsSubmitting(true);
        try {
            const cardToSend = { ...selectedCard };

            // Remove forbidden fields to satisfy backend validation
            delete cardToSend._id;
            delete cardToSend.status;
            delete cardToSend.acquiredAt;
            delete cardToSend.__v;
            delete cardToSend.owner; // if present
            delete cardToSend.offers; // if present
            delete cardToSend.createdAt; // if present
            delete cardToSend.updatedAt; // if present

            if (cardToSend.imageUrl && cardToSend.imageUrl.startsWith('/')) {
                const baseUrl = window.location.origin;
                cardToSend.imageUrl = baseUrl + cardToSend.imageUrl;
            } else if (cardToSend.imageUrl && cardToSend.imageUrl.startsWith('http')) {
                // leave as is
            }

            const res = await fetch(`${API_BASE_URL}/api/market/listings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ card: cardToSend }),
            });

            if (res.ok) {
                window.showToast('Card listed on the market successfully!', 'success');
                navigate('/market');
            } else {
                const errorData = await res.json();
                window.showToast(`Error: ${errorData.message}`, 'error');
            }
        } catch (error) {
            console.error('Error listing card:', error);
            window.showToast('Error listing card', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col items-center min-h-screen p-8 bg-gray-950 text-gray-100">
            <h1 className="text-3xl mb-4">Create a Market Listing</h1>
            <p className="mb-6 text-lg text-gray-300 max-w-xl text-center">
                Use this page to list a card from your collection on the market. First, use the filters below to search and sort your collection. Then, select a card to preview your listing, and finally click "List This Card" to post your listing.
            </p>

            {/* Filters & Sorting Controls */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
                <input
                    type="text"
                    placeholder="Search by card name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="p-2 rounded bg-gray-800 border border-gray-700 placeholder-gray-400"
                />
                <select
                    value={rarityFilter}
                    onChange={(e) => setRarityFilter(e.target.value)}
                    className="p-2 rounded bg-gray-800 border border-gray-700"
                >
                    <option value="">All Rarities</option>
                    <option value="Basic">Basic</option>
                    <option value="Common">Common</option>
                    <option value="Standard">Standard</option>
                    <option value="Uncommon">Uncommon</option>
                    <option value="Rare">Rare</option>
                    <option value="Epic">Epic</option>
                    <option value="Legendary">Legendary</option>
                    <option value="Mythic">Mythic</option>
                    <option value="Unique">Unique</option>
                    <option value="Divine">Divine</option>
                </select>
                <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="p-2 rounded bg-gray-800 border border-gray-700"
                >
                    <option value="name">Name</option>
                    <option value="mintNumber">Mint Number</option>
                    <option value="rarity">Rarity</option>
                    <option value="acquiredAt">Acquisition Date</option>
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

            {/* Collection Container */}
            <div className="w-full max-w-3xl bg-gray-900 p-6 rounded-lg shadow mb-8">
                <h2 className="collection-heading">Your Collection</h2>
                {filteredCollection.length === 0 ? (
                    <p className="no-cards-message">No cards available to list.</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-2">
                        {filteredCollection.map((card) => (
                            <div
                                key={card._id}
                                className={`cursor-pointer transition-transform rounded-lg border-2 border-transparent hover:scale-105 hover:border-cyan-400 ${selectedCard && selectedCard._id === card._id ? 'border-purple-500 shadow-lg' : ''}`}
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
                        ))}
                    </div>
                )}
            </div>

            {/* Listing Preview */}
            <div className="w-full max-w-3xl bg-gray-900 p-6 rounded-lg shadow mb-8 text-center">
                <h2 className="preview-heading">Listing Preview</h2>
                {selectedCard ? (
                    <div className="flex flex-col items-center mb-4">
                        <BaseCard
                            name={selectedCard.name}
                            image={selectedCard.imageUrl}
                            description={selectedCard.flavorText}
                            rarity={selectedCard.rarity}
                            mintNumber={selectedCard.mintNumber}
                        />
                        <button
                            className="mt-4 px-6 py-3 rounded bg-purple-600 hover:bg-purple-500 text-white w-full max-w-xs disabled:bg-gray-600 disabled:cursor-not-allowed"
                            onClick={handleListCard}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Listing...' : 'List This Card'}
                        </button>
                    </div>
                ) : (
                    <p className="text-gray-300">Select a card to preview your listing.</p>
                )}
            </div>
        </div>
    );
};

export default CreateListingPage;
