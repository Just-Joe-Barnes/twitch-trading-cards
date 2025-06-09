import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchUserProfile,
  fetchPendingTrades,
  acceptTrade,
  rejectTrade,
  cancelTrade,
} from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import BaseCard from '../components/BaseCard';
import '../styles/PendingTrades.css';

const PendingTrades = () => {
  const [trades, setTrades] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [activeTab, setActiveTab] = useState('incoming');
  const [showFilters, setShowFilters] = useState(false);
  const [openTrade, setOpenTrade] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const profile = await fetchUserProfile();
        setUser(profile);
        const data = await fetchPendingTrades(profile._id);
        setTrades(data);
      } catch (err) {
        console.error('Failed to load trades:', err);
        setError('Failed to load pending trades');
      }
    };
    load();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const refreshTrades = async () => {
    if (!user) return;
    try {
      const data = await fetchPendingTrades(user._id);
      setTrades(data);
    } catch (err) {
      console.error('Failed to refresh trades:', err);
      setError('Failed to refresh trades');
    }
  };

  const handleAction = async (id, action) => {
    const messages = {
      accept: 'Are you sure you want to accept this trade?',
      reject: 'Are you sure you want to reject this trade?',
      cancel: 'Are you sure you want to cancel this trade?',
    };
    if (!window.confirm(messages[action])) return;
    try {
      if (action === 'accept') await acceptTrade(id);
      if (action === 'reject') await rejectTrade(id);
      if (action === 'cancel') await cancelTrade(id);
      refreshTrades();
    } catch (err) {
      console.error(`Failed to ${action} trade:`, err);
      setError(`Failed to ${action} trade`);
    }
  };

  const handleCounter = (trade) => {
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

  if (error) return <div className="error-message">{error}</div>;
  if (!user) return <LoadingSpinner />;

  const pending = trades.filter((t) => t.status === 'pending');

  const sortFn = (a, b) =>
    sortOrder === 'newest'
      ? new Date(b.createdAt) - new Date(a.createdAt)
      : new Date(a.createdAt) - new Date(b.createdAt);

  const incoming = pending
    .filter((t) => t.recipient._id === user._id)
    .filter((t) =>
      t.sender.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort(sortFn);
  const outgoing = pending
    .filter((t) => t.sender._id === user._id)
    .filter((t) =>
      t.recipient.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort(sortFn);

  const tradesToShow = activeTab === 'incoming' ? incoming : outgoing;

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const TradeTile = ({ trade, isOutgoing }) => (
    <div
      className="trade-tile"
      onClick={() => setOpenTrade(trade)}
      role="button"
      tabIndex={0}
    >
      <div className="tile-header">
        <div className="avatar">
          {(isOutgoing ? trade.recipient.username : trade.sender.username)
            .charAt(0)
            .toUpperCase()}
        </div>
        <div className="tile-info">
          <div className="tile-user">
            {isOutgoing ? trade.recipient.username : trade.sender.username}
          </div>
          <div className="tile-age">{timeAgo(trade.createdAt)}</div>
        </div>
        <span className="status-badge">pending</span>
      </div>
      <div className="tile-preview">
        {trade.offeredItems[0] && (
          <img src={trade.offeredItems[0].imageUrl} alt="offered" />
        )}
        <span className="arrow">→</span>
        {trade.requestedItems[0] && (
          <img src={trade.requestedItems[0].imageUrl} alt="requested" />
        )}
      </div>
    </div>
  );

  const MobileTrade = ({ trade, isOutgoing }) => (
    <details className="trade-accordion">
      <summary>
        <div className="tile-header">
          <div className="avatar">
            {(isOutgoing ? trade.recipient.username : trade.sender.username)
              .charAt(0)
              .toUpperCase()}
          </div>
          <div className="tile-info">
            <div className="tile-user">
              {isOutgoing ? trade.recipient.username : trade.sender.username}
            </div>
            <div className="tile-age">{timeAgo(trade.createdAt)}</div>
          </div>
          <span className="status-badge">pending</span>
        </div>
      </summary>
      <div className="accordion-body">
        <TradeDetails trade={trade} isOutgoing={isOutgoing} />
      </div>
    </details>
  );

  const TradeDetails = ({ trade, isOutgoing }) => (
    <div className="trade-details-wrapper">
      <div className="trade-sides">
        <div className="trade-side">
          <h3>Offered</h3>
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
          <span className="packs-chip">
            {trade.offeredPacks} pack{trade.offeredPacks !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="trade-side">
          <h3>Requested</h3>
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
          <span className="packs-chip">
            {trade.requestedPacks} pack{trade.requestedPacks !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="trade-actions">
        {!isOutgoing ? (
          <>
            <button
              className="accept-button"
              onClick={() => handleAction(trade._id, 'accept')}
            >
              Accept
            </button>
            <button
              className="reject-button"
              onClick={() => handleAction(trade._id, 'reject')}
            >
              Reject
            </button>
            <button
              className="counter-button"
              onClick={() => handleCounter(trade)}
            >
              Counter
            </button>
          </>
        ) : (
          <button
            className="cancel-button"
            onClick={() => handleAction(trade._id, 'cancel')}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  const TradeModal = ({ trade, isOutgoing }) => (
    <div className="modal-overlay" onClick={() => setOpenTrade(null)}>
      <div className="trade-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setOpenTrade(null)}>
          ✕
        </button>
        <TradeDetails trade={trade} isOutgoing={isOutgoing} />
      </div>
    </div>
  );

  return (
    <div className="pending-trades-page">
      <h1 className="page-title">Pending Trades</h1>

      <div className="trade-tabs">
        <button
          className={activeTab === 'incoming' ? 'active' : ''}
          onClick={() => setActiveTab('incoming')}
        >
          Incoming
        </button>
        <button
          className={activeTab === 'outgoing' ? 'active' : ''}
          onClick={() => setActiveTab('outgoing')}
        >
          Outgoing
        </button>
      </div>

      <div className="filters-bar">
        <button
          className="toggle-filters"
          onClick={() => setShowFilters((p) => !p)}
        >
          Filters
        </button>
        {showFilters && (
          <div className="filters-panel">
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        )}
      </div>

      {!isMobile && (
        <div className="trades-grid">
          {tradesToShow.length === 0 ? (
            <p className="no-trades">No trades.</p>
          ) : (
            tradesToShow.map((t) => (
              <TradeTile
                key={t._id}
                trade={t}
                isOutgoing={activeTab === 'outgoing'}
              />
            ))
          )}
        </div>
      )}

      {isMobile && (
        <div className="trade-accordions">
          {tradesToShow.length === 0 ? (
            <p className="no-trades">No trades.</p>
          ) : (
            tradesToShow.map((t) => (
              <MobileTrade
                key={t._id}
                trade={t}
                isOutgoing={activeTab === 'outgoing'}
              />
            ))
          )}
        </div>
      )}

      {openTrade && (
        <TradeModal
          trade={openTrade}
          isOutgoing={openTrade.sender._id === user._id}
        />
      )}
    </div>
  );
};

export default PendingTrades;
