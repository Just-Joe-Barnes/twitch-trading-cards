// src/pages/PendingTrades.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserProfile, fetchPendingTrades, acceptTrade, rejectTrade, cancelTrade } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner'; // Import the spinner
import BaseCard from '../components/BaseCard';
import '../styles/PendingTrades.css';

const PendingTrades = () => {
    const [pendingTrades, setPendingTrades] = useState([]);
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('newest');
    const [expandedTrade, setExpandedTrade] = useState(null);
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
        setExpandedTrade((prev) => (prev === tradeId ? null : tradeId));
    };

    const cardPreview = (cards = []) => {
        const preview = cards.slice(0, 3);
        return (
            <div className="preview-cards">
                {preview.map((item) => (
                    <div key={item._id} className="trade-preview">
                        <BaseCard
                            name={item.name}
                            image={item.imageUrl}
                            rarity={item.rarity}
                            description={item.flavorText}
                            mintNumber={item.mintNumber}
                        />
                    </div>
                ))}
                {cards.length > preview.length && (
                    <span className="thumb-more">+{cards.length - preview.length} more</span>
                )}
            </div>
        );
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
                    const tradeStatusClass = `trade-card ${isOutgoing ? 'outgoing' : 'incoming'} ${expandedTrade === trade._id ? 'expanded' : 'collapsed'}`;

                    const offeredItemsCount = trade.offeredItems?.length || 0;
                    const requestedItemsCount = trade.requestedItems?.length || 0;
                    const tradeSummary = `${offeredItemsCount} item(s) & ${trade.offeredPacks} pack(s) for ${requestedItemsCount} item(s) & ${trade.requestedPacks} pack(s)`;

                    return (
                        <div
                            key={trade._id}
                            className={tradeStatusClass}
                            onClick={() => toggleTrade(trade._id)}
                        >
                            <div className="trade-header">
                                <div className="trade-header-info">
                                    <div className="trade-title">
                                        {isOutgoing ? 'Outgoing to' : 'Incoming from'}{' '}
                                        <span>
                                            {isOutgoing ? trade.recipient.username : trade.sender.username}
                                        </span>
                                    </div>
                                    <div className="trade-summary">{tradeSummary}</div>
                                    <div className="trade-overview">
                                        <div className="overview-section">
                                            {cardPreview(trade.offeredItems)}
                                            <span className="packs-chip">{trade.offeredPacks} pack{trade.offeredPacks !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="trade-arrow">for</div>
                                        <div className="overview-section">
                                            {cardPreview(trade.requestedItems)}
                                            <span className="packs-chip">{trade.requestedPacks} pack{trade.requestedPacks !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                </div>
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
                            </div>

                            <div className="trade-timestamp">
                                Created on: {new Date(trade.createdAt).toLocaleString()}
                            </div>

                            {expandedTrade === trade._id && (
                                <div className="trade-details" onClick={(e) => e.stopPropagation()}>
                                    <div className="trade-section">
                                        <h3>Offered Items</h3>
                                        <div className="cards-grid">
                                            {trade.offeredItems?.map((item) => (
                                                <div key={item._id} className="full-card">
                                                    <BaseCard
                                                        name={item.name}
                                                        image={item.imageUrl}
                                                        rarity={item.rarity}
                                                        description={item.flavorText}
                                                        mintNumber={item.mintNumber}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <span className="packs-chip">{trade.offeredPacks} pack{trade.offeredPacks !== 1 ? 's' : ''}</span>
                                    </div>

                                    <div className="trade-section">
                                        <h3>Requested Items</h3>
                                        <div className="cards-grid">
                                            {trade.requestedItems?.map((item) => (
                                                <div key={item._id} className="full-card">
                                                    <BaseCard
                                                        name={item.name}
                                                        image={item.imageUrl}
                                                        rarity={item.rarity}
                                                        description={item.flavorText}
                                                        mintNumber={item.mintNumber}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <span className="packs-chip">{trade.requestedPacks} pack{trade.requestedPacks !== 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                            )}

                        </div>
                    );
                })}
                </div>
            )}
        </div>
    );
};

export default PendingTrades;
