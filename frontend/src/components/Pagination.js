// src/components/Pagination.js

import React from 'react';
import '../styles/Pagination.css';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) {
        return null;
    }

    const handlePrevious = () => {
        onPageChange(currentPage - 1);
    };

    const handleNext = () => {
        onPageChange(currentPage + 1);
    };

    return (
        <div className="pagination-container">
            <button
                onClick={handlePrevious}
                disabled={currentPage === 1}
                className="pagination-button"
            >
                &laquo; Previous
            </button>
            <span className="pagination-info">
                Page {currentPage} of {totalPages}
            </span>
            <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className="pagination-button"
            >
                Next &raquo;
            </button>
        </div>
    );
};

export default Pagination;
