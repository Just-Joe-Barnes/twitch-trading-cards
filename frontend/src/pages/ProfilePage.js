// src/pages/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BaseCard from '../components/BaseCard';
import {
    fetchUserProfile,
    fetchUserProfileByUsername,
    fetchUserCollection
} from '../utils/api';
import '../styles/ProfilePage.css';

const ProfilePage = () => {
    const [featuredCards, setFeaturedCards] = useState([]);
    const [collectionCount, setCollectionCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState('');
    const navigate = useNavigate();
    const { username: routeUsername } = useParams();

    // Fetch profile data and collection data on mount.
    // If a username is provided in the URL, we fetch that user's profile.
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
                // Set featured cards from the profile response.
                let tempFeatured = profile.featuredCards || [];
                if (profile._id) {
                    const collectionData = await fetchUserCollection(profile._id);
                    setCollectionCount(collectionData.cards ? collectionData.cards.length : 0);
                    if (collectionData.cards) {
                        // Filter out any featured card that is no longer in the collection.
                        tempFeatured = tempFeatured.filter(card =>
                            collectionData.cards.some(c => c._id.toString() === card._id.toString())
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

    // Handle navigation to the user's collection page.
    const handleViewCollection = () => {
        navigate(`/collection/${username}`);
    };

    return (
        <div className="profile-page">
            {/* Title at the top */}
            <div className="title-container">
                <h1>{username}'s Profile</h1>
            </div>

            {/* Profile Overview Section */}
            <div className="profile-overview">
                <h2>Profile Overview</h2>
                <div className="stats">
                    <div className="stat">
                        <div>Total Cards</div>
                        <span>{collectionCount}</span>
                    </div>
                    <div className="stat">
                        <div>Featured Cards</div>
                        <span>{featuredCards.length}</span>
                    </div>
                </div>
            </div>

            {/* Featured Cards Section */}
            <div className="featured-cards-container">
                <h2>Featured Cards</h2>
                {loading ? (
                    <p>Loading...</p>
                ) : featuredCards.length > 0 ? (
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

            {/* View Collection Button */}
            <div className="view-collection-button-container">
                <button className="view-collection-button" onClick={handleViewCollection}>
                    View {username}'s Full Collection
                </button>
            </div>
        </div>
    );
};

export default ProfilePage;
