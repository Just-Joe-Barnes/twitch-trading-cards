// src/pages/AdminDashboardPage.js
import React, { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '../utils/api';
import BaseCard from '../components/BaseCard';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDashboardPage.css';

/*
  AdminDashboardPage:
  - Lists users with unopened packs.
  - Allows opening a pack for a selected user.
  - Plays a pack-opening animation.
  - Reveals opened cards sequentially (all starting face down).
  - Implements one-way flip: when a face-down card is clicked, it flips to show the front and cannot flip back.
  - When face down, hovering shows a rarity-based glow.
*/

const AdminDashboardPage = ({ user }) => {
  const navigate = useNavigate();

  // State for user list and selection
  const [usersWithPacks, setUsersWithPacks] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Internal loading state (spinner UI is removed on this page)
  const [loading, setLoading] = useState(true);
  // Controls whether the pack-opening overlay (animation) is showing
  const [isOpeningAnimation, setIsOpeningAnimation] = useState(false);

  // Opened cards state
  const [openedCards, setOpenedCards] = useState([]);
  // revealedCards controls sequential fade‑in: false = hidden, true = visible
  const [revealedCards, setRevealedCards] = useState([]);
  // faceDownCards: true = card is face down (back showing), false = face up (front showing)
  // Once a card is flipped to face up, further clicks do nothing.
  const [faceDownCards, setFaceDownCards] = useState([]);

  // For sequential reveal
  const [sequentialRevealStarted, setSequentialRevealStarted] = useState(false);
  const fallbackTimerRef = useRef(null);

  // Rarity mapping for hover glow effect
  const cardRarities = {
    Basic: '#8D8D8D',
    Common: '#64B5F6',
    Standard: '#66BB6A',
    Uncommon: '#1976D2',
    Rare: '#AB47BC',
    Epic: '#FFA726',
    Legendary: '#e32232',
    Mythic: 'hotpink',
    Unique: 'black',
    Divine: 'white',
  };
  const getRarityColor = (rarity) => cardRarities[rarity] || '#fff';

  // Fetch users with packs on mount
  useEffect(() => {
    if (!user?.isAdmin) {
      console.warn('Access denied: Admins only.');
      navigate('/login');
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await fetchWithAuth('/api/packs/usersWithPacks');
        setUsersWithPacks(data.users || []);
      } catch (err) {
        console.error('Error fetching packs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, navigate]);

  // Filter user list based on search input
  const filteredUsers = usersWithPacks.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle selection for a user from the list
  const toggleUserSelection = (u) => {
    setSelectedUser((prev) => (prev?._id === u._id ? null : u));
  };

  // Open pack for the selected user:
  // - Calls backend to open pack.
  // - Stores the returned cards.
  // - Initializes revealedCards (for fade-in) and faceDownCards (all start true).
  const openPackForUser = async () => {
    if (!selectedUser) return;
    setLoading(true);
    setIsOpeningAnimation(true);
    setOpenedCards([]);
    setRevealedCards([]);
    setFaceDownCards([]);
    setSequentialRevealStarted(false);
    try {
      const res = await fetchWithAuth(
        `/api/packs/admin/openPacksForUser/${selectedUser._id}`,
        { method: 'POST' }
      );
      const { newCards } = res;
      console.log('New cards:', newCards);
      setOpenedCards(newCards);
      setRevealedCards(Array(newCards.length).fill(false)); // All start hidden (fade-in)
      setFaceDownCards(Array(newCards.length).fill(true));    // All start face down (back showing)
      // Decrement the user's pack count
      setUsersWithPacks((prev) =>
        prev.map((u) =>
          u._id === selectedUser._id ? { ...u, packs: u.packs - 1 } : u
        )
      );
    } catch (err) {
      console.error('Error opening pack:', err);
      setIsOpeningAnimation(false);
    } finally {
      setLoading(false);
    }
  };

  // Sequentially reveal cards (fade them in one by one)
  const revealCardSequentially = (index) => {
    if (index >= openedCards.length) {
      setIsOpeningAnimation(false);
      return;
    }
    setTimeout(() => {
      setRevealedCards((prev) => {
        const updated = [...prev];
        updated[index] = true;
        console.log(`Card ${index} revealed`);
        return updated;
      });
      revealCardSequentially(index + 1);
    }, 1000);
  };

  // When the pack-opening video ends, remove the overlay and start the reveal immediately.
  const handleVideoEnd = () => {
    console.log('Video ended. Starting sequential reveal...');
    setIsOpeningAnimation(false);
    setSequentialRevealStarted(true);
    revealCardSequentially(0);
  };

  // Fallback: if no card is revealed after 4 seconds, reveal them all.
  useEffect(() => {
    if (
      openedCards.length > 0 &&
      !revealedCards.some(Boolean) &&
      !sequentialRevealStarted
    ) {
      fallbackTimerRef.current = setTimeout(() => {
        console.log('Fallback: revealing all cards after 4s');
        setRevealedCards(Array(openedCards.length).fill(true));
        setIsOpeningAnimation(false);
      }, 4000);
      return () => clearTimeout(fallbackTimerRef.current);
    }
  }, [openedCards, revealedCards, sequentialRevealStarted]);

  // One-way flip: if the card is still face down, flip to face up (and lock the state)
  const handleFlipCard = (i) => {
    setFaceDownCards((prev) => {
      // If the card is already face up, do nothing.
      if (!prev[i]) return prev;
      const updated = [...prev];
      updated[i] = false;
      return updated;
    });
  };

  const handleResetPack = () => {
    console.log('Resetting pack state');
    setOpenedCards([]);
    setRevealedCards([]);
    setFaceDownCards([]);
    setIsOpeningAnimation(false);
  };

  // (Note: We no longer render any loading spinner on this page.)

  return (
    <div className="dashboard-container">
      {isOpeningAnimation && (
        <div className="pack-opening-overlay">
          <video
            className="pack-opening-video"
            src="/animations/packopening.mp4"
            autoPlay
            playsInline
            controls={false}
            onEnded={handleVideoEnd} // Immediately remove overlay when video ends.
          />
        </div>
      )}
      <div className="grid-container">
        {/* Users with Packs Section */}
        <div className="users-with-packs">
          <h2>Users with Packs</h2>
          <div className="users-search">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="users-search-input"
            />
          </div>
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Unopened Packs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr
                  key={u._id}
                  className={selectedUser?._id === u._id ? 'selected' : ''}
                  onClick={() => toggleUserSelection(u)}
                >
                  <td>{u.username}</td>
                  <td>{u.packs}</td>
                  <td>{u.packs > 0 ? 'Available' : 'No packs'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Open Pack Section */}
        <div className="selected-user-section">
          {selectedUser && (
            <>
              <h2>Open Pack for {selectedUser.username}</h2>
              <button
                onClick={openPackForUser}
                disabled={loading || isOpeningAnimation || selectedUser.packs <= 0}
              >
                {loading ? 'Opening...' : 'Open Pack'}
              </button>
            </>
          )}
        </div>

        {/* Card Rarity Key */}
        <div className="card-rarity-key">
          <h2>Card Rarity Key</h2>
          <div className="rarity-list">
            {Object.entries(cardRarities).map(([rarity, color]) => (
              <div key={rarity} className="rarity-item">
                <span className="color-box" style={{ backgroundColor: color }} />
                <span className="rarity-text">{rarity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Opened Cards Section */}
        <div className="opened-cards">
          <h2>Opened Cards</h2>
          <div className="cards-container">
            {openedCards.map((card, i) => (
              <div
                key={i}
                className={`card-wrapper ${revealedCards[i] ? 'visible' : 'hidden'}`}
                onClick={() => handleFlipCard(i)}
                style={{ '--rarity-color': getRarityColor(card.rarity) }}
              >
                <div className="card-content">
                  <div className="card-inner">
                    {/* Back: forced to 300x450px, always centered */}
                    <div className="card-back">
                      <img
                        src="/images/card-back-placeholder.png"
                        alt="Card Back"
                      />
                    </div>
                    {/* Front: BaseCard renders at its natural (perfect) size */}
                    <div className="card-front">
                      <BaseCard
                        name={card.name}
                        image={card.imageUrl}
                        description={card.flavorText}
                        rarity={card.rarity}
                        mintNumber={card.mintNumber}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {openedCards.length > 0 && !isOpeningAnimation && (
            <button
              onClick={handleResetPack}
              style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', fontSize: '1rem' }}
            >
              Open Another Pack
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
