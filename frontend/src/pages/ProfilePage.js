import React, {useState, useEffect} from 'react';
import {useNavigate, useParams, Link} from 'react-router-dom';
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

const ProfilePage = () => {
    const [featuredCards, setFeaturedCards] = useState([]);
    const [favoriteCard, setFavoriteCard] = useState(null);
    const [cardQuery, setCardQuery] = useState('');
    const [cardResults, setCardResults] = useState([]);
    const [selectedRarity, setSelectedRarity] = useState('');
    const [availableRarities, setAvailableRarities] = useState([]);
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
    const navigate = useNavigate();
    const {username: routeUsername} = useParams();

    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [achievements, setAchievements] = useState([]);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const packs = await fetchAllPacks();
                setPackOptions(packs);

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
                const {listings} = await fetchUserMarketListings(profileId, 3);
                setUserListings(listings);
            } catch (e) {
                console.error('Error fetching user listings:', e);
            }
        };
        fetchListings();
    }, [profileId]);

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
            state: {counterOffer: {selectedUser: username}},
        });
    };

    const handleSelectCard = (card) => {
        setCardQuery(card.name);
        setCardResults([]);

        let firstAvailableRarity = ''; // Establish a default
        const raritiesForCard = card.rarities?.map(r => r.rarity) || [];

        if (raritiesForCard.length > 0) {
            firstAvailableRarity = raritiesForCard[0]; // Get the first rarity from the list
        }

        setAvailableRarities(raritiesForCard);

        // Set the selected rarity for the dropdown and the card preview
        setSelectedRarity(firstAvailableRarity);

        // Update the card preview object
        setFavoriteCard({
            name: card.name,
            imageUrl: card.imageUrl,
            flavorText: card.flavorText,
            rarity: firstAvailableRarity
        });
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

    const clearFavorite = async () => {
        try {
            await updateFavoriteCard('', '');
            setFavoriteCard(null);
            setEditingFavorite(false);
            setCardQuery('');
            setSelectedRarity('');
            setCardResults([]);
        } catch (err) {
            console.error('Error saving favorite card:', err);
        }
    };



    if (loading) {
        return <LoadingSpinner/>;
    }

    return (
        <div className="page">
            <h1>{username}'s Profile</h1>

            <div className="stats">
                <div className="stat" data-tooltip={`Total number of cards ${isOwnProfile ? 'you own' : username + ' owns'}`}>
                    <div>Total Cards</div>
                    <span>{collectionCount}</span>
                </div>
                <div className="stat" data-tooltip={`Unopened packs ${isOwnProfile ? 'you currently have' : username + ' currently has'}`}>
                    <div>Current Packs</div>
                    <span>{currentPacks}</span>
                </div>
                <div className="stat" data-tooltip={`Total packs ${isOwnProfile ? 'you have' : username + ' has'} opened`}>
                    <div>Opened Packs</div>
                    <span>{openedPacks}</span>
                </div>
                <div className="stat" data-tooltip={`${isOwnProfile ? 'Your' : username + '\'s'} current level`}>
                    <div>Level</div>
                    <span>{level}</span>
                </div>
                <div className="stat xp" data-tooltip="Earn XP by opening packs, completing trades, and selling cards.">
                    <div>XP</div>
                    <span>{xp % 100} / 100</span>
                    <div className="xp-bar-container">
                        <div className="xp-bar-fill" style={{width: `${(xp % 100)}%`}}></div>
                    </div>
                </div>

                <div className="button-group">
                    {!isOwnProfile && (
                        <button className="primary-button" onClick={handleInitiateTrade} style={{margin: '0'}}>
                            Trade with {username}
                        </button>
                    )}
                    <button className="secondary-button" onClick={handleViewCollection} style={{margin: '0'}}>
                        View Full Collection
                    </button>
                </div>
            </div>
            <div className="section-card">
                <h2>Featured Cards</h2>
                {featuredCards.length > 0 ? (
                    <div className="cards-grid">
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

            <div className="row-container three-one">
                <div className="column-container">
                    <div className="section-card">
                        <h2>Featured Achievements</h2>
                        <div className="achievements-container">
                            {achievements.length === 0 && <p>No achievements yet.</p>}
                            {achievements.map((ach, idx) => (
                                <div key={idx} className="achievement-badge" title={ach.description}
                                     data-tooltip={ach.description}>
                                    <span>{ach.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {userListings.length > 0 && (
                        <div className="section-card">
                            <h2>{isOwnProfile ? 'Your' : username + '\'s'} Market Listing{userListings.length > 1 ? 's' : ''}</h2>

                            <div className="card-tile-grid height-grid">
                                {userListings.map((listing) => (
                                    <div key={listing._id} className="card-tile">
                                        <BaseCard
                                            name={listing.card.name}
                                            image={listing.card.imageUrl}
                                            rarity={listing.card.rarity}
                                            description={listing.card.flavorText}
                                            mintNumber={listing.card.mintNumber}
                                            modifier={listing.card.modifier}
                                            miniCard={true}
                                        />
                                        <div className="actions">
                                            <Link to={`/market/listing/${listing._id}`}>
                                                <button className="primary-button">View Listing</button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="column-container">
                    <div className="card-tile" style={{marginTop: '1rem'}}>
                        <h2>Favorite Card Wanted</h2>

                        {(favoriteCard && favoriteCard.name) ? (
                            <BaseCard
                                name={favoriteCard.name}
                                image={favoriteCard.imageUrl}
                                rarity={selectedRarity || favoriteCard.rarity}
                                description={favoriteCard.flavorText}
                            />
                        ) : (
                            <>
                                <button
                                    className="primary-button"
                                    onClick={() => {
                                        setEditingFavorite(true);
                                        setCardQuery(favoriteCard?.name || '');
                                        setSelectedRarity(favoriteCard?.rarity || '');
                                    }}
                                >
                                    {favoriteCard && favoriteCard.name ? ('Change favourite card') : ('Select favourite card')}
                                </button>
                            </>
                        )}

                        {isOwnProfile && (
                            <div className="actions">
                                {(favoriteCard && !editingFavorite) && (
                                    (favoriteCard && favoriteCard.name) && (<button className="success-button" onClick={clearFavorite}>Clear</button>)
                                )}

                                {editingFavorite && (
                                    <div className="favorite-card-form">
                                        <div className="favorite-input">
                                            <input
                                                type="search"
                                                className="search-bar"
                                                placeholder="Search card..."
                                                value={cardQuery}
                                                onChange={(e) => setCardQuery(e.target.value)}
                                                onBlur={() => setTimeout(() => { setCardResults([]); }, 200)}
                                            />
                                            {cardResults.length > 0 && (
                                                <ul className="search-dropdown">
                                                    {cardResults.map((c) => (
                                                        <li
                                                            key={c._id}
                                                            className="search-result-item"
                                                            onClick={() => handleSelectCard(c)}
                                                        >
                                                            {c.name}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            <select
                                                value={selectedRarity}
                                                onChange={(e) => setSelectedRarity(e.target.value)}
                                                disabled={availableRarities.length === 0}
                                            >
                                                <option value="">Select rarity</option>
                                                {availableRarities.map((rarityName) => (
                                                    <option key={rarityName} value={rarityName}>
                                                        {rarityName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="button-group">
                                            <button className="success-button" onClick={saveFavorite}>Save</button>
                                            <button className="danger-button" onClick={() => {
                                                setEditingFavorite(false);
                                                setCardQuery(favoriteCard?.name || '');
                                                setSelectedRarity(favoriteCard?.rarity || '');
                                                setAvailableRarities([]);
                                            }}>Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

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
            </div>
        </div>
    );
};

export default ProfilePage;
