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
  const [activeTab, setActiveTab] = useState('incoming');
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

  const handleAction = async (id, action) => {
    const confirmMsg = {
      accept: 'Are you sure you want to accept this trade?',
      reject: 'Are you sure you want to reject this trade?',
      cancel: 'Are you sure you want to cancel this trade?',
    }[action];
    if (!window.confirm(confirmMsg)) return;
    const prev = trades;
    setTrades(prev.filter((t) => t._id !== id));
    try {
      if (action === 'accept') await acceptTrade(id);
      if (action === 'reject') await rejectTrade(id);
      if (action === 'cancel') await cancelTrade(id);
    } catch (err) {
      console.error(`Failed to ${action} trade:`, err);
      setTrades(prev);
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

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const sortFn = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

  const incoming = trades
    .filter((t) => t.recipient._id === user._id)
    .filter((t) => t.sender.username.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort(sortFn);

  const outgoing = trades

    .filter((t) => t.sender._id === user._id)
    .filter((t) => t.recipient.username.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort(sortFn);

  const tradesToShow = activeTab === 'incoming' ? incoming : outgoing;

  const RowActions = ({ trade, isOutgoing }) => (
    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
      {!isOutgoing ? (
        <>
          <button onClick={() => handleAction(trade._id, 'accept')} aria-label={`Accept trade with ${trade.sender.username}`}>Accept</button>
          <button onClick={() => handleCounter(trade)} aria-label={`Counter trade with ${trade.sender.username}`}>Counter</button>
          <button onClick={() => handleAction(trade._id, 'reject')} aria-label={`Reject trade with ${trade.sender.username}`}>Reject</button>
        </>
      ) : (
        <button onClick={() => handleAction(trade._id, 'cancel')} aria-label={`Cancel trade with ${trade.recipient.username}`}>Cancel</button>
      )}
    </div>
  );

  const TradeRow = ({ trade, isOutgoing }) => (
    <tr tabIndex={0} onClick={() => setOpenTrade(trade)}>
      <td><RowActions trade={trade} isOutgoing={isOutgoing} /></td>
      <td className="who">
        <strong>{isOutgoing ? 'you' : trade.sender.username}</strong>
        <span className="arrow">→</span>
        <strong>{isOutgoing ? trade.recipient.username : 'you'}</strong>
      </td>
      <td>
        {trade.offeredItems.slice(0,3).map((i) => (
          <img key={i._id} src={i.imageUrl} alt={i.name} />
        ))}
        {trade.offeredItems.length > 3 && (
          <span className="badge">+{trade.offeredItems.length - 3}</span>
        )}
        {trade.offeredPacks > 0 && <span className="packs">📦{trade.offeredPacks}</span>}
      </td>
      <td>
        {trade.requestedItems.slice(0,3).map((i) => (
          <img key={i._id} src={i.imageUrl} alt={i.name} />
        ))}
        {trade.requestedItems.length > 3 && (
          <span className="badge">+{trade.requestedItems.length - 3}</span>
        )}
        {trade.requestedPacks > 0 && <span className="packs">📦{trade.requestedPacks}</span>}
      </td>
      <td className="age">{timeAgo(trade.createdAt)}</td>
    </tr>
  );

  const MobileCard = ({ trade, isOutgoing }) => (
    <div className="mobile-card" tabIndex={0} onClick={() => setOpenTrade(trade)}>
      <div className="top">
        <span>
          {isOutgoing ? 'you' : trade.sender.username} →{' '}
          {isOutgoing ? trade.recipient.username : 'you'}
        </span>
        <span className="age">{timeAgo(trade.createdAt)}</span>
      </div>
      <div className="preview">
        {trade.offeredItems.slice(0,3).map((i) => (
          <img key={i._id} src={i.imageUrl} alt={i.name} />
        ))}
        <span className="arrow">→</span>
        {trade.requestedItems.slice(0,3).map((i) => (
          <img key={i._id} src={i.imageUrl} alt={i.name} />
        ))}
      </div>
      <div className="actions">
        <RowActions trade={trade} isOutgoing={isOutgoing} />
      </div>
    </div>
  );

  const DetailPanel = ({ trade, isOutgoing }) => (
    <aside className="detail-panel" role="dialog" aria-modal="true">
      <header>
        <h2>Trade Details</h2>
        <button onClick={() => setOpenTrade(null)} aria-label="Close details">✕</button>
      </header>
      <div className="detail-body">
        <section>
          <h3>Offered</h3>
          <div className="card-grid">
            {trade.offeredItems.map((item) => (
              <div key={item._id} className="card-tile">
                <BaseCard name={item.name} image={item.imageUrl} rarity={item.rarity} description={item.flavorText} mintNumber={item.mintNumber} />
              </div>
            ))}
            {trade.offeredPacks > 0 && <div className="pack-tile">📦 {trade.offeredPacks} packs</div>}
          </div>
        </section>
        <section>
          <h3>Requested</h3>
          <div className="card-grid">
            {trade.requestedItems.map((item) => (
              <div key={item._id} className="card-tile">
                <BaseCard name={item.name} image={item.imageUrl} rarity={item.rarity} description={item.flavorText} mintNumber={item.mintNumber} />
              </div>
            ))}
            {trade.requestedPacks > 0 && <div className="pack-tile">📦 {trade.requestedPacks} packs</div>}
          </div>
        </section>
      </div>
      <footer>
        <RowActions trade={trade} isOutgoing={isOutgoing} />
      </footer>
    </aside>
  );

  return (
    <div className="pending-page">
      <header className="page-header">
        <h1>Pending Trades</h1>
        <div className="header-controls">
          <div className="segmented" role="tablist">
            <button role="tab" aria-selected={activeTab === 'incoming'} className={activeTab==='incoming' ? 'active' : ''} onClick={() => setActiveTab('incoming')}>Incoming</button>
            <button role="tab" aria-selected={activeTab === 'outgoing'} className={activeTab==='outgoing' ? 'active' : ''} onClick={() => setActiveTab('outgoing')}>Outgoing</button>
          </div>
          <input type="search" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        
      </header>

      <div className="table-wrapper">
        {tradesToShow.length === 0 ? (
          <p className="no-trades">No pending trades</p>
        ) : !isMobile ? (
          <table className="trade-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Who</th>
                <th>Offer</th>
                <th>Want</th>
                <th className="age">Age</th>
              </tr>
            </thead>
            <tbody>
              {tradesToShow.map((t) => (
                <TradeRow key={t._id} trade={t} isOutgoing={activeTab==='outgoing'} />
              ))}
            </tbody>
          </table>
        ) : (
          tradesToShow.map((t) => (
            <MobileCard key={t._id} trade={t} isOutgoing={activeTab==='outgoing'} />
          ))
        )}
      </div>
      {openTrade && (
        <DetailPanel trade={openTrade} isOutgoing={openTrade.sender._id === user._id} />
      )}
    </div>
  );
};

export default PendingTrades;
