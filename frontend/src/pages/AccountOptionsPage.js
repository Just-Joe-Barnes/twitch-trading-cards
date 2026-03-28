import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
    fetchUserProfile,
    startLinkProvider,
    updateUsernameFromLinkedAccount,
    fetchAllPacks,
    updatePreferredPack,
    updateSelectedTitle,
} from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/AccountOptionsPage.css';
import { normalizeTitleEffect } from '../utils/titleEffects';

const AccountOptionsPage = () => {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [externalAccounts, setExternalAccounts] = useState([]);
    const [selectedUsername, setSelectedUsername] = useState('');
    const [savingUsername, setSavingUsername] = useState(false);
    const [linkingProvider, setLinkingProvider] = useState('');
    const location = useLocation();

    const [preferredPackId, setPreferredPackId] = useState('');
    const [packOptions, setPackOptions] = useState([]);
    const [selectedTitle, setSelectedTitle] = useState(null);
    const [unlockedTitles, setUnlockedTitles] = useState([]);
    const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);

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
                setPreferredPackId(me.preferredPack?._id || '');
                setSelectedTitle(me.selectedTitle || null);
                setUnlockedTitles(me.unlockedTitles || []);

                const packs = await fetchAllPacks();
                setPackOptions(packs);
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

    const tiktokAccount = useMemo(
        () => externalAccounts.find((account) => account.provider === 'tiktok'),
        [externalAccounts]
    );

    const formatNumber = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '—';
        return numeric.toLocaleString();
    };

    const formatTimestamp = (value) => {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleString();
    };

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

    const handleTitleChange = async (titleId) => {
        const selectedId = titleId || '';
        try {
            const res = await updateSelectedTitle(selectedId);
            setSelectedTitle(res.selectedTitle || null);
        } catch (err) {
            console.error('Error updating title:', err);
            if (window.showToast) {
                window.showToast('Error updating title.', 'error');
            }
        }
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsTitleModalOpen(false);
            }
        };
        if (isTitleModalOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isTitleModalOpen]);

    const renderTitleLabel = (title) => {
        if (!title) {
            return <span className="title-select-placeholder">No title</span>;
        }
        const titleName = title?.name || title?.slug;
        if (!titleName) {
            return <span className="title-select-placeholder">Untitled</span>;
        }
        const hasGradient = Boolean(title?.gradient && String(title.gradient).trim());
        const effectSlug = normalizeTitleEffect(title?.effect);
        const effectClass = effectSlug ? ` title-effect title-effect-${effectSlug}` : '';
        const titleStyle = hasGradient
            ? { '--title-gradient': title.gradient }
            : { color: title?.color || 'inherit' };
        const titleClassName = `title-select-text user-title-text${hasGradient ? ' gradient' : ''}${title?.isAnimated ? ' animated' : ''}${effectClass}`;
        return (
            <span className={titleClassName} style={titleStyle}>
                {titleName}
            </span>
        );
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <>
            <div className="page account-options">
                <h1>Account Options</h1>

                <div className="account-options-grid">
                    <div className="account-options-col">
                        <div className="section-card">
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

                        <div className="section-card">
                            <h2>Preferred Pack</h2>
                            <p className="account-options-help">
                                When you earn a pack, it will be of this type.
                            </p>
                            <div className="account-options-row">
                                <select
                                    value={preferredPackId}
                                    onChange={async (e) => {
                                        const id = e.target.value;
                                        setPreferredPackId(id);
                                        try {
                                            await updatePreferredPack(id);
                                        } catch (err) {
                                            console.error('Error updating preferred pack:', err);
                                        }
                                    }}
                                >
                                    <option value="">Select a pack</option>
                                    {packOptions.map((p) => (
                                        <option key={p._id} value={p._id}>
                                            {p.name || p.type || 'Unnamed'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="section-card">
                            <h2>Title</h2>
                            <p className="account-options-help">
                                Choose a title to display next to your username.
                            </p>
                            <div className="account-options-row">
                                <button
                                    type="button"
                                    className="title-select-toggle"
                                    onClick={() => setIsTitleModalOpen(true)}
                                >
                                    <span className="title-select-value">
                                        {renderTitleLabel(selectedTitle)}
                                    </span>
                                    <i className="fa-solid fa-list"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="account-options-col">
                        <div className="section-card">
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

                        <div className="section-card">
                            <h2>TikTok</h2>
                            <p className="account-options-help">
                                Progress toward packs earned from TikTok gifts.
                            </p>
                            {tiktokAccount ? (
                                <div className="tiktok-grid">
                                    <div className="tiktok-stat">
                                        <span className="tiktok-label">Username</span>
                                        <strong className="tiktok-value">
                                            {tiktokAccount.username ? `@${tiktokAccount.username}` : '—'}
                                        </strong>
                                    </div>
                                    <div className="tiktok-stat">
                                        <span className="tiktok-label">Coins toward pack</span>
                                        <strong className="tiktok-value">{formatNumber(tiktokAccount.coinBalance)}</strong>
                                    </div>
                                    <div className="tiktok-stat">
                                        <span className="tiktok-label">Coins to next pack</span>
                                        <strong className="tiktok-value">{formatNumber(tiktokAccount.coinsToNextPack)}</strong>
                                    </div>
                                    <div className="tiktok-stat">
                                        <span className="tiktok-label">Pending packs</span>
                                        <strong className="tiktok-value">{formatNumber(tiktokAccount.pendingPacks)}</strong>
                                    </div>
                                    <div className="tiktok-stat">
                                        <span className="tiktok-label">Total coins</span>
                                        <strong className="tiktok-value">{formatNumber(tiktokAccount.totalCoins)}</strong>
                                    </div>
                                    <div className="tiktok-stat">
                                        <span className="tiktok-label">Total packs awarded</span>
                                        <strong className="tiktok-value">{formatNumber(tiktokAccount.totalPacksAwarded)}</strong>
                                    </div>
                                    <div className="tiktok-stat">
                                        <span className="tiktok-label">Last event</span>
                                        <strong className="tiktok-value">{formatTimestamp(tiktokAccount.lastEventAt)}</strong>
                                    </div>
                                </div>
                            ) : (
                                <div className="tiktok-empty">
                                    No TikTok account linked yet. Link TikTok above to track gift progress.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {isTitleModalOpen && (
                <div className="title-modal-overlay" onClick={() => setIsTitleModalOpen(false)}>
                    <div className="title-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="title-modal-header">
                            <div>
                                <h2>Choose your title</h2>
                                <p>These are the titles you have unlocked.</p>
                            </div>
                            <button className="secondary-button" onClick={() => setIsTitleModalOpen(false)}>
                                <i className="fa-solid fa-xmark"></i> Close
                            </button>
                        </div>

                        <div className="title-modal-grid">
                            <button
                                type="button"
                                className={`title-modal-option${selectedTitle ? '' : ' selected'}`}
                                onClick={() => {
                                    handleTitleChange('');
                                    setIsTitleModalOpen(false);
                                }}
                            >
                                <div className="title-modal-label">{renderTitleLabel(null)}</div>
                                <div className="title-modal-desc">Show no title.</div>
                            </button>
                            {unlockedTitles.map((t) => (
                                <button
                                    key={t._id}
                                    type="button"
                                    className={`title-modal-option${selectedTitle?._id === t._id ? ' selected' : ''}`}
                                    onClick={() => {
                                        handleTitleChange(t._id);
                                        setIsTitleModalOpen(false);
                                    }}
                                >
                                    <div className="title-modal-label">{renderTitleLabel(t)}</div>
                                    {t.description && <div className="title-modal-desc">{t.description}</div>}
                                </button>
                            ))}
                            {unlockedTitles.length === 0 && (
                                <div className="title-modal-empty">No titles unlocked yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AccountOptionsPage;
