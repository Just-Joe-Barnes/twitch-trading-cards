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
    const [search, setSearch] = useState('');
    const [rarityFilter, setRarity] = useState('');
    const [sort, setSort] = useState('');
    const [order, setOrder] = useState('asc');
    const [packQuantity, setPackQuantity] = useState(0);
    const [featuredCards, setFeaturedCards] = useState([]);
    const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

    const clickTimerRef = useRef(null);

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
        if (sort) {
            filtered.sort((a, b) => {
                if (sort === 'mintNumber') {
                    const aNum = parseInt(a.mintNumber, 10);
                    const bNum = parseInt(b.mintNumber, 10);
                    return order === 'asc' ? aNum - bNum : bNum - aNum;
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

        // Show Featured Only
        if (showFeaturedOnly) {
            filtered = filtered.filter((card) =>
                featuredCards.some((fc) => fc._id === card._id)
            );
        }

        setFilteredCards(filtered);
    }, [allCards, search, rarityFilter, sort, order, showFeaturedOnly, featuredCards]);

    const handleCardClick = (card) => {
        if (onSelectItem) {
            const alreadySelected = selectedItems.find((item) => item.itemId === card._id);
            let updatedSelection = [];

            if (alreadySelected) {
                updatedSelection = selectedItems.filter((item) => item.itemId !== card._id);
            } else {
                if (selectedItems.length < 4) {
                    updatedSelection = [
                        ...selectedItems,
                        { itemId: card._id, itemType: 'card', card },
                    ];
                } else {
                    return;
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

    const handleCardDoubleClick = async (card) => {
        if (!isOwner) return;
        // If user already has 4 featured cards, block adding a new one
        const isCurrentlyFeatured = featuredCards.some((fc) => fc._id === card._id);
        if (!isCurrentlyFeatured && featuredCards.length >= 4) {
            // You could show a toast or quick highlight to indicate "no more featured allowed."
            return;
        }

        // Toggle featured
        try {
            await handleToggleFeatured(card);
        } catch (error) {
            console.error(error);
        }

        // Add a short highlight animation on the card
        const cardElement = document.getElementById(`card-${card._id}`);
        if (cardElement) {
            cardElement.classList.add('double-clicked');
            setTimeout(() => {
                cardElement.classList.remove('double-clicked');
            }, 1000); // 1 second “pop” animation
        }
    };

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

            <p className="catalogue-description">
                Browse your entire collection here! Use the filters below to search by name, rarity,
                or mint number. You can also add up to 4 cards to your profile page as "featured
                cards" by double clicking them. Double clicking a card again, or clicking the "Clear
                Featured Cards" button, will remove them from the featured section.
            </p>

            {/* Filters */}
            <div className="filters">
                <input
                    type="text"
                    placeholder="Search by card name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select value={rarityFilter} onChange={(e) => setRarity(e.target.value)}>
                    <option value="">All Rarities</option>
                    {rarities
                        .filter((r) => r.name !== 'All')
                        .map((r) => (
                            <option key={r.name} value={r.name.toLowerCase()}>
                                {r.name}
                            </option>
                        ))}
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

            {/* Card Rarity Key - Horizontal */}
            <div className="card-rarity-key-horizontal">
                {cardRarities.map((r) => (
                    <div key={r.rarity} className="rarity-item-horizontal">
                        <span className="color-box" style={{ backgroundColor: r.color }} />
                        <span className="rarity-text">{r.rarity}</span>
                    </div>
                ))}
            </div>

            {/* Cards */}
            <div className="cards-container">
                {loading ? (
                    <p>Loading...</p>
                ) : filteredCards.length > 0 ? (
                    filteredCards.map((card) => (
                        <div
                            key={card._id}
                            id={`card-${card._id}`}
                            className={`card-item ${selectedItems.some((item) => item.itemId === card._id)
                                    ? 'selected'
                                    : ''
                                }`}
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
                                    rarities.find(
                                        (r) => r.name.toLowerCase() === card.rarity.toLowerCase()
                                    )?.totalCopies || '???'
                                }
                            />
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
