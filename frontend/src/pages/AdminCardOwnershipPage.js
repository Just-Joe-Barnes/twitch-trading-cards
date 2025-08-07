import React, { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '../utils/api';
import { rarities, getRarityColor } from '../constants/rarities';
import BaseCard from '../components/BaseCard';
import NavAdmin from '../components/NavAdmin';
import RarityQuickNav from '../components/RarityQuickNav';
import { Link } from 'react-router-dom';
import useIsMobile from '../hooks/useIsMobile';
import '../styles/AdminDashboardPage.css';

const MODIFIER_PREFIXES = ['Glitched ', 'Negative ', 'Prismatic '];
const stripCardNameModifiers = (cardName) => {
    if (typeof cardName !== 'string') return cardName;
    for (const prefix of MODIFIER_PREFIXES) {
        if (cardName.startsWith(prefix)) {
            return cardName.substring(prefix.length);
        }
    }
    return cardName;
};

const AdminCardOwnershipPage = () => {
    const [allCards, setAllCards] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [ownershipData, setOwnershipData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedDetails, setExpandedDetails] = useState({});
    const [sortMode, setSortMode] = useState('count');
    const [limitedCards, setLimitedCards] = useState([]);

    // NEW: State for the username filter input
    const [userFilter, setUserFilter] = useState('');

    const isMobile = useIsMobile();

    const rarityRefs = useRef({});

    useEffect(() => {
        const fetchCards = async () => {
            try {
                const res = await fetchWithAuth('/api/admin/cards');
                const all = [];
                Object.values(res.groupedCards || {}).forEach(cards => all.push(...cards));
                const uniqueCards = Array.from(new Map(all.map(card => [card.name, card])).values());
                setAllCards(uniqueCards);
                const limited = all.filter(c => c.availableFrom && c.availableTo);
                setLimitedCards(limited);
            } catch (error) {
                console.error('Error fetching cards:', error);
            }
        };
        fetchCards();
    }, []);

    const isCardLimited = (cardToCheck) => {
        const baseCardName = stripCardNameModifiers(cardToCheck.name);
        return limitedCards.some((limitedCard) => limitedCard.name === baseCardName);
    };

    const handleSearchChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (!term) {
            setSuggestions([]);
            return;
        }
        const lower = term.toLowerCase();
        const filtered = allCards.filter(c => c.name.toLowerCase().includes(lower));
        setSuggestions(filtered.slice(0, 10));
    };

    const handleSelectCard = async (card) => {
        setSearchTerm('');
        setSuggestions([]);
        setSelectedCard(card);
        setLoading(true);
        setOwnershipData([]);
        setExpandedDetails({});
        setUserFilter(''); // NEW: Reset the user filter when a new card is chosen

        try {
            const dataFromApi = await fetchWithAuth(`/api/admin/card-ownership/${card._id}`);
            const completeData = rarities.map(rarityInfo => {
                const existingData = dataFromApi.find(d => d.rarity === rarityInfo.name);
                const owners = existingData ? existingData.owners : [];
                const totalCount = owners.reduce((sum, owner) => sum + owner.count, 0);
                return {
                    rarity: rarityInfo.name,
                    owners: owners,
                    totalCount: totalCount
                };
            });
            setOwnershipData(completeData);
        } catch (error) {
            console.error('Error fetching ownership data:', error);
            window.showToast('Failed to load ownership data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleUserExpansion = (rarity, username) => {
        const key = `${rarity}-${username}`;
        setExpandedDetails(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleNavClick = (rarity) => {
        rarityRefs.current[rarity]?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    return (
        <div className="page">
            <h1>Admin Card Ownership</h1>
            <NavAdmin />

            <div className="section-card">
                <h2>Find Card Owners</h2>
                <p>Search for a card by name to see a list of all users who own it.</p>
                <div className="search-container">
                    <input type="search" placeholder="Search for a card..." value={searchTerm} onChange={handleSearchChange} />
                    {suggestions.length > 0 && (
                        <ul className="suggestions-list">
                            {suggestions.map(card => (
                                <li key={card._id} onClick={() => handleSelectCard(card)}>
                                    <img src={card.imageUrl} alt={card.name} />{card.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {selectedCard && (
                <div className="ownership-page-layout">
                    {!isMobile && ownershipData.length > 0 && (
                        <RarityQuickNav rarityData={ownershipData} onNavClick={handleNavClick} />
                    )}

                    <div className="ownership-main-content">
                        <div className="section-card">
                            <h2>Results for: {selectedCard.name}</h2>

                            {/* --- CONTROLS SECTION --- */}
                            <div className="sort-controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <div className="button-group" style={{width: '100%', gap: '1rem'}}>
                                    <button className={`primary-button sm ${sortMode === 'count' ? 'active' : ''}`} onClick={() => setSortMode('count')}>Count</button>
                                    <button className={`primary-button sm ${sortMode === 'alpha' ? 'active' : ''}`} onClick={() => setSortMode('alpha')}>Name</button>
                                </div>
                                <input
                                    type="search"
                                    placeholder="Filter by username..."
                                    value={userFilter}
                                    onChange={(e) => setUserFilter(e.target.value)}
                                    style={{ marginLeft: 'auto' }}
                                />

                                {isMobile && ownershipData.length > 0 && (
                                    <select className="rarity-select-nav" onChange={(e) => handleNavClick(e.target.value)}>
                                        <option value="">Jump to rarity...</option>
                                        {ownershipData.map(({ rarity, totalCount }) => (
                                            <option key={rarity} value={rarity}>
                                                {rarity} ({totalCount})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {loading && <p>Loading owners...</p>}

                            <div className="ownership-results-container">
                                {ownershipData.map(({ rarity, owners }) => {
                                    // NEW: Apply the username filter before sorting
                                    const filteredOwners = owners.filter(owner =>
                                        owner.username.toLowerCase().includes(userFilter.toLowerCase())
                                    );

                                    const sortedOwners = [...filteredOwners].sort((a, b) => {
                                        return sortMode === 'alpha' ? a.username.localeCompare(b.username) : b.count - a.count;
                                    });

                                    return (
                                        <div
                                            key={rarity}
                                            className="rarity-group-item"
                                            ref={el => (rarityRefs.current[rarity] = el)}
                                        >
                                            <h3 style={{ color: getRarityColor(rarity) }}>{rarity}</h3>
                                            {sortedOwners.length > 0 ? (
                                                sortedOwners.map(({ username, count, cards }) => {
                                                    const expansionKey = `${rarity}-${username}`;
                                                    const isExpanded = expandedDetails[expansionKey];
                                                    return (
                                                        <div className="owner-details" key={username}>
                                                            <div className="owner-header">
                                                                <span className="username-toggle" onClick={() => toggleUserExpansion(rarity, username)}>
                                                                    {username} ({count}) {isExpanded ? '▼' : '▶'}
                                                                </span>
                                                                <Link className="button primary-button sm" to={`/profile/${username}`}>View Full Collection</Link>
                                                            </div>
                                                            {isExpanded && (
                                                                <div className={`cards-grid mini ${cards.some(card => card.slabbed) ? 'slabbed' : ''}`} style={{ marginTop: '1rem', marginBottom: '0' }}>
                                                                    {cards.map((card, index) => {
                                                                        const isLimited = isCardLimited(card);
                                                                        return (
                                                                            <BaseCard
                                                                                key={`${card._id}-${index}`}
                                                                                name={card.name}
                                                                                image={card.imageUrl}
                                                                                rarity={card.rarity}
                                                                                slabbed={card.slabbed}
                                                                                grade={card.grade}
                                                                                description={card.flavorText}
                                                                                mintNumber={card.mintNumber}
                                                                                modifier={card.modifier}
                                                                                miniCard={true}
                                                                                limited={isLimited}
                                                                            />
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p style={{ color: '#888', fontStyle: 'italic' }}>
                                                    {owners.length > 0 ? 'No owners match your filter.' : 'No owners for this rarity.'}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCardOwnershipPage;
