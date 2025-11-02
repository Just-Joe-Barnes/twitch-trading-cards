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
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={showOnlyNotInPacks}
                        onChange={(e) => setShowOnlyNotInPacks(e.target.checked)}
                    />
                    Show only cards not in packs
                </label>
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

                        return (
                            <BaseCard
                                key={card._id}
                                name={card.name}
                                image={card.imageUrl}
                                description={card.flavorText}
                                rarity={displayRarity}
                                modifier={selectedModifier === 'None' ? null : selectedModifier}
                                lore={card.lore}
                                miniCard={cardScale === 0.35}
                            />
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
