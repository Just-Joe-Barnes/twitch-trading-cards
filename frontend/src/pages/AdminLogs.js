import React, { useState, useEffect } from 'react';
import NavAdmin from "../components/NavAdmin";
import '../styles/AdminEventsPage.css';
import SearchableSelect from "../components/SearchableSelect";

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://192.168.0.136:5000';

// A helper function for making authenticated API calls.
const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(API_BASE_URL+url, { ...options, headers });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString();
};

const AdminLogPage = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        user: 'All',
        event: 'All',
    });
    const [uniqueUsers, setUniqueUsers] = useState([]);
    const [uniqueEvents, setUniqueEvents] = useState([]);

    // Fetch all logs from the API on component mount
    useEffect(() => {
        const loadLogs = async () => {
            try {
                setIsLoading(true);
                const data = await fetchWithAuth('/api/log');
                setLogs(data);

                const users = [...new Set(data.map(log => log.user?.username || 'Unknown User'))].sort();
                const events = [...new Set(data.map(log => log.event))].sort();
                setUniqueUsers(users);
                setUniqueEvents(events);
            } catch (error) {
                console.error("Failed to fetch logs:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadLogs();
    }, []);

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleClearFilters = () => {
        setFilters({
            user: 'All',
            event: 'All'
        });
    };

    const filteredLogs = logs.filter(log => {
        const matchesUser = filters.user === 'All' || (log.user?.username || 'Unknown User') === filters.user;
        const matchesEvent = filters.event === 'All' || log.event === filters.event;
        return matchesUser && matchesEvent;
    });

    if (isLoading) {
        return (
            <div className="page">
                <h1>Admin Log Dashboard</h1>
                <NavAdmin />
                <div className="section-card">Loading Logs...</div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="section-card">
                <h2>Log Filters</h2>
                <div className="filters-container">
                    <div className="form-group">
                        <label htmlFor="user-filter">Filter by User</label>
                        <SearchableSelect
                            options={uniqueUsers}
                            placeholder="Search users..."
                            onSelect={(selectedUser) => handleFilterChange('user', selectedUser)}
                            value={filters.user}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="message-filter">Filter by Event</label>
                        <SearchableSelect
                            options={uniqueEvents}
                            placeholder="Search events..."
                            onSelect={(selectedEvent) => handleFilterChange('event', selectedEvent)}
                            value={filters.event}
                        />
                    </div>

                    <div className="button-group">
                        <button className="secondary-button" onClick={handleClearFilters}>
                            Clear All Filters
                        </button>
                    </div>
                </div>
            </div>

            <div className="section-card">
                <h2>All Logged Events</h2>
                <div className="table-container">
                    <table className="events-table">
                        <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>User</th>
                            <th>Event</th>
                            <th>Message</th>
                            {/*<th width="40%">Data</th> /!* NEW COLUMN *!/*/}
                        </tr>
                        </thead>
                        <tbody>
                        {filteredLogs.length > 0 ? (
                            filteredLogs.map(log => (
                                <tr key={log._id}>
                                    <td>{formatTimestamp(log.createdAt)}</td>
                                    <td>{log.user?.username || 'Unknown User'}</td>
                                    <td>{log.event}</td>
                                    <td>{log.message || '—'}</td>
                                    {/*<LogDataCell data={log.data} /> /!* NEW COMPONENT *!/*/}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="empty-table-message">No events found with these filters.</td> {/* INCREASED COLSPAN */}
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminLogPage;
