import React, {useRef, useEffect, useState, memo} from 'react';
import '../styles/CardComponent.css';
import {rarities} from '../constants/rarities';
import {fetchWithAuth} from '../utils/api';

const BaseCard = ({
                      name,
                      image,
                      description,
                      rarity = 'common',
                      mintNumber,
                      draggable,
                      onDragStart,
                      onDoubleClick,
                      onClick,
                      inspectOnClick = true,
                      interactive = true,
                      modifier,
                      grade,
                      slabbed,
                      limited,
                      remaining,
                      timestatuscard,
                      timestatusnow,
                      featured,
                      lore,
                      loreAuthor,
                      miniCard = false,
                      cardScale = 1
                  }) => {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const cardRef = useRef(null);
    const nameRef = useRef(null);
    const invertRef = useRef(null);
    const glareRef = useRef(null);
    const holoRef = useRef(null);
    const holoVRef = useRef(null);
    const mythicCursorGradientRef = useRef(null);
    const divineArtworkRef = useRef(null);
    const descriptionRef = useRef(null);
    const [modifierData, setModifierData] = useState(null);
    const [cursorPosition, setCursorPosition] = useState({x: 0, y: 0});
    const isGlitch = modifierData?.name === 'Glitch';

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // This sets state to true when on-screen and false when off-screen
                setIsIntersecting(entry.isIntersecting);
            },
            {
                // A large rootMargin ensures a smooth experience
                rootMargin: '800px 0px 800px 0px',
            }
        );

        const currentRef = cardRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, []);

    // Determine base class names based on miniCard prop
    const cardContainerClass = miniCard ? 'mini-card-container' : 'card-container';
    const cardBorderClass = miniCard ? 'mini-card-border' : 'card-border';
    const cardNameClass = miniCard ? 'mini-card-name' : 'card-name';
    const cardArtworkClass = miniCard ? 'mini-card-artwork' : 'card-artwork';
    const cardDescriptionClass = miniCard ? 'mini-card-description' : 'card-description';
    const cardMintClass = miniCard ? 'mini-card-mint' : 'card-mint';
    const cardGlareContainerClass = miniCard ? 'mini-card-glare-container' : 'card-glare-container';
    const cardGlareClass = miniCard ? 'mini-card-glare' : 'card-glare';
    const cardHeaderClass = miniCard ? 'mini-card-header' : 'card-header';


    useEffect(() => {
        const card = cardRef.current;
        if (card && isIntersecting) { // Only run for visible, rendered cards
            card.style.transform =
                'scale(var(--card-scale, 1)) perspective(700px) rotateX(0deg) rotateY(0deg)';
        }
    }, [isIntersecting]);

    useEffect(() => {
        if (!isIntersecting) return; // Performance: Don't run effect if card is not visible
        const fetchModifier = async () => {
            if (!modifier) {
                setModifierData(null);
                return;
            }
            if (typeof modifier === 'object' && modifier.name) {
                setModifierData(modifier);
                return;
            }
            const isObjectId = typeof modifier === 'string' && /^[0-9a-fA-F]{24}$/.test(modifier);
            if (!isObjectId) {
                setModifierData({name: modifier});
                return;
            }
            try {
                const data = await fetchWithAuth(`/api/modifiers/${modifier}`, {method: 'GET'});
                setModifierData(data);
            } catch (error) {
                console.error('Error fetching modifier:', error.message);
            }
        };
        fetchModifier();
    }, [modifier, isIntersecting]);

    useEffect(() => {
        if (!isIntersecting) return; // Performance: Don't run effect if card is not visible
        if (descriptionRef.current) {
            if (!miniCard) {
                descriptionRef.current.style.fontSize = '.8rem';
                let fontSize = 1;
                while (
                    descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight &&
                    fontSize > 0.65) {
                    fontSize -= 0.05;
                    descriptionRef.current.style.fontSize = `${fontSize}rem`;
                }
            } else {
                descriptionRef.current.style.fontSize = '0.7rem';
            }
        }
    }, [description, miniCard, isIntersecting]);

    useEffect(() => {
        if (!isIntersecting) return; // Performance: Don't run effect if card is not visible
        if (nameRef.current) {
            if (!miniCard) {
                nameRef.current.style.fontSize = '1rem';
                let fontSize = 1;
                while (nameRef.current.scrollWidth > nameRef.current.clientWidth && fontSize > 0.6) {
                    fontSize -= 0.05;
                    nameRef.current.style.fontSize = `${fontSize}rem`;
                }
            } else {
                nameRef.current.style.fontSize = '0.75rem';
            }
        }
    }, [name, miniCard, isIntersecting]);


    const RemainingBadge = ({remaining}) =>
        remaining !== null && remaining !== undefined ? (
            <div className={`overlay-badge remaining-badge ${miniCard ? 'mini' : ''}`}>
                {remaining} remaining
            </div>
        ) : null;


    const TimeStatusBadge = ({card, now}) => {
        if (!card) {
            return null;
        }
        const currentTime = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
        if (!card.availableFrom || !card.availableTo) {
            return null;
        }
        const from = new Date(card.availableFrom);
        const to = new Date(card.availableTo);
        if (isNaN(from.getTime()) || isNaN(to.getTime())) {
            console.warn("TimeStatusBadge: Invalid date format in card.availableFrom or card.availableTo", card);
            return null;
        }
        const timeLeft = to.getTime() - currentTime.getTime();
        const timeUntilStarts = from.getTime() - currentTime.getTime();
        const badgeClass = `overlay-badge timeleft-badge ${miniCard ? 'mini' : ''}`;

        if (timeLeft <= 0) {
            return (<div className={`${badgeClass} expired pulse`}> Expired </div>);
        } else if (timeUntilStarts > 0) {
            const days = Math.floor(timeUntilStarts / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeUntilStarts % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            return (<div className={`${badgeClass} upcoming`}> Starts in: {days}d {hours}h </div>);
        } else if (timeLeft > 0) {
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            return (<div className={`${badgeClass} pulse`}> Ends in: {days}d {hours}h </div>);
        }
        return null;
    };


    const handlePointerMove = (e) => {
        const card = cardRef.current;
        card.style.transitionDuration = '.1s';
        if (!card || !interactive) return;

        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const rect = card.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        setCursorPosition({x, y});

        if (rarity.toLowerCase() === 'unique' && invertRef.current) {
            const percent = ((x / rect.width) * 100);
            const bandWidth = miniCard ? 4 : 8;
            const softEdge = miniCard ? 2 : 5;
            const spread = 27;
            const clamp = (v) => Math.max(0, Math.min(100, v));
            const centers = [clamp(percent), clamp(percent - spread), clamp(percent + spread)];
            const stops = (c) => `transparent ${c - bandWidth - softEdge}%, white ${c - bandWidth}%, white ${c + bandWidth}%, transparent ${c + bandWidth + softEdge}%`;
            const mask = `linear-gradient(60deg, ${stops(centers[0])}, ${stops(centers[1])}, ${stops(centers[2])})`;
            invertRef.current.style.maskImage = mask;
            invertRef.current.style.webkitMaskImage = mask;
            invertRef.current.style.opacity = '1';
        }

        const tiltSensitivity = miniCard ? 3 : 10;
        const halfW = rect.width / 2;
        const halfH = rect.height / 2;
        const rotateX = -((y - halfH) / tiltSensitivity);
        const rotateY = ((x - halfW) / tiltSensitivity);
        card.style.transform = `scale(var(--card-scale, 1)) perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        if (["rare", "legendary", "epic", "mythic"].includes(rarity.toLowerCase())) {
            card.style.setProperty('--cursor-x', `${(x / rect.width) * 100}%`);
            card.style.setProperty('--cursor-y', `${(y / rect.height) * 100}%`);
        }
        if (rarity.toLowerCase() === 'legendary') {
            const lx = ((x / rect.width) * (miniCard ? 5 : 10) - (miniCard ? 2.5 : 5)).toFixed(2) + '%';
            const ly = ((y / rect.height) * (miniCard ? 5 : 10) - (miniCard ? 2.5 : 5)).toFixed(2) + '%';
            card.style.setProperty('--lightning-x', lx);
            card.style.setProperty('--lightning-y', ly);
        }
        if (glareRef.current && ["basic", "common", "standard", "uncommon"].includes(rarity.toLowerCase())) {
            const gx = ((x / rect.width) * 100).toFixed(2);
            const gy = ((y / rect.height) * 100).toFixed(2);
            glareRef.current.style.transform = 'translate(-50%,-50%) scale(1.1)';
            glareRef.current.style.opacity = '0.6';
            glareRef.current.style.background = `radial-gradient(circle at ${gx}% ${gy}%, var(--glare-color), rgba(255,255,255,0))`;
        }
        if (holoRef.current && rarity.toLowerCase() === 'rare') {
            const px = (x / rect.width) * 100;
            holoRef.current.style.backgroundPosition = `${px}% 50%`;
            holoRef.current.style.opacity = '0.8';
        }
        if (holoVRef.current && rarity.toLowerCase() === 'holo-v') {
            const px = (x / rect.width) * 100;
            holoVRef.current.style.backgroundPosition = `${px}% 50%`;
            holoVRef.current.style.opacity = '0.8';
        }
        if (mythicCursorGradientRef.current && rarity.toLowerCase() === 'mythic') {
            mythicCursorGradientRef.current.style.setProperty('--cursor-x', `${x}px`);
            mythicCursorGradientRef.current.style.setProperty('--cursor-y', `${y}px`);
        }
        if (divineArtworkRef.current && rarity.toLowerCase() === 'divine') {
            const dx = (x - halfW) / (miniCard ? 40 : 20);
            const dy = (y - halfH) / (miniCard ? 40 : 20);
            divineArtworkRef.current.style.transform = `translate(${dx}px,${dy}px)`;
        }
        if (modifierData?.name === 'Glitch') {
            const glitchSensitivity = miniCard ? 30 : 15;
            const gx = ((x - halfW) / glitchSensitivity).toFixed(2);
            const gy = ((y - halfH) / glitchSensitivity).toFixed(2);
            card.style.setProperty('--glitch-x', `${gx}px`);
            card.style.setProperty('--glitch-y', `${gy}px`);
        }
    };

    const handlePointerLeave = () => {
        const card = cardRef.current;
        if (card) {
            card.style.transform = 'scale(var(--card-scale, 1)) perspective(700px) rotateX(0deg) rotateY(0deg)';
            card.style.removeProperty('--cursor-x');
            card.style.removeProperty('--cursor-y');
            card.style.transitionDuration = '1s';
        }
        if (invertRef.current) {
            invertRef.current.style.opacity = '0';
            invertRef.current.style.maskImage = invertRef.current.style.webkitMaskImage = 'none';
        }
        if (glareRef.current) {
            glareRef.current.style.opacity = '0';
            glareRef.current.style.transform = 'translate(-50%,-50%) scale(0)';
        }
        if (holoRef.current) holoRef.current.style.opacity = '0';
        if (holoVRef.current) holoVRef.current.style.opacity = '0';
        if (divineArtworkRef.current) divineArtworkRef.current.style.transform = 'translate(0,0)';
        if (mythicCursorGradientRef.current) {
            mythicCursorGradientRef.current.style.backgroundPosition = 'center';
        }
        card.style.removeProperty('--glitch-x');
        card.style.removeProperty('--glitch-y');
    };

    const handleClick = (e) => {
        if (onClick) onClick(e);
        if (inspectOnClick && window.inspectCard) {
            window.inspectCard({
                name, image, description, rarity, mintNumber, modifier, grade, slabbed, lore, loreAuthor,
                limited: limited || !!timestatuscard?.availableFrom || false,
                featured
            });
        }
    };

    return (
        <>
            <div
                ref={cardRef}
                className={`${cardContainerClass} ${rarity.toLowerCase()}${slabbed ? ' slabbed' : ''}`}
                onMouseMove={interactive ? handlePointerMove : undefined}
                onMouseLeave={interactive ? handlePointerLeave : undefined}
                onTouchStart={interactive ? handlePointerMove : undefined}
                onTouchMove={interactive ? handlePointerMove : undefined}
                onTouchEnd={interactive ? handlePointerLeave : undefined}
                onTouchCancel={interactive ? handlePointerLeave : undefined}
                draggable={draggable}
                onDragStart={e => draggable && onDragStart?.(e)}
                onDoubleClick={onDoubleClick}
                onClick={handleClick}
                style={{
                    ...(rarity.toLowerCase() === 'divine' ? {backgroundImage: `url(${image})`} : {}),
                    ...(modifierData?.css ? JSON.parse(modifierData.css) : {}),
                    '--mx': `${cursorPosition.x}px`,
                    '--my': `${cursorPosition.y}px`,
                    '--posx': `${cursorPosition.x}px`,
                    '--posy': `${cursorPosition.y}px`,
                    '--hyp': `${Math.hypot(cursorPosition.x, cursorPosition.y)}px`,
                }}
            >
                {isIntersecting && (
                    <>
                        <div
                            className={`${miniCard ? 'mini-' : ''}card-content-3d-wrapper ${slabbed ? 'slabbed' : ''} ${!isIntersecting ? 'un-rendered' : ''}`}>
                            {["basic", "common", "standard", "uncommon"].includes(rarity.toLowerCase()) && (
                                <div className={cardGlareContainerClass}>
                                    <div ref={glareRef} className={cardGlareClass}/>
                                </div>
                            )}
                            {!miniCard && rarity.toLowerCase() === 'rare' &&
                                <div ref={holoRef} className="holographic-overlay"/>}
                            {rarity.toLowerCase() === 'holo-v' && <div ref={holoVRef} className="holo-v"/>}
                            {rarity.toLowerCase() === 'mythic' && (
                                <>
                                    <div className="mythic-particles"/>
                                    <div className="mythic-holographic-overlay"/>
                                    <div className="mythic-tint"/>
                                </>
                            )}
                            {rarity.toLowerCase() === 'epic' && <div className="epic-galaxy-overlay"/>}
                            <div className={cardBorderClass}>
                                {rarity.toLowerCase() === 'divine' ? (
                                    <>
                                        <div className={cardHeaderClass}>
                                            <div className={`${cardNameClass} ${isGlitch ? 'glitch-text' : ''}`}
                                                 ref={nameRef}
                                                 data-text={name}>{name}</div>
                                            <div className={`${cardMintClass} ${isGlitch ? 'glitch-text' : ''}`}
                                                 data-text={`${mintNumber} / ${rarities.find(r => r.name.toLowerCase() === rarity.toLowerCase())?.totalCopies ?? '???'}`}>
                                        <span
                                            className="mint-number">{mintNumber} / {rarities.find(r => r.name.toLowerCase() === rarity.toLowerCase())?.totalCopies ?? '???'}</span>
                                            </div>
                                        </div>
                                        <RemainingBadge remaining={remaining}/>
                                        <TimeStatusBadge card={timestatuscard} now={timestatusnow}/>
                                    </>
                                ) : (
                                    <>
                                        <div className={`${cardNameClass} ${isGlitch ? 'glitch-text' : ''}`}
                                             ref={nameRef}
                                             data-text={name}>{name}</div>
                                        <div className={cardArtworkClass}>
                                            {rarity.toLowerCase() === 'unique' ? (
                                                <>
                                                    <img src={image} alt={name} className="grayscale" draggable={false}
                                                         loading="lazy" style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        objectPosition: 'center',
                                                        display: 'block'
                                                    }}/>
                                                    <img src={image} alt="" className="invertband" ref={invertRef}
                                                         draggable={false} loading="lazy" style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        objectPosition: 'center',
                                                        display: 'block'
                                                    }}/>
                                                </>
                                            ) : (
                                                <img src={image} alt={name} draggable={false} loading="lazy" style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    objectPosition: 'center',
                                                    display: 'block'
                                                }}/>
                                            )}
                                        </div>
                                        {(!miniCard && description) && (
                                            <div className={`${cardDescriptionClass} ${isGlitch ? 'glitch-text' : ''}`}
                                                 ref={descriptionRef} data-text={description}>{description}</div>
                                        )}
                                        <div className={`${cardMintClass} ${isGlitch ? 'glitch-text' : ''}`}
                                             data-text={`${mintNumber} / ${rarities.find(r => r.name.toLowerCase() === rarity.toLowerCase())?.totalCopies ?? '???'}`}>
                                    <span
                                        className="mint-number">{mintNumber} / {rarities.find(r => r.name.toLowerCase() === rarity.toLowerCase())?.totalCopies ?? '???'}</span>
                                        </div>
                                        <RemainingBadge remaining={remaining}/>
                                        <TimeStatusBadge card={timestatuscard} now={timestatusnow}/>
                                    </>
                                )}
                            </div>
                        </div>
                        {slabbed && (<div className={`slab-overlay ${rarity.toLowerCase()}`}
                                          style={{'--slab-color': rarities.find(r => r.name.toLowerCase() === rarity.toLowerCase())?.color ?? '#fff'}}>
                            <div className="slab-header"><img src="/images/logo-horizontal.png" alt="logo"
                                                              className={`slab-logo ${rarity.toLowerCase()}`}/>
                                <div className="slab-name">{name}</div>
                                <div className="slab-grade">{grade}</div>
                            </div>
                        </div>)}
                        {featured && (
                            <div className={`overlay-badge featured-badge ${miniCard ? 'mini' : ''}`}>Featured</div>)}
                        {modifierData?.name === 'Negative' && (
                            <div className={`negative-overlay ${miniCard ? 'mini' : ''}`}/>)}
                        {modifierData?.name === 'Glitch' && (
                            <div className={`glitch-overlay ${miniCard ? 'mini' : ''}`}/>)}
                        {modifierData?.name === 'Prismatic' && (
                            <div className={`prismatic-overlay ${miniCard ? 'mini' : ''}`}/>)}
                        {limited && (<div className={`limited-overlay ${miniCard ? 'mini' : ''}`}/>)}
                    </>)}
            </div>
        </>
    );
};

export default memo(BaseCard);
