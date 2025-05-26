import React, { useRef, useEffect } from 'react';
import '../styles/CardComponent.css';

const BaseCard = ({
  name,
  image,
  description,
  rarity = 'common',
  mintNumber,
  draggable,
  onDragStart,
  onDoubleClick,
}) => {
  const cardRef = useRef(null);
  const descriptionRef = useRef(null);

  // Auto-shrink description text to fit
  useEffect(() => {
    const desc = descriptionRef.current;
    if (!desc) return;
    desc.style.fontSize = '0.9rem';
    let size = 0.9;
    while (desc.scrollHeight > desc.clientHeight && size > 0.6) {
      size -= 0.05;
      desc.style.fontSize = `${size}rem`;
    }
  }, [description]);

  // ── UNIQUE THREE-BAND INVERT EFFECT ──
  useEffect(() => {
    if (!cardRef.current || rarity.toLowerCase() !== 'unique') return;
    const artwork = cardRef.current.querySelector('.card-artwork');
    const overlay = cardRef.current.querySelector('.invert-band-overlay');
    if (!artwork || !overlay) return;

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const updateMask = e => {
      const { left, width } = artwork.getBoundingClientRect();
      const pct = ((e.clientX - left) / width) * 100;
      const bandW = 8, edge = 5, spread = 27;

      const centers = [
        clamp(pct, 0, 100),
        clamp(pct - spread, 0, 100),
        clamp(pct + spread, 0, 100),
      ];

      const stops = c => `
        transparent ${c - bandW - edge}%,
        white ${c - bandW}%,
        white ${c + bandW}%,
        transparent ${c + bandW + edge}%`;

      overlay.style.webkitMaskImage =
      overlay.style.maskImage =
        `linear-gradient(60deg,
          ${stops(centers[0])},
          ${stops(centers[1])},
          ${stops(centers[2])}
        )`;
      overlay.style.opacity = '1';
    };

    artwork.addEventListener('mousemove', updateMask);
    artwork.addEventListener('mouseleave', () => {
      overlay.style.opacity = '0';
      overlay.style.webkitMaskImage =
      overlay.style.maskImage = 'none';
    });

    return () => {
      artwork.removeEventListener('mousemove', updateMask);
      artwork.removeEventListener('mouseleave', () => {});
    };
  }, [rarity, image]);
  // ── end unique effect ──

  // 3D-tilt on the entire card (unchanged)
  const handleMouseMove = e => {
    const card = cardRef.current;
    if (!card) return;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = e.clientX - left, y = e.clientY - top;
    card.style.transform = `perspective(700px)
      rotateX(${ -((y - height/2)/10) }deg)
      rotateY(${ ((x - width/2)/10) }deg)`;
  };
  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (card) card.style.transform = 'perspective(700px) rotateX(0) rotateY(0)';
  };

  return (
    <div
      ref={cardRef}
      className={`card-container ${rarity.toLowerCase()}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      draggable={draggable}
      onDragStart={e => draggable && onDragStart && onDragStart(e)}
      onDoubleClick={onDoubleClick}
    >
      <div className="card-border">
        <div className="card-name">{name}</div>
        <div className="card-artwork">
          <img src={image} alt={name} draggable={false} />
          {rarity.toLowerCase() === 'unique' && (
            <img
              src={image}
              alt=""
              className="invert-band-overlay"
              draggable={false}
            />
          )}
        </div>
        {description && (
          <div className="card-description" ref={descriptionRef}>
            {description}
          </div>
        )}
        <div className="card-mint">
          <span className="mint-number">{mintNumber}</span>
        </div>
      </div>
    </div>
  );
};

export default BaseCard;
