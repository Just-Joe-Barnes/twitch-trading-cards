import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {
    fetchUserCollection,
    fetchUserProfile,
    fetchFeaturedCards,
    updateFeaturedCards,
    fetchCards,
    fetchUserProfileByUsername,
} from '../utils/api';
import BaseCard from '../components/BaseCard';
import UserTitle from '../components/UserTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import HiddenTwitchEmbed from '../components/HiddenTwitchEmbed';
import '../styles/CollectionPage.css';
import {rarities} from '../constants/rarities';
import {modifiers} from '../constants/modifiers';

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

const CollectionPage = ({
                            onSelectItem,
                            selectedItems = [],
                            hideHeader = false,
                            collectionTitle,
                        }) => {
    const {username: collectionOwner} = useParams();
    const navigate = useNavigate();
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [collectionOwnerProfile, setCollectionOwnerProfile] = useState(null);
    const [allCards, setAllCards] = useState([]);
    const [filteredCards, setFilteredCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPacks, setTotalPacks] = useState(0);
    const rangeInputRef = useRef(null);
    const [limitedCards, setLimitedCards] = useState([]);

    const [rarityCount, setRarityCount] = useState({
        Basic: 0, Common: 0, Standard: 0, Uncommon: 0, Rare: 0,
        Epic: 0, Legendary: 0, Mythic: 0, Unique: 0, Divine: 0
    });

    const [displayRarityCount, setDisplayRarityCount] = useState({
        Basic: 0, Common: 0, Standard: 0, Uncommon: 0, Rare: 0,
        Epic: 0, Legendary: 0, Mythic: 0, Unique: 0, Divine: 0
    });


    const defaultCardScale = 1;
    const [cardScale, setCardScale] = useState(() => {
        const storedScale = parseFloat(localStorage.getItem("cardScale"));
        return isNaN(storedScale) ? defaultCardScale : storedScale;
    });

    const [showFilters, setShowFilters] = useState(false);

    const isMobile = useIsMobile();
    const maxCardScale = isMobile ? 1.3 : 2;
    const minCardScale = isMobile ? 0.35 : 0.35;

    const modifierNames = useMemo(() =>
            modifiers.filter(m => m.name !== 'None').map(m => m.name.toLowerCase())
        , []);

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

    const fetchCatalogue = async () => {
        try {
            const response = await fetchCards({limit: 'all'});
            const fetchedCards = response.cards;
            setLimitedCards(fetchedCards.filter((c) =>
                !!c.availableFrom && !!c.availableTo
            ));

        } catch (err) {
            console.error('Error fetching cards:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const isCardLimited = (card) => {
        return limitedCards.some((lc) => lc.name === card.name);
    }

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


    const handleCardScaleChange = (e) => {
        const newScale = parseFloat(e.target.value);
        setCardScale(newScale);
    };

    const [search, setSearch] = useState('');
    const [sortOption, setSortOption] = useState('acquiredAt');
    const [order, setOrder] = useState('desc');
    const [showSlabbedOnly, setShowSlabbedOnly] = useState(false);

    const [featuredCards, setFeaturedCards] = useState([]);
    const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

    const [showLimitedOnly, setShowLimitedOnly] = useState(false);
    const [selectedRarity, setSelectedRarity] = useState('');

    const ResetAllFilters = () => {
        setSearch('');
        setSortOption('acquiredAt');
        setOrder('desc');
        setShowSlabbedOnly(false);
        setShowFeaturedOnly(false);
        setShowLimitedOnly(false);
        setSelectedRarity('');
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profile = await fetchUserProfile();
                setLoggedInUser(profile);
            } catch (error) {
                console.error('Error fetching logged-in user profile:', error);
                setLoggedInUser(null);
            }
        };
        fetchProfile();
    }, []);

    useEffect(() => {
        const fetchCollectionData = async () => {
            try {
                setLoading(true);
                const identifier = collectionOwner || loggedInUser?.username;
                if (identifier) {
                    const data = await fetchUserCollection(identifier);
                    if (data.cards) {
                        setAllCards(data.cards);
                        setTotalPacks(data.packs || 0);
                    }
                }
            } catch (error) {
                console.error('Error fetching user collection:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCollectionData();
        fetchCatalogue();
        ResetAllFilters();
    }, [collectionOwner, loggedInUser]);

    useEffect(() => {
        const fetchFeatured = async () => {
            try {
                if (collectionOwner) {
                    const ownerProfile = await fetchUserProfileByUsername(collectionOwner);
                    setCollectionOwnerProfile(ownerProfile);
                    setFeaturedCards(ownerProfile.featuredCards || []);
                } else if (loggedInUser) {
                    const response = await fetchFeaturedCards();
                    setCollectionOwnerProfile(loggedInUser);
                    setFeaturedCards(response.featuredCards || []);
                }
            } catch (error) {
                console.error('Error fetching featured cards:', error);
                setFeaturedCards([]);
            }
        };
        fetchFeatured();
    }, [collectionOwner, loggedInUser]);

    useEffect(() => {
        let currentFilteredCards = [...allCards];

        if (search) {
            currentFilteredCards = currentFilteredCards.filter((card) =>
                card.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (showFeaturedOnly) {
            currentFilteredCards = currentFilteredCards.filter((card) =>
                featuredCards.some((fc) => fc._id === card._id)
            );
        }

        if (showSlabbedOnly) {
            currentFilteredCards = currentFilteredCards.filter(card => card.slabbed);
        }

        if (showLimitedOnly) {
            currentFilteredCards = currentFilteredCards.filter((card) =>
                isCardLimited(card) || card.rarity === 'Event'
            );
        }

        const newDisplayRarityCounts = {
            Basic: 0, Common: 0, Standard: 0, Uncommon: 0, Rare: 0,
            Epic: 0, Legendary: 0, Mythic: 0, Unique: 0, Divine: 0
        };
        for (const card of currentFilteredCards) {
            const rarity = card.rarity;
            if (newDisplayRarityCounts.hasOwnProperty(rarity)) {
                newDisplayRarityCounts[rarity] += 1;
            }
        }
        setDisplayRarityCount(newDisplayRarityCounts);

        if (selectedRarity) {
            currentFilteredCards = currentFilteredCards.filter(
                (card) => card.rarity.trim().toLowerCase() === selectedRarity.toLowerCase()
            );
        }

        const newRarityCounts = {
            Basic: 0, Common: 0, Standard: 0, Uncommon: 0, Rare: 0,
            Epic: 0, Legendary: 0, Mythic: 0, Unique: 0, Divine: 0
        };
        for (const card of currentFilteredCards) {
            const rarity = card.rarity;
            if (newRarityCounts.hasOwnProperty(rarity)) {
                newRarityCounts[rarity] += 1;
            }
        }
        setRarityCount(newRarityCounts);

        if (sortOption) {
            currentFilteredCards.sort((a, b) => {
                let result = 0;
                if (sortOption === 'mintNumber') {
                    const aNum = parseInt(a.mintNumber, 10);
                    const bNum = parseInt(b.mintNumber, 10);
                    result = aNum - bNum;
                } else if (sortOption === 'name') {
                    const nameA = getNameForSort(a.name);
                    const nameB = getNameForSort(b.name);
                    result = nameA.localeCompare(nameB);
                } else if (sortOption === 'rarity') {
                    const rarityA = rarities.findIndex(
                        (r) => r.name.toLowerCase() === a.rarity.toLowerCase()
                    );
                    const rarityB = rarities.findIndex(
                        (r) => r.name.toLowerCase() === b.rarity.toLowerCase()
                    );
                    result = rarityA - rarityB;
                } else if (sortOption === 'acquiredAt') {
                    result = new Date(a.acquiredAt) - new Date(b.acquiredAt);
                }
                return order === 'asc' ? result : -result;
            });
        }

        setFilteredCards(currentFilteredCards);
    }, [allCards, search, showFeaturedOnly, showSlabbedOnly, showLimitedOnly, featuredCards, selectedRarity, limitedCards, sortOption, order, getNameForSort]);

    useEffect(() => {
        if (selectedRarity !== '') {
            const currentRarityNameCapitalized = selectedRarity.charAt(0).toUpperCase() + selectedRarity.slice(1);
            if (rarityCount[currentRarityNameCapitalized] === 0) {
                setSelectedRarity('');
            }
        }
    }, [selectedRarity, rarityCount]);

    const handleCardClick = (card) => {
        if (onSelectItem) {
            const alreadySelected = selectedItems.find((item) => item.itemId === card._id);
            let updatedSelection = [];
            if (alreadySelected) {
                updatedSelection = selectedItems.filter((item) => item.itemId !== card._id);
            } else {
                if (selectedItems.length < 4) {
                    updatedSelection = [...selectedItems, {itemId: card._id, itemType: 'card', card}];
                } else {
                    if (window.showToast) {
                        window.showToast('You can select a maximum of 4 cards.', 'info');
                    }
                    return;
                }
            }
            onSelectItem(updatedSelection);
        }
    };

    const handleToggleFeatured = async (card) => {
        if (!isOwner) {
            if (window.showToast) {
                window.showToast("You can only modify your own featured cards.", "error");
            }
            return;
        }

        const isCurrentlyFeatured = featuredCards.some((fc) => fc._id === card._id);
        let newFeatured;
        if (isCurrentlyFeatured) {
            newFeatured = featuredCards.filter((fc) => fc._id !== card._id);
        } else {
            newFeatured = [...featuredCards, card];
        }
        const newFeaturedIds = newFeatured.map((c) => c._id);

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
            if (window.showToast) {
                window.showToast('Error updating featured cards.', 'error');
            } else {
                console.error('Error updating featured cards.');
            }
            setFeaturedCards(previousFeatured);
        }
    };

    const handleInspect = (card) => {
        const isFeatured = featuredCards.some((fc) => fc._id === card._id);
        const isLimited = isCardLimited(card);

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
                limited: isLimited,
                onToggleFeatured: () => handleToggleFeatured(card),
            });
        }
    };

    const handleClick = (card) => {
        handleCardClick(card);
        handleInspect(card);
    };

    const handleClearFeatured = async () => {
        if (!isOwner) {
            if (window.showToast) {
                window.showToast("You can only clear your own featured cards.", "error");
            }
            return;
        }

        const previousFeatured = featuredCards;
        setFeaturedCards([]);
        try {
            const response = await updateFeaturedCards([]);
            if (response.featuredCards) {
                setFeaturedCards(response.featuredCards);
            }
            if (window.showToast) {
                window.showToast('Featured cards cleared.', 'success');
            } else {
                console.log('Featured cards cleared.');
            }
        } catch (error) {
            console.error('Error clearing featured cards:', error);
            if (window.showToast) {
                window.showToast('Error clearing featured cards.', 'error');
            } else {
                console.error('Error clearing featured cards.');
            }
            setFeaturedCards(previousFeatured);
        }
    };

    const handleRarityChange = (rarityName) => {
        const normalizedRarityName = rarityName.toLowerCase();
        setSelectedRarity(prevRarity =>
            prevRarity === normalizedRarityName ? '' : normalizedRarityName
        );
    };

    const toggleSortOrder = () => {
        setOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
    };

    const binderTarget = collectionOwner || loggedInUser?.username;
    const isOwner = !collectionOwner || loggedInUser?.username === collectionOwner;
    const displayProfile = collectionOwnerProfile || loggedInUser;

    if (loading) return <LoadingSpinner/>;

    return (
        <>
            <HiddenTwitchEmbed />
            <div className="page">
                {!hideHeader && (
                    <h1>
                        {collectionTitle || (
                            <>
                                <UserTitle
                                    username={displayProfile?.username || 'User'}
                                    title={displayProfile?.selectedTitle}
                                />
                                {'\'s Collection'}
                            </>
                        )}
                    </h1>
                )}

                <div className="section-card narrow">
                    Browse your entire collection here! Use the filters below to search by name, rarity, or mint number.
                    Click a card to inspect it. From the inspector you can add or remove the card from your featured
                    list (up to 4 cards). Clicking the "Clear Featured Cards" button will remove all featured
                    selections.
                </div>

                <div className="stats">
                    <div className="stat"
                         data-tooltip={`Total number of cards in ${isOwner ? 'your' : collectionOwner + 's'} collection`}>
                        <div>Total Cards</div>
                        <span>{allCards.length}</span>
                    </div>
                    <div className="stat"
                         data-tooltip={`Unopened packs ${isOwner ? 'you currently have' : collectionOwner + 'currently has'}`}>
                        <div>Total Packs</div>
                        <span>{totalPacks}</span>
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className="stat">
                        {showFilters ? (
                            <>
                                <div>Hide Filters</div>
                                <i className="fa-solid fa-filter" />
                            </>
                        ) : (
                            <>
                                <div>Show Filters</div>
                                <i className="fa-regular fa-filter" />
                            </>
                        )}
                    </button>
                    <button
                        className="stat"
                        onClick={() => {
                            if (!binderTarget) return;
                            navigate(`/collection/${encodeURIComponent(binderTarget)}/binder`);
                        }}
                        disabled={!binderTarget}
                    >
                        <div>View Binder</div>
                        <i className="fa-regular fa-book-open" />
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
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="filter-input"
                                    />
                                </div>

                                <div className="filter-button-group">

                                    <div className="sort-controls">
                                        <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="filter-select">
                                            <option value="">Sort By</option>
                                            <option value="name">Name</option>
                                            <option value="mintNumber">Mint Number</option>
                                            <option value="rarity">Rarity</option>
                                            <option value="acquiredAt">Acquisition Date</option>
                                        </select>
                                    </div>
                                    <div className="checkbox-group button-row">
                                        <div className="sort-order-toggle checkbox-wrapper">
                                            <label htmlFor="sortOrderToggle">
                                                {order === 'asc' ? (
                                                    <i className="fa-regular fa-arrow-down-a-z"></i>
                                                ) : (
                                                    <i className="fa-regular fa-arrow-up-a-z"></i>
                                                )}
                                            </label>
                                            <input
                                                type="checkbox"
                                                id="sortOrderToggle"
                                                name="sortOrderToggle"
                                                checked={order === 'asc'}
                                                onChange={toggleSortOrder}
                                            />
                                        </div>
                                        <div className="checkbox-wrapper">
                                            <label htmlFor="slabbedCheckbox" data-tooltip="Show only Slabbed Cards">
                                                <i className={`fa-${showSlabbedOnly ? 'solid' : 'regular'} fa-square`}/>
                                            </label>
                                            <input type="checkbox" id="slabbedCheckbox" name="slabbedCheckboxN"
                                                   checked={showSlabbedOnly}
                                                   onChange={(e) => setShowSlabbedOnly(e.target.checked)}/>
                                        </div>
                                        <div className="checkbox-wrapper">
                                            <label htmlFor="featuredCheckbox" data-tooltip="Show only Featured Cards">
                                                <i className={`fa-${showFeaturedOnly ? 'solid' : 'regular'} fa-star`}/>
                                            </label>
                                            <input type="checkbox" id="featuredCheckbox" name="featuredCheckboxN"
                                                   checked={showFeaturedOnly}
                                                   onChange={(e) => setShowFeaturedOnly(e.target.checked)}/>
                                        </div>
                                        <div className="checkbox-wrapper">
                                            <label htmlFor="limitedCheckbox" data-tooltip="Show only Limited and Event Cards">
                                                <i className={`fa-${showLimitedOnly ? 'solid' : 'regular'} fa-crown`}/>
                                            </label>
                                            <input type="checkbox" id="limitedCheckbox" name="limitedCheckboxN"
                                                   checked={showLimitedOnly}
                                                   onChange={(e) => setShowLimitedOnly(e.target.checked)}/>
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
                                {rarities.map((r) => {
                                    const normalizedRarityName = r.name.toLowerCase();
                                    return (
                                        <button
                                            key={r.name}
                                            onClick={() => handleRarityChange(r.name)}
                                            className={`rarity-item ${normalizedRarityName} ${selectedRarity === normalizedRarityName ? 'active' : ''}`}
                                            disabled={displayRarityCount[r.name] === 0 && selectedRarity !== normalizedRarityName}
                                            style={{"--item-color": r.color}}
                                        >
                                            {r.name}
                                        </button>
                                    );
                                })}
                            </div>

                            <hr className="hr" />

                            <div className="button-group full">
                                {isOwner && (
                                    <button className="danger-button" onClick={handleClearFeatured}>
                                        Clear Featured Cards
                                    </button>
                                )}
                                <button className="secondary-button" onClick={ResetAllFilters}>
                                    <i className="fa-solid fa-broom-wide" /> Reset Filter Options
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {filteredCards.length === 0 && (
                    <div className="section-card" style={{marginTop: '0.5rem'}}>
                        No cards found.
                    </div>
                )}
            </div>

            {filteredCards.length > 0 && (
                <div className={`cards-grid ${cardScale === .35 ? 'mini' :''} ${filteredCards.some((card => card.slabbed)) ? 'slabbed' : ''}`}
                     style={{"--user-card-scale": (cardScale === .35 ? 1 : cardScale)}}>
                    {filteredCards.map((card) => {
                        const isFeatured = featuredCards.some((fc) => fc._id === card._id);
                        const isSelected = selectedItems.some((item) => item.itemId === card._id);
                        const isLimited = isCardLimited(card);
                        return (
                            <div
                                key={card._id}
                                id={`card-${card._id}`}
                                className={`card-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleClick(card)}
                            >
                                <BaseCard
                                    name={card.name}
                                    image={card.imageUrl}
                                    rarity={card.rarity}
                                    description={card.flavorText}
                                    mintNumber={card.mintNumber}
                                    modifier={card.modifier}
                                    grade={card.grade}
                                    slabbed={card.slabbed}
                                    limited={isLimited}
                                    featured={isFeatured}
                                    maxMint={
                                        rarities.find(
                                            (r) => r.name.toLowerCase() === card.rarity.toLowerCase()
                                        )?.totalCopies || '???'
                                    }
                                    miniCard={cardScale === .35}
                                    inspectOnClick={false}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};

export default CollectionPage;
