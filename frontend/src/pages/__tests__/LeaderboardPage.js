import React, { useState } from 'react';
import '../../styles/LeaderboardPage.css';

const mockLeaderboardData = {
    champions: {
        collectionScore: { username: 'CardShark', value: 185200, profilePic: '/images/defaultProfile.png' },
        unopenedPacks: { username: 'TheHoarder', value: 542, profilePic: '/images/defaultProfile.png' },
        completedTrades: { username: 'BigTrader', value: 1245, profilePic: '/images/defaultProfile.png' },
        divineCards: { username: 'GildedOne', value: 7, profilePic: '/images/defaultProfile.png' },
    },
    rankings: {
        collectionScore: [
            { rank: 1, username: 'CardShark', value: 185200 },
            { rank: 2, username: 'GildedOne', value: 179500 },
            { rank: 3, username: 'CollectorSupreme', value: 161300 },
            { rank: 4, username: 'MintCondition', value: 158900 },
            { rank: 5, username: 'VaultDweller', value: 145000 },
            { rank: 6, username: 'RareHunter', value: 132100 },
            { rank: 7, username: 'DeckMaster', value: 128700 },
            { rank: 8, username: 'ItchyBeard', value: 112300 },
            { rank: 9, username: 'TheProfessor', value: 109800 },
            { rank: 10, username: 'HighRoller', value: 101400 },
        ],
        unopenedPacks: [
            { rank: 1, username: 'TheHoarder', value: 542 },
            { rank: 2, username: 'PackRat', value: 499 },
            { rank: 3, username: 'VaultDweller', value: 350 },
            { rank: 4, username: 'DragonSleeve', value: 312 },
            { rank: 5, username: 'CardShark', value: 280 },
        ],
        completedTrades: [
            { rank: 1, username: 'BigTrader', value: 1245 },
            { rank: 2, username: 'TheBroker', value: 1180 },
            { rank: 3, username: 'MarketMover', value: 954 },
            { rank: 4, username: 'SwapKing', value: 899 },
            { rank: 5, username: 'DealMaker', value: 750 },
        ],
        divineCards: [
            { rank: 1, username: 'GildedOne', value: 7 },
            { rank: 2, username: 'CardShark', value: 6 },
            { rank: 3, username: 'MythicHunter', value: 5 },
        ]
    },
};

const ChampionCard = ({ title, icon, user }) => (
    <div className="champion-card">
        <div className="champion-header">
            <h3>{title}</h3>
            <i className={`fa-solid ${icon}`}></i>
        </div>
        <div className="champion-body">
            <img src={user.profilePic || '/images/defaultProfile.png'} alt={user.username} className="champion-pic" />
            <span className="champion-name"><a href={'/profile/' + user.username} className="champion-link">{user.username}</a></span>
            <span className="champion-value">{user.value.toLocaleString()}</span>
        </div>
    </div>
);

const LeaderboardPage = () => {
    const [activeCategory, setActiveCategory] = useState('collectionScore');

    const categories = [
        { key: 'collectionScore', name: 'Collection Score' },
        { key: 'unopenedPacks', name: 'Unopened Packs' },
        { key: 'completedTrades', name: 'Completed Trades' },
        { key: 'divineCards', name: 'Divine Cards' },
    ];

    return (
        <div className="page">
            <h1>Leaderboards</h1>

            <div className="section-card">
                <h2>Reigning Champions</h2>
                <div className="champions-grid">
                    <ChampionCard title="The Collector" icon="fa-layer-group" user={mockLeaderboardData.champions.collectionScore} />
                    <ChampionCard title="The Hoarder" icon="fa-box-archive" user={mockLeaderboardData.champions.unopenedPacks} />
                    <ChampionCard title="The Merchant" icon="fa-handshake" user={mockLeaderboardData.champions.completedTrades} />
                    <ChampionCard title="The Specialist" icon="fa-wand-sparkles" user={mockLeaderboardData.champions.divineCards} />
                </div>
            </div>

            <div className="section-card">
                <h2>Top Player Rankings</h2>
                <div className="leaderboard-toggle">
                    {categories.map(cat => (
                        <button
                            key={cat.key}
                            className={`secondary-button ${activeCategory === cat.key ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat.key)}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
                <table className="leaderboard-table">
                    <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Username</th>
                        <th>{categories.find(c => c.key === activeCategory)?.name}</th>
                    </tr>
                    </thead>
                    <tbody>
                    {mockLeaderboardData.rankings[activeCategory].map(player => (
                        <tr key={player.rank}>
                            <td className="rank-cell">{player.rank}</td>
                            <td><a href={'/profile/' + player.username}>{player.username}</a></td>
                            <td>{player.value.toLocaleString()}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LeaderboardPage;
