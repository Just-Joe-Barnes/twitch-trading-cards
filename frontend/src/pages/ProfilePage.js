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

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                let profile;
                if (routeUsername) {
                    // Fetch profile for the specified username.
                    profile = await fetchUserProfileByUsername(routeUsername);
                } else {
                    // Otherwise, fetch the logged-in user's profile.
                    profile = await fetchUserProfile();
                }
                setUsername(profile.username || 'User');
                // Set opened packs from profile
                setOpenedPacks(profile.openedPacks || 0);

                let tempFeatured = profile.featuredCards || [];
                if (profile._id) {
                    // Fetch collection data using the profile _id
                    const collectionData = await fetchUserCollection(profile._id);
                    // Update total cards count
                    setCollectionCount(collectionData.cards ? collectionData.cards.length : 0);
                    // Update current packs from collection data
                    setCurrentPacks(collectionData.packs || 0);

                    if (collectionData.cards) {
                        // Filter out any featured card that is no longer in the collection.
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
                    <div className="stat">
                        <div>Total Cards</div>
                        <span>{collectionCount}</span>
                    </div>
                    <div className="stat">
                        <div>Current Packs</div>
                        <span>{currentPacks}</span>
                    </div>
                    <div className="stat">
                        <div>Opened Packs</div>
                        <span>{openedPacks}</span>
                    </div>
                </div>
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
