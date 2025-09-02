import React, { useState, useEffect } from 'react';
import NavAdmin from "../components/NavAdmin";
import '../styles/AdminEventsPage.css';
import CardSearchInput from "../components/CardSearchInput";

// Added a constant for rarities to be used in the form
const rarities = [
    'Basic', 'Common', 'Standard', 'Uncommon', 'Rare',
    'Epic', 'Legendary', 'Mythic', 'Unique', 'Divine'
];

// A helper function for making authenticated API calls.
const fetchWithAuth = async (url, options = {}) => {
    // This function assumes it's running in an environment where the base URL is handled,
    // for example by a proxy in package.json or environment configuration.
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};


// Helper function to format dates into relative time (e.g., "in 2 days")
const formatRelativeTime = (date) => {
    const now = new Date();
    const seconds = Math.round((new Date(date) - now) / 1000);
    const absSeconds = Math.abs(seconds);
    const minutes = Math.round(absSeconds / 60);
    const hours = Math.round(absSeconds / 3600);
    const days = Math.round(absSeconds / 86400);

    // Using Intl.RelativeTimeFormat for localization and proper grammar
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (days > 0) return rtf.format(Math.sign(seconds) * days, 'day');
    if (hours > 0) return rtf.format(Math.sign(seconds) * hours, 'hour');
    if (minutes > 0) return rtf.format(Math.sign(seconds) * minutes, 'minute');
    return rtf.format(Math.sign(seconds) * seconds, 'second');
};


// Reusable Event Form Component
const EventForm = ({ eventToEdit, onClose, onSubmit }) => {
    const isEditing = !!eventToEdit;

    const getInitialFormData = () => {
        if (!isEditing) {
            return {
                name: '',
                description: '',
                startTime: '',
                endTime: '',
                triggerType: 'LOGIN',
                rewardType: 'CARD',
                rewardValue: '', // This will hold the cardId for CARD, or amount for others
                rarity: 'Random',
                isActive: true,
            };
        }

        const rewardValue = (eventToEdit.rewardType === 'XP' || eventToEdit.rewardType === 'PACK')
            ? eventToEdit.rewardDetails.amount
            : eventToEdit.rewardDetails.cardId || ''; // For CARD, it's the cardId

        return {
            name: eventToEdit.name,
            description: eventToEdit.description,
            startTime: new Date(eventToEdit.startTime).toISOString().slice(0, 16),
            endTime: new Date(eventToEdit.endTime).toISOString().slice(0, 16),
            triggerType: eventToEdit.triggerType,
            rewardType: eventToEdit.rewardType,
            rewardValue: rewardValue,
            rarity: eventToEdit.rewardDetails.rarity || 'Random',
            isActive: eventToEdit.isActive,
        };
    };

    const [formData, setFormData] = useState(getInitialFormData());

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    // --- 2. ADD A HANDLER FOR THE CARD SEARCH COMPONENT ---
    const handleCardSelection = (selectedCard) => {
        // Update the 'rewardValue' field in our form with the selected card's ID
        setFormData(prev => ({
            ...prev,
            rewardValue: selectedCard ? selectedCard._id : ''
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="section-card">
            <h2>{isEditing ? `Modify Event: ${eventToEdit.name}` : 'Add New Event'}</h2>
            <form className="add-event-form" onSubmit={handleSubmit}>
                <div className="form-column">
                    <div className="form-group">
                        <label htmlFor="name">Event Name</label>
                        <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} placeholder="e.g., Stream Launch Giveaway" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="description">Event Description</label>
                        <textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder="Describe the event for the users." rows="3" required></textarea>
                    </div>
                    <div className="form-group">
                        <label htmlFor="startTime">Start Time</label>
                        <input id="startTime" name="startTime" type="datetime-local" value={formData.startTime} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="endTime">End Time</label>
                        <input id="endTime" name="endTime" type="datetime-local" value={formData.endTime} onChange={handleChange} required />
                    </div>
                </div>

                <div className="form-column">
                    {/* ... (triggerType and rewardType selects are unchanged) ... */}
                    <div className="form-group">
                        <label htmlFor="triggerType">Trigger Type</label>
                        <select id="triggerType" name="triggerType" value={formData.triggerType} onChange={handleChange}>
                            <option value="LOGIN">LOGIN</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="rewardType">Reward Type</label>
                        <select id="rewardType" name="rewardType" value={formData.rewardType} onChange={handleChange}>
                            <option value="CARD">CARD</option>
                            <option value="PACK">PACK</option>
                            <option value="XP">XP</option>
                        </select>
                    </div>

                    {/* --- 3. REPLACE THE REWARD INPUT WITH DYNAMIC LOGIC --- */}
                    {formData.rewardType === 'CARD' ? (
                        <div className="form-group">
                            <label htmlFor="rewardValue">Reward Card</label>
                            <CardSearchInput
                                onCardSelect={handleCardSelection}
                                initialCardId={formData.rewardValue}
                                displayRarity={formData?.rarity}
                            />
                        </div>
                    ) : (
                        <div className="form-group">
                            <label htmlFor="rewardValue">Reward Amount</label>
                            <input
                                id="rewardValue"
                                name="rewardValue"
                                type="number"
                                value={formData.rewardValue}
                                onChange={handleChange}
                                placeholder="Pack amount or XP amount"
                                required
                            />
                        </div>
                    )}

                    {/* Conditional Rarity Dropdown (This logic is still correct) */}
                    {formData.rewardType === 'CARD' && (
                        <div className="form-group">
                            <label htmlFor="rarity">Rarity</label>
                            <select id="rarity" name="rarity" value={formData.rarity} onChange={handleChange}>
                                <option value="Random">Random</option>
                                {rarities.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    )}

                    {/* ... (The 'isActive' checkbox is unchanged) ... */}
                    <div className="form-group checkbox-group">
                        <input id="isActive" name="isActive" type="checkbox" checked={formData.isActive} onChange={handleChange} />
                        <label htmlFor="isActive">Event is Active</label>
                    </div>
                </div>


                <div className="form-footer">
                    <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
                    <button type="submit" className="primary-button">{isEditing ? 'Save Changes' : 'Create Event'}</button>
                </div>
            </form>
        </div>
    );
};

// Component to display the formatted date and update it periodically
const DateTimeDisplay = ({ date }) => {
    const [relativeTime, setRelativeTime] = useState(formatRelativeTime(date));

    useEffect(() => {
        const timer = setInterval(() => {
            setRelativeTime(formatRelativeTime(date));
        }, 60000);

        return () => clearInterval(timer);
    }, [date]);

    return (
        <div className="date-cell">
            <span className="relative-time">{relativeTime}</span>
            <span className="full-timestamp">{new Date(date).toLocaleString()}</span>
        </div>
    );
};


const EventRow = ({ event, onEdit, onToggleActive }) => {
    const now = new Date();
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    let status;

    if (!event.isActive) {
        status = 'Disabled';
    } else if (now > endTime) {
        status = 'Expired';
    } else if (now < startTime) {
        status = 'Scheduled';
    } else {
        status = 'Active';
    }

    const rewardString = event.rewardType === 'CARD'
        ? `Card (${(event.rewardDetails.cardId || '').slice(-4)}) - ${event.rewardDetails.rarity}`
        : event.rewardType === 'PACK'
            ? `Pack (${(event.rewardDetails.amount || '').toString()})`
            : `XP (${event.rewardDetails.amount || 0})`;

    return (
        <tr>
            <td>{event.name}</td>
            <td>{event.triggerType}</td>
            <td>{rewardString}</td>
            <td><DateTimeDisplay date={event.startTime} /></td>
            <td><DateTimeDisplay date={event.endTime} /></td>
            <td>
                <span className="status-badge" data-status={status.toLowerCase()}>
                    {status}
                </span>
            </td>
            <td>
                <div className="button-group">
                    <button className="secondary-button sm" onClick={() => onEdit(event)}>Edit</button>
                    <button
                        className={event.isActive ? "reject-button sm" : "success-button sm"}
                        onClick={() => onToggleActive(event._id)}
                    >
                        {event.isActive ? 'Disable' : 'Enable'}
                    </button>
                </div>
            </td>
        </tr>
    );
};

const AdminEvents = () => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [eventToEdit, setEventToEdit] = useState(null);

    // Fetch all events from the API on component mount
    useEffect(() => {
        const loadEvents = async () => {
            try {
                setIsLoading(true);
                const data = await fetchWithAuth('/api/events');
                setEvents(data);
            } catch (error) {
                console.error("Failed to fetch events:", error);
                // You could add a toast notification here for the user
            } finally {
                setIsLoading(false);
            }
        };
        loadEvents();
    }, []);


    const now = new Date();

    const currentEvents = events
        .filter(e => new Date(e.endTime) > now && e.isActive)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    const pastEvents = events
        .filter(e => new Date(e.endTime) <= now || !e.isActive)
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    const handleCreateNew = () => {
        setEventToEdit(null);
        setIsFormVisible(true);
    };

    const handleEdit = (event) => {
        setEventToEdit(event);
        setIsFormVisible(true);
    };

    const handleCloseForm = () => {
        setIsFormVisible(false);
        setEventToEdit(null);
    };

    const handleToggleActive = async (eventId) => {
        try {
            const updatedEvent = await fetchWithAuth(`/api/events/${eventId}/toggle`, { method: 'PUT' });
            setEvents(prevEvents =>
                prevEvents.map(event => (event._id === eventId ? updatedEvent : event))
            );
        } catch (error) {
            console.error("Failed to toggle event status:", error);
        }
    };

    const handleFormSubmit = async (formData) => {
        const formatPayload = (data) => {
            const payload = {
                name: data.name,
                description: data.description,
                startTime: new Date(data.startTime).toISOString(),
                endTime: new Date(data.endTime).toISOString(),
                triggerType: data.triggerType,
                rewardType: data.rewardType,
                isActive: data.isActive,
                rewardDetails: {},
            };
            if (data.rewardType === 'XP' || data.rewardType === 'PACK') {
                payload.rewardDetails.amount = parseInt(data.rewardValue, 10) || 0;
            } else if (data.rewardType === 'CARD') {
                payload.rewardDetails.cardId = data.rewardValue;
                payload.rewardDetails.rarity = data.rarity; // Add rarity to the payload
            }
            return payload;
        };

        const payload = formatPayload(formData);

        try {
            if (eventToEdit) {
                // Update existing event
                const updatedEvent = await fetchWithAuth(`/api/events/${eventToEdit._id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
                setEvents(prev => prev.map(e => e._id === eventToEdit._id ? updatedEvent : e));
            } else {
                // Create new event
                const newEvent = await fetchWithAuth('/api/events', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                setEvents(prev => [...prev, newEvent]);
            }
            handleCloseForm();
        } catch (error) {
            console.error("Failed to save event:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="page">
                <h1>Admin Events Management</h1>
                <NavAdmin />
                <div className="section-card">Loading Events...</div>
            </div>
        );
    }

    return (
        <div className="page">
            <h1>Admin Events Management</h1>
            <NavAdmin />

            {isFormVisible ? (
                <EventForm
                    eventToEdit={eventToEdit}
                    onClose={handleCloseForm}
                    onSubmit={handleFormSubmit}
                />
            ) : (
                <div className="section-card" style={{ textAlign: 'center' }}>
                    <button className="primary-button lg" onClick={handleCreateNew}>Create New Event</button>
                </div>
            )}

            <div className="section-card">
                <h2>Current & Scheduled Events</h2>
                <div className="table-container">
                    <table className="events-table">
                        <thead>
                        <tr>
                            <th>Name</th>
                            <th>Trigger</th>
                            <th>Reward</th>
                            <th>Starts</th>
                            <th>Ends</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {currentEvents.map(event => <EventRow key={event._id} event={event} onEdit={handleEdit} onToggleActive={handleToggleActive} />)}
                        {currentEvents.length === 0 && (
                            <tr>
                                <td colSpan="7" className="empty-table-message">No active or scheduled events.</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="section-card">
                <h2>Past Events</h2>
                <div className="table-container">
                    <table className="events-table">
                        <thead>
                        <tr>
                            <th>Name</th>
                            <th>Trigger</th>
                            <th>Reward</th>
                            <th>Starts</th>
                            <th>Ends</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {pastEvents.map(event => <EventRow key={event._id} event={event} onEdit={handleEdit} onToggleActive={handleToggleActive} />)}
                        {pastEvents.length === 0 && (
                            <tr>
                                <td colSpan="7" className="empty-table-message">No past events found.</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminEvents;
