import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserProfile, fetchPendingTrades, acceptTrade, rejectTrade, cancelTrade } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import BaseCard from '../components/BaseCard';
import '../styles/PendingTrades.css';

const PendingTrades = () => {
  const [trades, setTrades] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
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
      if (action === 'accept') await acceptTrade(id, user._id);
      if (action === 'reject') await rejectTrade(id, user._id);
      if (action === 'cancel') await cancelTrade(id, user._id);
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
    .filter((t) => t.sender.username.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort(sortFn);
  const outgoing = pending
    .filter((t) => t.sender._id === user._id)
    .filter((t) => t.recipient.username.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort(sortFn);

  const TradeCard = ({ trade, isOutgoing }) => (
    <div className={`trade-card ${isOutgoing ? 'outgoing' : 'incoming'}`}>
      <div className="trade-header">
        <div className="trade-title">
          {isOutgoing ? 'To' : 'From'}{' '}
          <span>{isOutgoing ? trade.recipient.username : trade.sender.username}</span>
        </div>
        <div className="trade-buttons-inline">
          {!isOutgoing ? (
            <>
              <button className="accept-button" onClick={() => handleAction(trade._id, 'accept')}>
                Accept
              </button>
              <button className="reject-button" onClick={() => handleAction(trade._id, 'reject')}>
                Reject
              </button>
              <button className="counter-button" onClick={() => handleCounter(trade)}>
                Counter
              </button>
            </>
          ) : (
            <button className="cancel-button" onClick={() => handleAction(trade._id, 'cancel')}>
              Cancel
            </button>
          )}
        </div>
      </div>
      <div className="trade-body">
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
        <div className="trade-arrow">for</div>
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
      <div className="trade-timestamp">
        Created on: {new Date(trade.createdAt).toLocaleString()}
      </div>
    </div>
  );

  return (
    <div className="pending-trades-container">
      <h1 className="page-title">Pending Trades</h1>

      <div className="filters">
        <input
          type="text"
          placeholder="Search by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-box"
        />
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="sort-dropdown">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      <div className="pending-section">
        <h2>Incoming Trades</h2>
        {incoming.length === 0 ? (
          <p className="no-trades">No incoming trades.</p>
        ) : (
          <div className="trades-list">
            {incoming.map((t) => (
              <TradeCard key={t._id} trade={t} isOutgoing={false} />
            ))}
          </div>
        )}
      </div>

      <div className="pending-section">
        <h2>Outgoing Trades</h2>
        {outgoing.length === 0 ? (
          <p className="no-trades">No outgoing trades.</p>
        ) : (
          <div className="trades-list">
            {outgoing.map((t) => (
              <TradeCard key={t._id} trade={t} isOutgoing={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingTrades;
