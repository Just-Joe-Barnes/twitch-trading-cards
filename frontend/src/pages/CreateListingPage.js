import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {fetchUserCollection, fetchUserProfile, fetchCards, API_BASE_URL} from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import BaseCard from '../components/BaseCard';
import {useNavigate} from 'react-router-dom';
import {rarities} from '../constants/rarities';

const CreateListingPage = () => {
    const [collection, setCollection] = useState([]);
    const [filteredCollection, setFilteredCollection] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [limitedCards, setLimitedCards] = useState([]);

    const [search, setSearch] = useState('');
    const [selectedRarity, setSelectedRarity] = useState('');
    const [sortOption, setSortOption] = useState('acquiredAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [showSlabbedOnly, setShowSlabbedOnly] = useState(false);
    const [showLimitedOnly, setShowLimitedOnly] = useState(false);

    const [rarityCount, setRarityCount] = useState({});
    const [showFilters, setShowFilters] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const profile = await fetchUserProfile();
                const collectionData = await fetchUserCollection(profile._id);
                setCollection(collectionData.cards || []);

                const catalogueData = await fetchCards({limit: 'all'});
                setLimitedCards(catalogueData.cards.filter(c => !!c.availableFrom && !!c.availableTo));
            } catch (error) {
                console.error("Error fetching initial data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const isCardLimited = useCallback((card) => {
        return limitedCards.some((lc) => lc.name === card.name);
    }, [limitedCards]);

    const preFilteredCollection = useMemo(() => {
        let currentFiltered = [...collection];
        if (search) {
            currentFiltered = currentFiltered.filter(card =>
                card.name.toLowerCase().includes(search.toLowerCase())
            );
        }
        if (selectedRarity) {
            currentFiltered = currentFiltered.filter(
                card => (card.rarity && card.rarity.toLowerCase() === selectedRarity.toLowerCase())
            );
        }
        return currentFiltered;
    }, [collection, search, selectedRarity]);

    const hasSlabbedCards = useMemo(() => preFilteredCollection.some(card => card.slabbed), [preFilteredCollection]);

    // --- MODIFICATION START ---
    // Update the check to include Event cards to correctly enable/disable the filter button.
    const hasLimitedOrEventCards = useMemo(() =>
            preFilteredCollection.some(card => isCardLimited(card) || card.rarity === 'Event'),
        [preFilteredCollection, isCardLimited]
    );
    // --- MODIFICATION END ---


    useEffect(() => {
        let currentFiltered = [...preFilteredCollection];
        let currentRarityCounts = rarities.reduce((acc, r) => ({...acc, [r.name]: 0}), {});

        preFilteredCollection.forEach(card => {
            const cardRarity = card.rarity;
            if (cardRarity && currentRarityCounts.hasOwnProperty(cardRarity)) {
                currentRarityCounts[cardRarity]++;
            }
        });
        setRarityCount(currentRarityCounts);

        if (showSlabbedOnly) {
            currentFiltered = currentFiltered.filter(card => card.slabbed);
        }

        // --- MODIFICATION START ---
        // Update the filter logic to include cards with the "Event" rarity.
        if (showLimitedOnly) {
            currentFiltered = currentFiltered.filter(card => isCardLimited(card) || card.rarity === 'Event');
        }
        // --- MODIFICATION END ---

        currentFiltered.sort((a, b) => {
            if (sortOption === 'mintNumber') {
                return sortOrder === 'asc' ? a.mintNumber - b.mintNumber : b.mintNumber - a.mintNumber;
            } else if (sortOption === 'name') {
                return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            } else if (sortOption === 'rarity') {
                const rarityOrder = rarities.map(r => r.name.toLowerCase());
                const aIndex = rarityOrder.indexOf(a.rarity?.toLowerCase());
                const bIndex = rarityOrder.indexOf(b.rarity?.toLowerCase());
                return sortOrder === 'asc' ? aIndex - bIndex : bIndex - aIndex;
            } else if (sortOption === 'acquiredAt') {
                return sortOrder === 'asc'
                    ? new Date(a.acquiredAt) - new Date(b.acquiredAt)
                    : new Date(b.acquiredAt) - new Date(a.acquiredAt);
            }
            return 0;
        });

        setFilteredCollection(currentFiltered);
    }, [preFilteredCollection, showSlabbedOnly, showLimitedOnly, sortOption, sortOrder, isCardLimited]);

    const handleCardSelect = (card) => {
        setSelectedCard(prev => (prev && prev._id === card._id ? null : card));
    };

    const toggleSortOrder = () => {
        setSortOrder(prevOrder => (prevOrder === 'asc' ? 'desc' : 'asc'));
    };

    const handleRarityChange = (rarityName) => {
        const normalizedRarityName = rarityName.toLowerCase();
        setSelectedRarity(prevRarity =>
            prevRarity === normalizedRarityName ? '' : normalizedRarityName
        );
    };

    const handleListCard = async () => {
        if (!selectedCard) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');

            const cardToList = { ...selectedCard };
            delete cardToList._id;
            delete cardToList.acquiredAt;
            delete cardToList.status;
            delete cardToList.__v;

            const res = await fetch(`${API_BASE_URL}/api/market/listings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ card: cardToList }),
            });

            if (res.ok) {
                window.showToast('Card listed on the market successfully!', 'success');
                navigate('/market');
            } else {
                const errorData = await res.json();
                window.showToast(`Error: ${errorData.message}`, 'error');
            }
        } catch (error) {
            console.error('Error listing card:', error);
            window.showToast('Error listing card', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner/>;

    return (
        <div className="page">
            <h1>Create a Market Listing</h1>
            <div className="section-card narrow">
                Use this page to list a card from your collection on the market. First, use the filters below to
                search
                and sort your collection. Then, select a card to preview your listing, and finally click "List This
                Card" to post your listing.
            </div>

            <div className="row-container three-one">
                <div className="column-container">
                    <h2>Your Collection</h2>
                    <div className="stats">
                        <button onClick={() => setShowFilters(!showFilters)} className="stat">
                            {showFilters ? "Hide Filters" : "Show Filters"}
                            <i className={`fa-solid ${showFilters ? 'fa-filter' : 'fa-filter'}`}/>
                        </button>
                    </div>
                    <br/>
                    {collection.length === 0 ? (
                        <p className="no-cards-message">You have no cards in your collection to list.</p>
                    ) : (
                        <>
                            {showFilters && (
                                <div className="section-card filters-panel" style={{marginBottom: "2rem"}}>
                                    <div className="filters">
                                        <div className="filter-card">
                                            <input
                                                type="text"
                                                placeholder="Search your collection by card name..."
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                className="filter-input"
                                            />
                                            <div className="sort-controls">
                                                <div className="filter-button-group horizontal">
                                                    <select value={sortOption}
                                                            onChange={(e) => setSortOption(e.target.value)}
                                                            className="filter-select">
                                                        <option value="name">Name</option>
                                                        <option value="mintNumber">Mint Number</option>
                                                        <option value="rarity">Rarity</option>
                                                        <option value="acquiredAt">Acquisition Date</option>
                                                    </select>
                                                    <div className="checkbox-group button-row">
                                                        <div className="sort-order-toggle checkbox-wrapper">
                                                            <label htmlFor="sortOrderToggle">
                                                                <i className={`fa-regular ${sortOrder === 'asc' ? 'fa-arrow-down-a-z' : 'fa-arrow-up-a-z'}`}></i>
                                                            </label>
                                                            <input type="checkbox" id="sortOrderToggle" checked={sortOrder === 'asc'} onChange={toggleSortOrder}/>
                                                        </div>
                                                        <div className={`checkbox-wrapper ${!hasSlabbedCards ? 'disabled' : ''}`}>
                                                            <label htmlFor="slabbedCheckbox" data-tooltip="Show only Slabbed Cards">
                                                                <i className={`fa-${showSlabbedOnly ? 'solid' : 'regular'} fa-square`}/>
                                                            </label>
                                                            <input type="checkbox" id="slabbedCheckbox" checked={showSlabbedOnly} onChange={(e) => setShowSlabbedOnly(e.target.checked)} disabled={!hasSlabbedCards}/>
                                                        </div>
                                                        {/* --- MODIFICATION START --- */}
                                                        {/* Update the tooltip and the disabled check. */}
                                                        <div className={`checkbox-wrapper ${!hasLimitedOrEventCards ? 'disabled' : ''}`}>
                                                            <label htmlFor="limitedCheckbox" data-tooltip="Show only Limited and Event Cards">
                                                                {/* --- MODIFICATION END --- */}
                                                                <i className={`fa-${showLimitedOnly ? 'solid' : 'regular'} fa-crown`}/>
                                                            </label>
                                                            <input type="checkbox" id="limitedCheckbox" checked={showLimitedOnly} onChange={(e) => setShowLimitedOnly(e.target.checked)} disabled={!hasLimitedOrEventCards}/>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="rarity-key">
                                            {rarities.map((r) => {
                                                const normalizedRarityName = r.name.toLowerCase();
                                                return (
                                                    <button
                                                        key={normalizedRarityName}
                                                        type="button"
                                                        onClick={() => handleRarityChange(r.name)}
                                                        className={`rarity-item ${normalizedRarityName} ${selectedRarity === normalizedRarityName ? 'active' : ''}`}
                                                        disabled={rarityCount[r.name] === 0 && selectedRarity !== normalizedRarityName}
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
                            {filteredCollection.length > 0 ? (
                                <div className="card-tile-grid mini height-grid">
                                    {filteredCollection.map((card) => (
                                        <div
                                            key={card._id}
                                            className={`card-tile ${selectedCard && selectedCard._id === card._id ? 'selected' : ''} ${card.gradingRequestedAt ? 'busy' : ''}`}
                                        >
                                            <BaseCard
                                                name={card.name}
                                                image={card.imageUrl}
                                                description={card.flavorText}
                                                rarity={card.rarity}
                                                mintNumber={card.mintNumber}
                                                modifier={card.modifier}
                                                slabbed={card.slabbed}
                                                grade={card.grade}
                                                limited={isCardLimited(card)}
                                                miniCard={true}
                                            />
                                            <div className="actions">
                                                <button className={`primary-button ${card._id === selectedCard?._id ? 'active' : ''}`} onClick={() => handleCardSelect(card)}
                                                        disabled={card.gradingRequestedAt}>
                                                    {card.gradingRequestedAt ? 'Busy' : card._id === selectedCard?._id ? 'Unselect' : 'Select'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="no-cards-message">No cards available to list matching your filters.</p>
                            )}
                        </>
                    )}
                </div>

                <div className="column-container">
                    <h2>Listing Preview</h2>
                    <div className="section-card">
                        {selectedCard ? (
                            <div className={`card-tile ${selectedCard.slabbed ? 'slabbed' : ''}`}>
                                <BaseCard
                                    name={selectedCard.name}
                                    image={selectedCard.imageUrl}
                                    description={selectedCard.flavorText}
                                    rarity={selectedCard.rarity}
                                    mintNumber={selectedCard.mintNumber}
                                    modifier={selectedCard.modifier}
                                    slabbed={selectedCard.slabbed}
                                    grade={selectedCard.grade}
                                    limited={isCardLimited(selectedCard)}
                                />
                                <div className="actions">
                                    <button
                                        className="primary-button"
                                        onClick={handleListCard}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Listing...' : 'List This Card'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="no-preview-message">Select a card to preview your listing.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateListingPage;
