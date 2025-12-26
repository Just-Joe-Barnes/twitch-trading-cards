import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchAdminCards, fetchWithAuth } from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { rarities } from "../constants/rarities";
import '../styles/CataloguePage.css';

const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);
    return isMobile;
};

const AdminCataloguePage = ({ onClose }) => {
    const [cards, setCards] = useState([]);
    const [packs, setPacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRarityFilter, setSelectedRarityFilter] = useState('basic');
    const [selectedModifier] = useState('None');
    const [sortOrder, setSortOrder] = useState('asc');
    const [setRandomRaritySeed] = useState(0);
    const [showOnlyNotInPacks, setShowOnlyNotInPacks] = useState(false);
    const [selectedCardIds, setSelectedCardIds] = useState(() => new Set());
    const [tagInput, setTagInput] = useState('');
    const [bulkTagBusy, setBulkTagBusy] = useState(false);
    const [bulkTagError, setBulkTagError] = useState('');

    const isMobile = useIsMobile();
    const defaultCardScale = 1;
    const [cardScale, setCardScale] = useState(() => {
        const storedScale = parseFloat(localStorage.getItem("cardScale"));
        return isNaN(storedScale) ? defaultCardScale : storedScale;
    });
    const rangeInputRef = useRef(null);
    const maxCardScale = isMobile ? 1.3 : 2;
    const minCardScale = isMobile ? 0.35 : 0.35;

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
    }, [cardScale]);

    const handleCardScaleChange = (e) => {
        setCardScale(parseFloat(e.target.value));
    };

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                const [cardsResponse, packsResponse] = await Promise.all([
                    fetchAdminCards({}),
                    fetchWithAuth('/api/admin/packs')
                ]);
                setCards(cardsResponse.cards || []);
                setPacks(packsResponse.packs || []);
            } catch (err) {
                console.error('Error fetching admin catalogue data:', err.message);
                setError('Failed to load admin catalogue data.');
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    const allCardIdsInPacks = useMemo(() => {
        const cardIdSet = new Set();
        packs.forEach(pack => {
            if (pack.cardPool) {
                pack.cardPool.forEach(cardId => {
                    cardIdSet.add(cardId.toString());
                });
            }
        });
        return cardIdSet;
    }, [packs]);

    const handleSearchChange = (e) => setSearchQuery(e.target.value);
    const handleRarityChange = (rarityName) => {
        const normalized = rarityName.toLowerCase();
        if (normalized === 'random') {
            setSelectedRarityFilter('random');
            setRandomRaritySeed(prev => prev + 1);
        } else {
            setSelectedRarityFilter(normalized);
            setRandomRaritySeed(0);
        }
    };
    const handleSortOrderChange = () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');

    const getNameForSort = (name) => name.toLowerCase().startsWith('the ') ? name.substring(4) : name;

    const getRandomRarityName = useCallback(() => {
        const selectable = rarities.filter(r => r.name.toLowerCase() !== 'all');
        if (selectable.length === 0) return 'basic';
        return selectable[Math.floor(Math.random() * selectable.length)].name.toLowerCase();
    }, []);

    const filteredAndSortedCards = useMemo(() => {
        let currentCards = cards.filter(card =>
            card.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (showOnlyNotInPacks) {
            currentCards = currentCards.filter(card => !allCardIdsInPacks.has(card._id.toString()));
        }

        currentCards.sort((a, b) => {
            const nameA = getNameForSort(a.name);
            const nameB = getNameForSort(b.name);
            return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
        return currentCards;
    }, [cards, searchQuery, sortOrder, showOnlyNotInPacks, allCardIdsInPacks]);

    const parseTagsInput = useCallback((value) => {
        if (!value) return [];
        const tags = value
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);
        return Array.from(new Set(tags));
    }, []);

    const visibleSelectedCount = useMemo(() => {
        if (selectedCardIds.size === 0) return 0;
        return filteredAndSortedCards.reduce((count, card) => {
            const cardId = card._id.toString();
            return count + (selectedCardIds.has(cardId) ? 1 : 0);
        }, 0);
    }, [filteredAndSortedCards, selectedCardIds]);

    const toggleCardSelection = useCallback((cardId) => {
        setSelectedCardIds((prev) => {
            const next = new Set(prev);
            if (next.has(cardId)) {
                next.delete(cardId);
            } else {
                next.add(cardId);
            }
            return next;
        });
    }, []);

    const handleSelectVisible = useCallback(() => {
        setSelectedCardIds((prev) => {
            const next = new Set(prev);
            filteredAndSortedCards.forEach((card) => {
                next.add(card._id.toString());
            });
            return next;
        });
    }, [filteredAndSortedCards]);

    const handleClearSelection = useCallback(() => {
        setSelectedCardIds(new Set());
    }, []);

    const handleBulkTagUpdate = async (mode) => {
        const cardIds = Array.from(selectedCardIds);
        const tags = parseTagsInput(tagInput);

        if (cardIds.length === 0) {
            window.showToast('Select at least one card.', 'error');
            return;
        }

        if (tags.length === 0) {
            window.showToast('Enter at least one tag to apply.', 'error');
            return;
        }

        setBulkTagBusy(true);
        setBulkTagError('');

        try {
            const payload = { cardIds };
            if (mode === 'add') {
                payload.addTags = tags;
            } else {
                payload.removeTags = tags;
            }

            const response = await fetchWithAuth('/api/admin/cards/bulk-tags', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            const updatedById = new Map(
                (response.updatedCards || []).map((card) => [card._id.toString(), card.gameTags || []])
            );

            if (updatedById.size > 0) {
                setCards((prev) =>
                    prev.map((card) => {
                        const update = updatedById.get(card._id.toString());
                        if (!update) return card;
                        return { ...card, gameTags: update };
                    })
                );
            }

            window.showToast(response.message || 'Tags updated successfully.', 'success');
        } catch (err) {
            const message = err?.message || 'Failed to update tags.';
            setBulkTagError(message);
            window.showToast(message, 'error');
        } finally {
            setBulkTagBusy(false);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="cata-page">{error}</div>;

    return (
        <div className="section-card" style={{ maxWidth: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <h2>Admin Catalogue (All Cards)</h2>
                <button className="secondary-button" onClick={onClose}>
                    &larr; Back to Card Management
                </button>
            </div>
            <hr className="separator" />
            <div className="filters">
                <div className="filter-card" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="filter-input"
                    />
                    <button onClick={handleSortOrderChange} className="primary-button">
                        Sort: {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                    </button>
                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={showOnlyNotInPacks}
                            onChange={(e) => setShowOnlyNotInPacks(e.target.checked)}
                        />
                        Show only cards not in packs
                    </label>
                </div>
                <div className="filter-card" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Tags (comma-separated)"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        className="filter-input"
                    />
                    <button
                        onClick={() => handleBulkTagUpdate('add')}
                        className="primary-button"
                        disabled={bulkTagBusy}
                    >
                        Add Tags
                    </button>
                    <button
                        onClick={() => handleBulkTagUpdate('remove')}
                        className="secondary-button"
                        disabled={bulkTagBusy}
                    >
                        Remove Tags
                    </button>
                </div>
                <div className="filter-card" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 600, minWidth: '160px' }}>
                        Selected: {selectedCardIds.size}
                        {selectedCardIds.size > 0 && selectedCardIds.size !== visibleSelectedCount
                            ? ` (visible ${visibleSelectedCount})`
                            : ''}
                    </div>
                    <button onClick={handleSelectVisible} className="secondary-button">
                        Select Visible ({filteredAndSortedCards.length})
                    </button>
                    <button onClick={handleClearSelection} className="secondary-button" disabled={selectedCardIds.size === 0}>
                        Clear Selection
                    </button>
                </div>
                {bulkTagError ? (
                    <div style={{ color: '#f19999', fontWeight: 600 }}>
                        {bulkTagError}
                    </div>
                ) : null}
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
                {rarities.map((r) => (
                    <button
                        key={r.name}
                        onClick={() => handleRarityChange(r.name)}
                        className={`rarity-item ${r.name.toLowerCase()} ${selectedRarityFilter === r.name.toLowerCase() ? 'active' : ''}`}
                        style={{ "--item-color": r.color }}
                    >
                        {r.name}
                    </button>
                ))}
            </div>
            <div
                className={`cards-grid ${cardScale === 0.35 ? 'mini' : ''}`}
                style={{ "--user-card-scale": (cardScale === 0.35 ? 1 : cardScale) }}
            >
                {filteredAndSortedCards.length > 0 ? (
                    filteredAndSortedCards.map((card) => {
                        const isEventCard = card.rarities && card.rarities.some(r => r.rarity === 'Event');
                        const displayRarity = isEventCard
                            ? 'Event'
                            : selectedRarityFilter === 'random'
                                ? getRandomRarityName()
                                : selectedRarityFilter;
                        const cardId = card._id.toString();
                        const isSelected = selectedCardIds.has(cardId);
                        const tagList = Array.isArray(card.gameTags) ? card.gameTags : [];

                        return (
                            <div
                                key={card._id}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem',
                                    borderRadius: '12px',
                                    border: isSelected ? '2px solid var(--brand-secondary)' : '2px solid transparent',
                                    background: isSelected ? 'rgba(126, 181, 188, 0.12)' : 'transparent'
                                }}
                            >
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleCardSelection(cardId)}
                                    />
                                    Select
                                </label>
                                <BaseCard
                                    name={card.name}
                                    image={card.imageUrl}
                                    description={card.flavorText}
                                    rarity={displayRarity}
                                    modifier={selectedModifier === 'None' ? null : selectedModifier}
                                    lore={card.lore}
                                    miniCard={cardScale === 0.35}
                                />
                                <div style={{ fontSize: '0.75rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    {tagList.length > 0 ? `Tags: ${tagList.join(', ')}` : 'Tags: none'}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p>No cards found for this selection.</p>
                )}
            </div>
        </div>
    );
};

export default AdminCataloguePage;
