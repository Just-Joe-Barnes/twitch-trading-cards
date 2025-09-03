import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import NavAdmin from "../components/NavAdmin";
import CreateCardForm from '../components/CreateCardForm'; // Import new components
import EditCardForm from '../components/EditCardForm';

// This is the main page component
const AdminCardManagement = () => {
    const [view, setView] = useState('menu'); // 'menu', 'create', or 'edit'
    const navigate = useNavigate();

    // Check for admin status on load
    useState(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (!payload.isAdmin) navigate('/');
        } else {
            navigate('/');
        }
    }, [navigate]);

    const handleCreateSubmit = async (cardData) => {
        try {
            // Default rarities structure for new cards
            const defaultRarities = [
                { rarity: 'Basic', totalCopies: 1000 }, { rarity: 'Common', totalCopies: 800 },
                { rarity: 'Standard', totalCopies: 600 }, { rarity: 'Uncommon', totalCopies: 400 },
                { rarity: 'Rare', totalCopies: 300 }, { rarity: 'Epic', totalCopies: 200 },
                { rarity: 'Legendary', totalCopies: 100 }, { rarity: 'Mythic', totalCopies: 50 },
                { rarity: 'Unique', totalCopies: 10 }, { rarity: 'Divine', totalCopies: 1 }
            ].map(r => ({ ...r, remainingCopies: r.totalCopies, availableMintNumbers: Array.from({length: r.totalCopies}, (_, i) => i + 1) }));

            await fetchWithAuth('/api/admin/cards', {
                method: 'POST',
                body: JSON.stringify({
                    name: cardData.name,
                    flavorText: cardData.flavorText,
                    imageUrl: cardData.imageUrl,
                    lore: cardData.lore,
                    loreAuthor: cardData.loreAuthor,
                    availableFrom: cardData.availableFrom,
                    availableTo: cardData.availableTo,
                    rarities: defaultRarities,
                }),
            });
            window.showToast('Card created successfully!', 'success');
            setView('menu'); // Return to the menu after successful creation
        } catch (error) {
            window.showToast(error.message || 'Error creating card.', 'error');
            // Re-throw to be caught by the form's .finally()
            throw error;
        }
    };

    const handleEditSubmit = async (cardData) => {
        try {
            await fetchWithAuth(`/api/admin/cards/${cardData._id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: cardData.name,
                    flavorText: cardData.flavorText,
                    imageUrl: cardData.imageUrl,
                    lore: cardData.lore,
                    loreAuthor: cardData.loreAuthor,
                    availableFrom: cardData.alwaysAvailable ? null : cardData.availableFrom || null,
                    availableTo: cardData.alwaysAvailable ? null : cardData.availableTo || null,
                }),
            });
            window.showToast('Card updated successfully!', 'success');
            setView('menu'); // Return to the menu
        } catch (error) {
            window.showToast(error.message || 'Error updating card.', 'error');
            throw error;
        }
    };

    const renderContent = () => {
        switch(view) {
            case 'create':
                return <CreateCardForm onSubmit={handleCreateSubmit} onClose={() => setView('menu')} />;
            case 'edit':
                return <EditCardForm onSubmit={handleEditSubmit} onClose={() => setView('menu')} />;
            case 'menu':
            default:
                return (
                    <div className="section-card">
                        <h2>Card Actions</h2>
                        <p>What would you like to do?</p>
                        <div className="button-group" style={{ justifyContent: 'center', gap: '1rem' }}>
                            <button className="primary-button lg" onClick={() => setView('create')}>
                                Create New Card
                            </button>
                            <button className="primary-button lg" onClick={() => setView('edit')}>
                                Edit Existing Card
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="page">
            <h1>Card Management</h1>
            <NavAdmin />
            {renderContent()}
        </div>
    );
};

export default AdminCardManagement;

