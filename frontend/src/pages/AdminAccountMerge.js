import React, { useState } from 'react';
import NavAdmin from '../components/NavAdmin';
import { fetchWithAuth } from '../utils/api';
import '../styles/AdminActions.css';
import '../styles/AdminAccountMerge.css';

const AdminAccountMerge = () => {
    const [source, setSource] = useState('');
    const [target, setTarget] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

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
        <div className="page">
            <h1>Account Merge</h1>
            <NavAdmin />

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
                            onChange={(e) => setSource(e.target.value)}
                            placeholder="Username, email, Twitch ID, or user ID"
                        />
                    </div>
                    <div className="aa-form-group">
                        <label>Target identifier</label>
                        <input
                            type="text"
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            placeholder="Username, email, Twitch ID, or user ID"
                        />
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
