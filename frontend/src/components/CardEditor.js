import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import BaseCard from './BaseCard';

const CardEditor = () => {
  const { id } = useParams();
  const [card, setCard] = useState(null);
  const [name, setName] = useState('');
  const [flavorText, setFlavorText] = useState('');

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const response = await fetch(`/api/cards/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch card');
        }
        const data = await response.json();
        setCard(data);
        setName(data.name);
        setFlavorText(data.flavorText);
      } catch (error) {
        console.error('Error fetching card:', error);
      }
    };

    fetchCard();
  }, [id]);

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/admin/cards/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, flavorText }),
      });
      if (!response.ok) {
        throw new Error('Failed to update card');
      }
      const data = await response.json();
      setCard(data.card);
      setName(data.card.name);
      setFlavorText(data.card.flavorText);
      alert('Card updated successfully!');
    } catch (error) {
      console.error('Error updating card:', error);
      alert('Failed to update card');
    }
  };

  if (!card) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Edit Card</h2>
      <div>
        <label>Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label>Flavor Text:</label>
        <textarea
          value={flavorText}
          onChange={(e) => setFlavorText(e.target.value)}
        />
      </div>
      <button onClick={handleSave}>Save</button>
      <h3>Preview</h3>
      <BaseCard card={card} />
    </div>
  );
};

export default CardEditor;
