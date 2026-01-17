import React, {useState, useEffect, useMemo} from 'react';
import {fetchWithAuth} from '../utils/api';
import BaseCard from '../components/BaseCard';
import UserTitle from '../components/UserTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {rarities} from '../constants/rarities';
import '../styles/MarketPage.css';
import {io} from 'socket.io-client';

const MarketPage = () => {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRarity, setSelectedRarity] = useState('');
    const [sortOption, setSortOption] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const navigate = useNavigate();
    const { username } = useParams();

    const [sellers, setSellers] = useState([]);
    const [selectedSellerId, setSelectedSellerId] = useState('');

    const [showFilters, setShowFilters] = useState(false);
    const [showSlabbedOnly, setShowSlabbedOnly] = useState(false);
    const [showLimitedOnly, setShowLimitedOnly] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const listingsPerPage = 50;

    const [rarityCount, setRarityCount] = useState({
        Basic: 0, Common: 0, Standard: 0, Uncommon: 0, Rare: 0,
        Epic: 0, Legendary: 0, Mythic: 0, Unique: 0, Divine: 0
    });

    const fetchListings = async (page = 1, sellerId = '') => {
        setLoading(true);
        try {
            let url = `/api/market/listings?page=${page}&limit=${listingsPerPage}`;
            if (sellerId) {
                url += `&sellerId=${sellerId}`;
            }
            const res = await fetchWithAuth(url);
            setListings(res.listings);
            setCurrentPage(res.page);
            setTotalPages(res.pages);

            const newRarityCounts = rarities.reduce((acc, r) => ({...acc, [r.name]: 0}), {});
            for (const listing of res.listings) {
                const rarity = listing.card.rarity;
                if (newRarityCounts.hasOwnProperty(rarity)) {
                    newRarityCounts[rarity] += 1;
                }
            }
            setRarityCount(newRarityCounts);
        } catch (err) {
            console.error('Error fetching market listings:', err);
            setError('Error fetching listings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchSellers = async () => {
            try {
                const sellersData = await fetchWithAuth('/api/market/sellers');
                setSellers(sellersData);
            } catch (err) {
                console.error('Error fetching sellers:', err);
            }
        };
        fetchSellers();
    }, []);

    useEffect(() => {
        if (username && sellers.length > 0) {
            const seller = sellers.find(s => s.username.toLowerCase() === username.toLowerCase());
            if (seller) {
                setSelectedSellerId(seller._id);
            }
        } else if (!username) {
            setSelectedSellerId('');
        }
    }, [username, sellers]);

    useEffect(() => {
        fetchListings(currentPage, selectedSellerId);

        const socket = io(process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000', {
            transports: ['websocket'],
        });

        socket.on('connect', () => console.log('Connected to Socket.io server'));
        socket.on('market:newListing', (newListing) => setListings((prev) => [newListing, ...prev]));

        return () => socket.disconnect();
    }, [currentPage, selectedSellerId]);

    const handleSellerChange = (e) => {
        const sellerId = e.target.value;
        setCurrentPage(1); // Reset to first page on new filter
        setSelectedSellerId(sellerId);

        if (sellerId) {
            const seller = sellers.find(s => s._id === sellerId);
            if (seller) {
                navigate(`/market/user/${seller.username}`, { replace: true });
            }
        } else {
            navigate('/market', { replace: true });
        }
    };

    const handleRarityChange = (rarityName) => {
        const normalizedRarityName = rarityName.toLowerCase();
        setSelectedRarity(prevRarity =>
            prevRarity === normalizedRarityName ? '' : normalizedRarityName
        );
    };

    const toggleSortOrder = () => {
        setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
    };

    const preFilteredListings = useMemo(() => {
        return listings.filter((listing) => {
            const card = listing.card;
            return (
                card.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                (selectedRarity ? card.rarity.toLowerCase() === selectedRarity.toLowerCase() : true)
            );
        });
    }, [listings, searchQuery, selectedRarity]);

    const hasSlabbedCards = useMemo(() => preFilteredListings.some(listing => listing.card.slabbed), [preFilteredListings]);
    const hasLimitedCards = useMemo(() => preFilteredListings.some(listing => !!listing.card.availableFrom && !!listing.card.availableTo), [preFilteredListings]);

    const filteredListings = useMemo(() => {
        return preFilteredListings.filter((listing) => {
            const card = listing.card;
            const isLimited = !!card.availableFrom && !!card.availableTo;
            return (
                (showSlabbedOnly ? card.slabbed === true : true) &&
                (showLimitedOnly ? isLimited === true : true)
            );
        });
    }, [preFilteredListings, showSlabbedOnly, showLimitedOnly]);

    const sortedListings = useMemo(() => [...filteredListings].sort((a, b) => {
        const cardA = a.card;
        const cardB = b.card;
        if (sortOption === 'name') {
            return sortOrder === 'asc'
                ? cardA.name.localeCompare(cardB.name)
                : cardB.name.localeCompare(cardA.name);
        } else if (sortOption === 'rarity') {
            const rarityA = rarities.findIndex(r => r.name.toLowerCase() === cardA.rarity.toLowerCase());
            const rarityB = rarities.findIndex(r => r.name.toLowerCase() === cardB.rarity.toLowerCase());
            return sortOrder === 'asc' ? rarityA - rarityB : rarityB - rarityA;
        }
        return 0;
    }), [filteredListings, sortOrder, sortOption]);

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const handleCreateNewListing = () => {
        navigate(`/market/create`);
    };

    const formatSellerLabel = (seller) => {
        if (!seller) return '';
        const titleName = seller.selectedTitle?.name;
        return titleName ? `${seller.username} ${titleName}` : seller.username;
    };

    if (loading) return <LoadingSpinner/>;
    if (error) return <div className="market-page-error">{error}</div>;

    return (
        <>
            <div className="page" style={{paddingBottom: '0'}}>
                <h1>Market</h1>
                <div className="info-section section-card narrow">
                    Welcome to the market! Here you can list your cards for trade offers and view offers from other
                    users.
                    Browse listings, filter by card name or rarity, and make an offer on the ones you like.
                </div>

                <div className="stats">
                    <div className="stat" data-tooltip="Total listings currently on the market">
                        <div>Total Listings</div>
                        <span>{listings.length}</span>
                    </div>
                    {totalPages > 1 && (
                        <div className="stat" data-tooltip="The number of pages available based on current filters">
                            <div>Total Pages</div>
                            <span>{totalPages}</span>
                        </div>
                    )}
                    <button onClick={() => setShowFilters(!showFilters)} className="stat">
                        {showFilters ? "Hide Filters" : "Show Filters"}
                        <i className={`fa-solid ${showFilters ? 'fa-filter' : 'fa-filter'}`}/>
                    </button>
                    <div className="button-group">
                        <button className="primary-button" onClick={handleCreateNewListing} style={{margin: '0'}}>
                            Create New Listing
                        </button>
                    </div>
                </div>
                <br/>
                {showFilters && (
                    <div className="section-card" style={{marginBottom: "2rem"}}>
                        <div className="filters">
                            <div className="filter-card">
                                <input
                                    type="text"
                                    placeholder="Search listings by card name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="filter-input"
                                />
                                <div className="sort-controls">
                                    <div className="filter-button-group horizontal">
                                        <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}
                                                className="filter-select">
                                            <option value="name">Name</option>
                                            <option value="rarity">Rarity</option>
                                        </select>
                                        <select
                                            value={selectedSellerId}
                                            onChange={handleSellerChange}
                                            className="filter-select"
                                        >
                                            <option value="">All Sellers</option>
                                            {sellers.map(seller => (
                                                <option key={seller._id} value={seller._id}>
                                                    {formatSellerLabel(seller)}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="checkbox-group button-row">
                                            <div className="sort-order-toggle checkbox-wrapper">
                                                <label htmlFor="sortOrderToggle">
                                                    <i className={`fa-regular ${sortOrder === 'asc' ? 'fa-arrow-down-a-z' : 'fa-arrow-up-a-z'}`}></i>
                                                </label>
                                                <input
                                                    type="checkbox"
                                                    id="sortOrderToggle"
                                                    checked={sortOrder === 'asc'}
                                                    onChange={toggleSortOrder}
                                                />
                                            </div>
                                            <div className={`checkbox-wrapper ${!hasSlabbedCards ? 'disabled' : ''}`}>
                                                <label htmlFor="slabbedCheckbox" data-tooltip="Show only Slabbed Cards">
                                                    <i className={`fa-${showSlabbedOnly ? 'solid' : 'regular'} fa-square`}/>
                                                </label>
                                                <input type="checkbox" id="slabbedCheckbox"
                                                       checked={showSlabbedOnly}
                                                       onChange={(e) => setShowSlabbedOnly(e.target.checked)}
                                                       disabled={!hasSlabbedCards}/>
                                            </div>
                                            <div className={`checkbox-wrapper ${!hasLimitedCards ? 'disabled' : ''}`}>
                                                <label htmlFor="limitedCheckbox" data-tooltip="Show only Limited Cards">
                                                    <i className={`fa-${showLimitedOnly ? 'solid' : 'regular'} fa-crown`}/>
                                                </label>
                                                <input type="checkbox" id="limitedCheckbox"
                                                       checked={showLimitedOnly}
                                                       onChange={(e) => setShowLimitedOnly(e.target.checked)}
                                                       disabled={!hasLimitedCards}/>
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
                                            onClick={() => handleRarityChange(r.name)}
                                            className={`rarity-item ${normalizedRarityName} ${selectedRarity === normalizedRarityName ? 'active' : ''}`}
                                            disabled={rarityCount[r.name] === 0}
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
                <div className={`card-tile-grid mini`} style={{marginTop: '0'}}>
                    {sortedListings.length > 0 ? (
                        sortedListings.map((listing) => (
                            <div key={listing._id} className={`card-tile ${listing.card.slabbed ? 'slabbed':''}`}>
                                <BaseCard
                                    name={listing.card.name}
                                    image={listing.card.imageUrl}
                                    rarity={listing.card.rarity}
                                    description={listing.card.flavorText}
                                    mintNumber={listing.card.mintNumber}
                                    modifier={listing.card.modifier}
                                    slabbed={listing.card.slabbed}
                                    grade={listing.card.grade}
                                    limited={!!listing.card.availableFrom && !!listing.card.availableTo}
                                />
                                <div className="actions">
                                    <p className="listing-owner">
                                        Listed by:{' '}
                                        <Link to={`/profile/${listing.owner.username}`}>
                                            <UserTitle username={listing.owner.username} title={listing.owner.selectedTitle} />
                                        </Link>
                                    </p>
                                    <p className="offers-count">Offers: {listing.offers ? listing.offers.length : 0}</p>
                                    <Link to={`/market/listing/${listing._id}`}>
                                        <button className="primary-button">View &amp; Make Offer</button>
                                    </Link>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>No listings found.</p>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="market-pagination" style={{marginTop: '1.5rem', textAlign: 'center'}}>
                        <button onClick={handlePreviousPage} disabled={currentPage === 1}>
                            Previous
                        </button>
                        <span style={{margin: '0 1rem'}}>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button onClick={handleNextPage} disabled={currentPage === totalPages}>
                            Next
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default MarketPage;
