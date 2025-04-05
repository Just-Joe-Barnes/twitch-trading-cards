import React, { useState } from 'react';
import TradingPage from './TradingPage';
import PendingTrades from './PendingTrades';
import '../styles/TradingPage.css';
import '../styles/PendingTrades.css';
import '../styles/TradingDashboard.css';

const TradingDashboard = () => {
  const [activeTab, setActiveTab] = useState('pending');

  return (
    <div className="trading-dashboard-container">
      <h1>Trading Dashboard</h1>
      <div className="tab-buttons">
        <button
          className={activeTab === 'pending' ? 'active' : ''}
          onClick={() => setActiveTab('pending')}
        >
          My Pending Trades
        </button>
        <button
          className={activeTab === 'create' ? 'active' : ''}
          onClick={() => setActiveTab('create')}
        >
          Create New Trade
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'pending' && <PendingTrades />}
        {activeTab === 'create' && <TradingPage />}
      </div>
    </div>
  );
};

export default TradingDashboard;
