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
    // Refs for lower rarity effects (unchanged)
    const glareRef = useRef(null);
    const holoRef = useRef(null);
    // For other rarities, we keep the existing refs
    const holoVRef = useRef(null);
    const mythicCursorGradientRef = useRef(null);
    const divineArtworkRef = useRef(null);
    // New ref for the description element so we can adjust its font size
    const descriptionRef = useRef(null);
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

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

    // useEffect to adjust the font size of the description so that it fits in 90px height.
    useEffect(() => {
        if (descriptionRef.current) {
            // Reset to maximum font size first.
            descriptionRef.current.style.fontSize = '0.9rem';
            let fontSize = 0.9;
            // While the content overflows the container and the font size is above the minimum...
            while (
                descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight &&
                fontSize > 0.6
            ) {
                fontSize -= 0.05;
                descriptionRef.current.style.fontSize = `${fontSize}rem`;
            }
        }
    }, [description]);

    const handleMouseMove = (e) => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCursorPosition({ x, y });
        const halfW = rect.width / 2;
        const halfH = rect.height / 2;
        const rotateX = -((y - halfH) / 10);
        const rotateY = ((x - halfW) / 10);
        card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        // For rare, legendary, epic, and mythic cards, update custom properties for overlays
        if (["rare", "legendary", "epic", "mythic"].includes(rarity.toLowerCase())) {
            card.style.setProperty('--cursor-x', `${(x / rect.width) * 100}%`);
            card.style.setProperty('--cursor-y', `${(y / rect.height) * 100}%`);
        }

        // For legendary cards, update lightning parallax properties
        if (rarity.toLowerCase() === 'legendary') {
            const lightningX = ((x / rect.width) * 10 - 5).toFixed(2) + '%';
            const lightningY = ((y / rect.height) * 10 - 5).toFixed(2) + '%';
            card.style.setProperty('--lightning-x', lightningX);
            card.style.setProperty('--lightning-y', lightningY);
        }

        // Lower rarity glare effect (basic/common/standard/uncommon)
        if (
            glareRef.current &&
            ["basic", "common", "standard", "uncommon"].includes(rarity.toLowerCase())
        ) {
            const glareX = ((x / rect.width) * 100).toFixed(2);
            const glareY = ((y / rect.height) * 100).toFixed(2);
            glareRef.current.style.transform = `translate(-50%, -50%) scale(1.2)`;
            glareRef.current.style.opacity = '0.6';
            glareRef.current.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, var(--glare-color, rgba(255,255,255,0.5)), rgba(255,255,255,0))`;
        }

        // Rare holographic overlay (unchanged)
        if (holoRef.current && rarity.toLowerCase() === 'rare') {
            const gradientX = (x / rect.width) * 100;
            const gradientY = (y / rect.height) * 100;
            holoRef.current.style.backgroundPosition = `${gradientX}% ${gradientY}%`;
            holoRef.current.style.opacity = '0.8';
        }

        // Holo V effect (unchanged)
        if (holoVRef.current && rarity.toLowerCase() === 'holo-v') {
            const gradientX = (x / rect.width) * 100;
            const gradientY = (y / rect.height) * 100;
            holoVRef.current.style.backgroundPosition = `${gradientX}% ${gradientY}%`;
            holoVRef.current.style.opacity = '0.8';
        }

        // Mythic cursor gradient (if applicable)
        if (mythicCursorGradientRef.current && rarity.toLowerCase() === 'mythic') {
            mythicCursorGradientRef.current.style.setProperty('--cursor-x', `${x}px`);
            mythicCursorGradientRef.current.style.setProperty('--cursor-y', `${y}px`);
        }

        // Divine parallax effect (if applicable)
        if (divineArtworkRef.current && rarity.toLowerCase() === 'divine') {
            const moveX = (x - halfW) / 20;
            const moveY = (y - halfH) / 20;
            divineArtworkRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
        }
    };

    const handleMouseLeave = () => {
        const card = cardRef.current;
        if (card) {
            card.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
            card.style.removeProperty('--cursor-x');
            card.style.removeProperty('--cursor-y');
        }
        if (glareRef.current) {
            glareRef.current.style.opacity = '0';
            glareRef.current.style.transform = 'translate(-50%, -50%) scale(0)';
        }
        if (holoRef.current) {
            holoRef.current.style.opacity = '0';
        }
        if (holoVRef.current) {
            holoVRef.current.style.opacity = '0';
        }
        if (mythicCursorGradientRef.current) {
            mythicCursorGradientRef.current.style.backgroundPosition = 'center';
        }
        if (divineArtworkRef.current) {
            divineArtworkRef.current.style.transform = 'translate(0, 0)';
        }
    };

    return (
        <div
            ref={cardRef}
            className={`card-container ${rarity.toLowerCase()}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            draggable={draggable}
            onDragStart={(e) => draggable && onDragStart && onDragStart(e)}
            onDoubleClick={onDoubleClick}
            style={{
                ...(rarity.toLowerCase() === 'divine' ? { backgroundImage: `url(${image})` } : {}),
                ...(modifierData?.css ? JSON.parse(modifierData.css) : {}),
                '--mx': `${cursorPosition.x}px`,
                '--my': `${cursorPosition.y}px`,
                '--posx': `${cursorPosition.x}px`,
                '--posy': `${cursorPosition.y}px`,
                '--hyp': `${Math.sqrt(cursorPosition.x * cursorPosition.x + cursorPosition.y * cursorPosition.y)}px`,
                '--galaxy': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cdefs%3E%3ClinearGradient id='rainbow' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%' stop-color='%23ff0000' /%3E%3Cstop offset='16.666%' stop-color='%23ff7f00' /%3E%3Cstop offset='33.333%' stop-color='%23ffff00' /%3E%3Cstop offset='50%' stop-color='%2300ff00' /%3E%3Cstop offset='66.666%' stop-color='%230000ff' /%3E%3Cstop offset='83.333%' stop-color='%234b0082' /%3E%3Cstop offset='100%' stop-color='%238b00ff' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23rainbow)' /%3E%3C/svg%3E")`,
            }}
        >
            {/* Render glare for lower rarities */}
            {["basic", "common", "standard", "uncommon"].includes(rarity.toLowerCase()) && (
                <div ref={glareRef} className="card-glare" />
            )}
            {/* Render rare effect overlay */}
            {rarity.toLowerCase() === 'rare' && (
                <div ref={holoRef} className="holographic-overlay" />
            )}
            {/* Render Holo V effect */}
            {rarity.toLowerCase() === 'holo-v' && (
                <div ref={holoVRef} className="holo-v" />
            )}
            {/* Render mythic effects */}
            {rarity.toLowerCase() === 'mythic' && (
                <>
                    <div className="mythic-particles" />
                    <div className="mythic-holographic-overlay" />
                    <div className="mythic-tint" />
                    <div className="mythic-rainbow-overlay" />
                    <div className="mythic-holo-overlay" />
                </>
            )}
            {/* Render epic galaxy overlay for epic cards */}
            {rarity.toLowerCase() === 'epic' && <div className="epic-galaxy-overlay" />}
            {/* Render unique and divine cards as before */}
            <div className="card-border">
                {rarity.toLowerCase() === 'divine' ? (
                    <div className="card-header">
                        <div className="card-name">{name}</div>
                        <div className="card-mint">
                            <span className="mint-number">
                                {mintNumber} / {rarities?.find((r) => r.name.toLowerCase() === rarity.toLowerCase())?.totalCopies || '???'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={`card-name ${modifierData?.name === 'Rainbow Holo' ? 'rainbow-holo' : ''}`}>{name}</div>
                        <div className="card-artwork">
                            <img src={image} alt={name} />
                            {modifierData?.name === 'Rainbow Holo' && (
                                <div
                                    className="rainbow-holo-image"
                                    style={{
                                        '--cursor-x': `${cursorPosition.x}px`,
                                        '--cursor-y': `${cursorPosition.y}px`,
                                    }}
                                ></div>
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
                                {mintNumber} / {rarities?.find((r) => r.name.toLowerCase() === rarity.toLowerCase())?.totalCopies || '???'}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default BaseCard;
