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
    const glareRef = useRef(null);
    const holoRef = useRef(null);
    const holoVRef = useRef(null);
    const mythicCursorGradientRef = useRef(null);
    const divineArtworkRef = useRef(null);
    const descriptionRef = useRef(null);
    const invertRef = useRef(null);
    const [modifierData, setModifierData] = useState(null);
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

    // Fetch modifier data (unchanged) :contentReference[oaicite:0]{index=0}
    useEffect(() => {
        const fetchModifier = async () => {
            if (modifier) {
                try {
                    const data = await fetchWithAuth(`/api/modifiers/${modifier}`, { method: 'GET' });
                    setModifierData(data);
                } catch (error) {
                    console.error('Error fetching modifier:', error.message);
                }
            } else {
                setModifierData(null);
            }
        };
        fetchModifier();
    }, [modifier]);

    // Auto‐shrink description text (unchanged) :contentReference[oaicite:1]{index=1}
    useEffect(() => {
        if (!descriptionRef.current) return;
        descriptionRef.current.style.fontSize = '0.9rem';
        let fontSize = 0.9;
        while (
            descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight &&
            fontSize > 0.6
        ) {
            fontSize -= 0.05;
            descriptionRef.current.style.fontSize = `${fontSize}rem`;
        }
    }, [description]);

    // Mouse‐move handles 3D tilt + all rarity overlays + our unique three‐band mask
    const handleMouseMove = (e) => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCursorPosition({ x, y });

        // 3D tilt (unchanged) :contentReference[oaicite:2]{index=2}
        const halfW = rect.width / 2;
        const halfH = rect.height / 2;
        const rotateX = -((y - halfH) / 10);
        const rotateY = ((x - halfW) / 10);
        card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        // Existing overlays (rare, legendary, epic, mythic, divine, glare…) :contentReference[oaicite:3]{index=3}
        if (["rare", "legendary", "epic", "mythic"].includes(rarity.toLowerCase())) {
            card.style.setProperty('--cursor-x', `${(x / rect.width) * 100}%`);
            card.style.setProperty('--cursor-y', `${(y / rect.height) * 100}%`);
        }
        if (rarity.toLowerCase() === 'legendary') {
            const lx = ((x / rect.width) * 10 - 5).toFixed(2) + '%';
            const ly = ((y / rect.height) * 10 - 5).toFixed(2) + '%';
            card.style.setProperty('--lightning-x', lx);
            card.style.setProperty('--lightning-y', ly);
        }
        if (
            glareRef.current &&
            ["basic", "common", "standard", "uncommon"].includes(rarity.toLowerCase())
        ) {
            const gx = ((x / rect.width) * 100).toFixed(2);
            const gy = ((y / rect.height) * 100).toFixed(2);
            glareRef.current.style.transform = `translate(-50%, -50%) scale(1.2)`;
            glareRef.current.style.opacity = '0.6';
            glareRef.current.style.background = `radial-gradient(circle at ${gx}% ${gy}%, var(--glare-color), rgba(255,255,255,0))`;
        }
        if (holoRef.current && rarity.toLowerCase() === 'rare') {
            const gx = (x / rect.width) * 100, gy = (y / rect.height) * 100;
            holoRef.current.style.backgroundPosition = `${gx}% ${gy}%`;
            holoRef.current.style.opacity = '0.8';
        }
        if (holoVRef.current && rarity.toLowerCase() === 'holo-v') {
            const gx = (x / rect.width) * 100, gy = (y / rect.height) * 100;
            holoVRef.current.style.backgroundPosition = `${gx}% ${gy}%`;
            holoVRef.current.style.opacity = '0.8';
        }
        if (mythicCursorGradientRef.current && rarity.toLowerCase() === 'mythic') {
            mythicCursorGradientRef.current.style.setProperty('--cursor-x', `${x}px`);
            mythicCursorGradientRef.current.style.setProperty('--cursor-y', `${y}px`);
        }
        if (divineArtworkRef.current && rarity.toLowerCase() === 'divine') {
            const moveX = (x - halfW) / 20, moveY = (y - halfH) / 20;
            divineArtworkRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
        }

        // ── UNIQUE: Three‐Band Invert Mask ── :contentReference[oaicite:4]{index=4}
        if (rarity.toLowerCase() === 'unique' && invertRef.current) {
            const art = card.querySelector('.card-artwork');
            if (art) {
                const aRect = art.getBoundingClientRect();
                const pct = ((e.clientX - aRect.left) / aRect.width) * 100;
                const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
                const bw = 8, edge = 5, spread = 27;
                const c1 = clamp(pct, 0, 100),
                      c2 = clamp(pct - spread, 0, 100),
                      c3 = clamp(pct + spread, 0, 100);
                const stops = c => `
                    transparent ${c - bw - edge}%,
                    white       ${c - bw}%,
                    white       ${c + bw}%,
                    transparent ${c + bw + edge}%`;
                const mask = `linear-gradient(60deg,
                    ${stops(c1)},
                    ${stops(c2)},
                    ${stops(c3)}
                )`;
                invertRef.current.style.webkitMaskImage =
                invertRef.current.style.maskImage = mask;
                invertRef.current.style.opacity = '1';
            }
        }
    };

    // Reset on mouse leave :contentReference[oaicite:5]{index=5}
    const handleMouseLeave = () => {
        const card = cardRef.current;
        if (card) {
            card.style.transform = 'perspective(700px) rotateX(0) rotateY(0)';
            card.style.removeProperty('--cursor-x');
            card.style.removeProperty('--cursor-y');
        }
        if (glareRef.current) {
            glareRef.current.style.opacity = '0';
            glareRef.current.style.transform = 'translate(-50%, -50%) scale(0)';
        }
        if (holoRef.current) holoRef.current.style.opacity = '0';
        if (holoVRef.current) holoVRef.current.style.opacity = '0';
        if (mythicCursorGradientRef.current)
            mythicCursorGradientRef.current.style.backgroundPosition = 'center';
        if (divineArtworkRef.current)
            divineArtworkRef.current.style.transform = 'translate(0, 0)';

        // Unique overlay reset :contentReference[oaicite:6]{index=6}
        if (rarity.toLowerCase() === 'unique' && invertRef.current) {
            invertRef.current.style.opacity = '0';
            invertRef.current.style.webkitMaskImage =
            invertRef.current.style.maskImage = 'none';
        }
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
            style={{
                ...(rarity.toLowerCase() === 'divine'
                    ? { backgroundImage: `url(${image})` }
                    : {}),
                ...(modifierData?.css ? JSON.parse(modifierData.css) : {}),
                '--mx': `${cursorPosition.x}px`,
                '--my': `${cursorPosition.y}px`,
                '--posx': `${cursorPosition.x}px`,
                '--posy': `${cursorPosition.y}px`,
                '--hyp': `${Math.sqrt(cursorPosition.x ** 2 + cursorPosition.y ** 2)}px`,
                '--galaxy': `url("data:image/svg+xml,...")`,
            }}
        >
            {/* Lower‐rarity glare */}
            {["basic", "common", "standard", "uncommon"].includes(rarity.toLowerCase()) && (
                <div ref={glareRef} className="card-glare" />
            )}
            {/* Rare, Holo-V, Mythic, Epic (unchanged) */}
            {rarity.toLowerCase() === 'rare' && (
                <div ref={holoRef} className="holographic-overlay" />
            )}
            {rarity.toLowerCase() === 'holo-v' && (
                <div ref={holoVRef} className="holo-v" />
            )}
            {rarity.toLowerCase() === 'mythic' && (
                <>
                    <div className="mythic-particles" />
                    <div className="mythic-holographic-overlay" />
                    <div className="mythic-tint" />
                    <div className="mythic-rainbow-overlay" />
                    <div className="mythic-holo-overlay" />
                </>
            )}
            {rarity.toLowerCase() === 'epic' && <div className="epic-galaxy-overlay" />}

            <div className="card-border">
                {rarity.toLowerCase() === 'divine' ? (
                    <div className="card-header">
                        <div className="card-name">{name}</div>
                        <div className="card-mint">
                            <span className="mint-number">
                                {mintNumber} /{' '}
                                {rarities
                                ?.find(r => r.name.toLowerCase() === rarity.toLowerCase())
                                ?.totalCopies ?? '???'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <>
                        <div
                            className={`card-name ${
                                modifierData?.name === 'Rainbow Holo' ? 'rainbow-holo' : ''
                            }`}
                        >
                            {name}
                        </div>

                        <div className="card-artwork">
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
                                <>
                                    <img src={image} alt={name} draggable={false} />
                                    {modifierData?.name === 'Rainbow Holo' && (
                                        <div
                                            className="rainbow-holo-image"
                                            style={{
                                                '--cursor-x': `${cursorPosition.x}px`,
                                                '--cursor-y': `${cursorPosition.y}px`,
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </div>

                        {description && (
                            <div
                                className="card-description"
                                ref={descriptionRef}
                            >
                                {description}
                            </div>
                        )}

                        <div className="card-mint">
                            <span className="mint-number">
                                {mintNumber} /{' '}
                                {rarities.find(r => r.name.toLowerCase() === rarity)?.totalCopies
                                    || '???'}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default BaseCard;
