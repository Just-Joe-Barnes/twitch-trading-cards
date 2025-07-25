// src/pages/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import BaseCard from '../components/BaseCard';
import {
    fetchUserProfile,
    fetchUserProfileByUsername,
    fetchUserCollection,
    fetchFavoriteCard,
    updateFavoriteCard,
    searchCardsByName,
    fetchUserMarketListings,
    fetchAllPacks,
    fetchPreferredPack,
    updatePreferredPack,
} from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/ProfilePage.css';
import '../styles/MarketPage.css';
import { rarities } from '../constants/rarities';

const ProfilePage = () => {
    const [featuredCards, setFeaturedCards] = useState([]);
    const [favoriteCard, setFavoriteCard] = useState(null);
    const [cardQuery, setCardQuery] = useState('');
    const [cardResults, setCardResults] = useState([]);
    const [selectedRarity, setSelectedRarity] = useState('');
    const [preferredPackId, setPreferredPackId] = useState('');
    const [packOptions, setPackOptions] = useState([]);
    const [editingFavorite, setEditingFavorite] = useState(false);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [collectionCount, setCollectionCount] = useState(0);
    const [currentPacks, setCurrentPacks] = useState(0);
    const [openedPacks, setOpenedPacks] = useState(0);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState('');
    const [profileId, setProfileId] = useState(null);
    const [userListings, setUserListings] = useState([]);
    const [moreListings, setMoreListings] = useState(0);
    const navigate = useNavigate();
    const { username: routeUsername } = useParams();

    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [achievements, setAchievements] = useState([]);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const packs = await fetchAllPacks();
                setPackOptions(packs);

                // Determine if the logged-in user is viewing their own profile
                let me = null;
                try {
                    me = await fetchUserProfile();
                } catch (e) {
                    console.error('Error fetching current user:', e);
                }

                let profile;
                if (routeUsername) {
                    profile = await fetchUserProfileByUsername(routeUsername);
                } else if (me) {
                    profile = me;
                } else {
                    profile = await fetchUserProfile();
                }
                setProfileId(profile._id || null);
                setUsername(profile.username || 'User');
                setOpenedPacks(profile.openedPacks || 0);
                setXp(profile.xp || 0);
                setLevel(profile.level || 1);
                setPreferredPackId(profile.preferredPack?._id || '');

                const ownProfile = me && profile && me.username === profile.username;
                setIsOwnProfile(ownProfile);

                let tempFeatured = profile.featuredCards || [];
                if (ownProfile) {
                    try {
                        const fav = await fetchFavoriteCard();
                        setFavoriteCard(fav);
                        const pref = await fetchPreferredPack();
                        setPreferredPackId(pref?._id || '');
                    } catch (e) {
                        console.error('Error fetching favorite card:', e);
                    }
                } else {
                    setFavoriteCard(profile.favoriteCard || null);
                }
                if (profile._id) {
                    const collectionData = await fetchUserCollection(profile._id);
                    setCollectionCount(collectionData.cards ? collectionData.cards.length : 0);
                    setCurrentPacks(collectionData.packs || 0);

                    if (collectionData.cards) {
                        tempFeatured = tempFeatured.filter((card) =>
                            collectionData.cards.some((c) => c._id.toString() === card._id.toString())
                        );
                    }
                }
                setFeaturedCards(tempFeatured);
                setAchievements(profile.featuredAchievements || []);
            } catch (error) {
                console.error('Error fetching user profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, [routeUsername]);


    useEffect(() => {
        const fetchListings = async () => {
            if (!profileId) return;
            try {
                const { listings, total } = await fetchUserMarketListings(profileId, 3);
                setUserListings(listings);
                setMoreListings(Math.max(total - listings.length, 0));
            } catch (e) {
                console.error('Error fetching user listings:', e);
            }
        };
        fetchListings();
    }, [profileId]);

    // Debounced search for card names when editing favorite card
    useEffect(() => {
        const fetchResults = async () => {
            if (cardQuery && isOwnProfile && editingFavorite) {
                const results = await searchCardsByName(cardQuery);
                setCardResults(results);
            } else {
                setCardResults([]);
            }
        };
        const t = setTimeout(fetchResults, 300);
        return () => clearTimeout(t);
    }, [cardQuery, isOwnProfile, editingFavorite]);

    const handleViewCollection = () => {
        navigate(`/collection/${username}`);
    };

    const handleInitiateTrade = () => {
        navigate('/trading', {
            state: { counterOffer: { selectedUser: username } },
        });
    };

    const handleSelectCard = (card) => {
        setCardQuery(card.name);
        setCardResults([]);
        setFavoriteCard({ ...favoriteCard, name: card.name, imageUrl: card.imageUrl, flavorText: card.flavorText });
    };

    const saveFavorite = async () => {
        try {
            await updateFavoriteCard(cardQuery, selectedRarity);
            const fav = await fetchFavoriteCard();
            setFavoriteCard(fav);
            setEditingFavorite(false);
            setCardQuery('');
            setSelectedRarity('');
            setCardResults([]);
        } catch (err) {
            console.error('Error saving favorite card:', err);
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="profile-page">
            <div className="title-container">
                <h1>{username}'s Profile</h1>
            </div>

            <div className="profile-overview">
                <h2>Profile Overview</h2>
                <div className="stats">
                    <div className="stat" data-tooltip="Total number of cards you own">
                        <div>Total Cards</div>
                        <span>{collectionCount}</span>
                    </div>
                    <div className="stat" data-tooltip="Unopened packs you currently have">
                        <div>Current Packs</div>
                        <span>{currentPacks}</span>
                    </div>
                    <div className="stat" data-tooltip="Total packs you have opened">
                        <div>Opened Packs</div>
                        <span>{openedPacks}</span>
                    </div>
                    <div className="stat" data-tooltip="Your current level">
                        <div>Level</div>
                        <span>{level}</span>
                    </div>
                    <div className="stat" data-tooltip="Earn XP by opening packs, completing trades, and selling cards.">
                        <div>XP</div>
                        <span>{xp % 100} / 100</span>
                        <div className="xp-bar-container">
                            <div className="xp-bar-fill" style={{ width: `${(xp % 100)}%` }}></div>
                        </div>
                    </div>
                </div>

                <h3>Achievements</h3>
                <div className="achievements-container">
                    {achievements.length === 0 && <p>No achievements yet.</p>}
                {achievements.map((ach, idx) => (
                        <div key={idx} className="achievement-badge" title={ach.description} style={{ opacity: ach.achieved ? 1 : 0.4 }}>
                            <span>{ach.name}</span>
                        </div>
                    ))}
                </div>

            </div>

            <div className="favorite-card-container">
                <h2>Favorite Card Wanted</h2>
                {favoriteCard && favoriteCard.name ? (
                    <div className="favorite-card-display">
                        <BaseCard
                            name={favoriteCard.name}
                            image={favoriteCard.imageUrl}
                            rarity={favoriteCard.rarity}
                            description={favoriteCard.flavorText}
                        />
                    </div>
                ) : (
                    <p>No favorite card selected.</p>
                )}
                {isOwnProfile && !editingFavorite && (
                    <button
                        className="edit-favorite-button"
                        onClick={() => {
                            setEditingFavorite(true);
                            setCardQuery(favoriteCard?.name || '');
                            setSelectedRarity(favoriteCard?.rarity || '');
                        }}
                    >
                        Change Favourite Card
                    </button>
                )}
                {isOwnProfile && editingFavorite && (
                    <div className="favorite-card-form">
                        <div className="favorite-input">
                            <input
                                type="text"
                                className="search-bar"
                                placeholder="Search card..."
                                value={cardQuery}
                                onChange={(e) => setCardQuery(e.target.value)}
                            />
                            {cardResults.length > 0 && (
                                <ul className="search-dropdown">
                                    {cardResults.map((c) => (
                                        <li
                                            key={c._id}
                                            className="search-result-item"
                                            onMouseDown={() => handleSelectCard(c)}
                                        >
                                            {c.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <select
                            value={selectedRarity}
                            onChange={(e) => setSelectedRarity(e.target.value)}
                        >
                            <option value="">Select rarity</option>
                            {rarities.map((r) => (
                                <option key={r.name} value={r.name}>
                                    {r.name}
                                </option>
                            ))}
                        </select>
                        <button onClick={saveFavorite}>Save</button>
                    </div>
                )}
            </div>

            <div className="trade-actions-container">
                <button className="profile-action-button" onClick={handleInitiateTrade}>
                    Start trade with {username}
                </button>
                <button className="profile-action-button" onClick={handleViewCollection}>
                    View Full Collection
                </button>

                {isOwnProfile && (
                    <div className="preferred-pack-container">
                        <h2>Preferred Pack</h2>
                        <select
                            value={preferredPackId}
                            onChange={async (e) => {
                                const id = e.target.value;
                                setPreferredPackId(id);
                                try {
                                    await updatePreferredPack(id);
                                } catch (err) {
                                    console.error('Error updating preferred pack:', err);
                                }
                            }}
                        >
                            <option value="">Select a pack</option>
                            {packOptions.map((p) => (
                                <option key={p._id} value={p._id}>
                                    {p.name || p.type || 'Unnamed'}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="featured-cards-container">
                <h2>Featured Cards</h2>
                {featuredCards.length > 0 ? (
                    <div className="featured-cards">
                        {featuredCards.map((card) => (
                            <BaseCard
                                key={card._id}
                                name={card.name}
                                image={card.imageUrl}
                                rarity={card.rarity}
                                description={card.flavorText}
                                mintNumber={card.mintNumber}
                                maxMint={card?.maxMint || '???'}
                                modifier={card.modifier}
                                grade={card.grade}
                                slabbed={card.slabbed}
                            />
                        ))}
                    </div>
                ) : (
                    <p>Set your featured cards on your collection page</p>
                )}
            </div>

            <div className="user-listings-container">
                <h2>{username}'s Market Listings</h2>
                {userListings.length > 0 ? (
                    <div className="user-listings">
                        {userListings.map((listing) => (
                            <div key={listing._id} className="listing-card">
                                <div className="listing-card-content">
                                    <BaseCard
                                        name={listing.card.name}
                                        image={listing.card.imageUrl}
                                        rarity={listing.card.rarity}
                                        description={listing.card.flavorText}
                                        mintNumber={listing.card.mintNumber}
                                        modifier={listing.card.modifier}
                                    />
                                </div>
                                <p className="offers-count">Offers: {listing.offers ? listing.offers.length : 0}</p>
                                <Link to={`/market/listing/${listing._id}`}>
                                    <button className="view-listing-button">View Listing</button>
                                </Link>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No active listings.</p>
                )}
                {moreListings > 0 && (
                    <p className="more-listings">{moreListings} more on the market</p>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
