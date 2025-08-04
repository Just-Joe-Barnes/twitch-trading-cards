import React, {useState, useEffect} from 'react';
import {useParams, useNavigate, Link} from 'react-router-dom';
import {fetchWithAuth, fetchUserProfile, fetchUserCollection} from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/MarketListingDetails.css';
import {rarities} from '../constants/rarities';

const MarketListingDetails = () => {
    const {id} = useParams();
    const navigate = useNavigate();

    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

    const [offerMessage, setOfferMessage] = useState('');
    const [offeredPacks, setOfferedPacks] = useState('');
    const [offerError, setOfferError] = useState('');
    const [offerSuccess, setOfferSuccess] = useState('');
    const [showOfferForm, setShowOfferForm] = useState(false);

    const [userPacks, setUserPacks] = useState(0);
    const [userCollection, setUserCollection] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    // Filter states for "Make an Offer" section - inspired by MarketPage
    const [searchQuery, setSearchQuery] = useState(''); // Renamed from 'search' to avoid conflict
    const [selectedRarity, setSelectedRarity] = useState(''); // Renamed from 'rarityFilter'
    const [filteredCollection, setFilteredCollection] = useState([]);
    const [rarityCount, setRarityCount] = useState({}); // To store counts for current user's collection

    const [selectedOfferedCards, setSelectedOfferedCards] = useState([]);

    const [offerSortBy, setOfferSortBy] = useState('newest');

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

    // Effect for filtering and counting user's collection
    useEffect(() => {
        let filtered = [...userCollection];
        let currentRarityCounts = rarities.reduce((acc, r) => {
            acc[r.name] = 0;
            return acc;
        }, {});

        // Apply search query
        if (searchQuery) {
            filtered = filtered.filter((card) =>
                card.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Count rarities based on the *currently filtered* collection (before rarity filter application)
        filtered.forEach(card => {
            const cardRarity = card.rarity || (card.rarities && card.rarities[0]?.rarity);
            if (cardRarity && currentRarityCounts.hasOwnProperty(cardRarity)) {
                currentRarityCounts[cardRarity]++;
            }
        });
        setRarityCount(currentRarityCounts); // Update counts based on current filters

        // Apply rarity filter
        if (selectedRarity) {
            filtered = filtered.filter(
                (card) => card.rarity?.toLowerCase() === selectedRarity.toLowerCase() ||
                    (card.rarities && card.rarities[0]?.rarity?.toLowerCase() === selectedRarity.toLowerCase())
            );
        }

        setFilteredCollection(filtered);
    }, [userCollection, searchQuery, selectedRarity]); // Depend on user collection and filter states

    const toggleCardSelection = (card) => {
        const alreadySelected = selectedOfferedCards.find(c => c._id === card._id);
        if (alreadySelected) {
            setSelectedOfferedCards(selectedOfferedCards.filter(c => c._id !== card._id));
        } else {
            setSelectedOfferedCards([...selectedOfferedCards, card]);
        }
    };

    const handleRarityChange = (rarityName) => {
        const normalizedRarityName = rarityName.toLowerCase();
        setSelectedRarity(prevRarity =>
            prevRarity === normalizedRarityName ? '' : normalizedRarityName // Toggle selection
        );
    };

    const handleOfferSubmit = async (e) => {
        e.preventDefault();
        setOfferError('');
        setOfferSuccess('');
        setIsSubmittingOffer(true);

        const packsNumber = Number(offeredPacks) || 0;
        if (packsNumber > userPacks) {
            setOfferError(`You only have ${userPacks} packs available.`);
            setIsSubmittingOffer(false);
            return;
        }

        try {
            const mappedCards = selectedOfferedCards.map(card => ({
                name: card.name,
                imageUrl: card.imageUrl?.startsWith('http') ? card.imageUrl : `${window.location.origin}${card.imageUrl.startsWith('/') ? '' : '/'}${card.imageUrl}`,
                rarity: card.rarity || (card.rarities && card.rarities[0]?.rarity) || '',
                mintNumber: card.mintNumber != null ? card.mintNumber : 0,
                grade: card.grade,
                slabbed: card.slabbed,
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
                setShowOfferForm(false);
            } else {
                setOfferError('Failed to submit offer.');
            }
        } catch (error) {
            console.error('Error making offer:', error);
            setOfferError('Error making offer.');
        } finally {
            setIsSubmittingOffer(false);
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

    const sortedOffers = listing?.offers ? [...listing.offers].sort((a, b) => {
        if (offerSortBy === 'packs-desc') {
            return b.offeredPacks - a.offeredPacks;
        } else if (offerSortBy === 'packs-asc') {
            return a.offeredPacks - b.offeredPacks;
        } else if (offerSortBy === 'oldest') {
            return new Date(a.createdAt) - new Date(b.createdAt);
        }
        return new Date(b.createdAt) - new Date(a.createdAt); // Default: newest
    }) : [];


    if (loading) return <LoadingSpinner/>;
    if (!listing) return <div>Listing not found.</div>;

    const isOwner =
        currentUser &&
        listing.owner &&
        (listing.owner._id
            ? listing.owner._id.toString() === currentUser._id.toString()
            : listing.owner.toString() === currentUser._id.toString());

    const userHasMadeOffer = listing.offers.some(
        (offer) => (offer.offerer._id ? offer.offerer._id.toString() : offer.offerer.toString()) === currentUser?._id?.toString()
    );

    return (
        <div className="page">
            <h1>
                {listing.card.name} <br/>
                <small>Listed by: <Link
                    to={`/profile/${listing.owner.username}`}>{listing.owner.username}</Link></small>
            </h1>

            <div className="card-tile">
                <BaseCard
                    name={listing.card.name}
                    image={listing.card.imageUrl}
                    rarity={listing.card.rarity}
                    description={listing.card.flavorText}
                    mintNumber={listing.card.mintNumber}
                    modifier={listing.card.modifier}
                />
            </div>

            <hr/>

            <h2>Existing Offers</h2>
            {sortedOffers.length > 0 ? (
                <>
                    <div className="offers-controls">
                        <label htmlFor="offer-sort">Sort By:</label>
                        <select id="offer-sort" value={offerSortBy} onChange={(e) => setOfferSortBy(e.target.value)}>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="packs-desc">Packs: High to Low</option>
                            <option value="packs-asc">Packs: Low to High</option>
                        </select>
                    </div>
                    <div className="offers-list">
                        {sortedOffers.map((offer) => {
                            const isMyOffer = (offer.offerer._id ? offer.offerer._id.toString() : offer.offerer.toString()) === currentUser?._id?.toString();
                            return (
                                <div key={offer._id}
                                     className={`section-card offer-item ${isMyOffer ? 'my-offer' : ''}`} style={{position: 'relative'}}>
                                    <p>
                                        <strong>Offer by:</strong> <Link
                                        to={`/profile/${offer.offerer.username}`}>{offer.offerer.username}</Link>
                                        {isMyOffer && <span className="my-offer-tag"> (Your Offer)</span>}
                                    </p>
                                    {offer.message && (
                                        <p>
                                            <strong>Message:</strong> {offer.message}
                                        </p>
                                    )}
                                    {offer.offeredPacks > 0 && (
                                        <p>
                                            <strong>Packs Offered:</strong> {offer.offeredPacks}
                                        </p>
                                    )}
                                    <p style={{textAlign: 'right', position: 'absolute', right: '8px', top: '0px'}}>
                                        <small><em>{new Date(offer.createdAt).toLocaleString()}</em></small>
                                    </p>
                                    {offer.offeredCards && offer.offeredCards.length > 0 && (
                                        <>
                                            <strong>Offered Cards:</strong>
                                            <div className={`card-tile-grid ${offer.offeredCards.some(card => card.slabbed) ? 'slabbed' : ''}`}>
                                                {offer.offeredCards.map(card => (
                                                    <div className="card-tile" key={card._id}>
                                                        <BaseCard
                                                            name={card.name}
                                                            image={card.imageUrl}
                                                            rarity={card.rarity}
                                                            description={card.flavorText}
                                                            mintNumber={card.mintNumber}
                                                            modifier={card.modifier}
                                                            slabbed={card.slabbed}
                                                            grade={card.grade}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    <div className="button-group">
                                        {isOwner && (
                                            <>
                                                <button className="primary-button" onClick={() => handleAcceptOffer(offer._id)}><i className="fa-regular fa-thumbs-up fa-fw" /> Accept</button>
                                                <button className="reject-button" onClick={() => handleRejectOffer(offer._id)}><i className="fa-regular fa-thumbs-down fa-fw" /> Reject</button>
                                            </>
                                        )}
                                        {!isOwner && isMyOffer && (
                                            <button className="reject-button" onClick={() => handleCancelOffer(offer._id)}><i className="fa-regular fa-thumbs-down fa-fw" /> Retract Offer</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="section-card">
                    <p>No offers have been submitted yet.</p>
                </div>
            )}

            {isOwner ? (
                <div className="owner-actions">
                    <button className="cancel-button" onClick={handleCancelListing}>
                        Cancel Listing
                    </button>
                </div>
            ) : (
                <>{!userHasMadeOffer && (
                    <div className="make-offer-section section-card">
                        {!isOwner && !userHasMadeOffer && !showOfferForm && (
                            <p className="no-offer-message" style={{textAlign: 'center'}}>You haven't made an offer on
                                this listing yet. Click "Make an Offer" to submit one!</p>
                        )}
                        <h2>
                            <button className="toggle-offer-form-button"
                                    onClick={() => setShowOfferForm(!showOfferForm)}>
                                {showOfferForm ? 'Hide Offer Form' : 'Make an Offer'}
                            </button>
                        </h2>
                        {showOfferForm && (
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
                                        min="0"
                                    />
                                </div>

                                <div className="market-offer-cards-section">
                                    <h3>Select Cards from Your Collection</h3>
                                    <div className="section-card filters-panel">
                                        <div className="filters">
                                            <div className="filter-card">
                                                <input
                                                    type="text"
                                                    placeholder="Search your collection..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="filter-input"
                                                />
                                            </div>

                                            <div className="rarity-key">
                                                {rarities.map((r) => {
                                                    const normalizedRarityName = r.name.toLowerCase();
                                                    return (
                                                        <button
                                                            key={normalizedRarityName}
                                                            type="button"
                                                            onClick={() => handleRarityChange(r.name)}
                                                            className={`rarity-item ${normalizedRarityName} ${selectedRarity === normalizedRarityName ? 'active' : ''}`}
                                                            disabled={rarityCount[r.name] === 0}
                                                            style={{"--item-color": r.color}}
                                                        >
                                                            {r.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-tile-grid height-grid">
                                        {filteredCollection.map((card) => {
                                            const isSelected = selectedOfferedCards.some(c => c._id === card._id);
                                            return (
                                                <div
                                                    key={card._id}
                                                    className={`card-tile ${isSelected ? 'selected' : ''} ${card.slabbed ? 'slabbed' : ''}`}
                                                >
                                                    <BaseCard
                                                        name={card.name}
                                                        image={card.imageUrl}
                                                        rarity={card.rarity || (card.rarities && card.rarities[0]?.rarity)}
                                                        description={card.flavorText}
                                                        mintNumber={card.mintNumber}
                                                        modifier={card.modifier}
                                                        slabbed={card.slabbed}
                                                        grade={card.grade}
                                                        miniCard={true}
                                                    />

                                                    <div className="actions">
                                                        <button className={`${isSelected ? 'primary-button' : ''}`}
                                                                type="button"
                                                                onClick={() => toggleCardSelection(card)}>
                                                            {isSelected ? 'Unselect Card' : 'Select Card'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {filteredCollection.length === 0 && (
                                            <p>No cards matching filter(s).</p>
                                        )}
                                    </div>
                                </div>

                                <div className="market-selected-cards-panel">
                                    <h3>Selected Cards for Offer</h3>
                                    <div className="card-tile-grid height-grid" style={{'--user-card-scale': 1}}>
                                        {selectedOfferedCards.length > 0 ? (
                                            selectedOfferedCards.map((card) => (
                                                <div key={card._id}
                                                     className={`card-tile ${card.slabbed ? 'slabbed' : ''}`}>
                                                    <BaseCard
                                                        name={card.name}
                                                        image={card.imageUrl}
                                                        rarity={card.rarity || (card.rarities && card.rarities[0]?.rarity)}
                                                        description={card.flavorText}
                                                        mintNumber={card.mintNumber}
                                                        modifier={card.modifier}
                                                        slabbed={card.slabbed}
                                                        grade={card.grade}
                                                        miniCard={true}
                                                    />

                                                    <div className="actions">
                                                        <button className='primary-button'
                                                                onClick={() => toggleCardSelection(card)}>
                                                            Unselect Card
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p>No cards selected yet.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="button-group">
                                    <button type="submit" className="primary-button" disabled={isSubmittingOffer}>
                                        {isSubmittingOffer ? 'Submitting...' : 'Submit Offer'}
                                        {isSubmittingOffer && <LoadingSpinner small/>}
                                    </button>
                                </div>
                            </form>
                        )}
                        {offerError && <p className="error">{offerError}</p>}
                        {offerSuccess && <p className="success">{offerSuccess}</p>}
                    </div>
                )}</>)}
        </div>
    );
};

export default MarketListingDetails;
