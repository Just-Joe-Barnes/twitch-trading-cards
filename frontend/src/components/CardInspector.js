import React, {useEffect, useRef, useState} from 'react';
import BaseCard from './BaseCard';
import '../styles/CardInspector.css';
import {rarities} from "../constants/rarities";

const CardInspector = ({card, onClose}) => {
    const inspectorRef = useRef(null);
    const [localFeatured, setLocalFeatured] = useState(card?.isFeatured ?? false);
    const [slabVisibility, setSlabVisibility] = useState(true);

    useEffect(() => {
        setLocalFeatured(card?.isFeatured ?? false);
        setSlabVisibility(card?.slabbed ?? true);
    }, [card]);

    useEffect(() => {
        if (card) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }

        return () => {
            document.body.classList.remove('no-scroll');
        };
    }, [card]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (card) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [card, onClose]);

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
        grade,
        slabbed,
        isOwner = false,
        onToggleFeatured,
        limited
    } = card;


    const toggleSlabVisibility = () => {
        setSlabVisibility(prev => !prev);
    };

    const effectiveSlabbed = slabbed && slabVisibility;

    return (
        <div className="card-inspector-overlay" onClick={onClose}>
            <div className="close-btn"><i className="fa-solid fa-close" /></div>
            <div className="card-inspector-feature-btn-container">
                <div className="button-group horizontal">
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
                            {localFeatured ? (
                                <>
                                    <i className="fa-solid fa-star"/> Unfeature
                                </>
                            ) : (
                                <>
                                    <i className="fa-regular fa-star"/> Feature
                                </>
                            )}
                        </button>
                    )}
                    {slabbed && (
                        <button
                            className={`primary-button ${slabVisibility ? 'active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleSlabVisibility();
                            }}
                        >
                            Toggle Slab
                        </button>
                    )}
                </div>
            </div>
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
                        grade={grade}
                        slabbed={effectiveSlabbed}
                        inspectOnClick={false}
                        interactive={true}
                        limited={limited}
                    />
                </div>
            </div>

            {rarity.toLowerCase() === 'divine' && (
                <div className="flavourtext">
                    {mintNumber && (
                        <div className="mint">
                            {mintNumber && (`${mintNumber} / ${rarities.find(r => r.name.toLowerCase() === rarity.toLowerCase())?.totalCopies ?? '???'}`)}
                        </div>
                    )}
                    <h3>{name}</h3>
                    {description}
                </div>
            )}
        </div>
    );
};

export default CardInspector;
