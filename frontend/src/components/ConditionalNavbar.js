import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';

const ConditionalNavbar = ({ user }) => {
    const location = useLocation();

    const hideOnRoutes = [
        '/stream-overlay',
        '/login'
    ];

    const shouldHide = hideOnRoutes.some(route => location.pathname.startsWith(route));

    if (user && !shouldHide) {
        return <Navbar isAdmin={user?.isAdmin} />;
    }

    return null;
};

export default ConditionalNavbar;
