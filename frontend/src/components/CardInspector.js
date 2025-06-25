import React from 'react';
import BaseCard from './BaseCard';
import '../styles/CardInspector.css';

const CardInspector = ({ card, onClose }) => {
  if (!card) return null;
  const { name, image, description, rarity, mintNumber, modifier } = card;
  return (
    <div className="card-inspector-overlay" onClick={onClose}>
      <div className="card-inspector" onClick={(e) => e.stopPropagation()}>
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
