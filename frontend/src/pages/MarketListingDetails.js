// frontend/src/pages/MarketListingDetails.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchWithAuth, fetchUserProfile, fetchUserCollection } from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/MarketListingDetails.css';

const rarities = [
    { name: 'Basic' },
    { name: 'Common' },
    { name: 'Standard' },
    { name: 'Uncommon' },
    { name: 'Rare' },
    { name: 'Epic' },
    { name: 'Legendary' },
    { name: 'Mythic' },
    { name: 'Unique' },
    { name: 'Divine' },
];

const MarketListingDetails = () => {
    const { id } = useParams();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);

    // Offer form states
    const [offerMessage, setOfferMessage] = useState('');
    const [offeredPacks, setOfferedPacks] = useState('');
    const [offerError, setOfferError] = useState('');
    const [offerSuccess, setOfferSuccess] = useState('');

    // Logged-in user's data
    const [userPacks, setUserPacks] = useState(0);
    const [userCollection, setUserCollection] = useState([]);

    // Collection filters
    const [search, setSearch] = useState('');
    const [rarityFilter, setRarityFilter] = useState('');
    const [filteredCollection, setFilteredCollection] = useState([]);

    // Selected cards for the offer
    const [selectedOfferedCards, setSelectedOfferedCards] = useState([]);

    // 1) Fetch market listing details
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

    // 2) Fetch logged-in user's profile & collection
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const profile = await fetchUserProfile();
                setUserPacks(profile.packs || 0);
                const collectionData = await fetchUserCollection(profile._id);
                setUserCollection(collectionData.cards || []);
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, []);

    // 3) Filter the user's collection based on search & rarity
    useEffect(() => {
        let filtered = [...userCollection];
        if (search) {
            filtered = filtered.filter((card) =>
                card.name.toLowerCase().includes(search.toLowerCase())
            );
        }
        if (rarityFilter) {
            filtered = filtered.filter(
                (card) => card.rarity.toLowerCase() === rarityFilter.toLowerCase()
            );
        }
        setFilteredCollection(filtered);
    }, [userCollection, search, rarityFilter]);

    // Toggle selection for offered cards
    const toggleCardSelection = (card) => {
        const alreadySelected = selectedOfferedCards.find((c) => c._id === card._id);
        if (alreadySelected) {
            setSelectedOfferedCards(selectedOfferedCards.filter((c) => c._id !== card._id));
        } else {
            setSelectedOfferedCards([...selectedOfferedCards, card]);
        }
    };

    // Submit the offer
    const handleOfferSubmit = async (e) => {
        e.preventDefault();
        setOfferError('');
        setOfferSuccess('');
        const packsNumber = Number(offeredPacks) || 0;
        if (packsNumber > userPacks) {
            setOfferError(`You only have ${userPacks} packs available.`);
            return;
        }
        try {
            const res = await fetchWithAuth(`/api/market/listings/${id}/offers`, {
                method: 'POST',
                body: JSON.stringify({
                    message: offerMessage,
                    offeredCards: selectedOfferedCards.map((card) => card._id),
                    offeredPacks: packsNumber,
                }),
            });
            if (res.message === 'Offer submitted successfully') {
                setOfferSuccess('Offer submitted successfully!');
                setOfferMessage('');
                setOfferedPacks('');
                setSelectedOfferedCards([]);
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
            <div className="listing-card-container">
                <BaseCard
                    name={listing.card.name}
                    image={listing.card.imageUrl}
                    rarity={listing.card.rarity}
                    description={listing.card.flavorText}
                    mintNumber={listing.card.mintNumber}
                />
            </div>
            <p className="listing-owner">Listed by: {listing.owner.username}</p>
            <hr />

            <h2>Make an Offer</h2>
            <form onSubmit={handleOfferSubmit} className="offer-form">
                <div className="form-group message-group">
                    <label htmlFor="offerMessage">Message (optional):</label>
                    <textarea
                        id="offerMessage"
                        value={offerMessage}
                        onChange={(e) => setOfferMessage(e.target.value)}
                        placeholder="Enter your message..."
                    />
                </div>

                <div className="form-group packs-group">
                    <label htmlFor="offeredPacks">Offered Packs (You have {userPacks}):</label>
                    <input
                        id="offeredPacks"
                        type="number"
                        value={offeredPacks}
                        onChange={(e) => setOfferedPacks(e.target.value)}
                        placeholder="0"
                    />
                </div>

                <div className="offer-cards-section">
                    <h3>Offer Cards</h3>
                    <div className="collection-filters">
                        <input
                            type="text"
                            placeholder="Search your collection..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <select
                            value={rarityFilter}
                            onChange={(e) => setRarityFilter(e.target.value)}
                        >
                            <option value="">All Rarities</option>
                            {rarities.map((r) => (
                                <option key={r.name} value={r.name}>
                                    {r.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="user-collection-grid">
                        {filteredCollection.map((card) => {
                            const isSelected = selectedOfferedCards.some((c) => c._id === card._id);
                            return (
                                <div
                                    key={card._id}
                                    className={`card-wrapper ${isSelected ? 'selected' : ''}`}
                                    onClick={() => toggleCardSelection(card)}
                                >
                                    <BaseCard
                                        name={card.name}
                                        image={card.imageUrl}
                                        rarity={card.rarity}
                                        description={card.flavorText}
                                        mintNumber={card.mintNumber}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="selected-cards-panel">
                    <h3>Selected Cards for Offer</h3>
                    <div className="selected-cards-grid">
                        {selectedOfferedCards.length > 0 ? (
                            selectedOfferedCards.map((card) => (
                                <div key={card._id} className="card-wrapper">
                                    <BaseCard
                                        name={card.name}
                                        image={card.imageUrl}
                                        rarity={card.rarity}
                                        description={card.flavorText}
                                        mintNumber={card.mintNumber}
                                    />
                                </div>
                            ))
                        ) : (
                            <p>No cards selected yet.</p>
                        )}
                    </div>
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
                            <p><strong>Message:</strong> {offer.message || 'No message'}</p>
                            {offer.offeredCards && offer.offeredCards.length > 0 && (
                                <p>
                                    <strong>Offered Cards:</strong> {offer.offeredCards.join(', ')}
                                </p>
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
