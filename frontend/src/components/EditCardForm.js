import React, { useState, useEffect, useMemo } from 'react';
import BaseCard from './BaseCard';
import { rarities } from "../constants/rarities";
import { fetchWithAuth } from "../utils/api";
import CardSearchInput from './CardSearchInput';

const EditCardForm = ({ onClose, onSubmit }) => {
    const [selectedCard, setSelectedCard] = useState(null);
    const [editData, setEditData] = useState(null);
    const [previewRarity, setPreviewRarity] = useState('Basic');
    const [loading, setLoading] = useState(false);
    const [allCards, setAllCards] = useState([]);
    const [cardsLoading, setCardsLoading] = useState(false);
    const [cardsError, setCardsError] = useState('');
    const [cardSearch, setCardSearch] = useState('');
    const [sortOrder, setSortOrder] = useState('asc');

    const getNameForSort = (name) => name.toLowerCase().startsWith('the ') ? name.substring(4) : name;

    useEffect(() => {
        if (selectedCard) {
            setEditData({
                _id: selectedCard._id,
                name: selectedCard.name,
                flavorText: selectedCard.flavorText || '',
                lore: selectedCard.lore || '',
                loreAuthor: selectedCard.loreAuthor || '',
                imageUrl: selectedCard.imageUrl || '',
                alwaysAvailable: selectedCard.availableFrom === null && selectedCard.availableTo === null,
                availableFrom: selectedCard.availableFrom ? new Date(selectedCard.availableFrom).toISOString().slice(0, 10) : '',
                availableTo: selectedCard.availableTo ? new Date(selectedCard.availableTo).toISOString().slice(0, 10) : '',
                isHidden: selectedCard.isHidden || false,
                gameTags: Array.isArray(selectedCard.gameTags) ? selectedCard.gameTags.join(', ') : '',
            });
            setPreviewRarity('Basic');
        } else {
            setEditData(null);
        }
    }, [selectedCard]);

    useEffect(() => {
        let isMounted = true;
        const fetchCards = async () => {
            try {
                setCardsLoading(true);
                const res = await fetchWithAuth('/api/admin/cards');
                const all = [];
                Object.values(res.groupedCards || {}).forEach(cards => all.push(...cards));
                const uniqueCards = Array.from(new Map(all.map(card => [card.name, card])).values());
                uniqueCards.sort((a, b) => getNameForSort(a.name).localeCompare(getNameForSort(b.name)));
                if (isMounted) {
                    setAllCards(uniqueCards);
                    setCardsError('');
                }
            } catch (error) {
                console.error('Error fetching cards for quick edit:', error);
                if (isMounted) {
                    setCardsError('Failed to load cards.');
                }
            } finally {
                if (isMounted) {
                    setCardsLoading(false);
                }
            }
        };
        fetchCards();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleFieldChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!editData || !editData.name) {
            window.showToast('Please ensure a card is loaded before changing the image.', 'error');
            e.target.value = null;
            return;
        }
        const formData = new FormData();
        formData.append('image', file);
        formData.append('cardName', editData.name);
        try {
            const data = await fetchWithAuth('/api/admin/upload-image', { method: 'POST', body: formData });
            if (data && data.imageUrl) {
                setEditData(prev => ({...prev, imageUrl: data.imageUrl}));
                window.showToast('Image updated successfully!', 'success');
            }
        } catch (error) {
            window.showToast(error.message || 'Image upload failed.', 'error');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        const parsedTags = editData.gameTags
            ? editData.gameTags.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0)
            : [];
        onSubmit({ ...editData, gameTags: parsedTags }).finally(() => setLoading(false));
    };

    const filteredCards = useMemo(() => {
        const term = cardSearch.trim().toLowerCase();
        const filtered = term
            ? allCards.filter(card => card.name.toLowerCase().includes(term))
            : allCards.slice();
        filtered.sort((a, b) => {
            const nameA = getNameForSort(a.name);
            const nameB = getNameForSort(b.name);
            return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
        return filtered;
    }, [allCards, cardSearch, sortOrder]);

    return (
        <div className="section-card">
            <h2>Edit Existing Card</h2>
            <div className="form-group">
                <label>Find Card</label>
                <CardSearchInput onCardSelect={setSelectedCard} initialCardId={selectedCard?._id} displayRarity={previewRarity} />
            </div>

            {editData && (
                <form className="add-event-form" onSubmit={handleSubmit} style={{marginTop: '2rem'}}>
                    <div className="form-column">
                        <div className="form-group">
                            <label htmlFor="name-edit">Card Name</label>
                            <input id="name-edit" name="name" type="text" value={editData.name} onChange={handleFieldChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="flavorText-edit">Flavor Text</label>
                            <textarea id="flavorText-edit" name="flavorText" value={editData.flavorText} onChange={handleFieldChange} rows="3" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="lore-edit">Lore (Optional)</label>
                            <textarea id="lore-edit" name="lore" value={editData.lore} onChange={handleFieldChange}
                                      placeholder="Enter card lore" rows="4"/>
                        </div>
                        <div className="form-group">
                            <label htmlFor="loreAuthor-edit">Lore Author (Optional)</label>
                            <input id="loreAuthor-edit" name="loreAuthor" type="text" value={editData.loreAuthor}
                                   onChange={handleFieldChange}
                                   placeholder="e.g., The Just Joe Show"/>
                        </div>
                        <div className="form-group">
                            <label htmlFor="image-edit">Change Image</label>
                            <input id="image-edit" type="file" accept="image/*,.gif" onChange={handleImageUpload} />
                            {editData.imageUrl && <p className="image-url-preview">Current URL: <a href={editData.imageUrl} target="_blank" rel="noopener noreferrer">View Image</a></p>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="gameTags-edit">Game Tags (comma separated)</label>
                            <input
                                id="gameTags-edit"
                                name="gameTags"
                                type="text"
                                value={editData.gameTags}
                                onChange={handleFieldChange}
                                placeholder="Elden Ring, Cyberpunk 2077"
                            />
                        </div>
                        <div className="form-group checkbox-group">
                            <input id="alwaysAvailable-edit" name="alwaysAvailable" type="checkbox" checked={editData.alwaysAvailable} onChange={handleFieldChange} />
                            <label htmlFor="alwaysAvailable-edit">Always Available in Packs</label>
                        </div>
                        <div className="form-group checkbox-group">
                            <input id="isHidden-edit" name="isHidden" type="checkbox" checked={editData.isHidden} onChange={handleFieldChange} />
                            <label htmlFor="isHidden-edit">Hide card from front end</label>
                        </div>
                        {!editData.alwaysAvailable && (
                            <div className="date-range-inputs">
                                <div className="form-group">
                                    <label>Available From:</label>
                                    <input name="availableFrom" type="date" value={editData.availableFrom} onChange={handleFieldChange} />
                                </div>
                                <div className="form-group">
                                    <label>Available To:</label>
                                    <input name="availableTo" type="date" value={editData.availableTo} onChange={handleFieldChange} />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-column">
                        <h3>Live Preview</h3>
                        <div className="card-preview-container card-tile-grid">
                            <div className="card-tile">
                                <BaseCard
                                    name={editData.name}
                                    description={editData.flavorText}
                                    image={editData.imageUrl}
                                    rarity={previewRarity}
                                />
                            </div>
                            <div className="card-tile">
                                <div style={{height: '200px'}}>
                                    <BaseCard
                                        name={editData.name}
                                        description={editData.flavorText}
                                        image={editData.imageUrl}
                                        rarity={previewRarity}
                                        miniCard={true}

                                    />
                                </div>
                                <div className="actions">
                                    <select value={previewRarity} onChange={(e) => setPreviewRarity(e.target.value)}>
                                        {rarities.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="form-footer">
                        <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
                        <button type="submit" className="primary-button" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            )}
            <div className="section-card" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <h3>Quick Edit Library</h3>
                    <div className="button-group" style={{ margin: 0 }}>
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        >
                            Sort: {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                        </button>
                    </div>
                </div>
                <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label htmlFor="quick-edit-search">Search cards</label>
                    <input
                        id="quick-edit-search"
                        type="search"
                        value={cardSearch}
                        onChange={(e) => setCardSearch(e.target.value)}
                        placeholder="Type a card name..."
                    />
                </div>
                {cardsLoading && <p>Loading cards...</p>}
                {cardsError && <p>{cardsError}</p>}
                {!cardsLoading && !cardsError && (
                    <div className="cards-grid mini" style={{ marginTop: '1rem' }}>
                        {filteredCards.length > 0 ? (
                            filteredCards.map((card) => {
                                const isEventCard = card.rarities && card.rarities.some(r => r.rarity === 'Event');
                                const displayRarity = isEventCard ? 'Event' : 'Basic';
                                const isSelected = selectedCard && selectedCard._id === card._id;
                                return (
                                    <div key={card._id} style={{ textAlign: 'center' }}>
                                        <BaseCard
                                            name={card.name}
                                            description={card.flavorText}
                                            image={card.imageUrl}
                                            rarity={displayRarity}
                                            miniCard={true}
                                        />
                                        <button
                                            type="button"
                                            className={isSelected ? 'success-button' : 'primary-button'}
                                            style={{ marginTop: '0.5rem' }}
                                            onClick={() => setSelectedCard(card)}
                                        >
                                            {isSelected ? 'Editing' : 'Edit'}
                                        </button>
                                    </div>
                                );
                            })
                        ) : (
                            <p>No cards match your search.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditCardForm;
