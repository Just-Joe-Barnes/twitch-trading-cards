// frontend/src/pages/MarketListingDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWithAuth, fetchUserProfile, fetchUserCollection } from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner';

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
    const navigate = useNavigate();

    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);

    const [offerMessage, setOfferMessage] = useState('');
    const [offeredPacks, setOfferedPacks] = useState('');
    const [offerError, setOfferError] = useState('');
    const [offerSuccess, setOfferSuccess] = useState('');

    const [userPacks, setUserPacks] = useState(0);
    const [userCollection, setUserCollection] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    const [search, setSearch] = useState('');
    const [rarityFilter, setRarityFilter] = useState('');
    const [filteredCollection, setFilteredCollection] = useState([]);

    const [selectedOfferedCards, setSelectedOfferedCards] = useState([]);

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

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const profile = await fetchUserProfile();
                setCurrentUser(profile);
                setUserPacks(profile.packs || 0);
                const collectionData = await fetchUserCollection(profile._id);
                setUserCollection(collectionData.cards || []);
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, []);

    useEffect(() => {
        let filtered = [...userCollection];
        if (search) {
            filtered = filtered.filter((card) =>
                card.name.toLowerCase().includes(search.toLowerCase())
            );
        }
        if (rarityFilter) {
            filtered = filtered.filter(
                (card) => card.rarity?.toLowerCase() === rarityFilter.toLowerCase() ||
                    (card.rarities && card.rarities[0]?.rarity?.toLowerCase() === rarityFilter.toLowerCase())
            );
        }
        setFilteredCollection(filtered);
    }, [userCollection, search, rarityFilter]);

    const toggleCardSelection = (card) => {
        const alreadySelected = selectedOfferedCards.find(c => c._id === card._id);
        if (alreadySelected) {
            setSelectedOfferedCards(selectedOfferedCards.filter(c => c._id !== card._id));
        } else {
            setSelectedOfferedCards([...selectedOfferedCards, card]);
        }
    };

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
            const mappedCards = selectedOfferedCards.map(card => ({
                name: card.name,
                imageUrl: card.imageUrl?.startsWith('http') ? card.imageUrl : `${window.location.origin}${card.imageUrl.startsWith('/') ? '' : '/'}${card.imageUrl}`,
                rarity: card.rarity || (card.rarities && card.rarities[0]?.rarity) || '',
                mintNumber: card.mintNumber != null ? card.mintNumber : 0,
                flavorText: card.flavorText || ''
            }));
            const res = await fetchWithAuth(`/api/market/listings/${id}/offers`, {
                method: 'POST',
                body: JSON.stringify({
                    message: offerMessage,
                    offeredCards: mappedCards,
                    offeredPacks: packsNumber,
                }),
            });
            if (res.message === 'Offer submitted successfully') {
                window.showToast('Offer submitted successfully!', 'success');
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

    const handleCancelListing = async () => {
        try {
            const res = await fetchWithAuth(`/api/market/listings/${id}`, {
                method: 'DELETE',
            });
            if (res.message) {
                navigate('/market');
            }
        } catch (error) {
            console.error('Error cancelling listing:', error);
        }
    };

    const handleAcceptOffer = async (offerId) => {
        try {
            const res = await fetchWithAuth(`/api/market/listings/${id}/offers/${offerId}/accept`, {
                method: 'PUT',
            });
            if (res.message) {
                window.showToast('Offer accepted. Listing is now sold.', 'success');
                navigate('/market');
            }
        } catch (error) {
            console.error('Error accepting offer:', error);
            window.showToast('Error accepting offer.', 'error');
        }
    };

    const handleRejectOffer = async (offerId) => {
        try {
            const res = await fetchWithAuth(`/api/market/listings/${id}/offers/${offerId}`, {
                method: 'DELETE',
            });
            if (res.message) {
                window.showToast('Offer rejected.', 'success');
                const updated = await fetchWithAuth(`/api/market/listings/${id}`);
                setListing(updated);
            }
        } catch (error) {
            console.error('Error rejecting offer:', error);
            window.showToast('Error rejecting offer.', 'error');
        }
    };

    const handleCancelOffer = async (offerId) => {
        try {
            const res = await fetchWithAuth(`/api/market/listings/${id}/offers/self`, {
                method: 'DELETE',
            });
            if (res.message) {
                window.showToast('Offer cancelled.', 'success');
                const updated = await fetchWithAuth(`/api/market/listings/${id}`);
                setListing(updated);
            }
        } catch (error) {
            console.error('Error cancelling offer:', error);
            window.showToast('Error cancelling offer.', 'error');
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!listing) return <div>Listing not found.</div>;

    const isOwner =
        currentUser &&
        listing.owner &&
        (listing.owner._id
            ? listing.owner._id.toString() === currentUser._id.toString()
            : listing.owner.toString() === currentUser._id.toString());

    return (
        <div className="p-6 max-w-4xl mx-auto bg-gray-950 min-h-screen text-gray-100">
            <h1 className="text-3xl text-center mb-4">{listing.card.name}</h1>
            <div className="flex justify-center mb-4">
                <BaseCard
                    name={listing.card.name}
                    image={listing.card.imageUrl}
                    rarity={listing.card.rarity}
                    description={listing.card.flavorText}
                    mintNumber={listing.card.mintNumber}
                />
            </div>
            <p className="text-sm mb-4">Listed by: {listing.owner.username}</p>

            {isOwner ? (
                <div className="owner-actions">
                    <button className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded" onClick={handleCancelListing}>
                        Cancel Listing
                    </button>
                </div>
            ) : (
                <>
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

                        <div className="market-offer-cards-section">
                            <h3>Offer Cards</h3>
                            <div className="filters">
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
                            <div className="market-user-collection-grid">
                                {filteredCollection.map((card) => {
                                    const isSelected = selectedOfferedCards.some(c => c._id === card._id);
                                    return (
                                        <div
                                            key={card._id}
                                            className={`market-card-wrapper ${isSelected ? 'selected' : ''}`}
                                            onClick={() => toggleCardSelection(card)}
                                        >
                                            <BaseCard
                                                name={card.name}
                                                image={card.imageUrl}
                                                rarity={card.rarity || (card.rarities && card.rarities[0]?.rarity)}
                                                description={card.flavorText}
                                                mintNumber={card.mintNumber}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="market-selected-cards-panel">
                            <h3>Selected Cards for Offer</h3>
                            <div className="market-selected-cards-grid">
                                {selectedOfferedCards.length > 0 ? (
                                    selectedOfferedCards.map((card) => (
                                        <div key={card._id} className="market-card-wrapper">
                                            <BaseCard
                                                name={card.name}
                                                image={card.imageUrl}
                                                rarity={card.rarity || (card.rarities && card.rarities[0]?.rarity)}
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
                </>
            )}

            <hr />
            <h2>Existing Offers</h2>
            {listing.offers && listing.offers.length > 0 ? (
                <ul className="offers-list">
                    {listing.offers.map((offer) => (
                        <li key={offer._id} className="offer-item">
                            <p>
                                <strong>Offer by:</strong> {offer.offerer.username || offer.offerer}
                            </p>
                            <p>
                                <strong>Message:</strong> {offer.message || 'No message'}
                            </p>
                            {offer.offeredCards && offer.offeredCards.length > 0 && (
                                <div className="offered-cards">
                                    <strong>Offered Cards:</strong>
                                    <div className="offered-cards-grid">
                                        {offer.offeredCards.map(card => (
                                            <div key={card._id || card.name} className="offered-card-item">
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
                                </div>
                            )}
                            <p>
                                <strong>Packs Offered:</strong> {offer.offeredPacks}
                            </p>
                            <p>
                                <em>{new Date(offer.createdAt).toLocaleString()}</em>
                            </p>
                            <div className="offer-actions">
                                {isOwner && (
                                    <>
                                        <button onClick={() => handleAcceptOffer(offer._id)}>Accept</button>
                                        <button onClick={() => handleRejectOffer(offer._id)}>Reject</button>
                                    </>
                                )}
                                {!isOwner && currentUser &&
                                    ((offer.offerer._id
                                        ? offer.offerer._id.toString() === currentUser._id.toString()
                                        : offer.offerer.toString() === currentUser._id.toString())) && (
                                        <button onClick={() => handleCancelOffer(offer._id)}>Cancel Offer</button>
                                    )}
                            </div>
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
