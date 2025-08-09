import React, {useState, useEffect, useMemo, useRef} from 'react';
import {useParams} from 'react-router-dom';
import io from 'socket.io-client';
import BaseCard from '../components/BaseCard';
import {getRarityColor, rarities} from '../constants/rarities';
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
    const [packMessage, setPackMessage] = useState('');
    const [queue, setQueue] = useState([]);
    const socketRef = useRef(null);

    const rarityOrderMap = useMemo(() => rarities.reduce((acc, r, index) => {
        acc[r.name] = index;
        return acc;
    }, {}), []);

    useEffect(() => {
        if (!userId) return;

        document.body.classList.add('transparent');
        const socketUrl = process.env.REACT_APP_API_BASE_URL || 'http://192.168.0.136:5000';
        const socket = io(socketUrl, {
            transports: ['websocket'],
            reconnectionAttempts: 5,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket connected, joining room:', userId);
            socket.emit('join', userId);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
        });

        socket.on('new-pack-opening', ({cards, username}) => {
            const randomMessage = packMessages[Math.floor(Math.random() * packMessages.length)];
            const formattedMessage = randomMessage.replace('{username}', username);

            setPackMessage(formattedMessage);
            setOpenedCards(cards);
            setRevealedCards(Array(cards.length).fill(false));
            setFaceDownCards(Array(cards.length).fill(true));
            setIsOpening(true);

            setTimeout(() => {
                startCardReveal(cards);
            }, 4000);
        });

        socket.on('queue-updated', (queueUsernames) => {
            console.log('Queue updated:', queueUsernames);
            setQueue(queueUsernames);
        });

        return () => {
            console.log('Disconnecting socket...');
            socket.disconnect();
            document.body.classList.remove('transparent');
        };
    }, [userId, rarityOrderMap]);

    const startCardReveal = async (cards) => {
        setPackMessage('');
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

        // --- NEW SYMMETRIC EXIT ANIMATION ---

        // 1. Wait for the cards to be admired
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 2. Loop from the outside in, hiding pairs of cards
        const numCards = cards.length;
        const middleIndex = Math.floor(numCards / 2);

        for (let i = 0; i < middleIndex; i++) {
            const leftIndex = i;
            const rightIndex = numCards - 1 - i;

            setRevealedCards(prev => {
                const updated = [...prev];
                updated[leftIndex] = false;  // Hide left card
                updated[rightIndex] = false; // Hide right card
                return updated;
            });
            await new Promise(resolve => setTimeout(resolve, 300)); // Stagger the pairs slightly
        }

        // 3. If there's an odd number of cards, hide the middle one last
        if (numCards % 2 !== 0) {
            setRevealedCards(prev => {
                const updated = [...prev];
                updated[middleIndex] = false;
                return updated;
            });
        }

        // 4. Wait for the last animation to finish
        await new Promise(resolve => setTimeout(resolve, 600));

        // 5. NOW, fully remove the component from the screen
        setIsOpening(false);
        setOpenedCards([]);

        if (socketRef.current) {
            console.log('Animation complete, signaling server.');
            socketRef.current.emit('animation-complete');
        }
    };

    if (!isOpening) {
        return null;
    }

    return (
        <div className="stream-overlay">

            {queue.length > 0 && (
                <div className="queue-display">
                    <h3>Packs in Queue: {queue.length}</h3>
                </div>
            )}

            {isOpening && (
                <>
                    {packMessage && (
                        <div className="pack-ripping-message">
                            {packMessage}
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
