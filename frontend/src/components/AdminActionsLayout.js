import React, {useState, useEffect} from 'react';
import {useNavigate, Outlet} from 'react-router-dom';
import {fetchUserProfile} from '../utils/api';
import NavAdmin from '../components/NavAdmin';
import '../styles/AdminActionsLayout.css';

const AdminActionsLayout = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const profile = await fetchUserProfile();
                if (!profile.isAdmin) {
                    navigate('/');
                } else {
                    setIsAdmin(true);
                }
            } catch {
                navigate('/');
            }
        };
        checkAdmin();
    }, [navigate]);

    if (!isAdmin) {
        return <div style={{padding: '2rem', color: '#fff'}}>Not authorized</div>;
    }

    return (
        <div className="admin-dashboard-container">
            <NavAdmin />
            <div className="admin-content-area">
                <Outlet /> {/* Renders the current child route component */}
            </div>
        </div>
    );
};

export default AdminActionsLayout;
