import React, { useState } from 'react';
import BaseCard from './BaseCard';
import { rarities } from "../constants/rarities";
import { fetchWithAuth } from "../utils/api";

const CreateCardForm = ({ onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [flavorText, setFlavorText] = useState('');
    const [lore, setLore] = useState('');
    const [loreAuthor, setLoreAuthor] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [alwaysAvailable, setAlwaysAvailable] = useState(true);
    const [availableFrom, setAvailableFrom] = useState('');
    const [availableTo, setAvailableTo] = useState('');
    const [previewRarity, setPreviewRarity] = useState('Basic');
    const [loading, setLoading] = useState(false);
    const [eventCard, setEventCard] = useState(false);
    const [isHidden, setIsHidden] = useState(false);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!name) {
            window.showToast('Please enter a card name before uploading an image.', 'error');
            e.target.value = null;
            return;
        }

        const formData = new FormData();
        formData.append('image', file);
        formData.append('cardName', name);

        try {
            const data = await fetchWithAuth('/api/admin/upload-image', {
                method: 'POST',
                body: formData,
            });
            if (data && data.imageUrl) {
                setImageUrl(data.imageUrl);
                window.showToast('Image uploaded successfully!', 'success');
            }
        } catch (error) {
            window.showToast(error.message || 'Image upload failed.', 'error');
        }
    };

    const handleEventCardChange = (e) => {
        const isChecked = e.target.checked;
        setEventCard(isChecked);
        if (isChecked) {
            setPreviewRarity('Event');
        } else {
            setPreviewRarity('Basic'); // Reset to default when unchecked
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        onSubmit({
            name,
            flavorText,
            lore,
            loreAuthor,
            imageUrl,
            availableFrom: alwaysAvailable ? null : availableFrom || null,
            availableTo: alwaysAvailable ? null : availableTo || null,
            eventCard,
            isHidden,
        }).finally(() => setLoading(false));
    };

    return (
        <div className="section-card">
            <h2>Create New Card</h2>
            <form className="add-event-form" onSubmit={handleSubmit}>
                <div className="form-column">
                    <div className="form-group">
                        <label htmlFor="name">Card Name</label>
                        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                               placeholder="Enter card name" required/>
                    </div>
                    <div className="form-group">
                        <label htmlFor="flavorText">Flavor Text</label>
                        <textarea id="flavorText" value={flavorText} onChange={(e) => setFlavorText(e.target.value)}
                                  placeholder="Enter flavor text" rows="3"/>
                    </div>
                    <div className="form-group">
                        <label htmlFor="lore">Lore (Optional)</label>
                        <textarea id="lore" value={lore} onChange={(e) => setLore(e.target.value)}
                                  placeholder="Enter card lore" rows="4"/>
                    </div>
                    <div className="form-group">
                        <label htmlFor="loreAuthor">Lore Author (Optional)</label>
                        <input id="loreAuthor" type="text" value={loreAuthor}
                               onChange={(e) => setLoreAuthor(e.target.value)}
                               placeholder="e.g., The Just Joe Show"/>
                    </div>
                    <div className="form-group">
                        <label htmlFor="image">Upload Image</label>
                        <input id="image" type="file" accept="image/*,.gif" onChange={handleImageUpload}/>
                        {imageUrl && <p className="image-url-preview">URL: <a href={imageUrl} target="_blank"
                                                                              rel="noopener noreferrer">View Image</a>
                        </p>}
                    </div>
                    <div className="form-group checkbox-group">
                        <input id="alwaysAvailable" type="checkbox" checked={alwaysAvailable}
                               onChange={(e) => setAlwaysAvailable(e.target.checked)}/>
                        <label htmlFor="alwaysAvailable">Always Available in Packs</label>
                    </div>
                    <div className="form-group checkbox-group">
                        <input id="eventCard" type="checkbox" checked={eventCard}
                               onChange={handleEventCardChange}/>
                        <label htmlFor="eventCard">Event Rarity Card</label>
                    </div>
                    <div className="form-group checkbox-group">
                        <input id="isHidden" type="checkbox" checked={isHidden}
                               onChange={(e) => setIsHidden(e.target.checked)}/>
                        <label htmlFor="isHidden">Hide card from front end</label>
                    </div>
                    {!alwaysAvailable && (
                        <div className="date-range-inputs">
                            <div className="form-group">
                                <label>Available From:</label>
                                <input type="date" value={availableFrom}
                                       onChange={(e) => setAvailableFrom(e.target.value)}/>
                            </div>
                            <div className="form-group">
                                <label>Available To:</label>
                                <input type="date" value={availableTo}
                                       onChange={(e) => setAvailableTo(e.target.value)}/>
                            </div>
                        </div>
                    )}
                </div>

                <div className="form-column">
                    <h3>Live Preview</h3>
                    <div className="card-preview-container card-tile-grid">
                        <div className="card-tile">
                            <BaseCard
                                name={name || "Card Name"}
                                description={flavorText || "Card flavor text..."}
                                image={imageUrl}
                                rarity={previewRarity}
                            />
                        </div>
                        <div className="card-tile">
                            <div style={{height: '200px'}}>
                                <BaseCard
                                    name={name || "Card Name"}
                                    description={flavorText || "Card flavor text..."}
                                    image={imageUrl}
                                    rarity={previewRarity}
                                    miniCard={true}

                                />
                            </div>
                            <div className="actions">
                                <select value={previewRarity} onChange={(e) => setPreviewRarity(e.target.value)} disabled={eventCard}>
                                    {rarities.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-footer button-group">
                    <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
                    <button type="submit" className="primary-button" disabled={loading}>
                        {loading ? 'Saving...' : 'Create Card'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateCardForm;
