import React, { useEffect, useState } from 'react';
import { fetchWithAuth, gradeCard } from '../utils/api';
import BaseCard from '../components/BaseCard';

const AdminGradingPage = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const data = await fetchWithAuth('/api/admin/users');
                setUsers(data);
            } catch (err) {
                console.error('Error fetching users', err);
            }
        };
        loadUsers();
    }, []);

    const handleSelectUser = async (e) => {
        const id = e.target.value;
        setSelectedUser(id);
        if (!id) return;
        setLoading(true);
        try {
            const data = await fetchWithAuth(`/api/users/${id}/collection`);
            setCards(data.cards || []);
        } catch (err) {
            console.error('Error fetching collection', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGrade = async (cardId) => {
        try {
            await gradeCard(selectedUser, cardId);
            const data = await fetchWithAuth(`/api/users/${selectedUser}/collection`);
            setCards(data.cards || []);
        } catch (err) {
            console.error('Error grading card', err);
        }
    };

    return (
        <div className="admin-grading-page">
            <h2>Admin Card Grading</h2>
            <label>
                Select User:
                <select value={selectedUser} onChange={handleSelectUser}>
                    <option value="">-- choose user --</option>
                    {users.map(u => (
                        <option key={u._id} value={u._id}>{u.username}</option>
                    ))}
                </select>
            </label>
            {loading && <p>Loading cards...</p>}
            <div className="grading-card-list">
                {cards.map(card => (
                    <div key={card._id} className="grading-card-item">
                        <BaseCard {...card} grade={card.grade} slabbed={card.slabbed} />
                        {!card.slabbed && (
                            <button onClick={() => handleGrade(card._id)}>Grade</button>
                        )}
                        {card.slabbed && <span>Grade: {card.grade}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminGradingPage;
