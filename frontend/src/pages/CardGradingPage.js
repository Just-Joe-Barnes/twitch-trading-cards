import React, {useEffect, useState, useMemo, useRef} from 'react';
import {fetchWithAuth, gradeCard, completeGrading, revealGradedCard, fetchUserProfile} from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import {rarities} from '../constants/rarities';
import '../styles/CardGradingPage.css';
import GradingInProgressCard from "../components/GradingInProgressCard";

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


const CardGradingPage = () => {
    const [selectedUser, setSelectedUser] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [gradingLoading, setGradingLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [rarityFilter, setRarityFilter] = useState('');
    const [sortOption, setSortOption] = useState('acquiredAt');
    const [order, setOrder] = useState('desc');
    const [showSlabbedOnly, setShowSlabbedOnly] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);
    const [revealedCards, setRevealedCards] = useState({});
    const [showFilters, setShowFilters] = useState(false);
    const [rarityCount, setRarityCount] = useState({
        Basic: 0, Common: 0, Standard: 0, Uncommon: 0, Rare: 0,
        Epic: 0, Legendary: 0, Mythic: 0, Unique: 0, Divine: 0
    });
    const [displayRarityCount, setDisplayRarityCount] = useState({
        Basic: 0, Common: 0, Standard: 0, Uncommon: 0, Rare: 0,
        Epic: 0, Legendary: 0, Mythic: 0, Unique: 0, Divine: 0
    });

    // Card Scaling State and Refs
    const isMobile = useIsMobile();
    const defaultCardScale = 1;
    const [cardScale, setCardScale] = useState(() => {
        const storedScale = parseFloat(localStorage.getItem("cardScale"));
        return isNaN(storedScale) ? defaultCardScale : storedScale;
    });
    const rangeInputRef = useRef(null);
    const maxCardScale = isMobile ? 1.3 : 2;
    const minCardScale = isMobile ? 0.35 : 0.35;


    const inProcessCards = useMemo(() => cards.filter(c => c.gradingRequestedAt && c.rarity !== 'Event'), [cards]);
    const collectionCards = useMemo(() => cards.filter(c => !c.gradingRequestedAt && c.rarity !== 'Event'), [cards]);

    // Card Scaling Effects and Handlers
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

    const handleRarityChange = (rarityName) => {
        const normalizedRarityName = rarityName.toLowerCase();
        setRarityFilter(prevRarity =>
            prevRarity === normalizedRarityName ? '' : normalizedRarityName
        );
    };

    const toggleSortOrder = () => {
        setOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
    };

    const toggleShowSlabbedOnly = (e) => {
        setShowSlabbedOnly(e.target.checked);
    };

    const rarityRank = useMemo(() => rarities.reduce((acc, r, idx) => {
        acc[r.name] = idx;
        return acc;
    }, {}), []);

    const cardsForDisplayCount = useMemo(() => collectionCards
        .filter(card => card.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .filter(card => (showSlabbedOnly ? card.slabbed : !card.slabbed)), [collectionCards, searchQuery, showSlabbedOnly]);

    const filteredCards = useMemo(() => cardsForDisplayCount
        .filter(card => rarityFilter === '' || card.rarity.toLowerCase() === rarityFilter.toLowerCase()), [cardsForDisplayCount, rarityFilter]);

    const sortedCards = useMemo(() => [...filteredCards].sort((a, b) => {
        let result = 0;
        if (sortOption === 'mintNumber') {
            result = a.mintNumber - b.mintNumber;
        } else if (sortOption === 'rarity') {
            result = rarityRank[a.rarity] - rarityRank[b.rarity];
        } else if (sortOption === 'acquiredAt') {
            result = new Date(a.acquiredAt) - new Date(b.acquiredAt);
        } else {
            result = a.name.localeCompare(b.name);
        }
        return order === 'asc' ? result : -result;
    }), [filteredCards, sortOption, order, rarityRank]);

    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const profile = await fetchUserProfile();
                setIsAdmin(profile.isAdmin);
                setSelectedUser(profile._id);
                const userData = await fetchWithAuth(`/api/users/${profile._id}/collection`);
                setCards(userData.cards || []);
            } catch (err) {
                console.error('Error initializing grading page', err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    useEffect(() => {
        const newRarityCounts = {
            Basic: 0, Common: 0, Standard: 0, Uncommon: 0, Rare: 0,
            Epic: 0, Legendary: 0, Mythic: 0, Unique: 0, Divine: 0
        };
        for (const card of sortedCards) {
            const rarity = card.rarity;
            if (newRarityCounts.hasOwnProperty(rarity)) {
                newRarityCounts[rarity] += 1;
            }
        }
        setRarityCount(newRarityCounts);
    }, [sortedCards]);

    useEffect(() => {
        const newDisplayCounts = {
            Basic: 0, Common: 0, Standard: 0, Uncommon: 0, Rare: 0,
            Epic: 0, Legendary: 0, Mythic: 0, Unique: 0, Divine: 0
        };
        for (const card of cardsForDisplayCount) {
            const rarity = card.rarity;
            if (newDisplayCounts.hasOwnProperty(rarity)) {
                newDisplayCounts[rarity] += 1;
            }
        }
        setDisplayRarityCount(newDisplayCounts);
    }, [cardsForDisplayCount]);

    useEffect(() => {
        if (rarityFilter !== '') {
            if (!loading && sortedCards.length === 0) {
                const currentRarityName = rarityFilter.charAt(0).toUpperCase() + rarityFilter.slice(1);
                if (rarityCount[currentRarityName] === 0) {
                    setRarityFilter('');
                }
            }
        }
    }, [rarityFilter, sortedCards.length, rarityCount, loading]);

    const handleSelectCard = (card) => {
        setSelectedCard(card);
    };

    const handleGrade = async () => {
        if (!selectedCard) return;
        setGradingLoading(true);
        try {
            await gradeCard(selectedUser, selectedCard._id);
            const data = await fetchWithAuth(`/api/users/${selectedUser}/collection`);
            setCards(data.cards || []);
            setSelectedCard(null);
        } catch (err) {
            console.error('Error grading card', err);
        } finally {
            setGradingLoading(false);
        }
    };

    const handleOverride = async (cardId) => {
        setGradingLoading(true);
        try {
            await completeGrading(selectedUser, cardId);
            const data = await fetchWithAuth(`/api/users/${selectedUser}/collection`);
            setCards(data.cards || []);
        } catch (err) {
            console.error('Error completing grading', err);
        } finally {
            setGradingLoading(false);
        }
    };

    const handleDone = async (cardId) => {
        setGradingLoading(true);
        try {
            await revealGradedCard(selectedUser, cardId);
            const data = await fetchWithAuth(`/api/users/${selectedUser}/collection`);
            setCards(data.cards || []);
            setRevealedCards(prev => {
                const copy = {...prev};
                delete copy[cardId];
                return copy;
            });
        } catch (err) {
            console.error('Error marking grading done', err);
        } finally {
            setGradingLoading(false);
        }
    };

    const toggleReveal = (cardId) => {
        setRevealedCards((prev) => {
            if (prev[cardId]) return prev;
            return {
                ...prev,
                [cardId]: true,
            };
        });
    };

    return (
        <>
            <div className="page" style={{paddingBottom: 0}}>
                {gradingLoading && <LoadingSpinner/>}
                <h1>Card Grading</h1>
                {!selectedCard && (
                    <>
                        <div className="info-section section-card narrow">
                            Use the controls below to search a user's collection and select
                            cards for grading. Once a card is graded you can reveal the slab
                            to complete the process. <strong>Event cards are ineligble for grading.</strong>
                        </div>
                        <div className="stats">
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
                    </>
                )}
                {!selectedCard && showFilters && selectedUser && (
                    <div className="section-card" style={{marginTop: "2ch"}}>
                        <div className="filters">
                            <div className="filter-card">
                                <input
                                    type="text"
                                    placeholder="Search by card name..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="filter-input"
                                    data-testid="search-input"
                                />
                                <div className="sort-controls">
                                    <select value={sortOption} onChange={e => setSortOption(e.target.value)}
                                            className="filter-select" data-testid="sort-select">
                                        <option value="name">Name</option>
                                        <option value="mintNumber">Mint Number</option>
                                        <option value="rarity">Rarity</option>
                                        <option value="acquiredAt">Acquisition Date</option>
                                    </select>
                                </div>
                            </div>
                            <div className="filter-button-group" style={{marginTop: '1ch'}}>
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
                                        <input
                                            type="checkbox"
                                            id="slabbedCheckbox"
                                            name="slabbedCheckboxN"
                                            checked={showSlabbedOnly}
                                            onChange={toggleShowSlabbedOnly}
                                            data-testid="slab-toggle"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="slidecontainer" style={{ marginTop: '1ch' }}>
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
                            <div className="rarity-key" style={{marginTop: '1ch'}}>
                                {rarities.map((r) => {
                                    const normalizedRarityName = r.name.toLowerCase();
                                    return (
                                        <button
                                            key={normalizedRarityName}
                                            onClick={() => handleRarityChange(r.name)}
                                            className={`rarity-item ${normalizedRarityName} ${rarityFilter === normalizedRarityName ? 'active' : ''}`}
                                            disabled={displayRarityCount[r.name] === 0 && rarityFilter !== normalizedRarityName}
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
            {loading && <div className="page" style={{paddingTop: '1rem'}}>
                <div className="section-card">Loading cards, please wait...</div>
            </div>}
            {!loading && (
                <div className="page full" style={{paddingTop: '0'}}>
                    {selectedCard ? (
                        <div className="reveal-zone" data-testid="selected-card-area">
                            <div className="card-tile">
                                <BaseCard
                                    name={selectedCard.name}
                                    image={selectedCard.imageUrl}
                                    description={selectedCard.flavorText}
                                    rarity={selectedCard.rarity}
                                    mintNumber={selectedCard.mintNumber}
                                    modifier={selectedCard.modifier}
                                    grade={selectedCard.grade}
                                    slabbed={selectedCard.slabbed}
                                />
                                <div className="actions">
                                    {!selectedCard.slabbed && (
                                        <button className="primary-button" onClick={handleGrade}
                                                data-testid="grade-btn">Grade Card</button>
                                    )}
                                    <button className="danger-button" onClick={() => setSelectedCard(null)}
                                            data-testid="cancel-btn">Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {inProcessCards.length > 0 && (
                                <div data-testid="inprocess-list">
                                    <h3>Grading In Progress</h3>
                                    <div
                                        className={`cards-grid ${showSlabbedOnly ? 'slabbed' : ''}`}
                                    >
                                        {inProcessCards.map(card => (
                                            <GradingInProgressCard
                                                key={card._id}
                                                card={card}
                                                isAdmin={isAdmin}
                                                isRevealed={!!revealedCards[card._id]}
                                                onFinish={handleOverride}
                                                onReveal={() => toggleReveal(card._id)}
                                                onDone={() => handleDone(card._id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div data-testid="collection-list" style={{marginTop: '0.5rem'}}>
                                {sortedCards.length === 0 && !loading && (
                                    <div className="section-card">
                                        No cards found in your collection matching the filters.
                                    </div>
                                )}
                                <div
                                    className={`cards-grid ${showSlabbedOnly ? 'slabbed' : ''} ${cardScale === 0.35 ? 'mini' : ''}`}
                                    style={{ "--user-card-scale": (cardScale === 0.35 ? 'mini' : '') } }
                                >
                                    {sortedCards.map(card => (
                                        <div key={card._id} className={`card-tile ${card.slabbed ? 'slabbed' : ''}  ${card.status !== 'available' ? 'busy' : ''}`}>
                                            <BaseCard
                                                name={card.name}
                                                image={card.imageUrl}
                                                description={card.flavorText}
                                                rarity={card.rarity}
                                                mintNumber={card.mintNumber}
                                                modifier={card.modifier}
                                                grade={card.grade}
                                                slabbed={card.slabbed}
                                                miniCard={cardScale === 0.35}
                                            />
                                            {!card.slabbed && (
                                                <div className="actions">
                                                    <button className="primary-button" disabled={card.status !== 'available'} onClick={() => handleSelectCard(card)} data-testid={`select-btn-${card._id}`}>
                                                        {card.status !== 'available' ? 'Busy' : 'Select'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
};

export default CardGradingPage;
