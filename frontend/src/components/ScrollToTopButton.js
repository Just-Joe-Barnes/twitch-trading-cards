import React, { useState, useEffect } from 'react';
import '../styles/ScrollToTopButton.css'; // We'll create this CSS file

const ScrollToTopButton = () => {
    const [isVisible, setIsVisible] = useState(false);

    // Show button when page is scrolled down
    const toggleVisibility = () => {
        if (window.scrollY > 300) { // Adjust this value as needed
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    // Scroll to top
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth' // Smooth scrolling animation
        });
    };

    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);

        return () => {
            window.removeEventListener('scroll', toggleVisibility);
        };
    }, []);

    return (
        <button
            className={`scroll-to-top-button ${isVisible ? 'show' : ''}`}
            onClick={scrollToTop}
            title="Scroll to top"
            aria-label="Scroll to top"
        >
            <i className="fa-solid fa-arrow-up"></i> {/* Font Awesome Up Arrow */}
        </button>
    );
};

export default ScrollToTopButton;
