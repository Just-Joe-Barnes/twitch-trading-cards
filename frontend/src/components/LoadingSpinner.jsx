// src/components/LoadingSpinner.jsx
import React from 'react';
import '../styles/LoadingSpinner.css';

const LoadingSpinner = () => {
    return (
        <div className="spinner-overlay">
            <div className="spinner"></div>
        </div>
    );
};

export default LoadingSpinner;
