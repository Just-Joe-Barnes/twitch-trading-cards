import React from 'react';
import PropTypes from 'prop-types';
import './CardComponent.css'; // We'll create this CSS file in Step 2

const CardComponent = ({ name, imageUrl, rarity, type, flavorText }) => {
    return (
        <div className={`card ${rarity.toLowerCase()}`}>
            <div className="card-header">{name}</div>
            <div className="card-image">
                <img src={imageUrl} alt={name} />
            </div>
            <div className="card-details">
                <span className="card-type">{type}</span>
                <span className={`card-rarity ${rarity.toLowerCase()}`}>{rarity}</span>
            </div>
            <div className="card-footer">{flavorText}</div>
        </div>
    );
};

CardComponent.propTypes = {
    name: PropTypes.string.isRequired,
    imageUrl: PropTypes.string.isRequired,
    rarity: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    flavorText: PropTypes.string.isRequired,
};

export default CardComponent;
