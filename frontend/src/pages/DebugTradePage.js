import React, { useEffect, useState } from 'react';
import { fetchUserProfile, fetchPendingTrades, acceptTrade, rejectTrade, cancelTrade } from '../utils/api';
import BaseCard from '../components/BaseCard';
import '../styles/PendingTrades.css';

const PendingTrades = () => {
    const [pendingTrades, setPendingTrades] = useState([]);
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');  // all, incoming, outgoing
    const [sortOrder, setSortOrder] = useState('newest');  // newest, oldest
    const [expandedTrades, setExpandedTrades] = useState({});  // Track expanded/collapsed state

    useEffect(() => {
        const loadUserProfile = async () => {
            try {
                const profile = await fetchUserProfile();
                setLoggedInUser(profile);
                loadPendingTrades(profile._id);
            } catch (err) {
                console.error('Failed to fetch user profile:', err);
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

    const handleAcceptTrade = async (tradeId) => {
        if (window.confirm('Are you sure you want to accept this trade?')) {
            try {
                await acceptTrade(tradeId);
                loadPendingTrades(loggedInUser._id);
            } catch (err) {
                console.error('Error accepting trade:', err);
                setError('Failed to accept trade');
            }
        }
    };

    const handleRejectTrade = async (tradeId) => {
        if (window.confirm('Are you sure you want to reject this trade?')) {
            try {
                await rejectTrade(tradeId);
                loadPendingTrades(loggedInUser._id);
            } catch (err) {
                console.error('Error rejecting trade:', err);
                setError('Failed to reject trade');
            }
        }
    };

    const handleCancelTrade = async (tradeId) => {
        if (window.confirm('Are you sure you want to cancel this trade?')) {
            try {
                await cancelTrade(tradeId);
                loadPendingTrades(loggedInUser._id);
            } catch (err) {
                console.error('Error cancelling trade:', err);
                setError('Failed to cancel trade');
            }
        }
    };

    const handleSearch = (e) => {
        setSearchQuery(e.target.value.toLowerCase());
    };

    const handleFilterChange = (e) => {
        setFilter(e.target.value);
    };

    const handleSortChange = (e) => {
        setSortOrder(e.target.value);
    };

    const toggleTrade = (tradeId) => {
        setExpandedTrades(prevState => ({
            ...prevState,
            [tradeId]: !prevState[tradeId]
        }));
    };

    const filteredAndSortedTrades = pendingTrades
        .filter((trade) => {
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
                filteredAndSortedTrades.map((trade) => {
                    const isOutgoing = trade.sender._id === loggedInUser._id;
                    const tradeStatusClass = `trade-card ${isOutgoing ? 'outgoing' : 'incoming'}`;
                    const isExpanded = expandedTrades[trade._id];

                    return (
                        <div key={trade._id} className={tradeStatusClass}>
                            <div className="trade-header">
                                {isOutgoing ? "Outgoing Trade" : "Incoming Trade"}
                                <span> with {isOutgoing ? trade.recipient.username : trade.sender.username}</span>
                                <button className="toggle-trade-button" onClick={() => toggleTrade(trade._id)}>
                                    {isExpanded ? "Collapse" : "Expand"}
                                </button>
                            </div>

                            <div className="trade-timestamp">Created on: {new Date(trade.createdAt).toLocaleString()}</div>

                            {isExpanded && (
                                <div className="trade-content">
                                    <div className="trade-section">
                                        <h4>Offered Items</h4>
                                        <div className="cards-grid">
                                            {trade.offeredItems.map((item) => (
                                                <BaseCard
                                                    key={item._id}
                                                    name={item.name}
                                                    image={item.imageUrl}
                                                    rarity={item.rarity}
                                                    description={item.flavorText}
                                                    mintNumber={item.mintNumber}
                                                    maxMint={item.maxMint || '???'}
                                                    glowEffect={true}
                                                />
                                            ))}
                                        </div>
                                        <p className="packs-info">Packs Offered: {trade.offeredPacks}</p>
                                    </div>

                                    <div className="trade-section">
                                        <h4>Requested Items</h4>
                                        <div className="cards-grid">
                                            {trade.requestedItems && trade.requestedItems.length > 0 ? (
                                                trade.requestedItems.map((item) => (
                                                    <BaseCard
                                                        key={item._id}
                                                        name={item.name}
                                                        image={item.imageUrl}
                                                        rarity={item.rarity}
                                                        description={item.flavorText}
                                                        mintNumber={item.mintNumber}
                                                        maxMint={item.maxMint || '???'}
                                                        glowEffect={true}
                                                    />
                                                ))
                                            ) : (
                                                <p>No requested items.</p>
                                            )}
                                        </div>
                                        <p className="packs-info">Packs Requested: {trade.requestedPacks}</p>
                                    </div>
                                </div>
                            )}

                            {isExpanded && (
                                <div className="trade-buttons">
                                    {!isOutgoing ? (
                                        <>
                                            <button className="accept-button" onClick={() => handleAcceptTrade(trade._id)}>Accept</button>
                                            <button className="reject-button" onClick={() => handleRejectTrade(trade._id)}>Reject</button>
                                        </>
                                    ) : (
                                        <button className="cancel-button" onClick={() => handleCancelTrade(trade._id)}>Cancel Trade</button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default PendingTrades;
