// src/pages/CollectionPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
    fetchUserCollection,
    fetchUserProfile,
    fetchFeaturedCards,
    updateFeaturedCards,
} from '../utils/api';
import BaseCard from '../components/BaseCard';
import '../styles/CollectionPage.css';
import { rarities } from '../constants/rarities';

// Mapping of rarity names to their corresponding border colors
const rarityColors = {
    basic: "#a0a0a0",
    common: "#78c2ad",
    standard: "#4a90e2",
    uncommon: "#9068be",
    rare: "#e5a228",
    epic: "#ff4500",
    legendary: "#00ced1",
    mythic: "#ff69b4",
    unique: "black",
    divine: "#ffd700"
};

const CollectionPage = ({ mode, onSelectItem, selectedItems = [], hideHeader = false, collectionTitle }) => {
    const { username: collectionOwner } = useParams();
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [allCards, setAllCards] = useState([]);
    const [filteredCards, setFilteredCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [rarity, setRarity] = useState('');
    const [sort, setSort] = useState('');
    const [order, setOrder] = useState('asc');
    const [packQuantity, setPackQuantity] = useState(0);
    const [featuredCards, setFeaturedCards] = useState([]); // current list of featured cards
    const [overlayMessages, setOverlayMessages] = useState({}); // mapping cardId -> message
    const [showFeaturedOnly, setShowFeaturedOnly] = useState(false); // filter toggle

    const clickTimerRef = useRef(null);

    // Fetch logged-in user's profile
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

    // Fetch collection cards
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

    // Fetch featured cards (only for the owner)
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

    // Apply filters and sorting to cards
    useEffect(() => {
        let filtered = [...allCards];

        if (search) {
            filtered = filtered.filter((card) =>
                card.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (rarity) {
            filtered = filtered.filter(
                (card) => card.rarity.trim().toLowerCase() === rarity.trim().toLowerCase()
            );
        }

        if (sort) {
            filtered.sort((a, b) => {
                if (sort === 'mintNumber') {
                    return order === 'asc'
                        ? parseInt(a.mintNumber, 10) - parseInt(b.mintNumber, 10)
                        : parseInt(b.mintNumber, 10) - parseInt(a.mintNumber, 10);
                } else if (sort === 'name') {
                    return order === 'asc'
                        ? a.name.localeCompare(b.name)
                        : b.name.localeCompare(a.name);
                } else if (sort === 'rarity') {
                    const rarityA = rarities.findIndex(
                        (r) => r.name.toLowerCase() === a.rarity.toLowerCase()
                    );
                    const rarityB = rarities.findIndex(
                        (r) => r.name.toLowerCase() === b.rarity.toLowerCase()
                    );
                    return order === 'asc' ? rarityA - rarityB : rarityB - rarityA;
                }
                return 0;
            });
        }

        // Apply the featured-only filter if enabled
        if (showFeaturedOnly) {
            filtered = filtered.filter((card) =>
                featuredCards.some((fc) => fc._id === card._id)
            );
        }

        setFilteredCards(filtered);
    }, [allCards, search, rarity, sort, order, showFeaturedOnly, featuredCards]);

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
                    return; // Prevent selecting more than 4 cards
                }
            }
            onSelectItem(updatedSelection);
        }
    };

    const handlePackQuantityChange = (e) => {
        const quantity = Math.max(0, Math.min(parseInt(e.target.value || 0, 10), 10));
        setPackQuantity(quantity);
        if (onSelectItem) {
            onSelectItem([
                ...selectedItems.filter((item) => item.itemType !== 'pack'),
                { itemId: 'pack', itemType: 'pack', quantity },
            ]);
        }
    };

    // Toggle a card's featured status and update the featured list
    const handleToggleFeatured = async (card) => {
        const isCurrentlyFeatured = featuredCards.some((fc) => fc._id === card._id);
        const newFeaturedCards = isCurrentlyFeatured
            ? featuredCards.filter((fc) => fc._id !== card._id)
            : [...featuredCards, card];

        try {
            await updateFeaturedCards(newFeaturedCards);
            setFeaturedCards(newFeaturedCards);
        } catch (error) {
            console.error('Error updating featured cards:', error);
            throw error;
        }
    };

    // Handle double-click: toggle featured status and display overlay message
    const handleCardDoubleClick = async (card) => {
        if (!isOwner) return;
        const isCurrentlyFeatured = featuredCards.some((fc) => fc._id === card._id);
        if (!isCurrentlyFeatured && featuredCards.length >= 4) {
            setOverlayMessages((prev) => ({ ...prev, [card._id]: "Maximum of 4 featured cards allowed" }));
            setTimeout(() => {
                setOverlayMessages((prev) => {
                    const newObj = { ...prev };
                    delete newObj[card._id];
                    return newObj;
                });
            }, 1500);
            return;
        }
        try {
            await handleToggleFeatured(card);
            const message = isCurrentlyFeatured ? "Card removed from featured cards" : "Card added to featured cards";
            setOverlayMessages((prev) => ({ ...prev, [card._id]: message }));
            setTimeout(() => {
                setOverlayMessages((prev) => {
                    const newObj = { ...prev };
                    delete newObj[card._id];
                    return newObj;
                });
            }, 1500);
        } catch (error) {
            console.error(error);
        }
    };

    // Distinguish between single and double click
    const handleClick = (card) => {
        if (clickTimerRef.current) return;
        clickTimerRef.current = setTimeout(() => {
            handleCardClick(card);
            clickTimerRef.current = null;
        }, 250);
    };

    const handleDoubleClick = (card) => {
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
        }
        handleCardDoubleClick(card);
    };

    // New: Clear all featured cards button handler
    const handleClearFeatured = async () => {
        try {
            await updateFeaturedCards([]);
            setFeaturedCards([]);
        } catch (error) {
            console.error('Error clearing featured cards:', error);
        }
    };

    const isOwner = !collectionOwner || loggedInUser === collectionOwner;

    return (
        <div className="collection-page">
            {!hideHeader && (
                <h1>{collectionTitle || `${collectionOwner || loggedInUser}'s Collection`}</h1>
            )}

            {/* Add a brief paragraph explaining the catalogue */}
            <p className="catalogue-description">
                Browse your entire collection here! Use the filters below to limit your searches by rarity, name or mint number. You can also add up to 4 cards to your profile page as "featured cards". Double them them again, or click the "Clear Featured Cards" button to remove all cards from the featured section.
            </p>

            {/* Filters */}
            <div className="filters">
                <input
                    type="text"
                    placeholder="Search by card name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select value={rarity} onChange={(e) => setRarity(e.target.value)}>
                    <option value="">All Rarities</option>
                    {rarities
                        .filter((r) => r.name !== 'All')
                        .map((r) => {
                            const lower = r.name.toLowerCase();
                            return (
                                <option
                                    key={r.name}
                                    value={r.name.toLowerCase()}
                                    style={{
                                        color: rarityColors[r.name.toLowerCase()],
                                        ...(r.name.toLowerCase() === 'unique'
                                            ? { textShadow: '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white' }
                                            : {})
                                    }}
                                >
                                    {r.name}
                                </option>

                            );
                        })}
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="">Sort By</option>
                    <option value="name">Name</option>
                    <option value="mintNumber">Mint Number</option>
                    <option value="rarity">Rarity</option>
                </select>
                <select value={order} onChange={(e) => setOrder(e.target.value)}>
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                </select>
                <div className="featured-controls">
                    <label className="featured-filter-toggle">
                        <input
                            type="checkbox"
                            checked={showFeaturedOnly}
                            onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                        />
                        Show Featured Only
                    </label>
                    {isOwner && (
                        <button className="clear-featured-button" onClick={handleClearFeatured}>
                            Clear Featured Cards
                        </button>
                    )}
                </div>
            </div>

            {mode && (
                <div className="pack-selection">
                    <label>Offer Packs:</label>
                    <input
                        type="number"
                        value={packQuantity}
                        onChange={(e) => {
                            const quantity = Math.max(0, Math.min(parseInt(e.target.value || 0, 10), 10));
                            setPackQuantity(quantity);
                            if (onSelectItem) {
                                onSelectItem([
                                    ...selectedItems.filter((item) => item.itemType !== 'pack'),
                                    { itemId: 'pack', itemType: 'pack', quantity },
                                ]);
                            }
                        }}
                        min="0"
                        max="10"
                    />
                </div>
            )}

            {/* Cards */}
            <div className="cards-container">
                {loading ? (
                    <p>Loading...</p>
                ) : filteredCards.length > 0 ? (
                    filteredCards.map((card) => (
                        <div
                            key={card._id}
                            className={`card-item ${selectedItems.some((item) => item.itemId === card._id) ? 'selected' : ''}`}
                            onClick={() => handleClick(card)}
                            onDoubleClick={() => handleDoubleClick(card)}
                            style={{ position: 'relative' }}
                        >
                            <BaseCard
                                name={card.name}
                                image={card.imageUrl}
                                rarity={card.rarity}
                                description={card.flavorText}
                                mintNumber={card.mintNumber}
                                maxMint={
                                    rarities.find((r) => r.name.toLowerCase() === card.rarity.toLowerCase())?.totalCopies ||
                                    '???'
                                }
                            />
                            {overlayMessages[card._id] && (
                                <div className="card-overlay">
                                    {overlayMessages[card._id]}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p>No cards found.</p>
                )}
            </div>
        </div>
    );
};

export default CollectionPage;
