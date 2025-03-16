// src/components/FlippableBaseCard.js
import React, { useState, useRef, useEffect } from 'react';
import BaseCard from './BaseCard';
import '../styles/FlippableBaseCard.css';

/**
 * A unified flipping card that:
 *  - starts face-down (back side showing)
 *  - flips to face-up on click
 *  - replicates the 3D tilt logic for both sides
 */
const FlippableBaseCard = ({ card }) => {
    // faceDown = true => show back, false => show front
    const [faceDown, setFaceDown] = useState(true);

    // We copy the tilt logic from BaseCard, but apply it to the entire container
    const cardRef = useRef(null);

    // We track the same glare/holo references for each side if needed
    // If you want the back to have the same glare effect, keep them; else remove them
    const glareRef = useRef(null);

    // Additional references if you want more overlays on the back side
    // (rare overlays, mythic effects, etc.) can also be used here.

    // Toggle faceDown on click => flips the card
    const handleClick = () => {
        setFaceDown(!faceDown);
    };

    // Cursor tilt logic, applied to the entire flipping container
    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const halfW = rect.width / 2;
        const halfH = rect.height / 2;
        const rotateX = -((y - halfH) / 10);
        const rotateY = ((x - halfW) / 10);

        // Apply tilt to the .flippable-3d container
        cardRef.current.style.transform =
            `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        // Example: glare effect on the back side (optional)
        if (glareRef.current) {
            const glareX = ((x / rect.width) * 100).toFixed(2);
            const glareY = ((y / rect.height) * 100).toFixed(2);
            glareRef.current.style.transform = 'translate(-50%, -50%) scale(1.2)';
            glareRef.current.style.opacity = '0.5';
            glareRef.current.style.background =
                `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.3), rgba(255,255,255,0))`;
        }
    };

    const handleMouseLeave = () => {
        if (cardRef.current) {
            cardRef.current.style.transform =
                'perspective(700px) rotateX(0deg) rotateY(0deg)';
        }
        if (glareRef.current) {
            glareRef.current.style.opacity = '0';
            glareRef.current.style.transform = 'translate(-50%, -50%) scale(0)';
        }
    };

    return (
        <div
            className="flippable-container"
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* This container enforces 300x450 and the 3D flip */}
            <div
                ref={cardRef}
                className={`flippable-3d ${faceDown ? 'face-down' : 'face-up'}`}
            >
                {/* Back side (shown first if faceDown=true) */}
                <div className="card-face card-back">
                    {/* Optional glare div for back side */}
                    <div ref={glareRef} className="card-back-glare" />
                    <img
                        src="/images/card-back-placeholder.png"
                        alt="Card Back"
                        className="card-back-image"
                    />
                </div>

                {/* Front side => your existing BaseCard */}
                <div className="card-face card-front">
                    <BaseCard
                        name={card.name}
                        image={card.imageUrl}
                        description={card.flavorText}
                        rarity={card.rarity}
                        mintNumber={card.mintNumber}
                    />
                </div>
            </div>
        </div>
    );
};

export default FlippableBaseCard;
