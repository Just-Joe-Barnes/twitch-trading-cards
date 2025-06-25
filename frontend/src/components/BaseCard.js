// src/components/BaseCard.js
import React, { useRef, useEffect, useState, memo } from 'react';
import '../styles/CardComponent.css';
import { rarities } from '../constants/rarities';
import { fetchWithAuth } from '../utils/api';

const BaseCard = ({
  name,
  image,
  description,
  rarity = 'common',
  mintNumber,
  draggable,
  onDragStart,
  onDoubleClick,
  onClick,
  inspectOnClick = true,
  modifier,
}) => {
  const cardRef = useRef(null);
  const nameRef = useRef(null);
  const invertRef = useRef(null);
  const glareRef = useRef(null);
  const holoRef = useRef(null);
  const holoVRef = useRef(null);
  const mythicCursorGradientRef = useRef(null);
  const divineArtworkRef = useRef(null);
  const descriptionRef = useRef(null);
  const [modifierData, setModifierData] = useState(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const isGlitch = modifierData?.name === 'Glitch';

  useEffect(() => {
    const fetchModifier = async () => {
      if (!modifier) {
        setModifierData(null);
        return;
      }

      // If modifier comes as a populated object, use it directly
      if (typeof modifier === 'object' && modifier.name) {
        setModifierData(modifier);
        return;
      }

      // Treat plain names as local modifiers and skip API fetch
      const isObjectId = typeof modifier === 'string' && /^[0-9a-fA-F]{24}$/.test(modifier);
      if (!isObjectId) {
        setModifierData({ name: modifier });
        return;
      }

      try {
        const data = await fetchWithAuth(`/api/modifiers/${modifier}`, { method: 'GET' });
        setModifierData(data);
      } catch (error) {
        console.error('Error fetching modifier:', error.message);
      }
    };
    fetchModifier();
  }, [modifier]);

  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.fontSize = '0.9rem';
      let fontSize = 0.9;
      while (
        descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight &&
        fontSize > 0.6
      ) {
        fontSize -= 0.05;
        descriptionRef.current.style.fontSize = `${fontSize}rem`;
      }
    }
  }, [description]);

  useEffect(() => {
    if (nameRef.current) {
      nameRef.current.style.fontSize = '1.1rem';
      let fontSize = 1.1;
      while (nameRef.current.scrollWidth > nameRef.current.clientWidth && fontSize > 0.7) {
        fontSize -= 0.05;
        nameRef.current.style.fontSize = `${fontSize}rem`;
      }
    }
  }, [name]);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCursorPosition({ x, y });

    // 3-band mask for unique
    if (rarity.toLowerCase() === 'unique' && invertRef.current) {
      const percent = ((x / rect.width) * 100);
      const bandWidth = 8;
      const softEdge = 5;
      const spread = 27;

      const clamp = (v) => Math.max(0, Math.min(100, v));
      const centers = [
        clamp(percent),
        clamp(percent - spread),
        clamp(percent + spread),
      ];
      const stops = (c) => `
        transparent ${c - bandWidth - softEdge}%,
        white ${c - bandWidth}%,
        white ${c + bandWidth}%,
        transparent ${c + bandWidth + softEdge}%`;
      const mask = `linear-gradient(60deg,
        ${stops(centers[0])},
        ${stops(centers[1])},
        ${stops(centers[2])}
      )`;

      invertRef.current.style.maskImage = mask;
      invertRef.current.style.webkitMaskImage = mask;
      invertRef.current.style.opacity = '1';
    }

    // Existing tilt and other rarity effects...
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    const rotateX = -((y - halfH) / 10);
    const rotateY = ((x - halfW) / 10);
    card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

    if (["rare","legendary","epic","mythic"].includes(rarity.toLowerCase())) {
      card.style.setProperty('--cursor-x', `${(x/rect.width)*100}%`);
      card.style.setProperty('--cursor-y', `${(y/rect.height)*100}%`);
    }
    if (rarity.toLowerCase() === 'legendary') {
      const lx = ((x/rect.width)*10 - 5).toFixed(2) + '%';
      const ly = ((y/rect.height)*10 - 5).toFixed(2) + '%';
      card.style.setProperty('--lightning-x', lx);
      card.style.setProperty('--lightning-y', ly);
    }
    if (
      glareRef.current &&
      ["basic","common","standard","uncommon"].includes(rarity.toLowerCase())
    ) {
      const gx = ((x/rect.width)*100).toFixed(2);
      const gy = ((y/rect.height)*100).toFixed(2);
      glareRef.current.style.transform = 'translate(-50%,-50%) scale(1.2)';
      glareRef.current.style.opacity = '0.6';
      glareRef.current.style.background = `radial-gradient(circle at ${gx}% ${gy}%, var(--glare-color), rgba(255,255,255,0))`;
    }
    if (holoRef.current && rarity.toLowerCase()==='rare') {
      const px = (x/rect.width)*100;
      holoRef.current.style.backgroundPosition = `${px}% 50%`;
      holoRef.current.style.opacity = '0.8';
    }
    if (holoVRef.current && rarity.toLowerCase()==='holo-v') {
      const px = (x/rect.width)*100;
      holoVRef.current.style.backgroundPosition = `${px}% 50%`;
      holoVRef.current.style.opacity = '0.8';
    }
    if (mythicCursorGradientRef.current && rarity.toLowerCase()==='mythic') {
      mythicCursorGradientRef.current.style.setProperty('--cursor-x', `${x}px`);
      mythicCursorGradientRef.current.style.setProperty('--cursor-y', `${y}px`);
    }
    if (divineArtworkRef.current && rarity.toLowerCase()==='divine') {
      const dx = (x-halfW)/20;
      const dy = (y-halfH)/20;
      divineArtworkRef.current.style.transform = `translate(${dx}px,${dy}px)`;
    }
    if (modifierData?.name === 'Glitch') {
      const gx = ((x-halfW)/15).toFixed(2);
      const gy = ((y-halfH)/15).toFixed(2);
      card.style.setProperty('--glitch-x', `${gx}px`);
      card.style.setProperty('--glitch-y', `${gy}px`);
    }
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (card) {
      card.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
      card.style.removeProperty('--cursor-x');
      card.style.removeProperty('--cursor-y');
    }
    if (invertRef.current) {
      invertRef.current.style.opacity = '0';
      invertRef.current.style.maskImage = invertRef.current.style.webkitMaskImage = 'none';
    }
    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
      glareRef.current.style.transform = 'translate(-50%,-50%) scale(0)';
    }
    if (holoRef.current) holoRef.current.style.opacity = '0';
    if (holoVRef.current) holoVRef.current.style.opacity = '0';
    if (divineArtworkRef.current) divineArtworkRef.current.style.transform = 'translate(0,0)';
    if (mythicCursorGradientRef.current) {
      mythicCursorGradientRef.current.style.backgroundPosition = 'center';
    }
    card.style.removeProperty('--glitch-x');
    card.style.removeProperty('--glitch-y');
  };

  const handleClick = (e) => {
    if (onClick) onClick(e);
    if (inspectOnClick && window.inspectCard) {
      window.inspectCard({ name, image, description, rarity, mintNumber, modifier });
    }
  };

  return (
    <div
      ref={cardRef}
      className={`card-container ${rarity.toLowerCase()}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      draggable={draggable}
      onDragStart={e => draggable && onDragStart?.(e)}
      onDoubleClick={onDoubleClick}
      onClick={handleClick}
      style={{
        ...(rarity.toLowerCase()==='divine' ? { backgroundImage: `url(${image})` } : {}),
        ...(modifierData?.css ? JSON.parse(modifierData.css) : {}),
        '--mx': `${cursorPosition.x}px`,
        '--my': `${cursorPosition.y}px`,
        '--posx': `${cursorPosition.x}px`,
        '--posy': `${cursorPosition.y}px`,
        '--hyp': `${Math.hypot(cursorPosition.x,cursorPosition.y)}px`,
      }}
    >
      {/* lower‐rarity glare */}
      {["basic","common","standard","uncommon"].includes(rarity.toLowerCase()) && (
        <div ref={glareRef} className="card-glare" />
      )}
      {/* rare holo */}
      {rarity.toLowerCase()==='rare' && <div ref={holoRef} className="holographic-overlay" />}
      {/* holo‐v */}
      {rarity.toLowerCase()==='holo-v' && <div ref={holoVRef} className="holo-v" />}
      {/* mythic */}
      {rarity.toLowerCase()==='mythic' && (
        <>
          <div className="mythic-particles" />
          <div className="mythic-holographic-overlay" />
          <div className="mythic-tint" />
          
        </>
      )}
      {/* epic */}
      {rarity.toLowerCase()==='epic' && <div className="epic-galaxy-overlay" />}

      <div className="card-border">
        {rarity.toLowerCase()==='divine' ? (
          <div className="card-header">
            <div
              className={`card-name ${isGlitch ? 'glitch-text' : ''}`}
              ref={nameRef}
              data-text={name}
            >
              {name}
            </div>
            <div className={`card-mint ${isGlitch ? 'glitch-text' : ''}`} data-text={`${mintNumber} / ${rarities.find(r => r.name.toLowerCase() === rarity.toLowerCase())?.totalCopies ?? '???'}`}> 
              <span className="mint-number">
                {mintNumber} /{' '}
                {rarities
                  .find(r => r.name.toLowerCase() === rarity.toLowerCase())
                  ?.totalCopies ?? '???'}
              </span>
            </div>
          </div>
        ) : (
          <>
            <div
              className={`card-name ${isGlitch ? 'glitch-text' : ''}`}
              ref={nameRef}
              data-text={name}
            >
              {name}
            </div>

            <div className="card-artwork">
              {rarity.toLowerCase()==='unique' ? (
                <>
                  <img
                    src={image}
                    alt={name}
                    className="grayscale"
                    draggable={false}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      display: 'block',
                    }}
                  />
                  <img
                    src={image}
                    alt=""
                    className="invertband"
                    ref={invertRef}
                    draggable={false}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      display: 'block',
                    }}
                  />
                </>
              ) : (
                <img
                  src={image}
                  alt={name}
                  draggable={false}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block',
                  }}
                />
              )}

            </div>

            {description && (
              <div
                className={`card-description ${isGlitch ? 'glitch-text' : ''}`}
                ref={descriptionRef}
                data-text={description}
              >
                {description}
              </div>
            )}

            <div
              className={`card-mint ${isGlitch ? 'glitch-text' : ''}`}
              data-text={`${mintNumber} / ${rarities.find(r => r.name.toLowerCase() === rarity.toLowerCase())?.totalCopies ?? '???'}`}
            >
              <span className="mint-number">
                {mintNumber} /{' '}
                {rarities
                  .find(r => r.name.toLowerCase() === rarity.toLowerCase())
                  ?.totalCopies ?? '???'}
              </span>
            </div>
          </>
        )}
      </div>
      {modifierData?.name === 'Negative' && (
        <div className="negative-overlay" />
      )}
      {modifierData?.name === 'Glitch' && (
        <div className="glitch-overlay" />
      )}
      {modifierData?.name === 'Prismatic' && (
        <div className="prismatic-overlay" />
      )}
    </div>
  );
};

export default memo(BaseCard);
