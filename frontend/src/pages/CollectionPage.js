// src/pages/CollectionPage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    fetchUserCollection,
    fetchUserProfile,
    fetchFeaturedCards,
    updateFeaturedCards,
} from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/CollectionPage.css';
import { rarities } from '../constants/rarities';

const cardRarities = [
    { rarity: 'Basic', color: '#8D8D8D' },
    { rarity: 'Common', color: '#64B5F6' },
    { rarity: 'Standard', color: '#66BB6A' },
    { rarity: 'Uncommon', color: '#1976D2' },
    { rarity: 'Rare', color: '#AB47BC' },
    { rarity: 'Epic', color: '#FFA726' },
    { rarity: 'Legendary', color: '#e32232' },
    { rarity: 'Mythic', color: 'hotpink' },
    { rarity: 'Unique', color: 'black' },
    { rarity: 'Divine', color: 'white' },
];

const CollectionPage = ({
    mode,
    onSelectItem,
    selectedItems = [],
    hideHeader = false,
    collectionTitle,
}) => {
    const { username: collectionOwner } = useParams();
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [allCards, setAllCards] = useState([]);
    const [filteredCards, setFilteredCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPacks, setTotalPacks] = useState(0); // new state for packs

    const hasSlabbed = filteredCards.some(card => card.slabbed);

    // Card Container Scale Slider
    const defaultCardScale = 1;
    const [cardScale, setCardScale] = useState(() => {
        const storedScale = localStorage.getItem("cardScale");
        return storedScale !== null ? parseFloat(storedScale) : defaultCardScale;
    });
    useEffect(() => {
        localStorage.setItem("cardScale", cardScale);
    }, [cardScale]);
    const handleCardScaleChange = (e) => {
        const newScale = parseFloat(e.target.value);
        setCardScale(newScale);
    };

    // Filter states
    const [search, setSearch] = useState('');
    const [rarityFilter, setRarityFilter] = useState('');
    const [sortOption, setSortOption] = useState('acquiredAt');
    const [order, setOrder] = useState('desc');
    const [showSlabbedOnly, setShowSlabbedOnly] = useState(false);

    // Featured states
    const [featuredCards, setFeaturedCards] = useState([]);
    const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);


    // 1) Fetch logged-in user
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profile = await fetchUserProfile();
                setLoggedInUser(profile.username);
            } catch (error) {
                console.error('Error fetching user profile:', error);
            }
        };
        fetchProfile();
    }, []);

    // 2) Fetch collection (for page owner or logged-in user)
    useEffect(() => {
        const fetchCollection = async () => {
            try {
                setLoading(true);
                const identifier = collectionOwner || loggedInUser;
                if (identifier) {
                    const data = await fetchUserCollection(identifier);
                    if (data.cards) {
                        setAllCards(data.cards);
                        setFilteredCards(data.cards);
                        setTotalPacks(data.packs || 0); // update total packs if provided
                    }
                }
            } catch (error) {
                console.error('Error fetching user collection:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCollection();
    }, [collectionOwner, loggedInUser]);

    // 3) Fetch featured cards (if applicable)
    useEffect(() => {
        const fetchFeatured = async () => {
            try {
                if (loggedInUser && (!collectionOwner || loggedInUser === collectionOwner)) {
                    const response = await fetchFeaturedCards();
                    setFeaturedCards(response.featuredCards || []);
                }
            } catch (error) {
                console.error('Error fetching featured cards:', error);
            }
        };
        fetchFeatured();
    }, [loggedInUser, collectionOwner]);

    // 4) Filter & sort cards
    useEffect(() => {
        let filtered = [...allCards];

        // Search filter
        if (search) {
            filtered = filtered.filter((card) =>
                card.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Rarity filter
        if (rarityFilter) {
            filtered = filtered.filter(
                (card) => card.rarity.trim().toLowerCase() === rarityFilter.trim().toLowerCase()
            );
        }

        // Sorting
        if (sortOption) {
            filtered.sort((a, b) => {
                if (sortOption === 'mintNumber') {
                    const aNum = parseInt(a.mintNumber, 10);
                    const bNum = parseInt(b.mintNumber, 10);
                    return order === 'asc' ? aNum - bNum : bNum - aNum;
                } else if (sortOption === 'name') {
                    return order === 'asc'
                        ? a.name.localeCompare(b.name)
                        : b.name.localeCompare(a.name);
                } else if (sortOption === 'rarity') {
                    const rarityA = rarities.findIndex(
                        (r) => r.name.toLowerCase() === a.rarity.toLowerCase()
                    );
                    const rarityB = rarities.findIndex(
                        (r) => r.name.toLowerCase() === b.rarity.toLowerCase()
                    );
                    return order === 'asc' ? rarityA - rarityB : rarityB - rarityA;
                } else if (sortOption === 'acquiredAt') {
                    return order === 'asc'
                        ? new Date(a.acquiredAt) - new Date(b.acquiredAt)
                        : new Date(b.acquiredAt) - new Date(a.acquiredAt);
                }
                return 0;
            });
        }

        // Show Featured Only
        if (showFeaturedOnly) {
            filtered = filtered.filter((card) =>
                featuredCards.some((fc) => fc._id === card._id)
            );
        }

        // Slabbed filter
        if (showSlabbedOnly) {
            filtered = filtered.filter((card) => card.slabbed);
        }

        setFilteredCards(filtered);
    }, [allCards, search, rarityFilter, sortOption, order, showFeaturedOnly, showSlabbedOnly, featuredCards]);

    // Single-click -> select card for deck builder
const handleCardClick = (card) => {
        if (onSelectItem) {
            const alreadySelected = selectedItems.find((item) => item.itemId === card._id);
            let updatedSelection = [];
            if (alreadySelected) {
                updatedSelection = selectedItems.filter((item) => item.itemId !== card._id);
            } else {
                if (selectedItems.length < 4) {
                    updatedSelection = [...selectedItems, { itemId: card._id, itemType: 'card', card }];
                } else {
                    return;
                }
            }
            onSelectItem(updatedSelection);
        }
    };

    // Toggle featured on the server
    const handleToggleFeatured = async (card) => {
        const isCurrentlyFeatured = featuredCards.some((fc) => fc._id === card._id);
        let newFeatured;
        if (isCurrentlyFeatured) {
            newFeatured = featuredCards.filter((fc) => fc._id !== card._id);
        } else {
            newFeatured = [...featuredCards, card];
        }
        const newFeaturedIds = newFeatured.map((c) => c._id);

        // Optimistically update UI
        const previousFeatured = featuredCards;
        setFeaturedCards(newFeatured);

        try {
            const response = await updateFeaturedCards(newFeaturedIds);
            if (response.featuredCards) {
                setFeaturedCards(response.featuredCards);
                if (window.showToast) {
                    const msg = isCurrentlyFeatured
                        ? 'Card removed from featured.'
                        : 'Card added to featured.';
                    window.showToast(msg, 'success');
                }
            }
        } catch (error) {
            console.error('Error updating featured cards:', error);
            alert('Error updating featured cards.');
            setFeaturedCards(previousFeatured); // revert on failure
            if (window.showToast) {
                window.showToast('Error updating featured cards.', 'error');
            }
        }
    };

    // Inspect card and pass extra info
    const handleInspect = (card) => {
        const isFeatured = featuredCards.some((fc) => fc._id === card._id);
        if (window.inspectCard) {
            window.inspectCard({
                ...card,
                name: card.name,
                image: card.imageUrl,
                description: card.flavorText,
                rarity: card.rarity,
                mintNumber: card.mintNumber,
                modifier: card.modifier,
                isFeatured,
                isOwner,
                onToggleFeatured: () => handleToggleFeatured(card),
            });
        }
    };

    // Single-click handler for card selection
    const handleClick = (card) => {
        handleCardClick(card);
        handleInspect(card);
    };

    // Clear all featured cards
    const handleClearFeatured = async () => {
        // Optimistically clear UI
        const previousFeatured = featuredCards;
        setFeaturedCards([]);
        try {
            const response = await updateFeaturedCards([]);
            if (response.featuredCards) {
                setFeaturedCards(response.featuredCards);
            }
            alert('Featured cards cleared.');
            if (window.showToast) {
                window.showToast('Featured cards cleared.', 'success');
            }
        } catch (error) {
            console.error('Error clearing featured cards:', error);
            alert('Error clearing featured cards.');
            setFeaturedCards(previousFeatured);
            if (window.showToast) {
                window.showToast('Error clearing featured cards.', 'error');
            }
        }
    };

    const isOwner = !collectionOwner || loggedInUser === collectionOwner;

    if (loading) return <LoadingSpinner />;

    return (
        <div className="cp-page">
            {!hideHeader && (
                <h1>{collectionTitle || `${collectionOwner || loggedInUser}'s Collection`}</h1>
            )}

            <p className="cp-catalogue-description">
                Browse your entire collection here! Use the filters below to search by name, rarity, or mint number.
                Click a card to inspect it. From the inspector you can add or remove the card from your featured list (up to 4 cards).
                Clicking the "Clear Featured Cards" button will remove all featured selections.
            </p>

            {/* New Top Section Container */}
            <div className="cp-top-section">
                <div className="cp-row">
                    <div className="cp-filters-container">
                        <h3>Filters</h3>
                        <div className="cp-filters">
                            <input
                                type="text"
                                placeholder="Search by card name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)}>
                                <option value="">All Rarities</option>
                                {rarities
                                    .filter((r) => r.name !== 'All')
                                    .map((r) => (
                                        <option key={r.name} value={r.name.toLowerCase()}>
                                            {r.name}
                                        </option>
                                    ))}
                            </select>
                            <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                                <option value="">Sort By</option>
                                <option value="name">Name</option>
                                <option value="mintNumber">Mint Number</option>
                                <option value="rarity">Rarity</option>
                                <option value="acquiredAt">Acquisition Date</option>
                            </select>
                            <select value={order} onChange={(e) => setOrder(e.target.value)}>
                                <option value="asc">Ascending</option>
                                <option value="desc">Descending</option>
                            </select>
                            <label className="cp-slabbed-toggle">
                                <input
                                    type="checkbox"
                                    checked={showSlabbedOnly}
                                    onChange={(e) => setShowSlabbedOnly(e.target.checked)}
                                />
                                Slabbed Only
                            </label>
                        </div>
                    </div>
                    <div className="cp-featured-container">
                        <h3>Featured Controls</h3>
                        <div className="cp-featured-controls">
                            <label className="cp-featured-toggle">
                                <input
                                    type="checkbox"
                                    checked={showFeaturedOnly}
                                    onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                                />
                                Show Featured Only
                            </label>
                            {isOwner && (
                                <button className="cp-clear-featured-button" onClick={handleClearFeatured}>
                                    Clear Featured Cards
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="cp-row">
                    <div className="cp-slider-container">
                        <div className="slidecontainer">
                            <label>Card Scale: </label>
                            <input
                                type="range"
                                min="0.1"
                                max="2"
                                step="0.05"
                                value={cardScale}
                                onChange={handleCardScaleChange}
                            />
                            <p>{Math.round(cardScale * 100)}%</p>
                        </div>
                    </div>
                    <div className="cp-rarity-container">
                        <div className="cp-rarity-key">
                            {cardRarities.map((r) => (
                                <div key={r.rarity} className="cp-rarity-item">
                                    <span className="cp-color-box" style={{ backgroundColor: r.color }} />
                                    <span className="cp-rarity-text">{r.rarity}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* New Stats Container */}
            <div className="cp-stats-container">
                <div className="cp-stats-item">
                    <h4>Total Cards</h4>
                    <p>{allCards.length}</p>
                </div>
                <div className="cp-stats-item">
                    <h4>Total Packs</h4>
                    <p>{totalPacks}</p>
                </div>
            </div>

            {/* Cards Grid */}
            <div className={`cp-cards-grid ${hasSlabbed ? 'slabbed' : ''}`} style={{ "--user-card-scale": cardScale }}>
                {filteredCards.length > 0 ? (
                    filteredCards.map((card) => {
                        const isFeatured = featuredCards.some((fc) => fc._id === card._id);
                        const isSelected = selectedItems.some((item) => item.itemId === card._id);
                        return (
                            <div
                                key={card._id}
                                id={`cp-card-${card._id}`}
                                className={`cp-card-item ${isSelected ? 'cp-selected' : ''} ${card.slabbed ? 'slabbed' : ''}`}
                                onClick={() => handleClick(card)}
                            >
                                {isFeatured && <div className="cp-featured-badge">Featured</div>}
                                <BaseCard
                                    name={card.name}
                                    image={card.imageUrl}
                                    rarity={card.rarity}
                                    description={card.flavorText}
                                    mintNumber={card.mintNumber}
                                    modifier={card.modifier}
                                    grade={card.grade}
                                    slabbed={card.slabbed}
                                    maxMint={
                                        rarities.find(
                                            (r) => r.name.toLowerCase() === card.rarity.toLowerCase()
                                        )?.totalCopies || '???'
                                    }
                                    inspectOnClick={false}
                                />
                            </div>
                        );
                    })
                ) : (
                    <p>No cards found.</p>
                )}
            </div>
        </div>
    );
};

export default CollectionPage;
