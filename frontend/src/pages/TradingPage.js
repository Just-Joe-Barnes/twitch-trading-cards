import React, {useState, useEffect, useRef, useMemo} from "react";
import {Link, useLocation} from "react-router-dom";
import {createTrade, searchUsers, fetchWithAuth} from "../utils/api";
import BaseCard from "../components/BaseCard";
import {rarities} from "../constants/rarities";

const TradingPage = ({userId}) => {
    const location = useLocation();
    const [showTradeForm, setShowTradeForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [userSuggestions, setUserSuggestions] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [counterTradeId, setCounterTradeId] = useState(null);
    const [userCollection, setUserCollection] = useState([]);
    const [recipientCollection, setRecipientCollection] = useState([]);
    const [tradeOffer, setTradeOffer] = useState([]);
    const [tradeRequest, setTradeRequest] = useState([]);
    const [offeredPacks, setOfferedPacks] = useState(0);
    const [requestedPacks, setRequestedPacks] = useState(0);
    const [loggedInUser, setLoggedInUser] = useState(null);

    const [leftSearch, setLeftSearch] = useState("");
    const [leftRarity, setLeftRarity] = useState("");
    const [leftSort, setLeftSort] = useState("acquiredAt");
    const [leftSortDir, setLeftSortDir] = useState("desc");
    const [leftSlabbedOnly, setLeftSlabbedOnly] = useState(false);
    const [leftRarityCount, setLeftRarityCount] = useState({});

    const [rightSearch, setRightSearch] = useState("");
    const [rightRarity, setRightRarity] = useState("");
    const [rightSort, setRightSort] = useState("acquiredAt");
    const [rightSortDir, setRightSortDir] = useState("desc");
    const [rightSlabbedOnly, setRightSlabbedOnly] = useState(false);
    const [rightRarityCount, setRightRarityCount] = useState({});

    const [displayUserCollection, setDisplayUserCollection] = useState([]);
    const [displayRecipientCollection, setDisplayRecipientCollection] = useState([]);
    const [showFilters, setShowFilters] = useState(false);

    const [activeIndex, setActiveIndex] = useState(-1);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchWithAuth("/api/users/me")
            .then((data) => {
                setLoggedInUser(data);
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        const counter = location.state?.counterOffer;
        if (counter) {
            setShowTradeForm(true);
            setSelectedUser(counter.selectedUser);
            setTradeOffer(counter.tradeOffer || []);
            setTradeRequest(counter.tradeRequest || []);
            setOfferedPacks(counter.offeredPPack || 0);
            setRequestedPacks(counter.requestedPacks || 0);
            setCounterTradeId(counter.tradeId || null);
        } else {
            setCounterTradeId(null);
        }
    }, [location.state]);

    useEffect(() => {
        if (searchQuery.length > 1) {
            searchUsers(searchQuery)
                .then((results) => {
                    const filtered = loggedInUser ? results.filter(u => u.username !== loggedInUser.username) : results;
                    setUserSuggestions(filtered);
                })
                .catch(console.error);
        } else {
            setUserSuggestions([]);
        }
    }, [searchQuery, loggedInUser]);

    useEffect(() => {
        if (selectedUser && loggedInUser?._id) {
            fetchWithAuth(`/api/users/${loggedInUser._id}/collection`)
                .then((data) => setUserCollection(data.cards || []))
                .catch(console.error);

            fetchWithAuth(`/api/users/${selectedUser}/collection`)
                .then((data) => setRecipientCollection(data.cards || []))
                .catch(console.error);
        }
    }, [selectedUser, loggedInUser]);

    const applyFiltersAndSort = (collection, search, rarity, sortBy, sortDir, slabbedOnly = false) => {
        let currentFiltered = [...collection];
        let currentRarityCounts = rarities.reduce((acc, r) => {
            acc[r.name] = 0;
            return acc;
        }, {});

        if (search) {
            currentFiltered = currentFiltered.filter((card) =>
                card.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (slabbedOnly) {
            currentFiltered = currentFiltered.filter(card => card.slabbed);
        }

        currentFiltered.forEach(card => {
            const cardRarity = card.rarity || (card.rarities && card.rarities[0]?.rarity);
            if (cardRarity && currentRarityCounts.hasOwnProperty(cardRarity)) {
                currentRarityCounts[cardRarity]++;
            }
        });

        if (rarity) {
            currentFiltered = currentFiltered.filter(
                (card) => (card.rarity && card.rarity.toLowerCase() === rarity.toLowerCase()) ||
                    (card.rarities && card.rarities[0]?.rarity?.toLowerCase() === rarity.toLowerCase())
            );
        }

        currentFiltered.sort((a, b) => {
            let result = 0;
            const getRarityIndex = (card) => {
                const cardRarity = card.rarity || (card.rarities && card.rarities[0]?.rarity);
                return rarities.findIndex((r) => r.name.toLowerCase() === cardRarity?.toLowerCase());
            };

            switch (sortBy) {
                case "mintNumber":
                    result = (a.mintNumber || 0) - (b.mintNumber || 0);
                    break;
                case "name":
                    result = a.name.localeCompare(b.name);
                    break;
                case "rarity":
                    result = getRarityIndex(a) - getRarityIndex(b);
                    break;
                case "acquiredAt":
                    result = new Date(a.acquiredAt) - new Date(b.acquiredAt);
                    break;
                default:
                    result = 0;
            }
            return sortDir === "asc" ? result : -result;
        });

        return {filteredData: currentFiltered, counts: currentRarityCounts};
    };

    const leftHasSlabbedCards = useMemo(() => userCollection.some(card => card.slabbed), [userCollection]);
    const rightHasSlabbedCards = useMemo(() => recipientCollection.some(card => card.slabbed), [recipientCollection]);

    useEffect(() => {
        const {filteredData, counts} = applyFiltersAndSort(
            userCollection,
            leftSearch,
            leftRarity,
            leftSort,
            leftSortDir,
            leftSlabbedOnly
        );
        setDisplayUserCollection(filteredData);
        setLeftRarityCount(counts);
    }, [userCollection, leftSearch, leftRarity, leftSort, leftSortDir, leftSlabbedOnly]);

    useEffect(() => {
        const {filteredData, counts} = applyFiltersAndSort(
            recipientCollection,
            rightSearch,
            rightRarity,
            rightSort,
            rightSortDir,
            rightSlabbedOnly
        );
        setDisplayRecipientCollection(filteredData);
        setRightRarityCount(counts);
    }, [recipientCollection, rightSearch, rightRarity, rightSort, rightSortDir, rightSlabbedOnly]);

    useEffect(() => {
        if (activeIndex < 0 || !dropdownRef.current) return;
        const activeItem = dropdownRef.current.children[activeIndex];
        if (activeItem) {
            activeItem.scrollIntoView({
                block: 'nearest',
            });
        }
    }, [activeIndex]);

    const handleSelectItem = (item, type) => {
        const setter = type === "offer" ? setTradeOffer : setTradeRequest;
        setter((prev) => {
            const exists = prev.some((i) => i._id === item._id);
            if (exists) {
                return prev.filter((i) => i._id !== item._id);
            } else {
                return prev.length < 5 ? [...prev, item] : prev;
            }
        });
    };

    const handleRarityButtonClick = (rarityName, panelType) => {
        const normalizedRarityName = rarityName.toLowerCase();
        if (panelType === 'left') {
            setLeftRarity(prevRarity =>
                prevRarity === normalizedRarityName ? '' : normalizedRarityName
            );
        } else if (panelType === 'right') {
            setRightRarity(prevRarity =>
                prevRarity === normalizedRarityName ? '' : normalizedRarityName
            );
        }
    };

    const toggleSortOrder = (panelType) => {
        if (panelType === 'left') {
            setLeftSortDir(prevOrder => (prevOrder === 'asc' ? 'desc' : 'asc'));
        } else if (panelType === 'right') {
            setRightSortDir(prevOrder => (prevOrder === 'asc' ? 'desc' : 'asc'));
        }
    };

    const handleSubmit = async () => {
        if (!selectedUser) {
            window.showToast("Select a user first!", "warning");
            return;
        }
        if (loggedInUser && selectedUser === loggedInUser.username) {
            window.showToast("You cannot trade with yourself!", "warning");
            return;
        }
        if (!tradeOffer.length && Number(offeredPacks) <= 0) {
            window.showToast("Add cards and/or packs to your offer!", "warning");
            return;
        }
        if (!tradeRequest.length && Number(requestedPacks) <= 0) {
            window.showToast("Add cards and/or packs to your request!", "warning");
            return;
        }
        if (!loggedInUser?._id) {
            window.showToast("User authentication error!", "error");
            return;
        }

        const tradePayload = {
            recipient: selectedUser,
            offeredItems: tradeOffer.map((item) => item._id),
            requestedItems: tradeRequest.map((item) => item._id),
            offeredPacks: Number(offeredPacks),
            requestedPacks: Number(requestedPacks)
        };
        if (counterTradeId) {
            tradePayload.counterOf = counterTradeId;
        }

        try {
            await createTrade(tradePayload);
            window.showToast("Trade submitted successfully!", "success");
            setTradeOffer([]);
            setTradeRequest([]);
            setOfferedPacks(0);
            setRequestedPacks(0);
            setSelectedUser(null);
            setShowTradeForm(false);
        } catch (error) {
            console.error("Error creating trade:", error);
            window.showToast(`Error creating trade: ${error.message}`, "error");
        }
    };

    const handleUserSelect = (username) => {
        if (loggedInUser && username === loggedInUser.username) {
            window.showToast("You cannot trade with yourself!", "warning");
            return;
        }
        setSelectedUser(username);
        setSearchQuery("");
        setUserSuggestions([]);
        setActiveIndex(-1);
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setActiveIndex(-1);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prevIndex) =>
                prevIndex < userSuggestions.length - 1 ? prevIndex + 1 : prevIndex
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && userSuggestions[activeIndex]) {
                handleUserSelect(userSuggestions[activeIndex].username);
            }
        } else if (e.key === 'Escape') {
            setSearchQuery('');
            setUserSuggestions([]);
        }
    };

    const resetTradeForm = () => {
        setSelectedUser(null);
        setTradeOffer([]);
        setTradeRequest([]);
        setOfferedPacks(0);
        setRequestedPacks(0);
        setLeftSearch('');
        setLeftRarity('');
        setLeftSort('acquiredAt');
        setLeftSortDir('desc');
        setLeftSlabbedOnly(false);
        setRightSearch('');
        setRightRarity('');
        setRightSort('acquiredAt');
        setRightSortDir('desc');
        setRightSlabbedOnly(false);
    }

    const toggleTradeForm = () => {
        if (showTradeForm) {
            resetTradeForm();
        }
        setShowTradeForm(!showTradeForm);
    }

    return (
        <>
            <div className="page" style={{paddingBottom: 0}}>
                <h1>Trading</h1>
                <div className="section-card">
                    Welcome to the trading system! You can trade up to 5 cards and/or up to 10 packs with other users.
                    Double-click on any selected card to remove it from your trade. Make sure to review your offers
                    and requests carefully before confirming a trade. Existing trades can be managed through the "View
                    Trades" button below.
                </div>
                <div className="button-group">
                    <button className="primary-button" onClick={() => toggleTradeForm()}>
                        {showTradeForm ? (
                            <>
                                <i className="fa-solid fa-trash"/> Clear and Close Trade Form
                            </>) : (
                            <>
                                <i className="fa-solid fa-plus"/> Create New Trade
                            </>
                        )}
                    </button>
                    <Link to="/trades/pending" className="button secondary-button" style={{margin: '0'}}>
                        <i className="fa-solid fa-list"/> View Trades
                    </Link>
                </div>
                {(showTradeForm && !selectedUser) && (
                    <div className="tp-user-search section-card">
                        <input
                            type="search"
                            placeholder="Search user to trade with..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={handleKeyDown}
                            className="filter-input"
                            autoComplete="off"
                        />
                        {userSuggestions.length > 0 && (
                            <ul className="search-dropdown" ref={dropdownRef}>
                                {userSuggestions.map((user, index) => (
                                    <li
                                        key={user._id}
                                        onClick={() => handleUserSelect(user.username)}
                                        className={`search-result-item ${index === activeIndex ? 'active' : ''}`}>
                                        {user.username}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
            {showTradeForm && (
                <div className="page full" style={{paddingTop: 0}}>
                    <div>
                        {selectedUser && (
                            <div className="tp-trade-interface">
                                <div className="row-container">
                                    <div className="column-container section-card">
                                        <div className="tp-panel-header">
                                            <h2>Your Collection</h2>
                                        </div>
                                        <div className="stats">
                                            <div className="stat" data-tooltip={`Total cards in your collection`}>
                                                <div>Total Cards</div>
                                                <span>{displayUserCollection.length}</span>
                                            </div>
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
                                        <div className="tp-panel-content">
                                            <div className="filter-card">
                                                <input
                                                    type="text"
                                                    placeholder="Search your collection..."
                                                    value={leftSearch}
                                                    onChange={(e) => setLeftSearch(e.target.value)}
                                                    className="filter-input"
                                                />
                                            </div>
                                            {showFilters && (
                                                <div className="filters">
                                                    <div className="sort-controls">
                                                        <div className="filter-button-group horizontal">
                                                            <select value={leftSort}
                                                                    onChange={(e) => setLeftSort(e.target.value)}
                                                                    className="filter-select">
                                                                <option value="mintNumber">Mint Number</option>
                                                                <option value="name">Name</option>
                                                                <option value="rarity">Rarity</option>
                                                                <option value="acquiredAt">Acquisition Date</option>
                                                            </select>
                                                            <div className="checkbox-group button-row">
                                                                <div className="sort-order-toggle checkbox-wrapper">
                                                                    <label htmlFor="leftSortOrderToggle">
                                                                        {leftSortDir === 'asc' ? (
                                                                            <i className="fa-regular fa-arrow-down-a-z"></i>
                                                                        ) : (
                                                                            <i className="fa-regular fa-arrow-up-a-z"></i>
                                                                        )}
                                                                    </label>
                                                                    <input
                                                                        type="checkbox"
                                                                        id="leftSortOrderToggle"
                                                                        name="leftSortOrderToggle"
                                                                        checked={leftSortDir === 'asc'}
                                                                        onChange={() => toggleSortOrder('left')}
                                                                    />
                                                                </div>
                                                                <div
                                                                    className={`checkbox-wrapper ${!leftHasSlabbedCards ? 'disabled' : ''}`}>
                                                                    <label htmlFor="leftSlabbedCheckbox"
                                                                           data-tooltip="Show only Slabbed Cards">
                                                                        <i className={`fa-${leftSlabbedOnly ? 'solid' : 'regular'} fa-square`}/>
                                                                    </label>
                                                                    <input type="checkbox" id="leftSlabbedCheckbox"
                                                                           name="leftSlabbedCheckboxN"
                                                                           checked={leftSlabbedOnly}
                                                                           onChange={(e) => setLeftSlabbedOnly(e.target.checked)}
                                                                           disabled={!leftHasSlabbedCards}/>
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
                                                                    onClick={() => handleRarityButtonClick(r.name, 'left')}
                                                                    className={`rarity-item ${normalizedRarityName} ${leftRarity === normalizedRarityName ? 'active' : ''}`}
                                                                    disabled={leftRarityCount[r.name] === 0}
                                                                    style={{"--item-color": r.color}}>
                                                                    {r.name}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="tp-grid-container">
                                                <div className="card-tile-grid height-grid mini">
                                                    {displayUserCollection.length > 0 ? (
                                                        displayUserCollection.map((card) => (
                                                            <div key={card._id}
                                                                 className={`card-tile ${tradeOffer.some((c) => c._id === card._id) ? "selected" : ""} ${card.slabbed ? 'slabbed' : ''} ${card.gradingRequestedAt ? 'busy' : ''}`}>
                                                                <BaseCard name={card.name} image={card.imageUrl}
                                                                          description={card.flavorText}
                                                                          rarity={card.rarity || (card.rarities && card.rarities[0]?.rarity)}
                                                                          mintNumber={card.mintNumber}
                                                                          modifier={card.modifier}
                                                                          slabbed={card.slabbed} grade={card.grade}
                                                                          miniCard={true}/>
                                                                <div className="actions">
                                                                    <button
                                                                        className={tradeOffer.some((c) => c._id === card._id) ? "primary-button" : ""}
                                                                        onClick={() => handleSelectItem(card, "offer")}
                                                                        type="button"
                                                                        disabled={card.gradingRequestedAt}>
                                                                        {card.gradingRequestedAt ? 'Busy' : tradeOffer.some((c) => c._id === card._id) ? "Unselect" : "Select"}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="no-cards-message">No cards available in your
                                                            collection matching filters.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="column-container section-card">
                                        <div className="tp-collection-panel">
                                            <div className="tp-panel-header">
                                                <h2 className="tp-collection-header">{selectedUser}'s Collection</h2>
                                            </div>
                                            <div className="stats">
                                                <div className="stat"
                                                     data-tooltip={`Total cards in ${selectedUser}'s collection`}>
                                                    <div>Total Cards</div>
                                                    <span>{displayRecipientCollection.length}</span>
                                                </div>
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
                                            <div className="tp-panel-content">
                                                <div className="filter-card">
                                                    <input
                                                        type="text"
                                                        placeholder={`Search ${selectedUser}'s collection...`}
                                                        value={rightSearch}
                                                        onChange={(e) => setRightSearch(e.target.value)}
                                                        className="filter-input"
                                                    />
                                                </div>
                                                {showFilters && (
                                                    <div className="filters">
                                                        <div className="sort-controls">
                                                            <div className="filter-button-group horizontal">
                                                                <select value={rightSort}
                                                                        onChange={(e) => setRightSort(e.target.value)}
                                                                        className="filter-select">
                                                                    <option value="mintNumber">Mint Number</option>
                                                                    <option value="name">Name</option>
                                                                    <option value="rarity">Rarity</option>
                                                                    <option value="acquiredAt">Acquisition Date</option>
                                                                </select>
                                                                <div className="checkbox-group button-row">
                                                                    <div className="sort-order-toggle checkbox-wrapper">
                                                                        <label htmlFor="rightSortOrderToggle">
                                                                            {rightSortDir === 'asc' ? (
                                                                                <i className="fa-regular fa-arrow-down-a-z"></i>
                                                                            ) : (
                                                                                <i className="fa-regular fa-arrow-up-a-z"></i>
                                                                            )}
                                                                        </label>
                                                                        <input
                                                                            type="checkbox"
                                                                            id="rightSortOrderToggle"
                                                                            name="rightSortOrderToggle"
                                                                            checked={rightSortDir === 'asc'}
                                                                            onChange={() => toggleSortOrder('right')}
                                                                        />
                                                                    </div>
                                                                    <div
                                                                        className={`checkbox-wrapper ${!rightHasSlabbedCards ? 'disabled' : ''}`}>
                                                                        <label htmlFor="rightSlabbedCheckbox"
                                                                               data-tooltip="Show only Slabbed Cards">
                                                                            <i className={`fa-${rightSlabbedOnly ? 'solid' : 'regular'} fa-square`}/>
                                                                        </label>
                                                                        <input type="checkbox" id="rightSlabbedCheckbox"
                                                                               name="rightSlabbedCheckboxN"
                                                                               checked={rightSlabbedOnly}
                                                                               onChange={(e) => setRightSlabbedOnly(e.target.checked)}
                                                                               disabled={!rightHasSlabbedCards}/>
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
                                                                        onClick={() => handleRarityButtonClick(r.name, 'right')}
                                                                        className={`rarity-item ${normalizedRarityName} ${rightRarity === normalizedRarityName ? 'active' : ''}`}
                                                                        disabled={rightRarityCount[r.name] === 0}
                                                                        style={{"--item-color": r.color}}>
                                                                        {r.name}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="tp-grid-container">
                                                    <div className="card-tile-grid height-grid  mini">
                                                        {displayRecipientCollection.length > 0 ? (
                                                            displayRecipientCollection.map((card) => (
                                                                <div key={card._id}
                                                                     className={`card-tile ${tradeRequest.some((c) => c._id === card._id) ? "selected" : ""} ${card.slabbed ? 'slabbed' : ''} ${card.gradingRequestedAt ? 'busy' : ''}`}>
                                                                    <BaseCard name={card.name} image={card.imageUrl}
                                                                              description={card.flavorText}
                                                                              rarity={card.rarity || (card.rarities && card.rarities[0]?.rarity)}
                                                                              mintNumber={card.mintNumber}
                                                                              modifier={card.modifier}
                                                                              slabbed={card.slabbed} grade={card.grade}
                                                                              miniCard={true}/>
                                                                    <div className="actions">
                                                                        <button
                                                                            className={tradeRequest.some((c) => c._id === card._id) ? "primary-button" : ""}
                                                                            onClick={() => handleSelectItem(card, "request")}
                                                                            type="button"
                                                                            disabled={card.gradingRequestedAt}>
                                                                            {card.gradingRequestedAt ? 'Busy' : tradeRequest.some((c) => c._id === card._id) ? "Unselect" : "Select"}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="no-cards-message">No cards available
                                                                in {selectedUser}'s collection matching filters.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <hr/>
                                <div className="row-container">
                                    <div className="column-container section-card">
                                        <h3>Your Offer
                                            ({tradeOffer.length} Card{tradeOffer.length !== 1 ? 's' : ''}, {offeredPacks} Pack{offeredPacks !== 1 ? 's' : ''})</h3>
                                        {tradeOffer.length > 0 && (
                                            <div className="card-tile-grid height-grid mini">
                                                {tradeOffer.map((card) => (
                                                    <div key={card._id}
                                                         className={`card-item ${card.slabbed ? 'slabbed' : ''}`}>
                                                        <BaseCard name={card.name} image={card.imageUrl}
                                                                  description={card.flavorText}
                                                                  rarity={card.rarity || (card.rarities && card.rarities[0]?.rarity)}
                                                                  mintNumber={card.mintNumber} modifier={card.modifier}
                                                                  slabbed={card.slabbed} grade={card.grade}
                                                                  miniCard={true}/>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="tp-pack-control">
                                            <label>Packs: </label>
                                            <input
                                                type="number"
                                                value={offeredPacks}
                                                onChange={(e) => setOfferedPacks(Math.min(10, Math.max(0, e.target.value)))}
                                                min="0"
                                                max="10"
                                            />
                                        </div>
                                    </div>
                                    <div className="column-container section-card">
                                        <h3>Your Request
                                            ({tradeRequest.length} Card{tradeRequest.length !== 1 ? 's' : ''}, {requestedPacks} Pack{requestedPacks !== 1 ? 's' : ''})</h3>
                                        {tradeRequest.length > 0 && (
                                            <div className="card-tile-grid height-grid mini">
                                                {tradeRequest.map((card) => (
                                                    <div key={card._id}
                                                         className={`card-item ${card.slabbed ? 'slabbed' : ''}`}>
                                                        <BaseCard name={card.name} image={card.imageUrl}
                                                                  description={card.flavorText}
                                                                  rarity={card.rarity || (card.rarities && card.rarities[0]?.rarity)}
                                                                  mintNumber={card.mintNumber} modifier={card.modifier}
                                                                  slabbed={card.slabbed} grade={card.grade}
                                                                  miniCard={true}/>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="tp-pack-control">
                                            <label>Packs: </label>
                                            <input
                                                type="number"
                                                value={requestedPacks}
                                                onChange={(e) => setRequestedPacks(Math.min(10, Math.max(0, e.target.value)))}
                                                min="0"
                                                max="10"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="button-group">
                                    <button className="primary-button" onClick={handleSubmit}>
                                        Send Trade to {selectedUser}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default TradingPage;
