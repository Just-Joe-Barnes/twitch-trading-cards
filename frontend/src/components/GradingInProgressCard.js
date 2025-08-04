import React, { useState, useEffect, useRef } from 'react';
import BaseCard from './BaseCard';
import {getRarityColor} from "../constants/rarities";

const GradingInProgressCard = ({ card, isAdmin, isRevealed, onFinish, onReveal, onDone }) => {
    const [currentTime, setCurrentTime] = useState(Date.now());
    const intervalRef = useRef(null);

    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        intervalRef.current = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [card.gradingRequestedAt]);

    const end = new Date(card.gradingRequestedAt).getTime() + 24 * 60 * 60 * 1000;
    const diff = end - currentTime;
    const seconds = Math.max(Math.floor(diff / 1000) % 60, 0);
    const minutes = Math.max(Math.floor(diff / (1000 * 60)) % 60, 0);
    const hours = Math.max(Math.floor(diff / (1000 * 60 * 60)) % 24, 0);
    const days = Math.max(Math.floor(diff / (1000 * 60 * 60 * 24)), 0);

    if (card.slabbed) {
        return (
            <div className="card-tile">
                <div className="card-item slabbed">
                    <div
                        className={`card-wrapper ${isRevealed ? 'face-up' : 'face-down'}`}
                        onClick={onReveal}
                        style={{'--rarity-color': getRarityColor(card.rarity)}}
                    >
                        <div className="card-content">
                            <div className="card-inner">
                                <div className="card-back">
                                    <img src="/images/card-back-placeholder.png" alt="Card Back"/>
                                    <div className="slab-back-overlay" style={{'--slab-color': getRarityColor(card.rarity)}}/>
                                </div>
                                <div className="card-front">
                                    <BaseCard
                                        name={card.name}
                                        image={card.imageUrl}
                                        description={card.flavorText}
                                        rarity={card.rarity}
                                        mintNumber={card.mintNumber}
                                        modifier={card.modifier}
                                        grade={card.grade}
                                        slabbed={card.slabbed}
                                        interactive={isRevealed}
                                        inspectOnClick={isRevealed}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    {isRevealed && (
                        <div className="actions">
                            <button className="success-button" onClick={onDone}> Done </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="card-tile">
            <BaseCard
                name={card.name}
                image={card.imageUrl}
                description={card.flavorText}
                rarity={card.rarity}
                mintNumber={card.mintNumber}
                modifier={card.modifier}
                slabbed={false}
            />
            <div className="actions">
                <div className="grading-remaining">
                    {days}d {hours}h {minutes}m {seconds}s
                </div>
                {(isAdmin || diff <= 0) && (
                    <button className="success-button" onClick={() => onFinish(card._id)}>
                        Finish Grading
                    </button>
                )}
            </div>
        </div>
    );
};

export default GradingInProgressCard;
