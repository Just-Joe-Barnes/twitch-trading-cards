import React, { useEffect, useState } from 'react';
import axios from '../utils/api';

const Dashboard = () => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/dashboard');
        setUserData(response.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchData();
  }, []);

  if (!userData) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Welcome to the Dashboard</h1>
      <p>Username: {userData.username}</p>
      <p>Packs Available: {userData.packs}</p>
      <h2>Your Cards:</h2>
      <ul>
        {userData.cards.map((card, index) => (
          <li key={index}>{card.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;
