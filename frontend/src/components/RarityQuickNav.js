import React from 'react';
import { getRarityColor } from '../constants/rarities';

const RarityQuickNav = ({ rarityData, onNavClick }) => {
    return (
        <aside className="quick-nav-sidebar">
            <ul>
                {rarityData.map(({ rarity, totalCount }) => (
                    <li key={rarity}>
                        <div
                            className={`nav-link ${rarity.toLowerCase()}`}
                            onClick={() => onNavClick(rarity)}
                            style={{
                                color: getRarityColor(rarity),
                                borderLeftColor: getRarityColor(rarity),
                            }}
                        >
                            {rarity}
                            <span className="nav-link-count">({totalCount})</span>
                        </div>
                    </li>
                ))}
            </ul>
        </aside>
    );
};

export default RarityQuickNav;
