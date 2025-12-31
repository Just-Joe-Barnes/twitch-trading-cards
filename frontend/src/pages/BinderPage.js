import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {useParams} from 'react-router-dom';
import {
    fetchUserCollection,
    fetchUserProfile,
    fetchCards,
    fetchBinder,
    updateBinder,
} from '../utils/api';
import BaseCard from '../components/BaseCard';
import '../styles/BinderPage.css';
import {rarities} from '../constants/rarities';
import {modifiers} from '../constants/modifiers';
import LoadingSpinner from "../components/LoadingSpinner";

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

const createEmptySlots = () => Array.from({ length: 9 }, () => null);
const createDefaultPages = () => Array.from({ length: 4 }, () => createEmptySlots());
const defaultCover = {
    title: 'My Binder',
    binderColor: '#262626',
    titleColor: '#f4f4f4',
    font: 'Cinzel, "Times New Roman", serif',
};
const coverFonts = [
    { label: 'Cinzel', value: 'Cinzel, "Times New Roman", serif' },
    { label: 'Cormorant', value: '"Cormorant Garamond", "Times New Roman", serif' },
    { label: 'Bebas', value: '"Bebas Neue", "Arial Narrow", sans-serif' },
    { label: 'Libre', value: '"Libre Baskerville", "Times New Roman", serif' },
    { label: 'Playfair', value: '"Playfair Display", "Times New Roman", serif' },
    { label: 'Abril', value: '"Abril Fatface", "Times New Roman", serif' },
    { label: 'Oswald', value: '"Oswald", "Arial Narrow", sans-serif' },
    { label: 'Unica One', value: '"Unica One", "Arial Narrow", sans-serif' },
    { label: 'IM Fell', value: '"IM Fell English", "Times New Roman", serif' },
];

const CardPickerModal = ({
                             onSelectCard,
                             onClose,
                             collectionOwner,
                             loggedInUser,
                             usedCardIds,
                             isMobile
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
    const [showModifiedOnly, setShowModifiedOnly] = useState(false);

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
    };

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

        if (showModifiedOnly) {
            currentFilteredCards = currentFilteredCards.filter((card) => Boolean(card.modifier));
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
    }, [allCards, search, selectedRarity, showModifiedOnly, limitedCards, sortOption, order, getNameForSort]);

    const handleRarityChange = (rarityName) => {
        const normalizedRarityName = rarityName.toLowerCase();
        setSelectedRarity(prevRarity =>
            prevRarity === normalizedRarityName ? '' : normalizedRarityName
        );
    };

    if (loading) return <LoadingSpinner/>;

    return (
        <div className="modal-overlay binder-modal" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(10, 10, 10, 0.95)', zIndex: 2000, display: 'flex',
            flexDirection: 'column', padding: isMobile ? '12px' : '20px', overflowY: 'auto', backdropFilter: 'blur(5px)'
        }}>
            <div className="modal-content" style={{
                backgroundColor: '#1e1e1e', borderRadius: isMobile ? '16px' : '12px',
                padding: isMobile ? '16px' : '25px', margin: isMobile ? '0' : 'auto', maxWidth: isMobile ? '100%' : '1200px', width: '100%',
                maxHeight: isMobile ? '88vh' : '90vh', overflowY: 'scroll',
                border: '1px solid #333',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '0', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom:'15px'}}>
                    <h2>Select a Card to Insert</h2>
                    <button onClick={onClose} className="secondary-button" style={{width: isMobile ? '100%' : 'auto'}}>
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
                                    <option value="mintNumber">Mint #</option>
                                </select>
                                <div className="checkbox-group button-row">
                                    <div className="checkbox-wrapper" style={{padding:'10px', cursor:'pointer'}}>
                                        <label onClick={() => setOrder(prev => prev === 'asc' ? 'desc' : 'asc')} style={{cursor:'pointer'}}>
                                            <i className={`fa-regular fa-arrow-${order === 'asc' ? 'down' : 'up'}-a-z`}></i> {order === 'asc' ? 'Asc' : 'Desc'}
                                        </label>
                                    </div>
                                    <div className="checkbox-wrapper" style={{padding:'10px', cursor:'pointer'}}>
                                        <label onClick={() => setShowModifiedOnly(prev => !prev)} style={{cursor:'pointer'}} title="Show only modified cards">
                                            <i className={showModifiedOnly ? 'fa-solid fa-square-check' : 'fa-regular fa-square'}></i> Modified
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
                        const cardId = card?._id ? String(card._id) : null;
                        const isUsed = cardId && usedCardIds?.has(cardId);
                        return (
                            <div
                                key={card._id}
                                className={`card-item ${isUsed ? 'used' : ''}`}
                                onClick={() => {
                                    if (isUsed) {
                                        if (window.showToast) {
                                            window.showToast('That card is already in the binder.', 'info');
                                        }
                                        return;
                                    }
                                    onSelectCard(card);
                                }}
                            >
                                {isUsed && <div className="used-badge">In Binder</div>}
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
                                    interactive={!isMobile}
                                />
                            </div>
                        );
                    })}
                </div>
                {filteredCards.length === 0 && <p style={{textAlign:'center', padding:'20px'}}>No cards found matching filters.</p>}
            </div>
        </div>
    );
};

const BulkFillModal = ({
    onConfirm,
    onClose,
    collectionOwner,
    loggedInUser,
    usedCardIds,
    isMobile,
}) => {
    const [allCards, setAllCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [orderMode, setOrderMode] = useState('mint');
    const [selectedName, setSelectedName] = useState('');

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
    }, [collectionOwner, loggedInUser]);

    const groupedCards = useMemo(() => {
        const grouped = new Map();
        allCards.forEach((card) => {
            const name = card?.name ? String(card.name).trim() : '';
            if (!name) return;
            const entry = grouped.get(name) || {
                name,
                cards: [],
                availableCards: [],
                previewCard: card,
            };
            const cardId = card?._id ? String(card._id) : null;
            entry.cards.push(card);
            if (cardId && !usedCardIds?.has(cardId)) {
                entry.availableCards.push(card);
            }
            if (!entry.previewCard) {
                entry.previewCard = card;
            }
            grouped.set(name, entry);
        });
        return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [allCards, usedCardIds]);

    const filteredGroups = useMemo(() => {
        if (!search) return groupedCards;
        const term = search.toLowerCase();
        return groupedCards.filter((group) => group.name.toLowerCase().includes(term));
    }, [groupedCards, search]);

    useEffect(() => {
        if (selectedName && !groupedCards.some((group) => group.name === selectedName)) {
            setSelectedName('');
        }
    }, [groupedCards, selectedName]);

    const selectedGroup = useMemo(
        () => groupedCards.find((group) => group.name === selectedName) || null,
        [groupedCards, selectedName]
    );

    if (loading) return <LoadingSpinner/>;

    return (
        <div className="modal-overlay binder-modal" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(10, 10, 10, 0.95)', zIndex: 2000, display: 'flex',
            flexDirection: 'column', padding: isMobile ? '12px' : '20px', overflowY: 'auto', backdropFilter: 'blur(5px)'
        }}>
            <div className="modal-content bulk-fill-content" style={{
                backgroundColor: '#1e1e1e', borderRadius: isMobile ? '16px' : '12px',
                padding: isMobile ? '16px' : '25px', margin: isMobile ? '0' : 'auto', maxWidth: isMobile ? '100%' : '1200px', width: '100%',
                maxHeight: isMobile ? '88vh' : '90vh', overflowY: 'scroll',
                border: '1px solid #333',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}>
                <div className="bulk-fill-header">
                    <h2>Bulk Fill Binder</h2>
                    <button onClick={onClose} className="secondary-button" style={{width: isMobile ? '100%' : 'auto'}}>
                        <i className="fa-solid fa-xmark"></i> Close
                    </button>
                </div>

                <p className="bulk-fill-help">
                    Pick a card and we will fill every empty slot in your binder using available copies.
                </p>

                <div className="bulk-fill-controls">
                    <input
                        type="text"
                        placeholder="Search cards..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="filter-input"
                    />
                    <select value={orderMode} onChange={(e) => setOrderMode(e.target.value)} className="filter-select">
                        <option value="mint">Mint order</option>
                        <option value="rarity">Rarity order</option>
                    </select>
                </div>

                <div className="cards-grid mini bulk-fill-grid">
                    {filteredGroups.map((group) => (
                        <div
                            key={group.name}
                            className={`card-item bulk-fill-item${selectedName === group.name ? ' selected' : ''}`}
                            onClick={() => setSelectedName(group.name)}
                        >
                            <BaseCard
                                name={group.previewCard?.name}
                                image={group.previewCard?.imageUrl}
                                rarity={group.previewCard?.rarity}
                                description={group.previewCard?.flavorText}
                                mintNumber={group.previewCard?.mintNumber}
                                modifier={group.previewCard?.modifier}
                                grade={group.previewCard?.grade}
                                slabbed={group.previewCard?.slabbed}
                                miniCard={true}
                                inspectOnClick={false}
                                interactive={!isMobile}
                            />
                            <div className="bulk-fill-meta">
                                <div className="bulk-fill-name">{group.name}</div>
                                <div className={`bulk-fill-count${group.availableCards.length === 0 ? ' empty' : ''}`}>
                                    {group.availableCards.length} available
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {filteredGroups.length === 0 && <p style={{textAlign:'center', padding:'20px'}}>No cards found.</p>}

                <div className="bulk-fill-footer">
                    <div className="bulk-fill-summary">
                        {selectedGroup
                            ? `${selectedGroup.availableCards.length} copies available`
                            : 'Select a card to continue.'}
                    </div>
                    <button
                        type="button"
                        className="primary-button"
                        disabled={!selectedGroup || selectedGroup.availableCards.length === 0}
                        onClick={() => {
                            if (!selectedGroup) return;
                            onConfirm(selectedGroup, orderMode);
                        }}
                    >
                        Fill binder
                    </button>
                </div>
            </div>
        </div>
    );
};

const BinderPage = () => {
    const {username: collectionOwner} = useParams();
    const [loggedInUser, setLoggedInUser] = useState(null);

    // Initialize with 4 pages (2 spreads)
    const [pages, setPages] = useState(createDefaultPages());
    const [currentSpreadIndex, setCurrentSpreadIndex] = useState(-1);
    const [pickingSlot, setPickingSlot] = useState(null);
    const [bulkFillOpen, setBulkFillOpen] = useState(false);
    const [limitedCards, setLimitedCards] = useState([]);
    const [binderLoading, setBinderLoading] = useState(true);
    const [binderReady, setBinderReady] = useState(false);
    const [coverSettings, setCoverSettings] = useState(defaultCover);
    const [showCoverControls, setShowCoverControls] = useState(true);
    const [showSlotControls, setShowSlotControls] = useState(true);

    // Drag and Drop State
    const [draggedItem, setDraggedItem] = useState(null); // { pageIndex, slotIndex, cardData }
    const [dragOverSlot, setDragOverSlot] = useState(null); // { pageIndex, slotIndex }
    const dragTimeoutRef = useRef(null);
    const dragEdgeRef = useRef({ direction: null, triggered: false });
    const saveTimeoutRef = useRef(null);
    const initialLoadRef = useRef(true);
    const touchStartRef = useRef(null);

    const isMobile = useIsMobile();
    const binderIdentifier = collectionOwner || loggedInUser;
    const isOwner = !collectionOwner || loggedInUser === collectionOwner;
    const isCoverView = currentSpreadIndex < 0;
    const usedCardIds = useMemo(() => {
        const ids = new Set();
        pages.forEach((page) => {
            page.forEach((slot) => {
                if (!slot) return;
                const id = slot.cardId || slot._id;
                if (id) ids.add(String(id));
            });
        });
        return ids;
    }, [pages]);

    const totalPages = pages.length;
    const infoText = isOwner
        ? (isMobile
            ? 'Swipe left or right to flip pages. Tap a slot to add a card.'
            : 'Drag cards to organize. Hover over side arrows while dragging to flip pages.')
        : (isMobile ? 'Swipe left or right to flip pages.' : 'Viewing binder layout.');
    const isNextDisabled = !isCoverView && currentSpreadIndex >= totalPages - 1;
    const isPrevDisabled = isCoverView;

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

    useEffect(() => {
        if (!isOwner) {
            setShowCoverControls(false);
            setShowSlotControls(false);
        }
    }, [isOwner]);

    useEffect(() => {
        if (!isMobile) return;
        setShowCoverControls(false);
        setShowSlotControls(false);
    }, [isMobile]);

    useEffect(() => {
        if (!binderIdentifier) return;
        let isMounted = true;

        const loadBinder = async () => {
            setBinderLoading(true);
            setBinderReady(false);
            initialLoadRef.current = true;

            try {
                const response = await fetchBinder(binderIdentifier);
                let pagesData = response?.binder?.pages;
                let coverData = response?.binder?.cover;
                let migratedLocal = false;

                if (isOwner && response?.isNew) {
                    const stored = localStorage.getItem(`binder:${binderIdentifier}`);
                    const parsed = stored ? JSON.parse(stored) : null;
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        pagesData = parsed;
                        coverData = defaultCover;
                        migratedLocal = true;
                    } else if (parsed && typeof parsed === 'object') {
                        pagesData = Array.isArray(parsed.pages) ? parsed.pages : createDefaultPages();
                        coverData = { ...defaultCover, ...parsed.cover };
                        migratedLocal = true;
                    }

                    if (migratedLocal) {
                        localStorage.removeItem(`binder:${binderIdentifier}`);
                    }
                }

                const resolvedPages = Array.isArray(pagesData) && pagesData.length > 0
                    ? pagesData
                    : createDefaultPages();
                const resolvedCover = { ...defaultCover, ...(coverData || {}) };

                if (!isMounted) return;
                setPages(resolvedPages);
                setCoverSettings(resolvedCover);
                setCurrentSpreadIndex(-1);

                if (migratedLocal) {
                    try {
                        await updateBinder(binderIdentifier, {
                            pages: resolvedPages,
                            cover: resolvedCover,
                        });
                    } catch (error) {
                        console.error(error);
                    }
                }
            } catch (error) {
                console.error(error);
                if (!isMounted) return;
                setPages(createDefaultPages());
                setCoverSettings(defaultCover);
                setCurrentSpreadIndex(-1);
            } finally {
                if (isMounted) {
                    setBinderLoading(false);
                    setBinderReady(true);
                }
            }
        };

        loadBinder();
        return () => {
            isMounted = false;
        };
    }, [binderIdentifier, isOwner]);

    useEffect(() => {
        if (!binderReady || !binderIdentifier || !isOwner) return;
        if (initialLoadRef.current) {
            initialLoadRef.current = false;
            return;
        }

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            updateBinder(binderIdentifier, {
                pages,
                cover: coverSettings,
            }).catch((error) => {
                console.error(error);
                if (window.showToast) {
                    window.showToast('Failed to auto-save binder.', 'error');
                }
            });
        }, 300);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [pages, coverSettings, binderReady, binderIdentifier, isOwner]);

    const isCardLimited = (card) => {
        return limitedCards.some((lc) => lc.name === card.name);
    };

    // --- Page Management Logic ---

    const handleAddPages = (position) => {
        if (isCoverView || !isOwner) return;
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
        if (isCoverView) {
            setCurrentSpreadIndex(0);
            return;
        }
        const increment = isMobile ? 1 : 2;
        if (currentSpreadIndex + increment < pages.length) {
            setCurrentSpreadIndex(prev => prev + increment);
        }
    }, [currentSpreadIndex, pages.length, isMobile, isCoverView]);

    const handlePrev = useCallback(() => {
        if (currentSpreadIndex <= 0) {
            setCurrentSpreadIndex(-1);
            return;
        }
        const decrement = isMobile ? 1 : 2;
        if (currentSpreadIndex - decrement >= 0) {
            setCurrentSpreadIndex(prev => prev - decrement);
        }
    }, [currentSpreadIndex, isMobile]);

    const handleTouchStart = (e) => {
        if (!isMobile) return;
        if (!e.touches || e.touches.length === 0) return;
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e) => {
        if (!isMobile || !touchStartRef.current) return;
        const touch = e.changedTouches && e.changedTouches[0];
        if (!touch) return;
        const { x, y } = touchStartRef.current;
        touchStartRef.current = null;
        const dx = touch.clientX - x;
        const dy = touch.clientY - y;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        if (dx < 0) {
            handleNext();
        } else {
            handlePrev();
        }
    };

    const handleTouchCancel = () => {
        touchStartRef.current = null;
    };

    const getVisiblePageIndexes = useCallback(() => {
        if (isCoverView) return [];
        if (isMobile) return [currentSpreadIndex];
        return [currentSpreadIndex, currentSpreadIndex + 1].filter((idx) => idx < pages.length);
    }, [isCoverView, isMobile, currentSpreadIndex, pages.length]);

    const setLockStateForVisiblePages = useCallback((locked) => {
        const visible = getVisiblePageIndexes();
        if (visible.length === 0) return;
        const updatedPages = pages.map((page, pageIndex) => {
            if (!visible.includes(pageIndex)) return page;
            return page.map((slot) => (slot ? { ...slot, locked } : slot));
        });
        setPages(updatedPages);
    }, [getVisiblePageIndexes, pages]);

    const handleBulkFill = (group, orderMode) => {
        if (!isOwner || !group) return;
        const availableCards = (group.cards || []).filter((card) => {
            const cardId = card?._id || card?.cardId;
            if (!cardId) return false;
            return !usedCardIds.has(String(cardId));
        });

        if (availableCards.length === 0) {
            if (window.showToast) {
                window.showToast(`No available copies of ${group.name} to fill.`, 'info');
            }
            return;
        }

        const emptySlots = [];
        pages.forEach((page, pageIndex) => {
            page.forEach((slot, slotIndex) => {
                if (!slot) emptySlots.push({ pageIndex, slotIndex });
            });
        });

        if (emptySlots.length === 0) {
            if (window.showToast) {
                window.showToast('No empty slots to fill.', 'info');
            }
            return;
        }

        const getMintValue = (value) => {
            const parsed = Number.parseInt(value, 10);
            return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
        };
        const getRarityIndex = (rarity) => {
            const index = rarities.findIndex((r) => r.name.toLowerCase() === String(rarity).toLowerCase());
            return index === -1 ? Number.MAX_SAFE_INTEGER : index;
        };

        const sortedCards = [...availableCards].sort((a, b) => {
            if (orderMode === 'rarity') {
                const rarityDelta = getRarityIndex(a.rarity) - getRarityIndex(b.rarity);
                if (rarityDelta !== 0) return rarityDelta;
            }
            return getMintValue(a.mintNumber) - getMintValue(b.mintNumber);
        });

        const fillCount = Math.min(sortedCards.length, emptySlots.length);
        const updatedPages = pages.map((page) => page.map((slot) => (slot ? { ...slot } : null)));

        for (let i = 0; i < fillCount; i += 1) {
            const { pageIndex, slotIndex } = emptySlots[i];
            const card = sortedCards[i];
            const cardId = card?._id || card?.cardId || null;
            updatedPages[pageIndex][slotIndex] = {
                ...card,
                cardId,
                locked: false,
            };
        }

        setPages(updatedPages);
        setBulkFillOpen(false);

        if (window.showToast) {
            const remaining = emptySlots.length - fillCount;
            const message = remaining > 0
                ? `Filled ${fillCount} slots with ${group.name}. ${remaining} slots left empty.`
                : `Filled ${fillCount} slots with ${group.name}.`;
            window.showToast(message, remaining > 0 ? 'info' : 'success');
        }
    };

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
            if (!isOwner) return;
            setPickingSlot({ pageIndex: pageIndex, slotIndex });
        } else {
            handleInspect(slotData);
        }
    };

    const toggleLock = (e, pageIndex, slotIndex) => {
        e.stopPropagation();
        if (!isOwner) return;
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
        if (!isOwner) return;
        const slotData = pages[pageIndex][slotIndex];

        if (slotData && slotData.locked) return;

        const updatedPages = [...pages];
        updatedPages[pageIndex][slotIndex] = null;
        setPages(updatedPages);
    };

    const handleCardSelected = (card) => {
        if (!isOwner) return;
        if (pickingSlot) {
            const updatedPages = [...pages];
            const cardId = card?._id || card?.cardId || null;
            if (cardId && usedCardIds.has(String(cardId))) {
                if (window.showToast) {
                    window.showToast('That card is already in the binder.', 'info');
                }
                return;
            }
            updatedPages[pickingSlot.pageIndex][pickingSlot.slotIndex] = {
                ...card,
                cardId,
                locked: false
            };
            setPages(updatedPages);
            setPickingSlot(null);
        }
    };

    // --- Drag and Drop Handlers ---

    const clearEdgeDrag = () => {
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
            dragTimeoutRef.current = null;
        }
        dragEdgeRef.current = { direction: null, triggered: false };
    };

    const handleDragStart = (e, pageIndex, slotIndex) => {
        if (!isOwner) {
            e.preventDefault();
            return;
        }
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

    const handleDragEnd = () => {
        clearEdgeDrag();
        setDragOverSlot(null);
        setDraggedItem(null);
    };

    const handleDragOver = (e, pageIndex, slotIndex) => {
        e.preventDefault();
        setDragOverSlot({ pageIndex: pageIndex, slotIndex });
    };

    const handleDrop = (e, targetPageIndex, targetSlotIndex) => {
        e.preventDefault();
        clearEdgeDrag();
        if (!isOwner) {
            setDraggedItem(null);
            return;
        }
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
        if (!isOwner || !draggedItem) return;
        const pageIncrement = isMobile ? 1 : 2;
        const canGoNext = isCoverView || currentSpreadIndex + pageIncrement < pages.length;
        const canGoPrev = !isCoverView;
        if (direction === 'next' && !canGoNext) return;
        if (direction === 'prev' && !canGoPrev) return;

        if (dragEdgeRef.current.direction !== direction) {
            clearEdgeDrag();
            dragEdgeRef.current.direction = direction;
        }

        if (dragEdgeRef.current.triggered || dragTimeoutRef.current) return;

        dragTimeoutRef.current = setTimeout(() => {
            if (direction === 'next') {
                handleNext();
            } else {
                handlePrev();
            }
            dragTimeoutRef.current = null;
            dragEdgeRef.current.triggered = true;
        }, 600);
    };

    const handleEdgeDragLeave = () => {
        clearEdgeDrag();
    };

    if (binderLoading) return <LoadingSpinner/>;

    return (
        <div className="binder-view page">
            <h1>Binder View</h1>

            <div className="info-section">{infoText}</div>

            {isCoverView && isOwner && (
                <>
                    <button
                        type="button"
                        className="cover-toggle"
                        onClick={() => setShowCoverControls(prev => !prev)}
                    >
                        {showCoverControls ? 'Hide cover options' : 'Show cover options'}
                    </button>
                    {showCoverControls && (
                        <div className="binder-cover-controls">
                            <div className="cover-field">
                                <label htmlFor="binder-title">Title</label>
                                <input
                                    id="binder-title"
                                    type="text"
                                    value={coverSettings.title}
                                    onChange={(e) => setCoverSettings(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Binder Title"
                                />
                            </div>
                            <div className="cover-field">
                                <label htmlFor="binder-color">Binder Color</label>
                                <input
                                    id="binder-color"
                                    type="color"
                                    value={coverSettings.binderColor}
                                    onChange={(e) => setCoverSettings(prev => ({ ...prev, binderColor: e.target.value }))}
                                />
                            </div>
                            <div className="cover-field">
                                <label htmlFor="title-color">Title Color</label>
                                <input
                                    id="title-color"
                                    type="color"
                                    value={coverSettings.titleColor}
                                    onChange={(e) => setCoverSettings(prev => ({ ...prev, titleColor: e.target.value }))}
                                />
                            </div>
                            <div className="cover-field">
                                <label htmlFor="title-font">Font</label>
                                <select
                                    id="title-font"
                                    value={coverSettings.font}
                                    onChange={(e) => setCoverSettings(prev => ({ ...prev, font: e.target.value }))}
                                >
                                    {coverFonts.map((font) => (
                                        <option key={font.label} value={font.value}>
                                            {font.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </>
            )}


            <div className="binder-workspace">

                <div className="binder-gutter">
                    <button
                        className="insert-btn"
                        onClick={() => handleAddPages('before')}
                        title="Insert Page Before"
                        disabled={isCoverView || !isOwner}
                    >
                        <i className="fa-solid fa-plus"></i>
                    </button>

                    <div
                        className={`nav-button ${isCoverView ? 'disabled' : ''}`}
                        onClick={handlePrev}
                        onDragEnter={() => handleEdgeDragEnter('prev')}
                        onDragOver={(e) => {
                            e.preventDefault();
                            handleEdgeDragEnter('prev');
                        }}
                        onDragLeave={handleEdgeDragLeave}
                    >
                        <i className="fa-solid fa-chevron-left fa-2x"></i>
                    </div>
                </div>

                <div className="binder-book" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchCancel}>
                    {!isCoverView && <div className="binder-spine"></div>}

                    {isCoverView && (
                        <div
                            className="binder-cover-panel"
                            style={{
                                background: coverSettings.binderColor,
                            }}
                        >
                            <div
                                className="binder-cover-title"
                                style={{
                                    color: coverSettings.titleColor,
                                    fontFamily: coverSettings.font,
                                }}
                            >
                                {coverSettings.title || 'My Binder'}
                            </div>
                        </div>
                    )}

                    {!isCoverView && pages.map((pageData, pageIndex) => {
                        let isVisible;
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
                                        draggable={!!slotData && !slotData.locked && isOwner && !isMobile}
                                        onDragStart={(e) => handleDragStart(e, pageIndex, slotIndex)}
                                        onDragOver={(e) => handleDragOver(e, pageIndex, slotIndex)}
                                        onDrop={(e) => handleDrop(e, pageIndex, slotIndex)}
                                        onDragEnd={handleDragEnd}
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

                                                {isOwner && showSlotControls && (
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
                                                )}
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
                        className={`nav-button ${!isCoverView && currentSpreadIndex >= pages.length - (isMobile ? 1 : 2) ? 'disabled' : ''}`}
                        onClick={handleNext}
                        onDragEnter={() => handleEdgeDragEnter('next')}
                        onDragOver={(e) => {
                            e.preventDefault();
                            handleEdgeDragEnter('next');
                        }}
                        onDragLeave={handleEdgeDragLeave}
                    >
                        <i className="fa-solid fa-chevron-right fa-2x"></i>
                    </div>

                    <button
                        className="insert-btn"
                        onClick={() => handleAddPages('after')}
                        title="Insert Page After"
                        disabled={isCoverView || !isOwner}
                    >
                        <i className="fa-solid fa-plus"></i>
                    </button>
                </div>
            </div>

            {isMobile && (
                <div className="binder-mobile-toolbar">
                    <div className="nav-row">
                        <button
                            type="button"
                            className="nav-btn"
                            onClick={handlePrev}
                            disabled={isPrevDisabled}
                            aria-label="Previous page"
                        >
                            <i className="fa-solid fa-chevron-left"></i>
                            <span>Prev</span>
                        </button>
                        <div className="page-indicator">
                            {isCoverView ? 'Cover' : `Page ${currentSpreadIndex + 1} of ${totalPages}`}
                        </div>
                        <button
                            type="button"
                            className="nav-btn"
                            onClick={handleNext}
                            disabled={isNextDisabled}
                            aria-label="Next page"
                        >
                            <span>Next</span>
                            <i className="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                    {isOwner && (
                        <div className="insert-row">
                            <button
                                type="button"
                                className="insert-btn-mobile"
                                onClick={() => handleAddPages('before')}
                                disabled={isCoverView}
                            >
                                <i className="fa-solid fa-plus"></i>
                                <span>Insert Before</span>
                            </button>
                            <button
                                type="button"
                                className="insert-btn-mobile"
                                onClick={() => handleAddPages('after')}
                                disabled={isCoverView}
                            >
                                <i className="fa-solid fa-plus"></i>
                                <span>Insert After</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {!isCoverView && isOwner && (
                <div className="binder-action-bar">
                    <button
                        type="button"
                        className="action-btn"
                        onClick={() => setShowSlotControls(prev => !prev)}
                    >
                        {showSlotControls ? 'Hide slot controls' : 'Show slot controls'}
                    </button>
                    <button
                        type="button"
                        className="action-btn"
                        onClick={() => {
                            setPickingSlot(null);
                            setBulkFillOpen(true);
                        }}
                    >
                        Bulk fill
                    </button>
                    <button
                        type="button"
                        className="action-btn"
                        onClick={() => setLockStateForVisiblePages(true)}
                    >
                        Lock all on page
                    </button>
                    <button
                        type="button"
                        className="action-btn"
                        onClick={() => setLockStateForVisiblePages(false)}
                    >
                        Unlock all on page
                    </button>
                </div>
            )}

            {pickingSlot && isOwner && (
                <CardPickerModal
                    onClose={() => setPickingSlot(null)}
                    onSelectCard={handleCardSelected}
                    collectionOwner={collectionOwner}
                    loggedInUser={loggedInUser}
                    usedCardIds={usedCardIds}
                    isMobile={isMobile}
                />
            )}

            {bulkFillOpen && isOwner && (
                <BulkFillModal
                    onClose={() => setBulkFillOpen(false)}
                    onConfirm={handleBulkFill}
                    collectionOwner={collectionOwner}
                    loggedInUser={loggedInUser}
                    usedCardIds={usedCardIds}
                    isMobile={isMobile}
                />
            )}
        </div>
    );
};

export default BinderPage;
