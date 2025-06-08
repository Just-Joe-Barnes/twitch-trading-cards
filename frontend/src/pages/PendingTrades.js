// src/pages/PendingTrades.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserProfile, fetchPendingTrades, acceptTrade, rejectTrade, cancelTrade } from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner'; // Import the spinner
import '../styles/PendingTrades.css';
import '../styles/CardComponent.css'; // Ensure BaseCard styles are applied

const PendingTrades = () => {
    const [pendingTrades, setPendingTrades] = useState([]);
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('newest');
    const [expandedTradeId, setExpandedTradeId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadUserProfile = async () => {
            try {
                const profile = await fetchUserProfile();
                setLoggedInUser(profile);
                loadPendingTrades(profile._id);
            } catch (err) {
                console.error('Failed to fetch user profile:', err.message);
                setError('Failed to fetch user profile');
            }
        };
        loadUserProfile();
    }, []);

    const loadPendingTrades = async (userId) => {
        try {
            const trades = await fetchPendingTrades(userId);
            setPendingTrades(trades);
        } catch (err) {
            console.error('Failed to fetch pending trades:', err);
            setError('Failed to load pending trades');
        }
    };

    const handleTradeAction = async (tradeId, action, e) => {
        e.stopPropagation();
        const confirmationMessage = {
            accept: 'Are you sure you want to accept this trade?',
            reject: 'Are you sure you want to reject this trade?',
            cancel: 'Are you sure you want to cancel this trade?'
        };

        if (window.confirm(confirmationMessage[action])) {
            try {
                if (action === 'accept') await acceptTrade(tradeId, loggedInUser._id);
                if (action === 'reject') await rejectTrade(tradeId, loggedInUser._id);
                if (action === 'cancel') await cancelTrade(tradeId, loggedInUser._id);
                loadPendingTrades(loggedInUser._id);
            } catch (err) {
                console.error(`Error ${action}ing trade:`, err);
                setError(`Failed to ${action} trade`);
            }
        }
    };

    const handleCounterOffer = (trade, e) => {
        e.stopPropagation();
        navigate('/trading', {
            state: {
                counterOffer: {
                    tradeId: trade._id,
                    selectedUser: trade.sender.username,
                    tradeOffer: trade.requestedItems,
                    tradeRequest: trade.offeredItems,
                    offeredPacks: trade.requestedPacks,
                    requestedPacks: trade.offeredPacks,
                },
            },
        });
    };

    const handleSearch = (e) => setSearchQuery(e.target.value.toLowerCase());
    const handleFilterChange = (e) => setFilter(e.target.value);
    const handleSortChange = (e) => setSortOrder(e.target.value);

    const toggleTrade = (tradeId) => {
        setExpandedTradeId((prev) => (prev === tradeId ? null : tradeId));
    };

    const filteredAndSortedTrades = pendingTrades
        .filter((trade) => {
            if (trade.status !== 'pending') return false;
            const isIncoming = trade.recipient._id === loggedInUser._id;
            const isOutgoing = trade.sender._id === loggedInUser._id;
            if (filter === 'incoming' && !isIncoming) return false;
            if (filter === 'outgoing' && !isOutgoing) return false;
            const otherParty = isIncoming ? trade.sender.username : trade.recipient.username;
            return otherParty.toLowerCase().includes(searchQuery);
        })
        .sort((a, b) => {
            if (sortOrder === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

    if (error) return <div className="error-message">{error}</div>;

    if (!loggedInUser) {
        // If still loading user data, display the global spinner.
        return <LoadingSpinner />;
    }

    return (
        <div className="pending-trades-container">
            <h1 className="page-title">Pending Trades</h1>

            <div className="filters">
                <input
                    type="text"
                    placeholder="Search by username..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="search-box"
                />
                <select value={filter} onChange={handleFilterChange} className="filter-dropdown">
                    <option value="all">All Trades</option>
                    <option value="incoming">Incoming Trades</option>
                    <option value="outgoing">Outgoing Trades</option>
                </select>
                <select value={sortOrder} onChange={handleSortChange} className="sort-dropdown">
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                </select>
            </div>

            {filteredAndSortedTrades.length === 0 ? (
                <p className="no-trades">No pending trades.</p>
            ) : (
                <div className="trades-grid">
                {filteredAndSortedTrades.map((trade) => {
                    const isOutgoing = trade.sender._id === loggedInUser._id;
                    const tradeStatusClass = `trade-card ${isOutgoing ? 'outgoing' : 'incoming'}`;
                    const isExpanded = expandedTradeId === trade._id;
                    const previewOffered = trade.offeredItems?.slice(0, 2) || [];
                    const previewRequested = trade.requestedItems?.slice(0, 2) || [];

                    const offeredCount = trade.offeredItems?.length || 0;
                    const requestedCount = trade.requestedItems?.length || 0;
                    const tradeSummary = `${offeredCount} item(s) & ${trade.offeredPacks} pack(s) for ${requestedCount} item(s) & ${trade.requestedPacks} pack(s)`;

                    return (
                        <div
                            key={trade._id}
                            className={`${tradeStatusClass} ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => toggleTrade(trade._id)}
                        >
                            <div className="trade-header">
                                <div className="trade-header-info">
                                    <div className="trade-title">
                                        {isOutgoing ? 'Outgoing Trade' : 'Incoming Trade'}{' '}
                                        <span>
                                            with {isOutgoing ? trade.recipient.username : trade.sender.username}
                                        </span>
                                    </div>
                                    <div className="trade-summary">{tradeSummary}</div>
                                    <div className="trade-overview">
                                        <div className="overview-section">
                                            {previewOffered.map((item) => (
                                                <img
                                                    key={item._id}
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    className="trade-thumb"
                                                />
                                            ))}
                                            {trade.offeredItems?.length > 2 && (
                                                <span className="thumb-more">+{trade.offeredItems.length - 2}</span>
                                            )}
                                            <span className="packs-chip">{trade.offeredPacks} pack{trade.offeredPacks !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="trade-arrow">for</div>
                                        <div className="overview-section">
                                            {previewRequested.map((item) => (
                                                <img
                                                    key={item._id}
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    className="trade-thumb"
                                                />
                                            ))}
                                            {trade.requestedItems?.length > 2 && (
                                                <span className="thumb-more">+{trade.requestedItems.length - 2}</span>
                                            )}
                                            <span className="packs-chip">{trade.requestedPacks} pack{trade.requestedPacks !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="trade-buttons-inline" onClick={(e) => e.stopPropagation()}>
                                        {!isOutgoing ? (
                                            <>
                                                <button
                                                    className="accept-button"
                                                    onClick={(e) => handleTradeAction(trade._id, 'accept', e)}
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    className="reject-button"
                                                    onClick={(e) => handleTradeAction(trade._id, 'reject', e)}
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    className="counter-button"
                                                    onClick={(e) => handleCounterOffer(trade, e)}
                                                >
                                                    Counter
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                className="cancel-button"
                                                onClick={(e) => handleTradeAction(trade._id, 'cancel', e)}
                                            >
                                                Cancel Trade
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="trade-timestamp">
                                Created on: {new Date(trade.createdAt).toLocaleString()}
                            </div>

                            <div className={`trade-content-wrapper ${isExpanded ? 'expanded' : ''}`}>
                                <div className="trade-content">
                                    <div className="trade-section">
                                        <h4>Offered Items</h4>
                                        <div className="cards-grid">
                                            {trade.offeredItems?.length > 0 ? (
                                                trade.offeredItems.map((item) => (
                                                    <BaseCard
                                                        key={item._id}
                                                        name={item.name}
                                                        image={item.imageUrl}
                                                        rarity={item.rarity}
                                                        description={item.flavorText}
                                                        mintNumber={item.mintNumber}
                                                        maxMint={item.maxMint || '???'}
                                                    />
                                                ))
                                            ) : (
                                                <p>No offered items.</p>
                                            )}
                                        </div>
                                        <p className="packs-info">Packs Offered: {trade.offeredPacks}</p>
                                    </div>

                                    <div className="trade-section">
                                        <h4>Requested Items</h4>
                                        <div className="cards-grid">
                                            {trade.requestedItems?.length > 0 ? (
                                                trade.requestedItems.map((item) => (
                                                    <BaseCard
                                                        key={item._id}
                                                        name={item.name}
                                                        image={item.imageUrl}
                                                        rarity={item.rarity}
                                                        description={item.flavorText}
                                                        mintNumber={item.mintNumber}
                                                        maxMint={item.maxMint || '???'}
                                                    />
                                                ))
                                            ) : (
                                                <p>No requested items.</p>
                                            )}
                                        </div>
                                        <p className="packs-info">Packs Requested: {trade.requestedPacks}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                </div>
            )}
        </div>
    );
};

export default PendingTrades;
