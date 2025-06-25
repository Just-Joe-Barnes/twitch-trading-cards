import React, { useEffect, useState } from 'react';
import BaseCard from './BaseCard';
import '../styles/CardInspector.css';

const CardInspector = ({ card, onClose }) => {
  const [userScale, setUserScale] = useState(1);
  useEffect(() => {
    const stored = localStorage.getItem('cardScale');
    if (stored) {
      const value = parseFloat(stored);
      if (!Number.isNaN(value)) setUserScale(value);
    }
  }, []);

  if (!card) return null;
  const { name, image, description, rarity, mintNumber, modifier } = card;
  return (
    <div className="card-inspector-overlay" onClick={onClose}>
      <div
        className="card-inspector"
        style={{ '--user-scale': userScale }}
        onClick={(e) => e.stopPropagation()}
      >
        <BaseCard
          name={name}
          image={image}
          description={description}
          rarity={rarity}
          mintNumber={mintNumber}
          modifier={modifier}
          inspectOnClick={false}
          interactive={true}
        />
      </div>
    </div>
  );
};

export default CardInspector;
