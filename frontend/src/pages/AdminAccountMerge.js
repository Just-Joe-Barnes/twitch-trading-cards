import React, { useMemo, useState, useEffect } from 'react';
import { fetchWithAuth, searchAdminUsers } from '../utils/api';
import '../styles/AdminActions.css';
import '../styles/AdminAccountMerge.css';

const AdminAccountMerge = () => {
    const [source, setSource] = useState('');
    const [target, setTarget] = useState('');
    const [sourceSuggestions, setSourceSuggestions] = useState([]);
    const [targetSuggestions, setTargetSuggestions] = useState([]);
    const [sourceSelection, setSourceSelection] = useState(null);
    const [targetSelection, setTargetSelection] = useState(null);
    const [confirmText, setConfirmText] = useState('');
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const providerLabels = useMemo(() => ({
        twitch: 'Twitch',
        youtube: 'YouTube',
        tiktok: 'TikTok',
        unknown: 'Unknown',
    }), []);

    const formatSuggestion = (user, provider) => {
        const providerKey = provider?.provider || user.lastLoginProvider || 'unknown';
        const providerLabel = providerLabels[providerKey] || providerKey;
        const username = provider?.username || user.username;
        const identifier = user.id;
        const meta = user.email
            ? user.email
            : user.twitchId
                ? `Twitch ID ${user.twitchId}`
                : `User ID ${user.id}`;

        return {
            key: `${user.id}-${providerKey}-${username || 'account'}`,
            identifier,
            provider: providerKey,
            providerLabel,
            username,
            userId: user.id,
            meta,
        };
    };

    const expandSuggestions = (users = []) => {
        const expanded = [];
        users.forEach((user) => {
            const providers = Array.isArray(user.providers) && user.providers.length
                ? user.providers
                : [{ provider: user.lastLoginProvider || 'unknown', username: user.username }];
            providers.forEach((provider) => {
                expanded.push(formatSuggestion(user, provider));
            });
        });
        return expanded;
    };

    useEffect(() => {
        let isActive = true;
        if (!source || source.length < 2 || (sourceSelection && source === sourceSelection.identifier)) {
            setSourceSuggestions([]);
            return () => {};
        }
        const timeout = setTimeout(async () => {
            try {
                const results = await searchAdminUsers(source);
                if (isActive) {
                    setSourceSuggestions(expandSuggestions(results));
                }
            } catch (err) {
                if (isActive) {
                    setSourceSuggestions([]);
                }
            }
        }, 250);
        return () => {
            isActive = false;
            clearTimeout(timeout);
        };
    }, [source, sourceSelection, providerLabels]);

    useEffect(() => {
        let isActive = true;
        if (!target || target.length < 2 || (targetSelection && target === targetSelection.identifier)) {
            setTargetSuggestions([]);
            return () => {};
        }
        const timeout = setTimeout(async () => {
            try {
                const results = await searchAdminUsers(target);
                if (isActive) {
                    setTargetSuggestions(expandSuggestions(results));
                }
            } catch (err) {
                if (isActive) {
                    setTargetSuggestions([]);
                }
            }
        }, 250);
        return () => {
            isActive = false;
            clearTimeout(timeout);
        };
    }, [target, targetSelection, providerLabels]);

    const handleSelectSuggestion = (suggestion, type) => {
        if (type === 'source') {
            setSource(suggestion.identifier);
            setSourceSelection(suggestion);
            setSourceSuggestions([]);
        } else {
            setTarget(suggestion.identifier);
            setTargetSelection(suggestion);
            setTargetSuggestions([]);
        }
    };

    const handlePreview = async () => {
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const response = await fetchWithAuth('/api/admin/merge-users', {
                method: 'POST',
                body: JSON.stringify({
                    source: source.trim(),
                    target: target.trim(),
                    dryRun: true
                })
            });
            setSummary(response);
        } catch (err) {
            setError(err.message || 'Failed to preview merge.');
        } finally {
            setLoading(false);
        }
    };

    const handleMerge = async () => {
        if (confirmText.trim().toUpperCase() !== 'MERGE') {
            setError('Type MERGE to confirm.');
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const response = await fetchWithAuth('/api/admin/merge-users', {
                method: 'POST',
                body: JSON.stringify({
                    source: source.trim(),
                    target: target.trim(),
                    confirm: true
                })
            });
            setResult(response);
        } catch (err) {
            setError(err.message || 'Failed to merge accounts.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page admin-merge-page">
            <h1>Account Merge</h1>

            <section className="section-card admin-merge-card">
                <h2>Merge Accounts</h2>
                <p className="admin-merge-help">
                    Merge all data from the source account into the target account. This is not reversible.
                    Use the preview first to check conflicts.
                </p>

                <div className="aa-admin-actions-form admin-merge-form">
                    <div className="aa-form-group">
                        <label>Source identifier</label>
                        <input
                            type="text"
                            value={source}
                            onChange={(e) => {
                                setSource(e.target.value);
                                setSourceSelection(null);
                            }}
                            placeholder="Username, email, Twitch ID, or user ID"
                        />
                        {sourceSelection && (
                            <div className={`admin-merge-selected provider-${sourceSelection.provider}`}>
                                Selected:
                                <span className={`provider-label provider-${sourceSelection.provider}`}>
                                    {sourceSelection.providerLabel}
                                </span>
                                <span className="provider-username">{sourceSelection.username}</span>
                                <span className="provider-meta">{sourceSelection.meta}</span>
                            </div>
                        )}
                        {sourceSuggestions.length > 0 && (
                            <div className="admin-merge-suggestions">
                                {sourceSuggestions.map((suggestion) => (
                                    <button
                                        key={suggestion.key}
                                        type="button"
                                        className={`admin-merge-suggestion provider-${suggestion.provider}`}
                                        onClick={() => handleSelectSuggestion(suggestion, 'source')}
                                    >
                                        <span className={`provider-label provider-${suggestion.provider}`}>
                                            {suggestion.providerLabel}
                                        </span>
                                        <span className="provider-username">{suggestion.username}</span>
                                        <span className="provider-meta">{suggestion.meta}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <p className="admin-merge-hint">
                            Search by username, email, Twitch ID, or user ID. Suggestions show the account origin.
                        </p>
                    </div>
                    <div className="aa-form-group">
                        <label>Target identifier</label>
                        <input
                            type="text"
                            value={target}
                            onChange={(e) => {
                                setTarget(e.target.value);
                                setTargetSelection(null);
                            }}
                            placeholder="Username, email, Twitch ID, or user ID"
                        />
                        {targetSelection && (
                            <div className={`admin-merge-selected provider-${targetSelection.provider}`}>
                                Selected:
                                <span className={`provider-label provider-${targetSelection.provider}`}>
                                    {targetSelection.providerLabel}
                                </span>
                                <span className="provider-username">{targetSelection.username}</span>
                                <span className="provider-meta">{targetSelection.meta}</span>
                            </div>
                        )}
                        {targetSuggestions.length > 0 && (
                            <div className="admin-merge-suggestions">
                                {targetSuggestions.map((suggestion) => (
                                    <button
                                        key={suggestion.key}
                                        type="button"
                                        className={`admin-merge-suggestion provider-${suggestion.provider}`}
                                        onClick={() => handleSelectSuggestion(suggestion, 'target')}
                                    >
                                        <span className={`provider-label provider-${suggestion.provider}`}>
                                            {suggestion.providerLabel}
                                        </span>
                                        <span className="provider-username">{suggestion.username}</span>
                                        <span className="provider-meta">{suggestion.meta}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <p className="admin-merge-hint">
                            Search by username, email, Twitch ID, or user ID. Suggestions show the account origin.
                        </p>
                    </div>

                    <div className="button-group">
                        <button type="button" onClick={handlePreview} disabled={loading}>
                            {loading ? 'Loading...' : 'Preview Merge'}
                        </button>
                    </div>
                </div>
            </section>

            <section className="section-card danger-zone admin-merge-danger">
                <h2>Confirm Merge</h2>
                <p>Type <strong>MERGE</strong> to confirm and then click merge.</p>
                <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="MERGE"
                />
                <div className="button-group">
                    <button
                        type="button"
                        className="reject-button"
                        onClick={handleMerge}
                        disabled={loading}
                    >
                        {loading ? 'Merging...' : 'Merge Accounts'}
                    </button>
                </div>
            </section>

            {error && (
                <div className="section-card admin-merge-error">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {summary && (
                <section className="section-card admin-merge-summary">
                    <h2>Preview Summary</h2>
                    <pre>{JSON.stringify(summary, null, 2)}</pre>
                </section>
            )}

            {result && (
                <section className="section-card admin-merge-summary">
                    <h2>Merge Result</h2>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </section>
            )}
        </div>
    );
};

export default AdminAccountMerge;
