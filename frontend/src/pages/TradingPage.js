import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createTrade, searchUsers, fetchWithAuth } from "../utils/api";
import BaseCard from "../components/BaseCard";
import "../styles/TradingPage.css";
import { rarities } from "../constants/rarities";

const TradingPage = ({ userId }) => {
    const location = useLocation();
    const [showTradeForm, setShowTradeForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [userSuggestions, setUserSuggestions] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showTradePreview, setShowTradePreview] = useState(true);
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
    const [leftSort, setLeftSort] = useState("mintNumber");
    const [leftSortDir, setLeftSortDir] = useState("asc");
    const [rightSearch, setRightSearch] = useState("");
    const [rightRarity, setRightRarity] = useState("");
    const [rightSort, setRightSort] = useState("mintNumber");
    const [rightSortDir, setRightSortDir] = useState("asc");

    // Card scaling is handled responsively based on screen size

    // Fetch logged-in user data
    useEffect(() => {
        fetchWithAuth("/api/users/me")
            .then((data) => {
                setLoggedInUser(data);
            })
            .catch(console.error);
    }, []);

    // If navigated with counter offer data, pre-populate the trade form
    useEffect(() => {
        const counter = location.state?.counterOffer;
        if (counter) {
            setShowTradeForm(true);
            setSelectedUser(counter.selectedUser);
            setTradeOffer(counter.tradeOffer || []);
            setTradeRequest(counter.tradeRequest || []);
            setOfferedPacks(counter.offeredPacks || 0);
            setRequestedPacks(counter.requestedPacks || 0);
            setCounterTradeId(counter.tradeId || null);
        } else {
            setCounterTradeId(null);
        }
    }, [location.state]);

    // Fetch user search suggestions
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
    }, [searchQuery]);

    // Fetch collections for logged-in user and selected user
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

    const handleUserSelect = (username) => {
        if (loggedInUser && username === loggedInUser.username) {
            window.showToast("You cannot trade with yourself!", "warning");
            return;
        }
        setSelectedUser(username);
        setSearchQuery("");
        setUserSuggestions([]);
    };

    const applyFilters = (collection, search, rarity, sortBy, sortDir) => {
        return collection
            .filter((card) =>
                card.name.toLowerCase().includes(search.toLowerCase()) &&
                (rarity ? card.rarity.toLowerCase() === rarity.toLowerCase() : true)
            )
            .sort((a, b) => {
                let result = 0;
                switch (sortBy) {
                    case "mintNumber":
                        result = a.mintNumber - b.mintNumber;
                        break;
                    case "name":
                        result = a.name.localeCompare(b.name);
                        break;
                    case "rarity":
                        const rarityA = rarities.findIndex((r) => r.name === a.rarity);
                        const rarityB = rarities.findIndex((r) => r.name === b.rarity);
                        result = rarityA - rarityB;
                        break;
                    default:
                        result = 0;
                }
                return sortDir === "asc" ? result : -result;
            })
            .slice(0, 15);
    };

    const handleSelectItem = (item, type) => {
        const setter = type === "offer" ? setTradeOffer : setTradeRequest;
        setter((prev) => {
            const exists = prev.some((i) => i._id === item._id);
            return exists
                ? prev.filter((i) => i._id !== item._id)
                : prev.length < 3
                    ? [...prev, item]
                    : prev;
        });
    };

    const handleRemoveItem = (card, type) => {
        const setter = type === "offer" ? setTradeOffer : setTradeRequest;
        setter((prev) => prev.filter((c) => c._id !== card._id));
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
        if (!tradeOffer.length && !offeredPacks) {
            window.showToast("Add items to offer!", "warning");
            return;
        }
        if (!tradeRequest.length && !requestedPacks) {
            window.showToast("Add items to request!", "warning");
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
        } catch (error) {
            console.error("Error creating trade:", error);
            window.showToast(`Error creating trade: ${error.message}`, "error");
        }
    };

    return (
        <div className="tp-trading-container">
            <h1>Trading</h1>
            <p className="tp-trading-info">
                Welcome to the trading system! You can trade up to 3 cards and/or up to 10 packs with other users.
                Double-click on any selected card to remove it from your trade. Make sure to review your offers
                and requests carefully before confirming a trade. Pending trades can be managed through the "View Pending Trades" button below.
            </p>

            <div className="tp-trade-control-buttons">
                <button
                    className="tp-toggle-form-button"
                    onClick={() => setShowTradeForm(!showTradeForm)}
                >
                    {showTradeForm ? "Hide Trade Form" : "Create New Trade"}
                </button>
                <Link to="/trades/pending">
                    <button className="tp-view-pending-button">View Pending Trades</button>
                </Link>
            </div>

            {showTradeForm && (
                <>
                    <div className="tp-user-search">
                        <input
                            type="text"
                            placeholder="Search user to trade with..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <ul className="tp-suggestions">
                            {userSuggestions.map((user) => (
                                <li key={user._id} onClick={() => handleUserSelect(user.username)}>
                                    {user.username}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {selectedUser && (
                        <div className="tp-trade-interface">
                            <div className="tp-trade-preview-control">
                                <button
                                    className="tp-toggle-preview-button"
                                    onClick={() => setShowTradePreview(!showTradePreview)}
                                >
                                    {showTradePreview ? "Hide Trade Preview" : "Show Trade Preview"}
                                </button>
                            </div>

                            {showTradePreview && (
                                <div className="tp-trade-preview">
                                    <div className="tp-offer-section">
                                        <h3>Your Offer</h3>
                                        <div className="tp-cards-horizontal">
                                            {tradeOffer.map((card) => (
                                                <div
                                                    key={card._id}
                                                    className="tp-card-item"
                                                    onDoubleClick={() => handleRemoveItem(card, "offer")}
                                                    onClick={() => handleSelectItem(card, "offer")}
                                                >
                                                    <BaseCard
                                                        name={card.name}
                                                        image={card.imageUrl}
                                                        description={card.flavorText}
                                                        rarity={card.rarity}
                                                        mintNumber={card.mintNumber}
                                                        maxMint={rarities.find((r) => r.name === card.rarity)?.totalCopies}
                                                        modifier={card.modifier}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="tp-pack-control">
                                            <label>Packs: </label>
                                            <input
                                                type="number"
                                                value={offeredPacks}
                                                onChange={(e) =>
                                                    setOfferedPacks(Math.min(10, Math.max(0, e.target.value)))
                                                }
                                                min="0"
                                                max="10"
                                            />
                                        </div>
                                    </div>

                                    <div className="tp-request-section">
                                        <h3>Your Request</h3>
                                        <div className="tp-cards-horizontal">
                                            {tradeRequest.map((card) => (
                                                <div
                                                    key={card._id}
                                                    className="tp-card-item"
                                                    onDoubleClick={() => handleRemoveItem(card, "request")}
                                                    onClick={() => handleSelectItem(card, "request")}
                                                >
                                                    <BaseCard
                                                        name={card.name}
                                                        image={card.imageUrl}
                                                        description={card.flavorText}
                                                        rarity={card.rarity}
                                                        mintNumber={card.mintNumber}
                                                        maxMint={rarities.find((r) => r.name === card.rarity)?.totalCopies}
                                                        modifier={card.modifier}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="tp-pack-control">
                                            <label>Packs: </label>
                                            <input
                                                type="number"
                                                value={requestedPacks}
                                                onChange={(e) =>
                                                    setRequestedPacks(Math.min(10, Math.max(0, e.target.value)))
                                                }
                                                min="0"
                                                max="10"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="tp-collections-wrapper">
                                <div className="tp-collection-panel">
                                    <h3 className="tp-collection-header">Your Collection</h3>
                                    <div className="tp-filters">
                                        <input
                                            type="text"
                                            placeholder="Search your collection..."
                                            value={leftSearch}
                                            onChange={(e) => setLeftSearch(e.target.value)}
                                        />
                                        <select value={leftRarity} onChange={(e) => setLeftRarity(e.target.value)}>
                                            <option value="">All Rarities</option>
                                            {rarities.map((r) => (
                                                <option key={r.name} value={r.name}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                        <select value={leftSort} onChange={(e) => setLeftSort(e.target.value)}>
                                            <option value="mintNumber">Mint Number</option>
                                            <option value="name">Name</option>
                                            <option value="rarity">Rarity</option>
                                        </select>
                                        <select value={leftSortDir} onChange={(e) => setLeftSortDir(e.target.value)}>
                                            <option value="asc">Ascending</option>
                                            <option value="desc">Descending</option>
                                        </select>
                                    </div>
                                    <div className="tp-cards-grid">
                                        {applyFilters(userCollection, leftSearch, leftRarity, leftSort, leftSortDir).map((card) => (
                                            <div
                                                key={card._id}
                                                className={`tp-card-item ${tradeOffer.some((c) => c._id === card._id) ? "tp-selected" : ""}`}
                                                onClick={() => handleSelectItem(card, "offer")}
                                            >
                                                <BaseCard
                                                    name={card.name}
                                                    image={card.imageUrl}
                                                    description={card.flavorText}
                                                    rarity={card.rarity}
                                                    mintNumber={card.mintNumber}
                                                    maxMint={rarities.find((r) => r.name === card.rarity)?.totalCopies}
                                                    modifier={card.modifier}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="tp-collection-panel">
                                    <h3 className="tp-collection-header">{selectedUser}'s Collection</h3>
                                    <div className="tp-filters">
                                        <input
                                            type="text"
                                            placeholder={`Search ${selectedUser}'s collection...`}
                                            value={rightSearch}
                                            onChange={(e) => setRightSearch(e.target.value)}
                                        />
                                        <select value={rightRarity} onChange={(e) => setRightRarity(e.target.value)}>
                                            <option value="">All Rarities</option>
                                            {rarities.map((r) => (
                                                <option key={r.name} value={r.name}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                        <select value={rightSort} onChange={(e) => setRightSort(e.target.value)}>
                                            <option value="mintNumber">Mint Number</option>
                                            <option value="name">Name</option>
                                            <option value="rarity">Rarity</option>
                                        </select>
                                        <select value={rightSortDir} onChange={(e) => setRightSortDir(e.target.value)}>
                                            <option value="asc">Ascending</option>
                                            <option value="desc">Descending</option>
                                        </select>
                                    </div>
                                    <div className="tp-cards-grid">
                                        {applyFilters(recipientCollection, rightSearch, rightRarity, rightSort, rightSortDir).map((card) => (
                                            <div
                                                key={card._id}
                                                className={`tp-card-item ${tradeRequest.some((c) => c._id === card._id) ? "tp-selected" : ""}`}
                                                onClick={() => handleSelectItem(card, "request")}
                                            >
                                                <BaseCard
                                                    name={card.name}
                                                    image={card.imageUrl}
                                                    description={card.flavorText}
                                                    rarity={card.rarity}
                                                    mintNumber={card.mintNumber}
                                                    maxMint={rarities.find((r) => r.name === card.rarity)?.totalCopies}
                                                    modifier={card.modifier}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button className="tp-submit-button" onClick={handleSubmit}>
                                Confirm Trade
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TradingPage;
