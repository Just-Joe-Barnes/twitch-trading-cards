import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {useParams} from 'react-router-dom';
import {
    fetchUserCollection,
    fetchUserProfile,
    fetchCards,
} from '../utils/api';
import BaseCard from '../components/BaseCard';
import '../styles/BinderPage.css';
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

const CardPickerModal = ({
                             onSelectCard,
                             onClose,
                             collectionOwner,
                             loggedInUser
                         }) => {
    const [allCards, setAllCards] = useState([]);
    const [filteredCards, setFilteredCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [limitedCards, setLimitedCards] = useState([]);
    const [showFilters, setShowFilters] = useState(false);

    const [search, setSearch] = useState('');
    const [sortOption, setSortOption] = useState('acquiredAt');
    const [order, setOrder] = useState('desc');
    const [selectedRarity, setSelectedRarity] = useState('');

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
                const cutIndex = lowerName.indexOf(prefix) + prefix.length;
                sortableName = sortableName.substring(cutIndex);
                break;
            }
        }
        return sortableName.trimStart();
    }, [modifierNames]);

    const fetchCatalogue = async () => {
        try {
            const response = await fetchCards({limit: 'all'});
            const fetchedCards = response.cards;
            setLimitedCards(fetchedCards.filter((c) =>
                !!c.availableFrom && !!c.availableTo
            ));
        } catch (err) {
            console.error(err);
        }
    };

    const isCardLimited = (card) => {
        return limitedCards.some((lc) => lc.name === card.name);
    }

    useEffect(() => {
        const fetchCollectionData = async () => {
            try {
                setLoading(true);
                const identifier = collectionOwner || loggedInUser;
                if (identifier) {
                    const data = await fetchUserCollection(identifier);
                    if (data.cards) {
                        setAllCards(data.cards);
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchCollectionData();
        fetchCatalogue();
    }, [collectionOwner, loggedInUser]);

    useEffect(() => {
        let currentFilteredCards = [...allCards];

        if (search) {
            currentFilteredCards = currentFilteredCards.filter((card) =>
                card.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (selectedRarity) {
            currentFilteredCards = currentFilteredCards.filter(
                (card) => card.rarity.trim().toLowerCase() === selectedRarity.toLowerCase()
            );
        }

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
                    const rarityA = rarities.findIndex(r => r.name.toLowerCase() === a.rarity.toLowerCase());
                    const rarityB = rarities.findIndex(r => r.name.toLowerCase() === b.rarity.toLowerCase());
                    result = rarityA - rarityB;
                } else if (sortOption === 'acquiredAt') {
                    result = new Date(a.acquiredAt) - new Date(b.acquiredAt);
                }
                return order === 'asc' ? result : -result;
            });
        }

        setFilteredCards(currentFilteredCards);
    }, [allCards, search, selectedRarity, limitedCards, sortOption, order, getNameForSort]);

    const handleRarityChange = (rarityName) => {
        const normalizedRarityName = rarityName.toLowerCase();
        setSelectedRarity(prevRarity =>
            prevRarity === normalizedRarityName ? '' : normalizedRarityName
        );
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(10, 10, 10, 0.95)', zIndex: 2000, display: 'flex',
            flexDirection: 'column', padding: '20px', overflowY: 'auto', backdropFilter: 'blur(5px)'
        }}>
            <div className="modal-content" style={{
                backgroundColor: '#1e1e1e', borderRadius: '12px',
                padding: '25px', margin: 'auto', maxWidth: '1200px', width: '100%',
                maxHeight: '90vh', overflowY: 'scroll',
                border: '1px solid #333',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom:'15px'}}>
                    <h2>Select a Card to Insert</h2>
                    <button onClick={onClose} className="secondary-button">
                        <i className="fa-solid fa-xmark"></i> Close
                    </button>
                </div>

                <div style={{marginBottom: '1rem'}}>
                    <button onClick={() => setShowFilters(!showFilters)} className="secondary-button" style={{width: '100%'}}>
                        {showFilters ? (
                            <span><i className="fa-solid fa-filter-circle-xmark"/> Hide Filters</span>
                        ) : (
                            <span><i className="fa-solid fa-filter"/> Show Filters</span>
                        )}
                    </button>
                </div>

                {showFilters && (
                    <div className="filters section-card" style={{background: '#141414', padding:'15px'}}>
                        <div className="filter-top-row">
                            <div className="filter-card">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="filter-input"
                                />
                            </div>
                            <div className="filter-button-group">
                                <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="filter-select">
                                    <option value="acquiredAt">Recent</option>
                                    <option value="name">Name</option>
                                    <option value="rarity">Rarity</option>
                                </select>
                                <div className="checkbox-group button-row">
                                    <div className="checkbox-wrapper" style={{padding:'10px', cursor:'pointer'}}>
                                        <label onClick={() => setOrder(prev => prev === 'asc' ? 'desc' : 'asc')} style={{cursor:'pointer'}}>
                                            <i className={`fa-regular fa-arrow-${order === 'asc' ? 'down' : 'up'}-a-z`}></i> {order === 'asc' ? 'Asc' : 'Desc'}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="rarity-key">
                            {rarities.map((r) => (
                                <button
                                    key={r.name}
                                    onClick={() => handleRarityChange(r.name)}
                                    className={`rarity-item ${r.name.toLowerCase()} ${selectedRarity === r.name.toLowerCase() ? 'active' : ''}`}
                                    style={{"--item-color": r.color}}
                                >
                                    {r.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="cards-grid mini" style={{"--user-card-scale": 1, marginTop: '20px'}}>
                    {filteredCards.map((card) => {
                        const isLimited = isCardLimited(card);
                        return (
                            <div key={card._id} className="card-item" onClick={() => onSelectCard(card)}>
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
                                    miniCard={true}
                                    inspectOnClick={false}
                                />
                            </div>
                        )
                    })}
                </div>
                {filteredCards.length === 0 && <p style={{textAlign:'center', padding:'20px'}}>No cards found matching filters.</p>}
            </div>
        </div>
    );
};

const BinderPage = () => {
    const {username: collectionOwner} = useParams();
    const [loggedInUser, setLoggedInUser] = useState(null);

    // Initialize with 4 pages (2 spreads)
    const [pages, setPages] = useState([Array(9).fill(null), Array(9).fill(null), Array(9).fill(null), Array(9).fill(null)]);
    const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
    const [pickingSlot, setPickingSlot] = useState(null);
    const [limitedCards, setLimitedCards] = useState([]);

    // Drag and Drop State
    const [draggedItem, setDraggedItem] = useState(null); // { pageIndex, slotIndex, cardData }
    const [dragOverSlot, setDragOverSlot] = useState(null); // { pageIndex, slotIndex }
    const dragTimeoutRef = useRef(null);

    const isMobile = useIsMobile();

    const fetchCatalogue = async () => {
        try {
            const response = await fetchCards({limit: 'all'});
            const fetchedCards = response.cards;
            setLimitedCards(fetchedCards.filter((c) =>
                !!c.availableFrom && !!c.availableTo
            ));
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profile = await fetchUserProfile();
                setLoggedInUser(profile.username);
            } catch (error) {
                setLoggedInUser(null);
            }
        };
        fetchProfile();
        fetchCatalogue();
    }, []);

    const isCardLimited = (card) => {
        return limitedCards.some((lc) => lc.name === card.name);
    }

    // --- Page Management Logic ---

    const handleAddPages = (position) => {
        const newPages = [Array(9).fill(null), Array(9).fill(null)];
        const updatedPages = [...pages];

        if (position === 'before') {
            updatedPages.splice(currentSpreadIndex, 0, ...newPages);
            setPages(updatedPages);
            // Don't change index, effectively "pushes" current view right
        } else {
            // Insert after current spread
            const insertIndex = isMobile ? currentSpreadIndex + 1 : currentSpreadIndex + 2;
            updatedPages.splice(insertIndex, 0, ...newPages);
            setPages(updatedPages);
        }
    };

    const handleNext = useCallback(() => {
        const increment = isMobile ? 1 : 2;
        if (currentSpreadIndex + increment < pages.length) {
            setCurrentSpreadIndex(prev => prev + increment);
        }
    }, [currentSpreadIndex, pages.length, isMobile]);

    const handlePrev = useCallback(() => {
        const decrement = isMobile ? 1 : 2;
        if (currentSpreadIndex - decrement >= 0) {
            setCurrentSpreadIndex(prev => prev - decrement);
        }
    }, [currentSpreadIndex, isMobile]);

    // --- Slot Interaction Logic ---

    const handleInspect = (card) => {
        if(!card) return;
        if (window.inspectCard) {
            window.inspectCard({
                ...card,
                name: card.name,
                image: card.imageUrl,
                description: card.flavorText,
                rarity: card.rarity,
                mintNumber: card.mintNumber,
                modifier: card.modifier,
                isOwner: (!collectionOwner || loggedInUser === collectionOwner),
                limited: isCardLimited(card),
                onToggleFeatured: () => {},
            });
        }
    };

    const handleSlotClick = (pageIndex, slotIndex) => {
        const slotData = pages[pageIndex][slotIndex];

        if (!slotData) {
            setPickingSlot({ pageIndex: pageIndex, slotIndex });
        } else {
            handleInspect(slotData);
        }
    };

    const toggleLock = (e, pageIndex, slotIndex) => {
        e.stopPropagation();
        const updatedPages = [...pages];
        const slotData = updatedPages[pageIndex][slotIndex];

        if (slotData) {
            updatedPages[pageIndex][slotIndex] = {
                ...slotData,
                locked: !slotData.locked
            };
            setPages(updatedPages);
        }
    };

    const handleRemoveCard = (e, pageIndex, slotIndex) => {
        e.stopPropagation();
        const slotData = pages[pageIndex][slotIndex];

        if (slotData && slotData.locked) return;

        const updatedPages = [...pages];
        updatedPages[pageIndex][slotIndex] = null;
        setPages(updatedPages);
    }

    const handleCardSelected = (card) => {
        if (pickingSlot) {
            const updatedPages = [...pages];
            updatedPages[pickingSlot.pageIndex][pickingSlot.slotIndex] = {
                ...card,
                locked: false
            };
            setPages(updatedPages);
            setPickingSlot(null);
        }
    };

    // --- Drag and Drop Handlers ---

    const handleDragStart = (e, pageIndex, slotIndex) => {
        const slotData = pages[pageIndex][slotIndex];

        if (!slotData || slotData.locked) {
            e.preventDefault();
            return;
        }

        setDraggedItem({
            pageIndex: pageIndex,
            slotIndex: slotIndex,
            cardData: slotData
        });

        e.dataTransfer.effectAllowed = "move";

        var img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
    };

    const handleDragOver = (e, pageIndex, slotIndex) => {
        e.preventDefault();
        setDragOverSlot({ pageIndex: pageIndex, slotIndex });
    };

    const handleDrop = (e, targetPageIndex, targetSlotIndex) => {
        e.preventDefault();
        setDragOverSlot(null);

        if (!draggedItem) return;

        const { pageIndex: sourceP, slotIndex: sourceS } = draggedItem;

        // Don't do anything if dropped on itself
        if (targetPageIndex === sourceP && targetSlotIndex === sourceS) {
            setDraggedItem(null);
            return;
        }

        const updatedPages = [...pages];
        const targetCard = updatedPages[targetPageIndex][targetSlotIndex];

        if (targetCard && targetCard.locked) {
            if (window.showToast) window.showToast("That slot is locked!", "error");
            setDraggedItem(null);
            return;
        }

        // Swap
        updatedPages[targetPageIndex][targetSlotIndex] = draggedItem.cardData;
        updatedPages[sourceP][sourceS] = targetCard;

        setPages(updatedPages);
        setDraggedItem(null);
    };

    // --- Edge Navigation Drag Logic ---

    const handleEdgeDragEnter = (direction) => {
        if (!draggedItem) return;

        if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);

        dragTimeoutRef.current = setTimeout(() => {
            if (direction === 'next') {
                handleNext();
            } else {
                handlePrev();
            }
        }, 600);
    };

    const handleEdgeDragLeave = () => {
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
        }
    };

    return (
        <div className="binder-view page">
            <h1>Binder View</h1>

            <div className="info-section">
                Drag cards to organize. Hover over side arrows while dragging to flip pages.
                <br/>
                <br/>
                <div><strong><u>Note - this page is just a test and does not function at all in any way how it should or will in the real feature. This is a test. Repeat, this is a test.</u></strong></div>
            </div>


            <div className="binder-workspace">

                <div className="binder-gutter">
                    <button
                        className="insert-btn"
                        onClick={() => handleAddPages('before')}
                        title="Insert Page Before"
                    >
                        <i className="fa-solid fa-plus"></i>
                    </button>

                    <div
                        className={`nav-button ${currentSpreadIndex === 0 ? 'disabled' : ''}`}
                        onClick={handlePrev}
                        onDragEnter={() => handleEdgeDragEnter('prev')}
                        onDragLeave={handleEdgeDragLeave}
                    >
                        <i className="fa-solid fa-chevron-left fa-2x"></i>
                    </div>
                </div>

                <div className="binder-book">
                    <div className="binder-spine"></div>

                    {pages.map((pageData, pageIndex) => {
                        let isVisible = false;
                        if (isMobile) {
                            isVisible = pageIndex === currentSpreadIndex;
                        } else {
                            isVisible = pageIndex === currentSpreadIndex || pageIndex === currentSpreadIndex + 1;
                        }

                        const isDragSource = draggedItem && draggedItem.pageIndex === pageIndex;

                        if (!isVisible && !isDragSource) return null;

                        const style = (!isVisible && isDragSource)
                            ? { position: 'fixed', top: -9999, opacity: 0, pointerEvents:'none' }
                            : {};

                        const pageClass = isMobile
                            ? 'binder-page single'
                            : `binder-page ${pageIndex % 2 === 0 ? 'left-page' : 'right-page'}`;

                        return (
                            <div key={pageIndex} className={pageClass} style={style}>
                                {pageData.map((slotData, slotIndex) => (
                                    <div
                                        key={slotIndex}
                                        className={`binder-slot ${dragOverSlot?.pageIndex === pageIndex && dragOverSlot?.slotIndex === slotIndex ? 'drag-over' : ''} ${!slotData ? '' : 'hasCard'}`}
                                        draggable={!!slotData && !slotData.locked}
                                        onDragStart={(e) => handleDragStart(e, pageIndex, slotIndex)}
                                        onDragOver={(e) => handleDragOver(e, pageIndex, slotIndex)}
                                        onDrop={(e) => handleDrop(e, pageIndex, slotIndex)}
                                        onDragEnd={() => setDraggedItem(null)}
                                        onClick={() => handleSlotClick(pageIndex, slotIndex)}
                                    >
                                        {slotData ? (
                                            <div className="slot-content-wrapper">
                                                <BaseCard
                                                    {...slotData}
                                                    image={slotData.imageUrl}
                                                    description={slotData.flavorText}
                                                    limited={isCardLimited(slotData)}
                                                    inspectOnClick={false}
                                                    miniCard={false}
                                                />

                                                <div className="slot-controls">
                                                    <button
                                                        className={`control-btn ${slotData.locked ? 'locked' : ''}`}
                                                        onClick={(e) => toggleLock(e, pageIndex, slotIndex)}
                                                        title={slotData.locked ? "Unlock" : "Lock"}
                                                    >
                                                        <i className={`fa-solid fa-${slotData.locked ? 'lock' : 'lock-open'}`}></i>
                                                    </button>
                                                    {!slotData.locked && (
                                                        <button
                                                            className="control-btn remove"
                                                            onClick={(e) => handleRemoveCard(e, pageIndex, slotIndex)}
                                                            title="Remove Card"
                                                        >
                                                            <i className="fa-solid fa-xmark"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="slot-placeholder">
                                                <i className="fa-solid fa-plus"></i>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div className="page-number">Page {pageIndex + 1}</div>
                            </div>
                        );
                    })}
                </div>

                <div className="binder-gutter">
                    <div
                        className={`nav-button ${currentSpreadIndex >= pages.length - (isMobile ? 1 : 2) ? 'disabled' : ''}`}
                        onClick={handleNext}
                        onDragEnter={() => handleEdgeDragEnter('next')}
                        onDragLeave={handleEdgeDragLeave}
                    >
                        <i className="fa-solid fa-chevron-right fa-2x"></i>
                    </div>

                    <button
                        className="insert-btn"
                        onClick={() => handleAddPages('after')}
                        title="Insert Page After"
                    >
                        <i className="fa-solid fa-plus"></i>
                    </button>
                </div>
            </div>

            {pickingSlot && (
                <CardPickerModal
                    onClose={() => setPickingSlot(null)}
                    onSelectCard={handleCardSelected}
                    collectionOwner={collectionOwner}
                    loggedInUser={loggedInUser}
                />
            )}
        </div>
    );
};

export default BinderPage;
