// src/pages/TradingPage.js
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { fetchTrades, createTrade, searchUsers, fetchWithAuth } from "../utils/api";
import BaseCard from "../components/BaseCard";
import LoadingSpinner from "../components/LoadingSpinner"; // Import the spinner component
import "../styles/TradingPage.css";
import { rarities } from "../constants/rarities";

// Define applyFilters function if not already defined
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

const TradingPage = ({ userId }) => {
    const [showTradeForm, setShowTradeForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [userSuggestions, setUserSuggestions] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showTradePreview, setShowTradePreview] = useState(true);
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

    // For handling clicks (to distinguish single from double)
    const clickTimerRef = useRef(null);

    // Fetch logged-in user data
    useEffect(() => {
        fetchWithAuth("/api/users/me")
            .then((data) => {
                setLoggedInUser(data);
            })
            .catch(console.error);
    }, []);

    // If loggedInUser hasn't loaded yet, show the global spinner
    if (!loggedInUser) {
        return <LoadingSpinner />;
    }

    // Fetch user search suggestions
    useEffect(() => {
        if (searchQuery.length > 1) {
            searchUsers(searchQuery)
                .then(setUserSuggestions)
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
        setSelectedUser(username);
        setSearchQuery("");
        setUserSuggestions([]);
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
            alert("Select a user first!");
            return;
        }
        if (!tradeOffer.length && !offeredPacks) {
            alert("Add items to offer!");
            return;
        }
        if (!tradeRequest.length && !requestedPacks) {
            alert("Add items to request!");
            return;
        }
        if (!loggedInUser?._id) {
            alert("User authentication error!");
            return;
        }

        const tradePayload = {
            senderId: loggedInUser._id,
            recipient: selectedUser,
            offeredItems: tradeOffer.map((item) => item._id),
            requestedItems: tradeRequest.map((item) => item._id),
            offeredPacks: Number(offeredPacks),
            requestedPacks: Number(requestedPacks)
        };

        try {
            await createTrade(tradePayload);
            alert("Trade submitted successfully!");
            setTradeOffer([]);
            setTradeRequest([]);
            setOfferedPacks(0);
            setRequestedPacks(0);
        } catch (error) {
            console.error("Error creating trade:", error);
            alert(`Error creating trade: ${error.message}`);
        }
    };

    // Single-click -> select card
    const handleCardClick = (card) => {
        if (clickTimerRef.current) return;
        clickTimerRef.current = setTimeout(() => {
            handleSelectItem(card, "offer"); // Or handle as needed based on your design
            clickTimerRef.current = null;
        }, 250);
    };

    // Double-click -> remove or toggle featured; using same logic for now.
    const handleDoubleClick = (card) => {
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
        }
        handleRemoveItem(card, "offer");
    };

    return (
        <div className="trading-container">
            <h1>Trading</h1>
            <p className="trading-info">
                Welcome to the trading system! You can trade up to 3 cards and/or up to 10 packs with other users.
                Double-click on any selected card to remove it from your trade. Make sure to review your offers
                and requests carefully before confirming a trade. Pending trades can be managed through the "View Pending Trades" button below.
            </p>

            <div className="trade-control-buttons">
                <button
                    className="toggle-form-button"
                    onClick={() => setShowTradeForm(!showTradeForm)}
                >
                    {showTradeForm ? "Hide Trade Form" : "Create New Trade"}
                </button>
                <Link to="/trades/pending">
                    <button className="view-pending-button">View Pending Trades</button>
                </Link>
            </div>

            {showTradeForm && (
                <>
                    <div className="user-search">
                        <input
                            type="text"
                            placeholder="Search user to trade with..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <ul className="suggestions">
                            {userSuggestions.map((user) => (
                                <li key={user._id} onClick={() => handleUserSelect(user.username)}>
                                    {user.username}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {selectedUser && (
                        <div className="trade-interface">
                            <div className="trade-preview-control">
                                <button
                                    className="toggle-preview-button"
                                    onClick={() => setShowTradePreview(!showTradePreview)}
                                >
                                    {showTradePreview ? "Hide Trade Preview" : "Show Trade Preview"}
                                </button>
                            </div>

                            {showTradePreview && (
                                <div className="trade-preview">
                                    <div className="offer-section">
                                        <h3>Your Offer</h3>
                                        <div className="cards-horizontal">
                                            {tradeOffer.map((card) => (
                                                <div
                                                    key={card._id}
                                                    className="card-preview-wrapper"
                                                    onDoubleClick={() => handleRemoveItem(card, "offer")}
                                                >
                                                    <BaseCard
                                                        name={card.name}
                                                        image={card.imageUrl}
                                                        rarity={card.rarity}
                                                        description={card.flavorText}
                                                        mintNumber={card.mintNumber}
                                                        maxMint={rarities.find((r) => r.name === card.rarity)?.totalCopies}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pack-control">
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

                                    <div className="request-section">
                                        <h3>Your Request</h3>
                                        <div className="cards-horizontal">
                                            {tradeRequest.map((card) => (
                                                <div
                                                    key={card._id}
                                                    className="card-preview-wrapper"
                                                    onDoubleClick={() => handleRemoveItem(card, "request")}
                                                >
                                                    <BaseCard
                                                        name={card.name}
                                                        image={card.imageUrl}
                                                        rarity={card.rarity}
                                                        description={card.flavorText}
                                                        mintNumber={card.mintNumber}
                                                        maxMint={rarities.find((r) => r.name === card.rarity)?.totalCopies}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pack-control">
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

                            <div className="collections-wrapper">
                                <div className="collection-panel">
                                    <div className="filters">
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
                                    <div className="cards-grid">
                                        {applyFilters(userCollection, leftSearch, leftRarity, leftSort, leftSortDir).map((card) => (
                                            <div
                                                key={card._id}
                                                className={`card-wrapper ${tradeOffer.some((c) => c._id === card._id) ? "selected" : ""}`}
                                                onClick={() => handleSelectItem(card, "offer")}
                                            >
                                                <BaseCard
                                                    name={card.name}
                                                    image={card.imageUrl}
                                                    description={card.flavorText}
                                                    rarity={card.rarity}
                                                    mintNumber={card.mintNumber}
                                                    maxMint={rarities.find((r) => r.name === card.rarity)?.totalCopies}
                                                />
                                                {tradeOffer.some((c) => c._id === card._id) && (
                                                    <div className="selection-badge">✓</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="collection-panel">
                                    <div className="filters">
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
                                    <div className="cards-grid">
                                        {applyFilters(recipientCollection, rightSearch, rightRarity, rightSort, rightSortDir).map((card) => (
                                            <div
                                                key={card._id}
                                                className={`card-wrapper ${tradeRequest.some((c) => c._id === card._id) ? "selected" : ""}`}
                                                onClick={() => handleSelectItem(card, "request")}
                                            >
                                                <BaseCard
                                                    name={card.name}
                                                    image={card.imageUrl}
                                                    description={card.flavorText}
                                                    rarity={card.rarity}
                                                    mintNumber={card.mintNumber}
                                                    maxMint={rarities.find((r) => r.name === card.rarity)?.totalCopies}
                                                />
                                                {tradeRequest.some((c) => c._id === card._id) && (
                                                    <div className="selection-badge">✓</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button className="submit-button" onClick={handleSubmit}>
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
