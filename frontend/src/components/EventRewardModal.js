import React from 'react';
import BaseCard from './BaseCard';
import '../styles/EventRewardModal.css';

const EventRewardModal = ({ reward, onClose }) => {
    if (!reward) return null;

    const renderReward = () => {
        switch (reward.type) {
            case 'CARD':
                return (
                    <>
                        <h2>You Received a Card!</h2>
                        <div className="reward-card-container">
                            <BaseCard
                                name={reward.data.name}
                                image={reward.data.imageUrl}
                                rarity={reward.data.rarity}
                                description={reward.data.flavorText}
                                mintNumber={reward.data.mintNumber}
                                modifier={reward.data.modifier}
                                inspectOnClick={false}
                            />
                        </div>
                        <p>This card has been added to your collection.</p>
                    </>
                );
            case 'PACK':
                return (
                    <>
                        <h2>You Received {reward.data.amount} Pack{reward.data.amount > 1 && 's'}!</h2>
                        <div className="reward-icon">🎁</div>
                        <p>{reward.data.amount} pack{reward.data.amount > 1 && 's'} has been added to your account.</p>
                    </>
                );
            case 'XP':
                return (
                    <>
                        <h2>You Received XP!</h2>
                        <div className="reward-icon">✨</div>
                        <p>{reward.data.amount} XP has been added to your account.</p>
                    </>
                );
            default:
                return <p>An unknown reward has been granted!</p>;
        }
    };

    return (
        <div className="reward-modal-overlay" onClick={onClose}>
            <div className="reward-modal-content" onClick={(e) => e.stopPropagation()}>
                {renderReward()}
                <button className="primary-button" onClick={onClose}>
                    Awesome!
                </button>
            </div>
        </div>
    );
};

export default EventRewardModal;
