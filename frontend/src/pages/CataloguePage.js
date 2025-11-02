import React, {useState, useEffect, useMemo, useRef, useCallback} from 'react';
import {fetchCards, fetchAllPacks} from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import {modifiers} from '../constants/modifiers';
import '../styles/CataloguePage.css';
import {rarities} from "../constants/rarities";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const API_AVAILABILITY_URL = API_BASE_URL + "/api/cards/availability";

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


const CataloguePage = ({user}) => {
    const [cards, setCards] = useState([]);
    const [packs, setPacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [availability, setAvailability] = useState([]);

    const [activeTab, setActiveTab] = useState('all');

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRarityFilter, setSelectedRarityFilter] = useState('basic');
    const [selectedModifier, setSelectedModifier] = useState('None');
    const [sortOption, setSortOption] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [randomRaritySeed, setRandomRaritySeed] = useState(0);
    const defaultCardScale = 1;
    const [cardScale, setCardScale] = useState(() => {
        const storedScale = parseFloat(localStorage.getItem("cardScale"));
        return isNaN(storedScale) ? defaultCardScale : storedScale;
    });

    const rangeInputRef = useRef(null);
    const [showFilters, setShowFilters] = useState(false);

    const isMobile = useIsMobile();
    const maxCardScale = isMobile ? 1.3 : 2;
    const minCardScale = isMobile ? 0.35 : 0.35;

    const modifierNames = useMemo(() =>
            modifiers.filter(m => m.name !== 'None').map(m => m.name.toLowerCase())
        , []);

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
            if (cardScale > 1.3) setCardScale(1.3);
            if (cardScale < 0.35) setCardScale(0.35);
        }
    }, [isMobile, cardScale]);

    const handleCardScaleChange = (e) => {
        const newScale = parseFloat(e.target.value);
        setCardScale(newScale);
    };

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);

                const cardsPromise = fetchCards({isAdmin: false});
                const [cardsResponse, availabilityResponse, packsResponse] = await Promise.all([
                    cardsPromise,
                    fetch(API_AVAILABILITY_URL),
                    fetchAllPacks()
                ]);

                const availabilityData = await availabilityResponse.json();

                setCards(cardsResponse.cards || []);
                setAvailability(availabilityData.availability || []);
                const sortedPacks = (packsResponse || []).sort((a, b) => a.name.localeCompare(b.name));
                setPacks(sortedPacks);

            } catch (err) {
                console.error('Error fetching catalogue data:', err.message);
                setError('Failed to load catalogue data.');
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [user]);

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

    const getNameForSort = useCallback((name) => {
        let sortableName = name;
        let lowerName = name.toLowerCase();

        if (lowerName.startsWith('the ')) {
            sortableName = sortableName.substring(4);
            lowerName = lowerName.substring(4);
        }

        lowerName = lowerName.trimStart();

        for (const modifier of modifierNames) {
            let prefix = modifier + ' ';
            if (modifier === 'glitch') {
                prefix = 'glitched ';
            }

            if (lowerName.startsWith(prefix)) {
                const originalLower = sortableName.toLowerCase();
                const prefixIndex = originalLower.indexOf(prefix);
                const cutIndex = prefixIndex + prefix.length;
                sortableName = sortableName.substring(cutIndex);
                break;
            }
        }

        return sortableName.trimStart();
    }, [modifierNames]);

    const getRandomRarityName = useCallback(() => {
        const selectableRarities = rarities.filter(r => r.name.toLowerCase() !== 'all');
        if (selectableRarities.length === 0) return 'basic';
        const randomIndex = Math.floor(Math.random() * selectableRarities.length);
        return selectableRarities[randomIndex].name.toLowerCase();
    }, [rarities]);

    const filteredAndSortedCards = useMemo(() => {
        let currentCards = [...cards];
        if (searchQuery) {
            currentCards = currentCards.filter((card) =>
                card.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        currentCards.sort((a, b) => {
            if (sortOption === 'name') {
                const nameA = getNameForSort(b.name);
                const nameB = getNameForSort(a.name);
                return sortOrder === 'asc'
                    ? nameB.localeCompare(nameA)
                    : nameA.localeCompare(nameB);
            }
            return 0;
        });
        return currentCards;
    }, [cards, searchQuery, sortOption, sortOrder, getNameForSort]);

    const eventAndLimitedCards = useMemo(() => {
        return cards.filter(card => {
            const isEvent = card.rarities && card.rarities.some(r => r.rarity === 'Event');
            const isLimited = !!card.availableFrom && !!card.availableTo;
            return isEvent || isLimited;
        }).sort((a, b) => getNameForSort(a.name).localeCompare(getNameForSort(b.name)));
    }, [cards, getNameForSort]);

    const cardsByPack = useMemo(() => {
        if (!packs.length || !cards.length) return [];
        return packs.map(pack => {
            const packId = pack._id?.$oid || pack._id;
            const cardIdsInPack = new Set(pack.cardPool.map(id => id.$oid || id));
            const cardsInThisPack = cards.filter(card => cardIdsInPack.has(card._id));
            return {
                ...pack,
                id: packId,
                cards: cardsInThisPack.sort((a, b) => getNameForSort(a.name).localeCompare(getNameForSort(b.name)))
            };
        }).filter(pack => pack.cards.length > 0);
    }, [packs, cards, getNameForSort]);

    const CardGrid = ({cardList}) => (
        <div className={`cards-grid ${cardScale === 0.35 ? 'mini' : ''}`}
             style={{"--user-card-scale": (cardScale === 0.35 ? 1 : cardScale)}}>
            {cardList.length > 0 ? (
                cardList.map((card) => {
                    const isEventCard = card.rarities && card.rarities.some(r => r.rarity === 'Event');
                    const displayRarity = isEventCard
                        ? 'Event'
                        : selectedRarityFilter === 'random'
                            ? getRandomRarityName()
                            : selectedRarityFilter;
                    const remaining = getRemaining(card.name, displayRarity);
                    return (
                        <BaseCard
                            key={card._id}
                            name={card.name}
                            image={card.imageUrl}
                            description={card.flavorText}
                            rarity={displayRarity}
                            mintNumber={card.mintNumber}
                            limited={!!card.availableFrom}
                            modifier={selectedModifier === 'None' ? null : selectedModifier}
                            lore={card.lore}
                            loreAuthor={card.loreAuthor}
                            remaining={remaining}
                            timestatuscard={card}
                            miniCard={cardScale === 0.35}
                        />
                    );
                })
            ) : (
                <div className="section-card">No cards found for this selection.</div>
            )}
        </div>
    );

    const activePack = useMemo(() => {
        if (activeTab === 'all' || activeTab === 'event') return null;
        return cardsByPack.find(p => p.id === activeTab);
    }, [activeTab, cardsByPack]);

    if (loading) return <LoadingSpinner/>;
    if (error) return <div className="cata-page">{error}</div>;

    return (
        <>
            <div className="page">
                <h1>Card Catalogue</h1>

                <div className="info-section section-card narrow">
                    Explore our complete collection of trading cards. Use the tabs to navigate between all cards,
                    limited
                    editions, or specific packs.
                </div>

                <hr className="separator"/>

                <h2>View Packs</h2>

                <div className="stats">
                    {activeTab === 'event' ? (
                        <div className="stat" data-tooltip="Total count of Limited Edition & Event cards">
                            <div>Limited & Event</div>
                            <span>{eventAndLimitedCards.length}</span>
                        </div>
                    ) : (
                        activePack ? (
                            <>
                                <div className="stat" data-tooltip={`Total cards in the ${activePack.name} pack`}>
                                    <div>Cards in Pack</div>
                                    <span>{activePack.cards.length}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="stat" data-tooltip={`Total number of cards in Neds Decks`}>
                                    <div>Total Cards</div>
                                    <span>{cards.length}</span>
                                </div>
                                <div className="stat" data-tooltip="Total count of Limited Edition & Event cards">
                                    <div>Limited & Event</div>
                                    <span>{eventAndLimitedCards.length}</span>
                                </div>
                            </>
                        )
                    )}

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

                <div className="tabs-container">
                    <button
                        className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        All Cards
                    </button>
                    {cardsByPack.map(pack => (
                        <button
                            key={pack.id}
                            className={`tab-button ${activeTab === pack.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(pack.id)}
                        >
                            {pack.name}
                        </button>
                    ))}
                    <button
                        className={`tab-button ${activeTab === 'event' ? 'active' : ''}`}
                        onClick={() => setActiveTab('event')}
                    >
                        Event & Limited
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
                                        <select value={sortOption} onChange={handleSortChange}
                                                className="filter-select">
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
                                <button key="random" onClick={() => handleRarityChange("Random")}
                                        className={`rarity-item random ${selectedRarityFilter === 'random' ? 'active' : ''}`}>
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

            <div className="page full" style={{paddingTop: '0'}}>
                {activeTab === 'all' && (
                    <CardGrid cardList={filteredAndSortedCards}/>
                )}

                {activeTab === 'event' && (
                    <CardGrid cardList={eventAndLimitedCards}/>
                )}

                {activePack && (
                    <CardGrid cardList={activePack.cards}/>
                )}
            </div>
        </>
    )
        ;
};

export default CataloguePage;
