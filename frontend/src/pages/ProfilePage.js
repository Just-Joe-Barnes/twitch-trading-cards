// src/pages/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BaseCard from '../components/BaseCard';
import {
    fetchUserProfile,
    fetchUserProfileByUsername,
    fetchUserCollection,
} from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/App.css';
import '../styles/ProfilePage.css';

const ProfilePage = () => {
    const [featuredCards, setFeaturedCards] = useState([]);
    const [collectionCount, setCollectionCount] = useState(0);
    const [currentPacks, setCurrentPacks] = useState(0);
    const [openedPacks, setOpenedPacks] = useState(0);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState('');
    const navigate = useNavigate();
    const { username: routeUsername } = useParams();

    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [achievements, setAchievements] = useState([]);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                let profile;
                if (routeUsername) {
                    profile = await fetchUserProfileByUsername(routeUsername);
                } else {
                    profile = await fetchUserProfile();
                }
                setUsername(profile.username || 'User');
                setOpenedPacks(profile.openedPacks || 0);
                setXp(profile.xp || 0);
                setLevel(profile.level || 1);
                setAchievements(profile.achievements || []);

                let tempFeatured = profile.featuredCards || [];
                if (profile._id) {
                    const collectionData = await fetchUserCollection(profile._id);
                    setCollectionCount(collectionData.cards ? collectionData.cards.length : 0);
                    setCurrentPacks(collectionData.packs || 0);

                    if (collectionData.cards) {
                        tempFeatured = tempFeatured.filter((card) =>
                            collectionData.cards.some((c) => c._id.toString() === card._id.toString())
                        );
                    }
                }
                setFeaturedCards(tempFeatured);
            } catch (error) {
                console.error('Error fetching user profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, [routeUsername]);

    const handleViewCollection = () => {
        navigate(`/collection/${username}`);
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="profile-page">
            <div className="title-container">
                <h1>{username}'s Profile</h1>
            </div>

            <div className="profile-overview">
                <h2>Profile Overview</h2>
                <div className="stats">
                    <div className="stat tooltip">
                        <div>Total Cards</div>
                        <span>{collectionCount}</span>
                        <span className="tooltiptext">The total number of cards in your collection.</span>
                    </div>
                    <div className="stat tooltip">
                        <div>Current Packs</div>
                        <span>{currentPacks}</span>
                        <span className="tooltiptext">Unopened packs you currently own.</span>
                    </div>
                    <div className="stat tooltip">
                        <div>Opened Packs</div>
                        <span>{openedPacks}</span>
                        <span className="tooltiptext">Total packs you have opened.</span>
                    </div>
                    <div className="stat tooltip">
                        <div>Level</div>
                        <span>{level}</span>
                        <span className="tooltiptext">Your current level based on XP.</span>
                    </div>
                    <div className="stat tooltip">
                        <div>XP</div>
                        <span>{xp % 100} / 100</span>
                        <div style={{ background: '#333', borderRadius: '8px', overflow: 'hidden', marginTop: '0.5rem' }}>
                            <div style={{
                                width: `${(xp % 100)}%`,
                                background: '#db88db',
                                height: '10px',
                                transition: 'width 0.3s ease'
                            }}></div>
                        </div>
                        <span className="tooltiptext">Earn XP by opening packs, trading, and listing cards.</span>
                    </div>
                </div>
                <h3>Achievements</h3>
                <ul>
                    {achievements.map((a, idx) => (
                        <li key={idx}>
                            <strong>{a.name}</strong>: {a.description}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="featured-cards-container">
                <h2>Featured Cards</h2>
                {featuredCards.length > 0 ? (
                    <div className="featured-cards">
                        {featuredCards.map((card) => (
                            <BaseCard
                                key={card._id}
                                name={card.name}
                                image={card.imageUrl}
                                rarity={card.rarity}
                                description={card.flavorText}
                                mintNumber={card.mintNumber}
                                maxMint={card?.maxMint || '???'}
                            />
                        ))}
                    </div>
                ) : (
                    <p>Set your featured cards on your collection page</p>
                )}
            </div>

            <div className="view-collection-button-container">
                <button className="view-collection-button" onClick={handleViewCollection}>
                    View {username}'s Full Collection
                </button>
            </div>
        </div>
    );
};

export default ProfilePage;
