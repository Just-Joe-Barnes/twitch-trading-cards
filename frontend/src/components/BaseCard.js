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
    const [modifierData, setModifierData] = useState(null);
    const descriptionRef = useRef(null);
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

    // Fetch modifier details (unchanged)
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

    // Auto‐shrink description text (unchanged)
    useEffect(() => {
        if (!descriptionRef.current) return;
        descriptionRef.current.style.fontSize = '0.9rem';
        let size = 0.9;
        while (
            descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight &&
            size > 0.6
        ) {
            size -= 0.05;
            descriptionRef.current.style.fontSize = `${size}rem`;
        }
    }, [description]);

    // ── UNIQUE THREE-BAND INVERT EFFECT ──
    useEffect(() => {
        if (!cardRef.current || rarity.toLowerCase() !== 'unique') return;
        const artwork = cardRef.current.querySelector('.card-artwork');
        const overlay = cardRef.current.querySelector('.invert-band-overlay');
        if (!artwork || !overlay) return;

        function clamp(v, min, max) {
            return Math.max(min, Math.min(max, v));
        }

        function updateMask(e) {
            const rect = artwork.getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            const bandW = 8, edge = 5, spread = 27;

            const c1 = clamp(pct, 0, 100);
            const c2 = clamp(pct - spread, 0, 100);
            const c3 = clamp(pct + spread, 0, 100);

            const stops = c => `
                transparent ${c - bandW - edge}%,
                white ${c - bandW}%,
                white ${c + bandW}%,
                transparent ${c + bandW + edge}%`;

            const grad = `linear-gradient(60deg,
                ${stops(c1)},
                ${stops(c2)},
                ${stops(c3)}
            )`;

            overlay.style.webkitMaskImage =
                overlay.style.maskImage = grad;
            overlay.style.opacity = '1';
        }

        function onMove(e) {
            updateMask(e);
        }
        function onLeave() {
            overlay.style.opacity = '0';
            overlay.style.webkitMaskImage =
                overlay.style.maskImage = 'none';
        }

        artwork.addEventListener('mousemove', onMove);
        artwork.addEventListener('mouseleave', onLeave);
        return () => {
            artwork.removeEventListener('mousemove', onMove);
            artwork.removeEventListener('mouseleave', onLeave);
        };
    }, [rarity, image]);
    // ── end unique effect ──

    // 3D tilt & cursor tracking (unchanged)
    const handleMouseMove = e => {
        const card = cardRef.current;
        if (!card) return;
        const { left, top, width, height } = card.getBoundingClientRect();
        const x = e.clientX - left, y = e.clientY - top;
        setCursorPosition({ x, y });
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
                    {/* Unique-only overlay */}
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
