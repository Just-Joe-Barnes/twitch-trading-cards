import React, {useEffect, useState, useMemo, useCallback, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import {
    fetchUserProfile,
    fetchPendingTrades,
    fetchTrades,
    acceptTrade,
    rejectTrade,
    cancelTrade,
} from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import BaseCard from '../components/BaseCard';
import '../styles/PendingTrades.css';
import {rarities} from '../constants/rarities';

const PendingTrades = () => {
    const [pendingTrades, setPendingTrades] = useState([]);
    const [completedTrades, setCompletedTrades] = useState([]);
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('incoming');
    const [openTrade, setOpenTrade] = useState(null);
    const [panelOpen, setPanelOpen] = useState(false);

    const navigate = useNavigate();
    const detailPanelRef = useRef(null);

    useEffect(() => {
        if (!panelOpen && openTrade) {
            const t = setTimeout(() => setOpenTrade(null), 300);
            return () => clearTimeout(t);
        }
    }, [panelOpen, openTrade]);

    useEffect(() => {
        if (openTrade) {
            requestAnimationFrame(() => setPanelOpen(true));
        }
    }, [openTrade]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                const inspectorIsOpen = document.querySelector('.card-inspector-overlay');
                if (!inspectorIsOpen) {
                    setPanelOpen(false);
                }
            }
        };

        if (panelOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [panelOpen]);

    useEffect(() => {
        const loadTrades = async () => {
            try {
                const profile = await fetchUserProfile();
                setUser(profile);

                const pending = await fetchPendingTrades(profile._id);
                setPendingTrades(pending);

                const all = await fetchTrades(profile._id);
                setCompletedTrades(all.filter(t => t.status !== 'pending'));

            } catch (err)
            {
                console.error('Failed to load trades:', err);
                setError('Failed to load trades');
            }
        };
        loadTrades();
    }, []);

    const {incomingTrades, outgoingTrades, completedHistory} = useMemo(() => {
        if (!user) {
            return {incomingTrades: [], outgoingTrades: [], completedHistory: []};
        }

        const sortFn = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

        const incoming = pendingTrades
            .filter((t) => t.recipient?.username === user.username)
            .sort(sortFn);

        const outgoing = pendingTrades
            .filter((t) => t.sender?.username === user.username)
            .sort(sortFn);

        const completed = completedTrades.sort(sortFn);

        return {
            incomingTrades: incoming,
            outgoingTrades: outgoing,
            completedHistory: completed,
        };
    }, [pendingTrades, completedTrades, user]);

    const filteredTradesToShow = useMemo(() => {
        const query = searchQuery.toLowerCase();
        let sourceTrades;

        if (activeTab === 'incoming') {
            sourceTrades = incomingTrades;
        } else if (activeTab === 'outgoing') {
            sourceTrades = outgoingTrades;
        } else {
            sourceTrades = completedHistory;
        }

        if (!query) {
            return sourceTrades;
        }

        return sourceTrades.filter((t) =>
            (t.sender?.username || '').toLowerCase().includes(query) ||
            (t.recipient?.username || '').toLowerCase().includes(query)
        );
    }, [searchQuery, activeTab, incomingTrades, outgoingTrades, completedHistory]);

    const handleAction = useCallback(async (id, action) => {
        const confirmMsg = {
            accept: 'Are you sure you want to accept this trade?',
            reject: 'Are you sure you want to reject this trade?',
            cancel: 'Are you sure you want to cancel this trade?',
        }[action];

        if (!window.confirm(confirmMsg)) return;
        setPendingTrades(prev => prev.filter((t) => t._id !== id));
        setPanelOpen(false);

        try {
            if (action === 'accept') {
                await acceptTrade(id);
            } else if (action === 'reject') {
                await rejectTrade(id);
            } else if (action === 'cancel') {
                await cancelTrade(id);
            }
            const updatedPending = await fetchPendingTrades(user._id);
            setPendingTrades(updatedPending);
            const updatedAll = await fetchTrades(user._id);
            setCompletedTrades(updatedAll.filter(t => t.status !== 'pending'));

        } catch (err) {
            console.error(`Failed to ${action} trade:`, err);
            setError(`Failed to ${action} trade.`);
            const currentPending = await fetchPendingTrades(user._id);
            setPendingTrades(currentPending);
            const currentAll = await fetchTrades(user._id);
            setCompletedTrades(currentAll.filter(t => t.status !== 'pending'));
        }
    }, [user]);

    const senderName = useCallback((trade) => trade.sender?.username || 'Unknown', []);
    const recipientName = useCallback((trade) => trade.recipient?.username || 'Unknown', []);

    const handleCounter = useCallback((trade) => {
        navigate('/trading', {
            state: {
                counterOffer: {
                    tradeId: trade._id,
                    selectedUser: senderName(trade),
                    tradeOffer: trade.requestedItems,
                    tradeRequest: trade.offeredItems,
                    offeredPacks: trade.requestedPacks,
                    requestedPacks: trade.offeredPacks,
                },
            },
        });
    }, [navigate, senderName]);

    const handleRowClick = useCallback((trade) => {
        if (openTrade && openTrade._id === trade._id) {
            setPanelOpen(false);
        } else {
            setPanelOpen(false);
            setTimeout(() => setOpenTrade(trade), panelOpen ? 300 : 0);
        }
    }, [openTrade, panelOpen]);

    const timeAgo = useCallback((date) => {
        const diff = Math.floor((Date.now() - new Date(date)) / 1000);
        if (diff < 60) return `${diff}s`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}d`;
    }, []);

    const offerSummary = useCallback((items, packs) => {
        if (items.length === 0 && packs === 0) return 'Nothing';
        if (items.length === 0) return `${packs} packs`;
        const first = items[0];
        const extras = items.length - 1;
        const rarityColor = rarities.find(r => r.name.toLowerCase() === first.rarity.toLowerCase())?.color ?? 'inherit';
        return (
            <span>
                {first.name} <span style={{color: rarityColor}}>{first.rarity}</span>
                {extras > 0 && ` +${extras} more`}
                {packs > 0 && ` + ${packs} packs`}
            </span>
        );
    }, []);

    if (error) return <div className="error-message">{error}</div>;
    if (!user) return <LoadingSpinner/>;

    const RowActions = ({trade, isOutgoing, hideLabels = false}) => (
        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
            {!isOutgoing ? (
                <div className={`button-group ${hideLabels ? 'icons' : ''}`}>
                    <button className="primary-button" onClick={() => handleAction(trade._id, 'accept')}
                            {...(hideLabels ? { 'data-tooltip': 'Accept trade' } : {})}
                            aria-label={`Accept trade with ${senderName(trade)}`}>
                        <i className="fa-regular fa-thumbs-up fa-fw" /> {!hideLabels && 'Accept trade'}
                    </button>
                    <button className="secondary-button" onClick={() => handleCounter(trade)}
                            {...(hideLabels ? { 'data-tooltip': 'Counter offer' } : {})}
                            aria-label={`Counter trade with ${senderName(trade)}`}>
                        <i className="fa-regular fa-recycle fa-fw" /> {!hideLabels && 'Counter offer'}
                    </button>
                    <button className="reject-button" onClick={() => handleAction(trade._id, 'reject')}
                            {...(hideLabels ? { 'data-tooltip': 'Reject trade' } : {})}
                            aria-label={`Reject trade with ${senderName(trade)}`}>
                        <i className="fa-regular fa-thumbs-down fa-fw" /> {!hideLabels && 'Reject trade'}
                    </button>
                </div>
            ) : (
                <button onClick={() => handleAction(trade._id, 'cancel')}
                        aria-label={`Cancel trade with ${recipientName(trade)}`}>Cancel</button>
            )}
        </div>
    );

    const TradeCard = ({trade, isOutgoing, isHistory = false}) => (
        <div
            className="trade-card"
            tabIndex={0}
            onClick={() => handleRowClick(trade)}
        >
            <div className="users">
                <div className="sender">
                    {trade.sender?.username === user.username ? 'You' : trade.sender?.username}
                </div>
                <div>→</div>
                <div className="recipient">{trade.recipient?.username === user.username ? 'You' : trade.recipient?.username}</div>
                <span className="age">{timeAgo(trade.createdAt)}</span>
            </div>
            <div className="preview">
                {offerSummary(trade.offeredItems, trade.offeredPacks)}
                <span className="arrow">→</span>
                {offerSummary(trade.requestedItems, trade.requestedPacks)}
            </div>
            <div className="actions">
                {isHistory ? (
                    <div className="status">Status: {trade.status}</div>
                ) : (
                    <RowActions trade={trade} isOutgoing={isOutgoing} hideLabels={true}/>
                )}
            </div>
        </div>
    );

    const DetailPanel = ({trade, isOutgoing, open, showActions = true}) => (
        <aside
            className={`detail-panel ${open ? 'open' : ''}`}
            role="dialog"
            aria-modal="true"
            ref={detailPanelRef}
        >
            <h1>Trade Details</h1>
            <button className="close-button" onClick={() => setPanelOpen(false)} aria-label="Close panel">✕</button>
            <div className="detail-body">
                <section>
                    <h3>Offered by {isOutgoing ? 'you' : senderName(trade)}</h3>
                    {trade.offeredPacks > 0 && (
                        <p className="pack-count">{trade.offeredPacks} packs offered</p>
                    )}
                    <div className="cards-grid mini">
                        {trade.offeredItems.length > 0 ? (
                            trade.offeredItems.map((item) => (
                                <BaseCard
                                    key={item._id}
                                    name={item.name}
                                    image={item.imageUrl}
                                    rarity={item.rarity}
                                    description={item.flavorText}
                                    mintNumber={item.mintNumber}
                                    modifier={item.modifier}
                                    miniCard={true}
                                />
                            ))
                        ) : (
                            <p>No cards offered.</p>
                        )}
                    </div>
                </section>
                <hr />
                <section>
                    <h3>Requested from {isOutgoing ? recipientName(trade) : 'you'}</h3>
                    {trade.requestedPacks > 0 && (
                        <p className="pack-count">{trade.requestedPacks} packs requested</p>
                    )}
                    <div className="cards-grid mini">
                        {trade.requestedItems.length > 0 ? (
                            trade.requestedItems.map((item) => (
                                <BaseCard
                                    key={item._id}
                                    name={item.name}
                                    image={item.imageUrl}
                                    rarity={item.rarity}
                                    description={item.flavorText}
                                    mintNumber={item.mintNumber}
                                    modifier={item.modifier}
                                    miniCard={true}
                                />
                            ))
                        ) : (
                            <p>No cards requested.</p>
                        )}
                    </div>
                </section>
            </div>
            <footer>
                {trade.status !== 'pending' && (
                    <h2>Status: {trade.status}</h2>
                )}
                {showActions && (
                    <RowActions trade={trade} isOutgoing={isOutgoing}/>
                )}
            </footer>
        </aside>
    );

    return (
        <div className="page">
            <h1>View Trades</h1>
            <div className="section-card">
                <div className="header-controls">
                    <div className="button-group" role="tablist">
                        <input type="search" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
                        <button role="tab" aria-selected={activeTab === 'incoming'} className={activeTab === 'incoming' ? 'active' : ''} onClick={() => setActiveTab('incoming')}>
                            <i className="fa-regular fa-arrow-down" /> Incoming
                        </button>
                        <button role="tab" aria-selected={activeTab === 'outgoing'} className={activeTab === 'outgoing' ? 'active' : ''} onClick={() => setActiveTab('outgoing')}>
                            <i className="fa-regular fa-arrow-up" /> Outgoing
                        </button>
                        <button role="tab" aria-selected={activeTab === 'completed'} className={activeTab === 'completed' ? 'active' : ''} onClick={() => setActiveTab('completed')}>
                            <i className="fa-regular fa-check" /> Completed
                        </button>
                    </div>
                </div>
            </div>
            <div className="trade-list-cards">
                {filteredTradesToShow.length === 0 ? (
                    <p className="no-trades">No {activeTab === 'completed' ? 'completed' : 'pending'} trades</p>
                ) : (
                    filteredTradesToShow.map((t) => (
                        <TradeCard
                            key={t._id}
                            trade={t}
                            isOutgoing={activeTab === 'outgoing'}
                            isHistory={activeTab === 'completed'}
                        />
                    ))
                )}
            </div>
            {openTrade && (
                <>
                    <div className={`detail-panel-overlay ${panelOpen ? 'open' : ''}`} onClick={() => setPanelOpen(false)}></div>
                    <DetailPanel
                        trade={openTrade}
                        isOutgoing={openTrade.sender?.username === user.username}
                        open={panelOpen}
                        showActions={activeTab !== 'completed'}
                    />
                </>
            )}
        </div>
    );
};

export default PendingTrades;
