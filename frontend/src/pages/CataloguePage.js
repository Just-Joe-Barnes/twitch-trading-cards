import React, {useState, useEffect, useMemo, useRef, useCallback} from 'react';
import {fetchCards} from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import {modifiers} from '../constants/modifiers';
import '../styles/CataloguePage.css';
import {rarities} from "../constants/rarities";

const API_AVAILABILITY_URL =
    process.env.NODE_ENV === 'production'
        ? 'https://neds-decks.onrender.com/api/cards/availability'
        : 'http://localhost:5000/api/cards/availability';

const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);

    return isMobile;
};


const CataloguePage = () => {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [availability, setAvailability] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRarityFilter, setSelectedRarityFilter] = useState('basic');
    const [selectedModifier, setSelectedModifier] = useState('None');
    const [sortOption, setSortOption] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');

    const [randomRaritySeed, setRandomRaritySeed] = useState(0);

    const BASE_CARD_WIDTH = 300;
    const BASE_CARD_HEIGHT = 450;
    const CARD_MARGIN = 10;

    const defaultCardScale = 1;
    const [cardScale, setCardScale] = useState(() => {
        const storedScale = parseFloat(localStorage.getItem("cardScale"));
        return isNaN(storedScale) ? defaultCardScale : storedScale;
    });

    const rangeInputRef = useRef(null);
    const [showFilters, setShowFilters] = useState(false);

    // --- NEW ---
    // 2. Use the hook and determine the max scale.
    const isMobile = useIsMobile();
    const maxCardScale = isMobile ? 1.3 : 2;
    const minCardScale = isMobile ? 0.35 : 0.1;

    useEffect(() => {
        localStorage.setItem("cardScale", cardScale);
    }, [cardScale]);

    const handleRangeChange = (inputElement) => {
        if (!inputElement) return;

        const value = parseFloat(inputElement.value);
        const min = parseFloat(inputElement.min || 0);
        const max = parseFloat(inputElement.max || 100);

        const percentage = ((value - min) / (max - min)) * 100;
        inputElement.style.setProperty('--range-progress', `${percentage}%`);
    };

    useEffect(() => {
        localStorage.setItem("cardScale", cardScale.toString());

        if (rangeInputRef.current) {
            handleRangeChange(rangeInputRef.current);
        }
    }, [cardScale, showFilters]);

    useEffect(() => {
        if (isMobile) {
            if (cardScale > 1.3) {
                setCardScale(1.3);
            }
            if (cardScale < 0.35) {
                setCardScale(0.35);
            }
        }
    }, [isMobile, cardScale]);

    const handleCardScaleChange = (e) => {
        const newScale = parseFloat(e.target.value);
        setCardScale(newScale);
    };

    const fetchCatalogue = async () => {
        try {
            const response = await fetchCards({});
            setCards(response.cards);
        } catch (err) {
            console.error('Error fetching cards:', err.message);
            setError('Failed to load cards.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailability = async () => {
        try {
            const response = await fetch(API_AVAILABILITY_URL);
            const data = await response.json();
            setAvailability(data.availability);
        } catch (err) {
            console.error('Error fetching card availability:', err);
        }
    };

    useEffect(() => {
        fetchCatalogue();
        fetchAvailability();
    }, []);

    const handleSearchChange = (e) => setSearchQuery(e.target.value);

    const handleRarityChange = (rarityName) => {
        const normalizedRarityName = rarityName.toLowerCase();
        if (normalizedRarityName === 'random') {
            setSelectedRarityFilter('random');
            setRandomRaritySeed(prev => prev + 1);
        } else {
            setSelectedRarityFilter(normalizedRarityName);
            setRandomRaritySeed(0);
        }
    };

    const handleModifierChange = (name) => setSelectedModifier(name);
    const handleSortChange = (e) => setSortOption(e.target.value);
    const handleSortOrderChange = () => setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');

    const getRemaining = (cardName, rarityPreview) => {
        const found = availability.find(
            (item) => item.name === cardName && item.rarity.toLowerCase() === rarityPreview.toLowerCase()
        );

        return found ? found.remaining : null;
    };

    const getNameForSort = (name) => {
        if (name.toLowerCase().startsWith('the ')) {
            return name.substring(4);
        }
        return name;
    };

    const getRandomRarityName = useCallback(() => {
        const selectableRarities = rarities.filter(r => r.name.toLowerCase() !== 'all');
        if (selectableRarities.length === 0) {
            return 'basic';
        }
        const randomIndex = Math.floor(Math.random() * selectableRarities.length);
        return selectableRarities[randomIndex].name.toLowerCase();
    }, []);

    const filteredAndSortedCards = useMemo(() => {
        let currentCards = [...cards];

        if (searchQuery) {
            currentCards = currentCards.filter((card) =>
                card.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        currentCards.sort((a, b) => {
            if (sortOption === 'name') {
                const nameA = getNameForSort(a.name);
                const nameB = getNameForSort(b.name);
                return sortOrder === 'asc'
                    ? nameA.localeCompare(nameB)
                    : nameB.localeCompare(a.name);
            }
            return 0;
        });

        return currentCards;
    }, [cards, searchQuery, sortOption, sortOrder, randomRaritySeed]);

    const limitedCards = cards.filter(card =>
        card.availableFrom || card.availableTo
    );

    const activeLimitedCards = limitedCards.filter(card => {
        const now = new Date();
        const from = card.availableFrom ? new Date(card.availableFrom) : null;
        const to = card.availableTo ? new Date(card.availableTo) : null;
        return (!from || from <= now) && (!to || to >= now);
    });

    if (loading) return <LoadingSpinner/>;
    if (error) return <div className="cata-page">{error}</div>;

    return (
        <>
            <div className="page">
                <h1>Card Catalogue</h1>
                <div className="info-section section-card narrow">
                    Explore our complete collection of trading cards. Use the search box to find cards by name, and use
                    the rarity or modifier buttons below to preview each card in different styles.
                </div>

                <div className="stats">
                    <div className="stat"
                         data-tooltip={`Total number of cards in Neds Decks`}>
                        <div>Total Cards</div>
                        <span>{cards.length}</span>
                    </div>
                    <div className="stat"
                         data-tooltip="Total count of Limited Edition cards">
                        <div>Limited Cards</div>
                        <span>{limitedCards.length}</span>
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className="stat">
                        {showFilters ? (
                            <>
                                <div>Hide Filters</div>
                                <i className="fa-solid fa-filter"/>
                            </>
                        ) : (
                            <>
                                <div>Show Filters</div>
                                <i className="fa-regular fa-filter"/>
                            </>
                        )}
                    </button>
                </div>

                {showFilters && (
                    <div className="section-card" style={{marginTop: "2ch"}}>
                        <div className="filters">
                            <div className="filter-top-row">
                                <div className="filter-card">
                                    <input
                                        type="text"
                                        placeholder="Search by card name..."
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                        className="filter-input"
                                    />

                                    <div className="sort-controls">
                                        <select value={sortOption} onChange={handleSortChange} className="filter-select">
                                            <option value="">Sort By</option>
                                            <option value="name">Name</option>
                                        </select>
                                        <div className="sort-order-toggle checkbox-wrapper">
                                            <label htmlFor="sortOrderToggle">
                                                {sortOrder === 'asc' ? (
                                                    <i className="fa-regular fa-arrow-down-a-z"></i>
                                                ) : (
                                                    <i className="fa-regular fa-arrow-up-a-z"></i>
                                                )}
                                            </label>
                                            <input
                                                type="checkbox"
                                                id="sortOrderToggle"
                                                name="sortOrderToggle"
                                                checked={sortOrder === 'asc'}
                                                onChange={handleSortOrderChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="filter-button-group">
                                    <div className="cata-modifier-box" style={{width: '100%', textAlign: 'center'}}>
                                        <div className="cata-modifier-selector" style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}>
                                            {modifiers.map((m) => {
                                                const iconMap = {
                                                    None: <i className="fa-solid fa-ban"></i>,
                                                    Negative: <i className="fa-solid fa-square-half-stroke"></i>,
                                                    Glitch: <i className="fa-solid fa-bolt-lightning"></i>,
                                                    Prismatic: <i className="fa-solid fa-sparkles"></i>,
                                                }

                                                return (
                                                    <button
                                                        key={m.name}
                                                        data-tooltip={m.name}
                                                        onClick={() => handleModifierChange(m.name)}
                                                        className={`cata-modifier-button ${selectedModifier === m.name ? 'active' : ''}`}
                                                    >
                                                        {iconMap[m.name]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="slidecontainer">
                                <label>Card Scale: </label>
                                <input
                                    type="range"
                                    min={minCardScale}
                                    max={maxCardScale}
                                    step="0.05"
                                    value={cardScale}
                                    onChange={handleCardScaleChange}
                                    ref={rangeInputRef}
                                />
                                <p>{Math.round(cardScale * 100)}%</p>
                            </div>

                            <div className="rarity-key">
                                <button
                                    key="random"
                                    onClick={() => handleRarityChange("Random")}
                                    className={`rarity-item random ${selectedRarityFilter === 'random' ? 'active' : ''}`}
                                >
                                    Random
                                </button>
                                {rarities.map((r) => {
                                    const comparisonRarityName = r.name.toLowerCase();
                                    return (
                                        <button
                                            key={comparisonRarityName}
                                            onClick={() => handleRarityChange(r.name)}
                                            className={`rarity-item ${comparisonRarityName} ${selectedRarityFilter === comparisonRarityName ? 'active' : ''}`}
                                            style={{"--item-color": r.color}}
                                        >
                                            {r.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {activeLimitedCards.length > 0 && (
                <>
                    <h2>Currently Available Limited Cards</h2>
                    <div className="cards-grid">
                        {activeLimitedCards.map((card) => {
                            const displayRarity = selectedRarityFilter === 'random'
                                ? getRandomRarityName()
                                : selectedRarityFilter;

                            const remaining = getRemaining(card.name, displayRarity);

                            const layoutWidth = BASE_CARD_WIDTH * cardScale + (2 * CARD_MARGIN);
                            const layoutHeight = BASE_CARD_HEIGHT * cardScale + (2 * CARD_MARGIN);

                            return (
                                <div
                                    key={card._id}
                                    id={`card-${card._id}`}
                                    style={{
                                        width: `${layoutWidth}px`,
                                        height: `${layoutHeight}px`,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <BaseCard
                                        name={card.name}
                                        image={card.imageUrl}
                                        description={card.flavorText}
                                        rarity={displayRarity}
                                        mintNumber={card.mintNumber}
                                        remaining={remaining}
                                        limited={true}
                                        timestatuscard={card}
                                        modifier={selectedModifier === 'None' ? null : selectedModifier}
                                        cardScale={cardScale}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            <div className="cards-grid" style={{"--user-card-scale": cardScale}}>
                {filteredAndSortedCards.length > 0 ? (
                    filteredAndSortedCards.map((card) => {
                        const displayRarity = selectedRarityFilter === 'random'
                            ? getRandomRarityName()
                            : selectedRarityFilter;

                        const remaining = getRemaining(card.name, displayRarity);

                        return (
                            <div key={card._id} className="cata-card">
                                <div className="cata-card-inner">
                                    <BaseCard
                                        name={card.name}
                                        image={card.imageUrl}
                                        description={card.flavorText}
                                        rarity={displayRarity}
                                        mintNumber={card.mintNumber}
                                        limited={!!card.availableFrom}
                                        modifier={selectedModifier === 'None' ? null : selectedModifier}
                                        remaining={remaining}
                                        timestatuscard={card}
                                    />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div>No cards found.</div>
                )}
            </div>
        </>
    );
};

export default CataloguePage;
