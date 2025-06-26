import React, { useEffect, useRef, useState } from 'react';
import BaseCard from './BaseCard';
import '../styles/CardInspector.css';

const ANIMATION_DURATION = 500; // ms

const CardInspector = ({ card, onClose }) => {
  const inspectorRef = useRef(null);
  const [closing, setClosing] = useState(false);

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

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, ANIMATION_DURATION);
  };

  if (!card) return null;
  const { name, image, description, rarity, mintNumber, modifier } = card;
  return (
    <div className={`card-inspector-overlay${closing ? ' closing' : ''}`} onClick={handleClose}>
      <div
        className={`card-inspector${closing ? ' closing' : ''}`}
        ref={inspectorRef}
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
