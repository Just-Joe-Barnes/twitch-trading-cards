import React, { useState, useEffect } from 'react';
import FullScreenLoader from './FullScreenLoader';

const LoadingWrapper = ({ children, delay = 1500 }) => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, delay);

        // Cleanup timer on unmount
        return () => clearTimeout(timer);
    }, [delay]);

    if (isLoading) {
        return <FullScreenLoader />;
    }

    return <>{children}</>;
};

export default LoadingWrapper;
