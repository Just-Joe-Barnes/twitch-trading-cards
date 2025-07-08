import React, { useEffect, useRef, useState } from 'react';
import BaseCard from './BaseCard';
import { FaStar, FaRegStar } from 'react-icons/fa';
import '../styles/CardInspector.css';

const CardInspector = ({ card, onClose }) => {
  const inspectorRef = useRef(null);
  const [localFeatured, setLocalFeatured] = useState(card?.isFeatured ?? false);

  useEffect(() => {
    if (!card) return;
    const updateScale = () => {
      const root = getComputedStyle(document.documentElement);
      const cardHeight = parseFloat(root.getPropertyValue('--card-height')) || 450;
      const cardWidth = parseFloat(root.getPropertyValue('--card-width')) || 300;
      const fitHeight = (window.innerHeight * 0.9) / cardHeight;
      const fitWidth = (window.innerWidth * 0.9) / cardWidth;
      if (inspectorRef.current) {
        inspectorRef.current.style.setProperty('--fit-height', fitHeight);
        inspectorRef.current.style.setProperty('--fit-width', fitWidth);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [card]);

  if (!card) return null;
  const {
    name,
    image,
    description,
    rarity,
    mintNumber,
    modifier,
    isFeatured = false,
    isOwner = false,
    onToggleFeatured,
  } = card;
  useEffect(() => {
    setLocalFeatured(card?.isFeatured ?? false);
  }, [card]);

  return (
    <div className="card-inspector-overlay" onClick={onClose}>
      {isOwner && (
        <button
          className={`card-inspector-feature-btn ${localFeatured ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            const newState = !localFeatured;
            setLocalFeatured(newState);
            onToggleFeatured?.(card);
          }}
          title={localFeatured ? 'Remove from featured' : 'Add to featured'}
        >
          {localFeatured ? <FaStar /> : <FaRegStar />}
          {localFeatured ? ' Unfeature' : ' Feature'}
        </button>
      )}
      <div
        className="card-inspector"
        ref={inspectorRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-inspector-card-wrapper">
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
    </div>
  );
};

export default CardInspector;
