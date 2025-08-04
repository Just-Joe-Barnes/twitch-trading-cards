import React from 'react';
import { rarities } from 'constants/rarities';

const RarityKey = () => {
  return (
      <div className="section-card">
          <div className="rarity-key">
              {rarities.map((r) => (
                  <div key={r.name} className={`rarity-item ${r.name}`} style={{"--item-color": r.color}}>
                      <span className="rarity-text">{r.name}</span>
                  </div>
              ))}
          </div>
      </div>
  );
};

export default RarityKey;
