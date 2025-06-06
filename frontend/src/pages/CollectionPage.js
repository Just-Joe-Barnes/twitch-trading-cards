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
import LoadingSpinner from '../components/LoadingSpinner';
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
    const [sortOption, setSortOption] = useState('');
    const [order, setOrder] = useState('asc');

    // Featured states
    const [featuredCards, setFeaturedCards] = useState([]);
    const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

    // For distinguishing single vs. double-click
    const clickTimerRef = useRef(null);

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

        setFilteredCards(filtered);
    }, [allCards, search, rarityFilter, sortOption, order, showFeaturedOnly, featuredCards]);

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
        try {
            await updateFeaturedCards(newFeaturedIds);
            const response = await fetchFeaturedCards();
            setFeaturedCards(response.featuredCards || []);
        } catch (error) {
            console.error('Error updating featured cards:', error);
        }
    };

    // Double-click -> add/remove from featured
    const handleCardDoubleClick = async (card) => {
        if (!loggedInUser) return;
        const isCurrentlyFeatured = featuredCards.some((fc) => fc._id === card._id);
        if (!isCurrentlyFeatured && featuredCards.length >= 4) {
            console.warn('Max 4 featured cards allowed!');
            return;
        }
        try {
            await handleToggleFeatured(card);
        } catch (error) {
            console.error(error);
        }
        const cardElement = document.getElementById(`cp-card-${card._id}`);
        if (cardElement) {
            cardElement.classList.add('cp-double-clicked');
            setTimeout(() => {
                cardElement.classList.remove('cp-double-clicked');
            }, 1000);
        }
    };

    // Distinguish single vs. double-click logic
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

    // Clear all featured cards
    const handleClearFeatured = async () => {
        try {
            await updateFeaturedCards([]);
            const response = await fetchFeaturedCards();
            setFeaturedCards(response.featuredCards || []);
        } catch (error) {
            console.error('Error clearing featured cards:', error);
        }
    };

    const isOwner = !collectionOwner || loggedInUser === collectionOwner;

    if (loading) return <LoadingSpinner />;

    return (
        <div className="p-6 bg-gray-950 text-gray-100 min-h-screen">
            {!hideHeader && (
                <h1 className="text-3xl text-center mb-2">{collectionTitle || `${collectionOwner || loggedInUser}'s Collection`}</h1>
            )}

            <p className="text-center text-lg mb-6 text-gray-300">
                Browse your entire collection here! Use the filters below to search by name, rarity, or mint number.
                You can also add up to 4 cards to your profile page as "featured cards" by double clicking them.
                Double clicking a card again, or clicking the "Clear Featured Cards" button, will remove it.
            </p>

            {/* New Top Section Container */}
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-900 p-4 rounded-lg w-full">
                        <h3 className="text-center mb-4 text-lg">Filters</h3>
                        <div className="flex flex-wrap justify-center gap-4">
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
                                {rarities
                                    .filter((r) => r.name !== 'All')
                                    .map((r) => (
                                        <option key={r.name} value={r.name.toLowerCase()}>
                                            {r.name}
                                        </option>
                                    ))}
                            </select>
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                                className="p-2 rounded bg-gray-800 border border-gray-700"
                            >
                                <option value="">Sort By</option>
                                <option value="name">Name</option>
                                <option value="mintNumber">Mint Number</option>
                                <option value="rarity">Rarity</option>
                                <option value="acquiredAt">Acquisition Date</option>
                            </select>
                            <select
                                value={order}
                                onChange={(e) => setOrder(e.target.value)}
                                className="p-2 rounded bg-gray-800 border border-gray-700"
                            >
                                <option value="asc">Ascending</option>
                                <option value="desc">Descending</option>
                            </select>
                        </div>
                    </div>
                    <div className="bg-gray-900 p-4 rounded-lg w-full">
                        <div>
                            <h3 className="text-center mb-4 text-lg">Featured Controls</h3>
                            <div className="flex items-center justify-center gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={showFeaturedOnly}
                                        onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                                    />
                                    Show Featured Only
                                </label>
                                {isOwner && (
                                    <button className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500" onClick={handleClearFeatured}>
                                        Clear Featured Cards
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col items-center justify-center bg-gray-900 p-4 rounded-lg">
                        <div className="w-full text-center">
                            <label>Card Scale: </label>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.05"
                                value={cardScale}
                                onChange={handleCardScaleChange}
                            />
                            <p>{Math.round(cardScale * 100)}%</p>
                        </div>
                    </div>
                    <div className="bg-gray-900 p-4 rounded-lg flex justify-center">
                        <div className="flex flex-wrap justify-center items-center gap-4 border border-gray-700 rounded-lg p-4 bg-gray-800">
                            {cardRarities.map((r) => (
                                <div key={r.rarity} className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded" style={{ backgroundColor: r.color }} />
                                    <span>{r.rarity}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* New Stats Container */}
            <div className="flex justify-center gap-8 mb-6 text-center">
                <div>
                    <h4>Total Cards</h4>
                    <p>{allCards.length}</p>
                </div>
                <div>
                    <h4>Total Packs</h4>
                    <p>{totalPacks}</p>
                </div>
            </div>

            {/* Cards Grid */}
            <div
                className="flex flex-wrap justify-center gap-6 bg-gray-900 border border-gray-700 rounded-2xl p-4 mb-8"
                style={{ transform: `scale(${cardScale})`, width: `${100 / cardScale}%`, transformOrigin: 'top left' }}
            >
                {filteredCards.length > 0 ? (
                    filteredCards.map((card) => {
                        const isFeatured = featuredCards.some((fc) => fc._id === card._id);
                        const isSelected = selectedItems.some((item) => item.itemId === card._id);
                        return (
                            <div
                                key={card._id}
                                id={`cp-card-${card._id}`}
                                className={`cursor-pointer transition-transform rounded-lg ${isSelected ? 'ring-2 ring-purple-500' : ''}`}
                                onClick={() => handleClick(card)}
                                onDoubleClick={() => handleDoubleClick(card)}
                            >
                                {isFeatured && <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">Featured</div>}
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
