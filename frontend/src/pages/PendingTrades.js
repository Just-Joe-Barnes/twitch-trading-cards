import React, { useEffect, useRef, useState } from 'react';
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
  const [statusFilters, setStatusFilters] = useState({
    pending: true,
    countered: true,
    expired: true,
  });
  const [typeFilters, setTypeFilters] = useState({
    Creature: true,
    Spell: true,
    Artifact: true,
  });
  const [openTrade, setOpenTrade] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const sidebarRef = useRef(null);
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

  useEffect(() => {
    if (!showFilters) return;
    const firstInput = sidebarRef.current?.querySelector('input, select, button');
    firstInput?.focus();
    const handleKey = (e) => {
      if (e.key === 'Escape') setShowFilters(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showFilters]);

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

  const visibleStatuses = Object.keys(statusFilters).filter(
    (k) => statusFilters[k]
  );
  const pending = trades.filter((t) => visibleStatuses.includes(t.status));

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
    <article
      className="trade-card"
      onClick={() => setOpenTrade(trade)}
      tabIndex={0}
    >
      <header className="card-head">
        <div className="avatar">
          {(isOutgoing ? trade.recipient.username : trade.sender.username)
            .charAt(0)
            .toUpperCase()}
        </div>
        <div className="card-meta">
          <span className="user-name">
            {isOutgoing ? trade.recipient.username : trade.sender.username}
          </span>
          <span className="badge">Pending</span>
        </div>
      </header>
      <div className="preview">
        {trade.offeredItems[0] && (
          <img src={trade.offeredItems[0].imageUrl} alt="offered" />
        )}
        <span className="arrow">→</span>
        {trade.requestedItems[0] && (
          <img src={trade.requestedItems[0].imageUrl} alt="requested" />
        )}
      </div>
      <footer className="card-foot">{timeAgo(trade.createdAt)}</footer>
    </article>
  );

  const MobileTrade = ({ trade, isOutgoing }) => (
    <details className="trade-accordion">
      <summary>
        <div className="mobile-head">
          <div className="avatar">
            {(isOutgoing ? trade.recipient.username : trade.sender.username)
              .charAt(0)
              .toUpperCase()}
          </div>
          <span className="user-name">
            {isOutgoing ? trade.recipient.username : trade.sender.username}
          </span>
          <span className="badge">Pending</span>
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
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trade-dialog-title"
      onClick={() => setOpenTrade(null)}
    >
      <div className="trade-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div className="avatar">
            {(isOutgoing ? trade.recipient.username : trade.sender.username)
              .charAt(0)
              .toUpperCase()}
          </div>
          <div className="modal-meta">
            <h2 id="trade-dialog-title">
              {isOutgoing ? trade.recipient.username : trade.sender.username}
            </h2>
            <span className="modal-age">Sent {timeAgo(trade.createdAt)}</span>
          </div>
          <button
            className="modal-close"
            onClick={() => setOpenTrade(null)}
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div className="modal-body">
          <section>
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
              <span className="packs-chip">
                {trade.offeredPacks} pack{trade.offeredPacks !== 1 ? 's' : ''}
              </span>
            </div>
          </section>
          <section>
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
              <span className="packs-chip">
                {trade.requestedPacks} pack{trade.requestedPacks !== 1 ? 's' : ''}
              </span>
            </div>
          </section>
        </div>
        <div className="modal-actions">
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
    </div>
  );

  return (
    <div className="pending-trades-page">
      <header className="pending-header">
        <h1 id="page-title" className="page-title">Pending Trades</h1>
        <div role="tablist" aria-label="Pending trades" className="trade-tabs">
          <button
            role="tab"
            id="tab-in"
            aria-controls="panel-in"
            aria-selected={activeTab === 'incoming'}
            className={activeTab === 'incoming' ? 'active' : ''}
            onClick={() => setActiveTab('incoming')}
          >
            Incoming
          </button>
          <button
            role="tab"
            id="tab-out"
            aria-controls="panel-out"
            aria-selected={activeTab === 'outgoing'}
            className={activeTab === 'outgoing' ? 'active' : ''}
            onClick={() => setActiveTab('outgoing')}
          >
            Outgoing
          </button>
        </div>
        <button
          className="open-filters"
          onClick={() => setShowFilters(true)}
        >
          Filters
        </button>
      </header>

      {showFilters && (
        <>
          <div
            className="filters-overlay"
            onClick={() => setShowFilters(false)}
          />
          <aside
            className="filters-sidebar"
            ref={sidebarRef}
            role="dialog"
            aria-label="Trade filters"
          >
            <button
              className="close-filters"
              onClick={() => setShowFilters(false)}
              aria-label="Close filters"
            >
              ✕
            </button>
            <label htmlFor="filter-user" className="sr-only">
              Filter by user
            </label>
            <input
              id="filter-user"
              type="search"
              placeholder="Username…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <label htmlFor="filter-sort" className="sr-only">
              Sort
            </label>
            <select
              id="filter-sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="newest">Date (newest)</option>
              <option value="oldest">Date (oldest)</option>
              <option value="rarity">Rarity</option>
            </select>
            <fieldset>
              <legend>Status</legend>
              {['pending', 'countered', 'expired'].map((s) => (
                <label key={s}>
                  <input
                    type="checkbox"
                    checked={statusFilters[s]}
                    onChange={(e) =>
                      setStatusFilters({
                        ...statusFilters,
                        [s]: e.target.checked,
                      })
                    }
                  />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Card type</legend>
              {Object.keys(typeFilters).map((t) => (
                <label key={t}>
                  <input
                    type="checkbox"
                    checked={typeFilters[t]}
                    onChange={(e) =>
                      setTypeFilters({
                        ...typeFilters,
                        [t]: e.target.checked,
                      })
                    }
                  />
                  {t}
                </label>
              ))}
            </fieldset>
          </aside>
        </>
      )}

      {!isMobile && (
        <div
          className="trades-grid"
          role="tabpanel"
          id={activeTab === 'incoming' ? 'panel-in' : 'panel-out'}
          aria-labelledby={activeTab === 'incoming' ? 'tab-in' : 'tab-out'}
        >
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
        <div
          className="trade-accordions"
          role="tabpanel"
          id={activeTab === 'incoming' ? 'panel-in' : 'panel-out'}
          aria-labelledby={activeTab === 'incoming' ? 'tab-in' : 'tab-out'}
        >
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
