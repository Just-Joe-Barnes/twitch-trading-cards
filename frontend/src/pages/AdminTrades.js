import React, { useState, useEffect, useCallback } from 'react';
import NavAdmin from "../components/NavAdmin";
import Pagination from '../components/Pagination';
import '../styles/AdminTradesPage.css';
import {getRarityColor} from "../constants/rarities";

const AdminTrades = () => {
    const [trades, setTrades] = useState([]);
    const [error, setError] = useState(null);
    const [activePage, setActivePage] = useState(1);
    const [inactivePage, setInactivePage] = useState(1);

    // --- NEW STATE to track which trade is being updated ---
    const [updatingTradeId, setUpdatingTradeId] = useState(null);

    const TRADES_PER_PAGE = 15;

    // --- Extracted fetch function to be reusable ---
    const fetchTrades = useCallback(async () => {
        setError(null);
        try {
            const response = await fetch('/api/admin/trades', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch trades.');
            }
            const data = await response.json();
            setTrades(data);
        } catch (err) {
            setError(err.message);
        }
    }, []);

    useEffect(() => {
        fetchTrades();
    }, [fetchTrades]);

    // --- NEW HANDLER FUNCTION for actions ---
    const handleUpdateTradeStatus = async (tradeId, action) => {
        if (!window.confirm(`Are you sure you want to force-${action} this trade? This action cannot be undone.`)) {
            return;
        }

        setUpdatingTradeId(tradeId);
        try {
            const response = await fetch(`/api/admin/trades/${tradeId}/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Failed to ${action} trade.`);
            }

            alert(`Success: ${data.message}`); // Simple success feedback
            fetchTrades(); // Refetch all trades to get the latest state

        } catch (err) {
            console.error(err);
            alert(`Error: ${err.message}`); // Simple error feedback
        } finally {
            setUpdatingTradeId(null);
        }
    };

    // Filter trades
    const activeTrades = trades.filter(trade => trade.status === 'pending');
    const inactiveTrades = trades.filter(trade =>
        trade.status === 'cancelled' ||
        trade.status === 'rejected' ||
        trade.status === 'accepted' ||
        (trade.expiresAt && new Date(trade.expiresAt) < new Date())
    );

    // Pagination calculations
    const totalActivePages = Math.ceil(activeTrades.length / TRADES_PER_PAGE);
    const currentActiveTrades = activeTrades.slice((activePage - 1) * TRADES_PER_PAGE, activePage * TRADES_PER_PAGE);

    const totalInactivePages = Math.ceil(inactiveTrades.length / TRADES_PER_PAGE);
    const currentInactiveTrades = inactiveTrades.slice((inactivePage - 1) * TRADES_PER_PAGE, inactivePage * TRADES_PER_PAGE);

    useEffect(() => {
        if (activePage > totalActivePages && totalActivePages > 0) setActivePage(totalActivePages);
    }, [activePage, totalActivePages]);

    useEffect(() => {
        if (inactivePage > totalInactivePages && totalInactivePages > 0) setInactivePage(totalInactivePages);
    }, [inactivePage, totalInactivePages]);

    const renderTableRows = (tradeList) => {
        if (tradeList.length === 0) {
            return (
                <tr>
                    <td colSpan="8" className="empty-table-message">No trades found in this category.</td>
                </tr>
            );
        }
        return tradeList.map(trade => {
            const isUpdating = updatingTradeId === trade._id;

            const offeredItemsToDisplay = (trade.offeredItemsSnapshot && trade.offeredItemsSnapshot.length > 0)
                ? trade.offeredItemsSnapshot
                : trade.offeredItems;

            const requestedItemsToDisplay = (trade.requestedItemsSnapshot && trade.requestedItemsSnapshot.length > 0)
                ? trade.requestedItemsSnapshot
                : trade.requestedItems;

            return (
                <tr key={trade._id} className={`status-${trade.status} ${isUpdating ? 'updating' : ''}`}>
                    <td>{trade._id}</td>
                    <td>{new Date(trade.createdAt).toLocaleString()}</td>
                    <td>{trade.sender?.username || 'N/A'}</td>
                    <td>{trade.recipient?.username || 'N/A'}</td>

                    {/* --- UPDATED Items Column --- */}
                    <td className="items-cell">
                        <div className="item-list">
                            <strong>Offered:</strong>
                            {offeredItemsToDisplay && offeredItemsToDisplay.length > 0 ? (
                                offeredItemsToDisplay.map(item => (
                                    <div key={item.originalId} className="item-detail">
                                        {item.name} #{item.mintNumber} <span style={{color: getRarityColor(item.rarity)}}>{item.rarity}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="item-detail-none">None</div>
                            )}
                        </div>
                        <div className="item-list requested-list">
                            <strong>Requested:</strong>
                            {requestedItemsToDisplay && requestedItemsToDisplay.length > 0 ? (
                                requestedItemsToDisplay.map(item => (
                                    <div key={item.originalId} className="item-detail">
                                        {item.name} #{item.mintNumber} <span style={{color: getRarityColor(item.rarity)}}>{item.rarity}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="item-detail-none">None</div>
                            )}
                        </div>
                    </td>

                    <td>{trade.offeredPacks} / {trade.requestedPacks}</td>
                    <td className={`status status-${trade.status}`}>{trade.status}</td>
                    <td>
                        {trade.status === 'pending' ? (
                            <div className="action-buttons">
                                <button disabled={isUpdating} onClick={() => handleUpdateTradeStatus(trade._id, 'accept')} className="btn-accept">Accept</button>
                                <button disabled={isUpdating} onClick={() => handleUpdateTradeStatus(trade._id, 'reject')} className="btn-reject">Reject</button>
                                <button disabled={isUpdating} onClick={() => handleUpdateTradeStatus(trade._id, 'cancel')} className="btn-cancel">Cancel</button>
                            </div>
                        ) : (
                            'N/A'
                        )}
                    </td>
                </tr>
            );
        });
    };

    // Main render...
    return (
        <div className="page">
            <h1>Admin Trades</h1>
            <NavAdmin />

            {error && <div className="error-message section-card">{error}</div>}

            <div className="section-card">
                <h2>Active Trades ({activeTrades.length})</h2>
                <div className="table-container">
                    <table className="events-table">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Date Created</th>
                            <th>Sender</th>
                            <th>Recipient</th>
                            <th>Items (O/R)</th>
                            <th>Packs (O/R)</th>
                            <th>Status</th>
                            <th>Actions</th> {/* <-- NEW COLUMN HEADER */}
                        </tr>
                        </thead>
                        <tbody>
                        {renderTableRows(currentActiveTrades)}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={activePage} totalPages={totalActivePages} onPageChange={setActivePage}/>
            </div>

            <div className="section-card">
                <h2>Completed / Cancelled Trades ({inactiveTrades.length})</h2>
                {/* ... The second table is identical in structure but only needs the "Actions" header ... */}
                <div className="table-container">
                    <table className="events-table">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Date Created</th>
                            <th>Sender</th>
                            <th>Recipient</th>
                            <th>Items (O/R)</th>
                            <th>Packs (O/R)</th>
                            <th>Status</th>
                            <th>Actions</th> {/* <-- NEW COLUMN HEADER */}
                        </tr>
                        </thead>
                        <tbody>
                        {renderTableRows(currentInactiveTrades)}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={inactivePage} totalPages={totalInactivePages} onPageChange={setInactivePage} />
            </div>
        </div>
    );
};

export default AdminTrades;
