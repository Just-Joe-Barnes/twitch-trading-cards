import React, {useState, useEffect, useMemo, useRef} from 'react';
import {useParams} from 'react-router-dom';
import io from 'socket.io-client';
import BaseCard from '../components/BaseCard';
import {getRarityColor, rarities} from '../constants/rarities';
import UserTitle from '../components/UserTitle';
import '../styles/StreamOverlayPage.css';

const packMessages = [
    "Ripping a pack for {username}!",
    "Let's see {username}'s luck in this pack...",
    "What's in the pack, {username}?",
    "Shuffling the cards for {username}...",
    "{username} is testing their luck!",
    "A wild pack appears for {username}!",
    "Good luck, {username}! Let's see what you got."
];

const StreamOverlayPage = () => {
    const {userId} = useParams();
    const [openedCards, setOpenedCards] = useState([]);
    const [isOpening, setIsOpening] = useState(false);
    const [revealedCards, setRevealedCards] = useState([]);
    const [faceDownCards, setFaceDownCards] = useState([]);
    const [packMessageParts, setPackMessageParts] = useState(null);
    const [queue, setQueue] = useState([]);
    const [isQueuePaused, setIsQueuePaused] = useState(false);
    const socketRef = useRef(null);

    const rarityOrderMap = useMemo(() => rarities.reduce((acc, r, index) => {
        acc[r.name] = index;
        return acc;
    }, {}), []);

    const socketUrl = process.env.REACT_APP_API_BASE_URL || 'http://192.168.0.136:5000';
    const apiUrl = `${socketUrl}/api`;

    useEffect(() => {
        if (!userId) return;

        document.body.classList.add('transparent');

        const fetchQueueStatus = async () => {
            try {
                const response = await fetch(`${apiUrl}/admin/queues/status`);
                if (!response.ok) {
                    throw new Error('Failed to fetch queue status');
                }
                const data = await response.json();
                setQueue(data.queue)
                setIsQueuePaused(data.isPaused);
            } catch (error) {
                console.error("Error fetching queue status:", error);
            }
        };

        fetchQueueStatus();

        const socket = io(socketUrl, {
            transports: ['websocket'],
            reconnectionAttempts: 5,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join', userId);
            socket.emit('register-overlay', userId);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
        });

        socket.on('new-pack-opening', ({cards, username, title}) => {
            const randomMessage = packMessages[Math.floor(Math.random() * packMessages.length)];
            const parts = randomMessage.split('{username}');
            setPackMessageParts({ pre: parts[0], username: username, title: title || null, post: parts[1] || '' });

            setOpenedCards(cards);
            setRevealedCards(Array(cards.length).fill(false));
            setFaceDownCards(Array(cards.length).fill(true));
            setIsOpening(true);

            setTimeout(() => {
                startCardReveal(cards);
            }, 4000);
        });

        socket.on('queue-updated', (queueUsernames) => {
            setQueue(queueUsernames);
        });

        return () => {
            socket.disconnect();
            document.body.classList.remove('transparent');
        };
    }, [userId, rarityOrderMap, apiUrl, socketUrl]);

    const startCardReveal = async (cards) => {
        setPackMessageParts(null);
        setRevealedCards(Array(cards.length).fill(true));
        await new Promise(resolve => setTimeout(resolve, 500));

        const indicesToFlip = cards
            .map((card, index) => ({index, rarityOrder: rarityOrderMap[card.rarity]}))
            .sort((a, b) => a.rarityOrder - b.rarityOrder)
            .map(item => item.index);

        for (const index of indicesToFlip) {
            setFaceDownCards(prev => {
                const updated = [...prev];
                updated[index] = false;
                return updated;
            });
            await new Promise(resolve => setTimeout(resolve, 700));
        }

        await new Promise(resolve => setTimeout(resolve, 5000));

        const numCards = cards.length;
        const middleIndex = Math.floor(numCards / 2);

        for (let i = 0; i < middleIndex; i++) {
            const leftIndex = i;
            const rightIndex = numCards - 1 - i;

            setRevealedCards(prev => {
                const updated = [...prev];
                updated[leftIndex] = false;
                updated[rightIndex] = false;
                return updated;
            });
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (numCards % 2 !== 0) {
            setRevealedCards(prev => {
                const updated = [...prev];
                updated[middleIndex] = false;
                return updated;
            });
        }

        await new Promise(resolve => setTimeout(resolve, 600));

        setIsOpening(false);
        setOpenedCards([]);

        if (socketRef.current) {
            socketRef.current.emit('animation-complete');
        }
    };

    return (
        <div className="stream-overlay">
            {(!isQueuePaused && queue.length > 0) && (
                <div className="queue-display">
                    <span>{queue.length}</span> <br/>
                    Packs in Queue
                </div>
            )}

            {isOpening && (
                <>
                    {packMessageParts && (
                        <div className="pack-ripping-message">
                            {packMessageParts.pre}
                            <b>
                                <UserTitle username={packMessageParts.username} title={packMessageParts.title} />
                            </b>
                            {packMessageParts.post}
                        </div>
                    )}
                    <div className="opened-cards-stream">
                        <div className="cards-container-stream">
                            {openedCards.map((card, i) => {
                                const flipClass = faceDownCards[i] ? 'face-down' : 'face-up';
                                return (
                                    <div
                                        key={i}
                                        className={`card-wrapper-stream ${revealedCards[i] ? 'visible' : ''} ${flipClass}`}
                                        style={{'--rarity-color': getRarityColor(card.rarity)}}
                                    >
                                        <div className="card-content-stream">
                                            <div className="card-inner-stream">
                                                <div className="card-back-stream">
                                                    <img src="/images/card-back-placeholder.png" alt="Card Back"/>
                                                </div>
                                                <div className="card-front-stream">
                                                    <BaseCard
                                                        key={`${card._id}-${i}`}
                                                        name={card.name}
                                                        image={card.imageUrl}
                                                        rarity={card.rarity}
                                                        description={card.flavorText}
                                                        mintNumber={card.mintNumber}
                                                        modifier={card.modifier}
                                                        miniCard={true}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default StreamOverlayPage;
