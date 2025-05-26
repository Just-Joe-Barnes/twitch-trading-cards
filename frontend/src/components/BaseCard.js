import React, { useRef, useEffect, useState } from 'react';
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
    modifier,
}) => {
    const cardRef = useRef(null);
    const descriptionRef = useRef(null);
    const invertRef = useRef(null);            // <-- ref for our overlay
    const [modifierData, setModifierData] = useState(null);
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

    // Fetch modifier (unchanged)
    useEffect(() => {
        (async () => {
            if (!modifier) return setModifierData(null);
            try {
                const data = await fetchWithAuth(`/api/modifiers/${modifier}`, { method: 'GET' });
                setModifierData(data);
            } catch (e) {
                console.error('Error fetching modifier:', e.message);
            }
        })();
    }, [modifier]);

    // Auto‐shrink description (unchanged)
    useEffect(() => {
        const d = descriptionRef.current;
        if (!d) return;
        d.style.fontSize = '0.9rem';
        let size = 0.9;
        while (d.scrollHeight > d.clientHeight && size > 0.6) {
            size -= 0.05;
            d.style.fontSize = `${size}rem`;
        }
    }, [description]);

    // Main mouse‐move handler
    const handleMouseMove = e => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCursorPosition({ x, y });

        // 3D tilt (unchanged)
        const halfW = rect.width/2, halfH = rect.height/2;
        card.style.transform = `perspective(700px)
            rotateX(${ -((y - halfH)/10) }deg)
            rotateY(${ ((x - halfW)/10) }deg)`;

        // Unique: three‐band invert overlay
        if (rarity.toLowerCase() === 'unique' && invertRef.current) {
            const art = card.querySelector('.card-artwork');
            const aRect = art.getBoundingClientRect();
            const pct = ((e.clientX - aRect.left) / aRect.width) * 100;
            const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
            const bandW = 8, edge = 5, spread = 27;
            const c1 = clamp(pct,0,100),
                  c2 = clamp(pct - spread,0,100),
                  c3 = clamp(pct + spread,0,100);
            const stops = c => `
                transparent ${c - bandW - edge}%,
                white       ${c - bandW}%,
                white       ${c + bandW}%,
                transparent ${c + bandW + edge}%`;
            const mask = `linear-gradient(60deg,
                ${stops(c1)},
                ${stops(c2)},
                ${stops(c3)}
            )`;
            invertRef.current.style.webkitMaskImage =
            invertRef.current.style.maskImage = mask;
            invertRef.current.style.opacity = '1';
        }

        // …and all your existing rarity‐specific logic remains here (glare, holo, etc.)…
    };

    const handleMouseLeave = () => {
        const card = cardRef.current;
        if (card) card.style.transform = 'perspective(700px) rotateX(0) rotateY(0)';

        // Unique overlay reset
        if (rarity.toLowerCase() === 'unique' && invertRef.current) {
            invertRef.current.style.opacity = '0';
            invertRef.current.style.webkitMaskImage =
            invertRef.current.style.maskImage = 'none';
        }

        // …plus your existing teardown for other overlays…
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
            {/* …lower‐rarity glare, rare/holo, etc.… */}

            <div className="card-border">
                {rarity.toLowerCase() === 'divine' ? (
                    /* Divine header… */
                    <div className="card-header">
                      {/* … */}
                    </div>
                ) : (
                    <>
                        <div className="card-name">{name}</div>
                        <div className="card-artwork">
                            {/* Unique: two‐layer image */}
                            {rarity.toLowerCase() === 'unique' ? (
                                <>
                                  <img
                                    src={image}
                                    alt={name}
                                    className="grayscale"
                                    draggable={false}
                                  />
                                  <img
                                    src={image}
                                    alt=""
                                    className="invertband"
                                    ref={invertRef}
                                    draggable={false}
                                  />
                                </>
                            ) : (
                                <img
                                  src={image}
                                  alt={name}
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
                    </>
                )}
            </div>
        </div>
    );
};

export default BaseCard;
