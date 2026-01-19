import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchUserProfile, startLinkProvider, updateUsernameFromLinkedAccount } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/AccountOptionsPage.css';

const AccountOptionsPage = () => {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [externalAccounts, setExternalAccounts] = useState([]);
    const [selectedUsername, setSelectedUsername] = useState('');
    const [savingUsername, setSavingUsername] = useState(false);
    const [linkingProvider, setLinkingProvider] = useState('');
    const location = useLocation();

    const providerLabels = {
        twitch: 'Twitch',
        youtube: 'YouTube',
        tiktok: 'TikTok',
    };

    const linkProviders = [
        { key: 'twitch', label: 'Twitch' },
        { key: 'youtube', label: 'YouTube' },
        { key: 'tiktok', label: 'TikTok' },
    ];

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const me = await fetchUserProfile();
                setProfile(me);
                setExternalAccounts(me.externalAccounts || []);
                setSelectedUsername(me.username || '');
            } catch (error) {
                console.error('Failed to load profile:', error);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const linked = params.get('linked');
        const linkError = params.get('linkError');
        if (linked && window.showToast) {
            window.showToast(`Linked ${providerLabels[linked] || linked}.`, 'success');
        }
        if (linkError && window.showToast) {
            window.showToast('Unable to link that account. Please contact support if this persists.', 'error');
        }
    }, [location.search]);

    const usernameOptions = useMemo(() => {
        const names = new Set();
        if (profile?.username) {
            names.add(profile.username);
        }
        for (const account of externalAccounts) {
            if (account?.username) {
                names.add(account.username);
            }
        }
        return Array.from(names);
    }, [profile, externalAccounts]);

    const handleSaveUsername = async () => {
        if (!selectedUsername || !profile) {
            return;
        }
        try {
            setSavingUsername(true);
            const response = await updateUsernameFromLinkedAccount(selectedUsername);
            setProfile((prev) => ({ ...prev, username: response.username }));
            window.dispatchEvent(new CustomEvent('profile-updated'));
            if (window.showToast) {
                window.showToast('Username updated.', 'success');
            }
        } catch (error) {
            console.error('Failed to update username:', error);
            if (window.showToast) {
                window.showToast(error.message || 'Unable to update username.', 'error');
            }
        } finally {
            setSavingUsername(false);
        }
    };

    const handleLinkProvider = async (provider) => {
        try {
            setLinkingProvider(provider);
            const redirectUrl = await startLinkProvider(provider);
            window.location.href = redirectUrl;
        } catch (error) {
            console.error('Error starting link flow:', error);
            if (window.showToast) {
                window.showToast('Failed to start link flow. Try again.', 'error');
            }
        } finally {
            setLinkingProvider('');
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="page account-options">
            <h1>Account Options</h1>

            <div className="section-card account-options-card">
                <h2>Display Username</h2>
                <p className="account-options-help">
                    Your username defaults to the first account you created. Choose a linked account name below if
                    you want it to show across Ned's Decks.
                </p>
                <div className="account-options-row">
                    <select
                        value={selectedUsername}
                        onChange={(e) => setSelectedUsername(e.target.value)}
                    >
                        {usernameOptions.map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                    <button
                        className="primary-button"
                        onClick={handleSaveUsername}
                        disabled={savingUsername || selectedUsername === profile?.username}
                    >
                        {savingUsername ? 'Saving...' : 'Save Username'}
                    </button>
                </div>
            </div>

            <div className="section-card linked-accounts">
                <h2>Linked Accounts</h2>
                <div className="linked-accounts-list">
                    {linkProviders.map((provider) => {
                        const linkedAccount = externalAccounts.find(
                            (account) => account.provider === provider.key
                        );
                        const isLinked = Boolean(linkedAccount);
                        const usernameLabel = linkedAccount?.username ? `@${linkedAccount.username}` : '';

                        return (
                            <div key={provider.key} className={`linked-account-row linked-account-${provider.key}`}>
                                <div className="linked-account-meta">
                                    <span className={`linked-account-badge linked-account-badge-${provider.key}`}>
                                        {provider.label}
                                    </span>
                                    <div className="linked-account-details">
                                        <div className="linked-account-status">
                                            {isLinked ? 'Linked' : 'Not linked'}
                                        </div>
                                        {usernameLabel && (
                                            <div className="linked-account-username">{usernameLabel}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="linked-account-actions">
                                    {isLinked ? (
                                        <span className="linked-account-linked">Connected</span>
                                    ) : (
                                        <button
                                            className="secondary-button"
                                            onClick={() => handleLinkProvider(provider.key)}
                                            disabled={linkingProvider === provider.key || provider.disabled}
                                        >
                                            {provider.disabled ? 'Coming soon' : (linkingProvider === provider.key ? 'Linking...' : 'Link')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <p className="account-options-help">
                    You can only link an account you sign in with. If a provider is already linked to someone else,
                    it will be rejected.
                </p>
            </div>
        </div>
    );
};

export default AccountOptionsPage;
