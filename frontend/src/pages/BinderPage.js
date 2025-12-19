import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {useParams} from 'react-router-dom';
import {
    fetchUserCollection,
    fetchUserProfile,
    fetchCards,
} from '../utils/api';
import BaseCard from '../components/BaseCard';
import '../styles/BinderPage.css';
import {rarities} from '../constants/rarities';
import {modifiers} from '../constants/modifiers';
import LoadingSpinner from "../components/LoadingSpinner";

const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

    useEffect(() => {
        if (!binderReady || !binderIdentifier) return;
        if (initialLoadRef.current) {
            initialLoadRef.current = false;
            return;
        }

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            try {
                localStorage.setItem(`binder:${binderIdentifier}`, JSON.stringify(pages));
            } catch (error) {
                console.error(error);
                if (window.showToast) {
                    window.showToast('Failed to auto-save binder.', 'error');
                }
            }
        }, 300);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [pages, binderReady, binderIdentifier]);

    const isCardLimited = (card) => {
        return limitedCards.some((lc) => lc.name === card.name);
    }

    // --- Page Management Logic ---

    const handleAddPages = (position) => {
        const newPages = [Array(9).fill(null), Array(9).fill(null)];
        const updatedPages = [...pages];

        if (position === 'before') {
            updatedPages.splice(currentSpreadIndex, 0, ...newPages);
            setPages(updatedPages);
            // Don't change index, effectively "pushes" current view right
        } else {
            // Insert after current spread
            const insertIndex = isMobile ? currentSpreadIndex + 1 : currentSpreadIndex + 2;
            updatedPages.splice(insertIndex, 0, ...newPages);
            setPages(updatedPages);
        }
    };

    const handleNext = useCallback(() => {
        const increment = isMobile ? 1 : 2;
        if (currentSpreadIndex + increment < pages.length) {
            setCurrentSpreadIndex(prev => prev + increment);
        }
    }, [currentSpreadIndex, pages.length, isMobile]);

    const handlePrev = useCallback(() => {
        const decrement = isMobile ? 1 : 2;
        if (currentSpreadIndex - decrement >= 0) {
            setCurrentSpreadIndex(prev => prev - decrement);
        }
    }, [currentSpreadIndex, isMobile]);

    // --- Slot Interaction Logic ---

    const handleInspect = (card) => {
        if(!card) return;
        if (window.inspectCard) {
            window.inspectCard({
                ...card,
                name: card.name,
                image: card.imageUrl,
                description: card.flavorText,
                rarity: card.rarity,
                mintNumber: card.mintNumber,
                modifier: card.modifier,
                isOwner: (!collectionOwner || loggedInUser === collectionOwner),
                limited: isCardLimited(card),
                onToggleFeatured: () => {},
            });
        }
    };

    const handleSlotClick = (pageIndex, slotIndex) => {
        const slotData = pages[pageIndex][slotIndex];

        if (!slotData) {
            setPickingSlot({ pageIndex: pageIndex, slotIndex });
        } else {
            handleInspect(slotData);
        }
    };

    const toggleLock = (e, pageIndex, slotIndex) => {
        e.stopPropagation();
        const updatedPages = [...pages];
        const slotData = updatedPages[pageIndex][slotIndex];

        if (slotData) {
            updatedPages[pageIndex][slotIndex] = {
                ...slotData,
                locked: !slotData.locked
            };
            setPages(updatedPages);
        }
    };

    const handleRemoveCard = (e, pageIndex, slotIndex) => {
        e.stopPropagation();
        const slotData = pages[pageIndex][slotIndex];

        if (slotData && slotData.locked) return;

        const updatedPages = [...pages];
        updatedPages[pageIndex][slotIndex] = null;
        setPages(updatedPages);
    }

    const handleCardSelected = (card) => {
        if (pickingSlot) {
            const updatedPages = [...pages];
            const cardId = card?._id || card?.cardId || null;
            updatedPages[pickingSlot.pageIndex][pickingSlot.slotIndex] = {
                ...card,
                cardId,
                locked: false
            };
            setPages(updatedPages);
            setPickingSlot(null);
        }
    };

    // --- Drag and Drop Handlers ---

    const handleDragStart = (e, pageIndex, slotIndex) => {
        const slotData = pages[pageIndex][slotIndex];

        if (!slotData || slotData.locked) {
            e.preventDefault();
            return;
        }

        setDraggedItem({
            pageIndex: pageIndex,
            slotIndex: slotIndex,
            cardData: slotData
        });

        e.dataTransfer.effectAllowed = "move";

        var img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
    };

    const handleDragOver = (e, pageIndex, slotIndex) => {
        e.preventDefault();
        setDragOverSlot({ pageIndex: pageIndex, slotIndex });
    };

    const handleDrop = (e, targetPageIndex, targetSlotIndex) => {
        e.preventDefault();
        setDragOverSlot(null);

        if (!draggedItem) return;

        const { pageIndex: sourceP, slotIndex: sourceS } = draggedItem;

        // Don't do anything if dropped on itself
        if (targetPageIndex === sourceP && targetSlotIndex === sourceS) {
            setDraggedItem(null);
            return;
        }

        const updatedPages = [...pages];
        const targetCard = updatedPages[targetPageIndex][targetSlotIndex];

        if (targetCard && targetCard.locked) {
            if (window.showToast) window.showToast("That slot is locked!", "error");
            setDraggedItem(null);
            return;
        }

        // Swap
        updatedPages[targetPageIndex][targetSlotIndex] = draggedItem.cardData;
        updatedPages[sourceP][sourceS] = targetCard;

        setPages(updatedPages);
        setDraggedItem(null);
    };

    // --- Edge Navigation Drag Logic ---

    const handleEdgeDragEnter = (direction) => {
        if (!draggedItem) return;

        if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);

        dragTimeoutRef.current = setTimeout(() => {
            if (direction === 'next') {
                handleNext();
            } else {
                handlePrev();
            }
        }, 600);
    };

    const handleEdgeDragLeave = () => {
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
        }
    };

    if (binderLoading) return <LoadingSpinner/>;

    return (
        <div className="binder-view page">
            <h1>Binder View</h1>

            <div className="info-section">
                Drag cards to organize. Hover over side arrows while dragging to flip pages.
                <br/>
                <br/>
                <div><strong><u>Note - this page is just a test and does not function at all in any way how it should or will in the real feature. This is a test. Repeat, this is a test.</u></strong></div>
            </div>


            <div className="binder-workspace">

                <div className="binder-gutter">
                    <button
                        className="insert-btn"
                        onClick={() => handleAddPages('before')}
                        title="Insert Page Before"
                    >
                        <i className="fa-solid fa-plus"></i>
                    </button>

                    <div
                        className={`nav-button ${currentSpreadIndex === 0 ? 'disabled' : ''}`}
                        onClick={handlePrev}
                        onDragEnter={() => handleEdgeDragEnter('prev')}
                        onDragLeave={handleEdgeDragLeave}
                    >
                        <i className="fa-solid fa-chevron-left fa-2x"></i>
                    </div>
                </div>

                <div className="binder-book">
                    <div className="binder-spine"></div>

                    {pages.map((pageData, pageIndex) => {
                        let isVisible;
                        if (isMobile) {
                            isVisible = pageIndex === currentSpreadIndex;
                        } else {
                            isVisible = pageIndex === currentSpreadIndex || pageIndex === currentSpreadIndex + 1;
                        }

                        const isDragSource = draggedItem && draggedItem.pageIndex === pageIndex;

                        if (!isVisible && !isDragSource) return null;

                        const style = (!isVisible && isDragSource)
                            ? { position: 'fixed', top: -9999, opacity: 0, pointerEvents:'none' }
                            : {};

                        const pageClass = isMobile
                            ? 'binder-page single'
                            : `binder-page ${pageIndex % 2 === 0 ? 'left-page' : 'right-page'}`;

                        return (
                            <div key={pageIndex} className={pageClass} style={style}>
                                {pageData.map((slotData, slotIndex) => (
                                    <div
                                        key={slotIndex}
                                        className={`binder-slot ${dragOverSlot?.pageIndex === pageIndex && dragOverSlot?.slotIndex === slotIndex ? 'drag-over' : ''} ${!slotData ? '' : 'hasCard'}`}
                                        draggable={!!slotData && !slotData.locked}
                                        onDragStart={(e) => handleDragStart(e, pageIndex, slotIndex)}
                                        onDragOver={(e) => handleDragOver(e, pageIndex, slotIndex)}
                                        onDrop={(e) => handleDrop(e, pageIndex, slotIndex)}
                                        onDragEnd={() => setDraggedItem(null)}
                                        onClick={() => handleSlotClick(pageIndex, slotIndex)}
                                    >
                                        {slotData ? (
                                            <div className="slot-content-wrapper">
                                                <BaseCard
                                                    {...slotData}
                                                    image={slotData.imageUrl}
                                                    description={slotData.flavorText}
                                                    limited={isCardLimited(slotData)}
                                                    inspectOnClick={false}
                                                    miniCard={false}
                                                />

                                                <div className="slot-controls">
                                                    <button
                                                        className={`control-btn ${slotData.locked ? 'locked' : ''}`}
                                                        onClick={(e) => toggleLock(e, pageIndex, slotIndex)}
                                                        title={slotData.locked ? "Unlock" : "Lock"}
                                                    >
                                                        <i className={`fa-solid fa-${slotData.locked ? 'lock' : 'lock-open'}`}></i>
                                                    </button>
                                                    {!slotData.locked && (
                                                        <button
                                                            className="control-btn remove"
                                                            onClick={(e) => handleRemoveCard(e, pageIndex, slotIndex)}
                                                            title="Remove Card"
                                                        >
                                                            <i className="fa-solid fa-xmark"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="slot-placeholder">
                                                <i className="fa-solid fa-plus"></i>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div className="page-number">Page {pageIndex + 1}</div>
                            </div>
                        );
                    })}
                </div>

                <div className="binder-gutter">
                    <div
                        className={`nav-button ${currentSpreadIndex >= pages.length - (isMobile ? 1 : 2) ? 'disabled' : ''}`}
                        onClick={handleNext}
                        onDragEnter={() => handleEdgeDragEnter('next')}
                        onDragLeave={handleEdgeDragLeave}
                    >
                        <i className="fa-solid fa-chevron-right fa-2x"></i>
                    </div>

                    <button
                        className="insert-btn"
                        onClick={() => handleAddPages('after')}
                        title="Insert Page After"
                    >
                        <i className="fa-solid fa-plus"></i>
                    </button>
                </div>
            </div>

            {pickingSlot && (
                <CardPickerModal
                    onClose={() => setPickingSlot(null)}
                    onSelectCard={handleCardSelected}
                    collectionOwner={collectionOwner}
                    loggedInUser={loggedInUser}
                />
            )}
        </div>
    );
};

export default BinderPage;


