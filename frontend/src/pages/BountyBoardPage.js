import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchWithAuth, fetchUserCollection } from '../utils/api';
import BaseCard from '../components/BaseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { rarities } from '../constants/rarities';
import '../styles/MarketPage.css';
import '../styles/BountyBoardPage.css';

const BountyBoardPage = ({ userId, username }) => {
    const [bounties, setBounties] = useState([]);
    const [userCollection, setUserCollection] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRarity, setSelectedRarity] = useState('');
    const navigate = useNavigate();

    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [bountiesRes, userRes] = await Promise.all([
                    fetchWithAuth('/api/bounty/wanted'),
                    fetchUserCollection(userId)
                ]);

                setBounties(bountiesRes);
                setUserCollection(userRes.cards);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching bounty data:', err);
                setError('Error fetching bounty board data.');
                setLoading(false);
            }
        };

        if (userId) {
            fetchData();
        }
    }, [userId]);

    const { ownedBounties, otherBounties } = useMemo(() => {
        let currentBounties = bounties.filter((bounty) => {
            const card = bounty.wantedCard;
            return (
                card.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                (selectedRarity ? card.rarity.toLowerCase() === selectedRarity.toLowerCase() : true)
            );
        });

        const bountiesUserOwns = [];
        const otherBountiesList = [];

        currentBounties.forEach(bounty => {
            // Check if the user owns a copy of the card from the bounty
            const hasCard = userCollection.some(card =>
                card.name === bounty.wantedCard.name && card.rarity === bounty.wantedCard.rarity
            );
            if (hasCard) {
                bountiesUserOwns.push(bounty);
            } else {
                otherBountiesList.push(bounty);
            }
        });

        const sortByName = (a, b) => a.wantedCard.name.localeCompare(b.wantedCard.name);

        bountiesUserOwns.sort(sortByName);
        otherBountiesList.sort(sortByName);

        return {
            ownedBounties: bountiesUserOwns,
            otherBounties: otherBountiesList
        };
    }, [bounties, searchQuery, selectedRarity, userCollection]);

    const handleRarityChange = (rarityName) => {
        const normalizedRarityName = rarityName.toLowerCase();
        setSelectedRarity(prevRarity =>
            prevRarity === normalizedRarityName ? '' : normalizedRarityName
        );
    };

    const getRarityCount = useMemo(() => {
        const counts = rarities.reduce((acc, r) => ({ ...acc, [r.name]: 0 }), {});
        bounties.forEach(bounty => {
            const rarity = bounty.wantedCard.rarity;
            if (counts.hasOwnProperty(rarity)) {
                counts[rarity] += 1;
            }
        });
        return counts;
    }, [bounties]);

    const handleInitiateTrade = (recipientUsername, wantedCard) => {
        if (recipientUsername === username) {
            window.showToast("You cannot trade for your own card!", "warning");
            return;
        }

        const cardToOffer = userCollection.find(card =>
            card.name === wantedCard.name && card.rarity === wantedCard.rarity
        );

        if (!cardToOffer) {
            window.showToast("You no longer have that card to offer!", "warning");
            return;
        }

        navigate('/trading', {
            state: {
                bountyTrade: {
                    selectedUser: recipientUsername,
                    tradeOffer: [cardToOffer],
                    tradeRequest: [],
                },
            },
        });
    };

    const renderBounties = (bountyList, canTrade) => {
        if (bountyList.length === 0) {
            return <p className="no-bounties-message">No matching bounties in this section.</p>;
        }
        return bountyList.map((bounty) => (
            <div key={bounty.user._id} className="card-tile bounty-item">
                <BaseCard
                    name={bounty.wantedCard.name}
                    image={bounty.wantedCard.imageUrl}
                    rarity={bounty.wantedCard.rarity}
                    description={bounty.wantedCard.flavorText}
                    lore={bounty.wantedCard.lore}
                    loreAuthor={bounty.wantedCard.loreAuthor}
                />
                <div className="actions">
                    <p className="listing-owner" style={{textAlign: 'center'}}>Wanted by <br /> <Link to={`/profile/${bounty.user.username}`}>{bounty.user.username}</Link></p>
                    {bounty.user.username === username ? (
                        <button className="primary-button" disabled>
                            You set this bounty
                        </button>
                    ) : (
                        canTrade ? (
                            <button
                                className="primary-button"
                                onClick={() => handleInitiateTrade(bounty.user.username, bounty.wantedCard)}
                            >
                                Initiate Trade
                            </button>
                        ) : (
                            <button
                                className="primary-button"
                                disabled
                            >
                                You don't own this card
                            </button>
                        )
                    )}
                </div>
            </div>
        ));
    };

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="bounty-page-error">{error}</div>;

    return (
        <>
            <div className="page" style={{ paddingBottom: '0' }}>
                <h1>Bounty Board</h1>
                <div className="info-section section-card narrow">
                    Welcome to the Bounty Board! If you have a wanted card, the "Initiate Trade" button will be enabled,
                    allowing you to start a trade pre-filled with the wanted card.
                </div>

                <div className="stats">
                    <div className="stat">
                        <div>Active Bounties</div>
                        <span>{bounties.length}</span>
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className="stat">
                        {showFilters ? "Hide Filters" : "Show Filters"}
                        <i className={`fa-solid ${showFilters ? 'fa-filter' : 'fa-filter'}`} />
                    </button>
                    <Link to={`/profile/${username}`} className="button primary-button" style={{ margin: '0', padding: '2rem' }}>
                        Set Your Wanted Card <br/> on your profile
                    </Link>
                </div>
                <br />
                {showFilters && (
                    <div className="section-card" style={{ marginBottom: "2rem" }}>
                        <div className="filters">
                            <div className="filter-card">
                                <input
                                    type="text"
                                    placeholder="Search bounties by card name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="filter-input"
                                />
                            </div>
                            <div className="rarity-key">
                                {rarities.map((r) => {
                                    const normalizedRarityName = r.name.toLowerCase();
                                    return (
                                        <button
                                            key={normalizedRarityName}
                                            onClick={() => handleRarityChange(r.name)}
                                            className={`rarity-item ${normalizedRarityName} ${selectedRarity === normalizedRarityName ? 'active' : ''}`}
                                            disabled={getRarityCount[r.name] === 0}
                                            style={{ "--item-color": r.color }}
                                        >
                                            {r.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="page full" style={{ paddingTop: '0' }}>
                {ownedBounties.length > 0 && (
                    <>
                        <h2>Bounties You Can Complete</h2>
                        <div className={`card-tile-grid`} style={{ marginTop: '0' }}>
                            {renderBounties(ownedBounties, true)}
                        </div>
                    </>
                )}

                <h2>Other Active Bounties</h2>
                <div className={`card-tile-grid`} style={{ marginTop: '0' }}>
                    {renderBounties(otherBounties, false)}
                </div>

                {bounties.length === 0 && (
                    <p className="no-bounties">No active bounties found.</p>
                )}
            </div>
        </>
    );
};

export default BountyBoardPage;
