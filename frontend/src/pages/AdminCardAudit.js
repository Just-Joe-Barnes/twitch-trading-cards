import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchUserProfile,
    fetchAdminCardAudit,
    fixCardDefinitionInconsistencies,
    fixDuplicateAndMintZeroCards,
    fixCardDataMismatches,
    fixMissingModifierPrefixes, fixLegacyGlitchNames,
    backfillTradeSnapshots
} from '../utils/api';

const AdminCardAudit = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [auditData, setAuditData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fixStatus, setFixStatus] = useState(null);
    const [prefixFixStatus, setPrefixFixStatus] = useState(null);
    const [legacyGlitchFixStatus, setLegacyGlitchFixStatus] = useState(null);
    const [duplicateFixStatus, setDuplicateFixStatus] = useState(null);
    const [mismatchFixStatus, setMismatchFixStatus] = useState(null);
    const [tradeFixStatus, setTradeFixStatus] = useState(null);
    const [showDetails, setShowDetails] = useState({
        malformedUserCards: false,
        missingParentCardDefinitions: false,
        missingRarityDefinitions: false,
        duplicateMintNumbersInCardDef: false,
        userCardsToReroll: false,
        noMintNumbersLeftForReroll: false,
        trueDuplicateCardInstancesAcrossUsers: false,
        mint0Cards: false,
        cardDataMismatches: false,
        missingModifierPrefixIssues: false,
        legacyGlitchNameIssues: false,
    });

    const navigate = useNavigate();

    const loadAuditData = async () => {
        setLoading(true);
        setError(null);
        setFixStatus(null);
        setDuplicateFixStatus(null);
        setMismatchFixStatus(null);
        setPrefixFixStatus(null);
        setLegacyGlitchFixStatus(null);
        setTradeFixStatus(null);
        try {
            const data = await fetchAdminCardAudit();
            setAuditData(data);
        } catch (fetchError) {
            setError(fetchError.message || 'Failed to load audit data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const checkAdminAndFetch = async () => {
            try {
                const profile = await fetchUserProfile();
                if (!profile.isAdmin) {
                    navigate('/');
                } else {
                    setIsAdmin(true);
                    loadAuditData();
                }
            } catch (authError) {
                navigate('/');
            }
        };
        checkAdminAndFetch();
    }, [navigate]);

    const toggleDetails = (section) => {
        setShowDetails(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleFixLegacyGlitchNames = async (performActualFix = false) => {
        const confirmationMessage = performActualFix
            ? "Are you absolutely sure you want to PERMANENTLY fix all legacy 'Glitch ' names to 'Glitched '?\n\n" +
            "This action will update all card names starting with the old prefix. This cannot be undone."
            : "Initiating a DRY RUN to fix legacy 'Glitch ' names.\n\n" +
            "This will show you what *would* be fixed without making any changes to the database. Proceed?";

        if (!window.confirm(confirmationMessage)) {
            setLegacyGlitchFixStatus({ status: 'info', message: 'Operation cancelled by user.' });
            return;
        }

        setLegacyGlitchFixStatus({ status: 'pending', message: `Performing ${performActualFix ? 'actual fix' : 'dry run'}... Please wait...` });

        try {
            const result = await fixLegacyGlitchNames({ dryRun: !performActualFix });
            setLegacyGlitchFixStatus({ ...result, status: 'success' });

            if (!result.isDryRun) {
                await loadAuditData();
            }
        } catch (err) {
            setLegacyGlitchFixStatus({ status: 'error', message: `Operation failed: ${err.message || 'Unknown error.'}` });
        }
    };

    const handleBackfillTradeSnapshots = async (performActualFix = false) => {
        const confirmationMessage = performActualFix
            ? "Are you absolutely sure you want to PERMANENTLY backfill snapshot data for all legacy trades?\n\n" +
            "This action will update old trade records. This cannot be undone."
            : "Initiating a DRY RUN to find legacy trades.\n\n" +
            "This will show you how many trades would be fixed without changing the database. Proceed?";

        if (!window.confirm(confirmationMessage)) {
            setTradeFixStatus({ status: 'info', message: 'Operation cancelled by user.' });
            return;
        }

        setTradeFixStatus({ status: 'pending', message: `Performing ${performActualFix ? 'actual fix' : 'dry run'}... This may take a moment...` });

        try {
            const result = await backfillTradeSnapshots({ dryRun: !performActualFix });
            setTradeFixStatus({ ...result, status: 'success' });
        } catch (err) {
            setTradeFixStatus({ status: 'error', message: `Operation failed: ${err.message || 'Unknown error.'}` });
        }
    };


    // --- Handler for the NEW "Card Data Mismatches" Fix ---
    const handleFixMismatches = async (performActualFix = false) => {
        const confirmationMessage = performActualFix
            ? "Are you absolutely sure you want to PERMANENTLY fix ALL 'Card Data Mismatches'?\n\n" +
            "This action will update user card data (like image URLs and flavor text) to match the master card definitions. This action cannot be undone."
            : "Initiating a DRY RUN for 'Card Data Mismatches'.\n\n" +
            "This will show you what *would* be fixed without making any changes to the database. Proceed?";

        if (!window.confirm(confirmationMessage)) {
            setMismatchFixStatus({ status: 'info', message: 'Operation cancelled by user.' });
            return;
        }

        setMismatchFixStatus({ status: 'pending', message: `Performing ${performActualFix ? 'actual fix' : 'dry run'}... Please wait...` });

        try {
            const result = await fixCardDataMismatches({ dryRun: !performActualFix });
            setMismatchFixStatus({ ...result, status: 'success' }); // API returns a report object

            if (!result.isDryRun) {
                await loadAuditData(); // Reload data to see updated audit results
            }
        } catch (err) {
            setMismatchFixStatus({ status: 'error', message: `Operation failed: ${err.message || 'Unknown error.'}` });
        }
    };

    const handleFixMissingPrefixes = async (performActualFix = false) => {
        const confirmationMessage = performActualFix
            ? "Are you absolutely sure you want to PERMANENTLY fix ALL 'Missing Modifier Prefix Issues'?\n\n" +
            "This action will ADD prefixes (e.g., 'Glitched ') to card names based on their assigned modifier. This action cannot be undone."
            : "Initiating a DRY RUN for 'Missing Modifier Prefix Issues'.\n\n" +
            "This will show you what *would* be fixed without making any changes to the database. Proceed?";

        if (!window.confirm(confirmationMessage)) {
            setPrefixFixStatus({ status: 'info', message: 'Operation cancelled by user.' });
            return;
        }

        setPrefixFixStatus({ status: 'pending', message: `Performing ${performActualFix ? 'actual fix' : 'dry run'}... Please wait...` });

        try {
            // Call the new API function
            const result = await fixMissingModifierPrefixes({ dryRun: !performActualFix });
            setPrefixFixStatus({ ...result, status: 'success' });

            if (!result.isDryRun) {
                await loadAuditData();
            }
        } catch (err) {
            setPrefixFixStatus({ status: 'error', message: `Operation failed: ${err.message || 'Unknown error.'}` });
        }
    };

    // --- Existing handlers preserved from your old file ---
    const handleFixInconsistencies = async (performActualFix = false) => {
        const confirmationMessage = performActualFix
            ? "Are you absolutely sure you want to PERMANENTLY fix ALL 'Inconsistencies with Card Definition'?\n\n" +
            "This action will modify the database by removing problematic mint numbers from master card definitions " +
            "and decrementing remaining copies. This action cannot be undone."
            : "Initiating a DRY RUN for 'Inconsistencies with Card Definition'.\n\n" +
            "This will show you what *would* be fixed without making any changes to the database. Proceed?";

        if (!window.confirm(confirmationMessage)) {
            setFixStatus({ status: 'info', message: 'Operation cancelled by user.' });
            return;
        }

        setFixStatus({ status: 'pending', message: `Performing ${performActualFix ? 'actual fix' : 'dry run'}... Please wait...` });

        try {
            const sendAsDryRunToAPI = !performActualFix;
            const result = await fixCardDefinitionInconsistencies(sendAsDryRunToAPI);
            setFixStatus({
                status: result.status,
                message: result.message,
                fixedCount: result.fixedCount,
                failedCount: result.failedCount,
                isDryRun: result.isDryRun,
                failedFixes: result.failedFixes || []
            });

            if (!result.isDryRun) {
                await loadAuditData();
            }

        } catch (err) {
            setFixStatus({ status: 'error', message: `Operation failed: ${err.message || 'Unknown error.'}` });
        }
    };

    const handleFixDuplicateAndMintZeroCards = async (performActualFix = false) => {
        const confirmationMessage = performActualFix
            ? "Are you absolutely sure you want to PERMANENTLY fix ALL 'True Duplicate Card Instances Across Users' and 'Mint 0 Cards'?\n\n" +
            "This action will modify the database by rerolling mint numbers for duplicates and removing cards with mint 0. This action cannot be undone."
            : "Initiating a DRY RUN for 'True Duplicate Card Instances Across Users' and 'Mint 0 Cards'.\n\n" +
            "This will show you what *would* be fixed without making any changes to the database. Proceed?";

        if (!window.confirm(confirmationMessage)) {
            setDuplicateFixStatus({ status: 'info', message: 'Operation cancelled by user.' });
            return;
        }

        setDuplicateFixStatus({ status: 'pending', message: `Performing ${performActualFix ? 'actual fix' : 'dry run'} for duplicates/mint 0s... Please wait...` });

        try {
            const sendAsDryRunToAPI = !performActualFix;
            const result = await fixDuplicateAndMintZeroCards(sendAsDryRunToAPI);
            setDuplicateFixStatus({
                status: result.status,
                message: result.message,
                fixed: result.fixed, // Use 'fixed' object from API
                failed: result.failed, // Use 'failed' object from API
                isDryRun: result.isDryRun,
                fixPlan: result.fixPlan || []
            });

            if (!result.isDryRun) {
                await loadAuditData();
            }

        } catch (err) {
            setDuplicateFixStatus({ status: 'error', message: `Operation failed: ${err.message || 'Unknown error.'}` });
        }
    };

    if (!isAdmin) {
        return <div className="page" style={{ padding: '2rem', color: '#fff' }}>Not authorized. Redirecting...</div>;
    }

    if (loading) {
        return <div className="page" style={{ padding: '2rem', color: '#fff' }}>Loading audit data...</div>;
    }

    if (error) {
        return <div className="page" style={{ padding: '2rem', color: '#ff6b6b' }}>Error: {error}</div>;
    }

    if (!auditData) {
        return <div className="page" style={{ padding: '2rem', color: '#fff' }}>No audit data available.</div>;
    }

    const legacyGlitchCount = auditData.summary.legacyGlitchNameIssuesCount || 0;
    const prefixIssueCount = auditData.summary.missingModifierPrefixIssuesCount || 0;
    const mismatchCount = auditData.summary.cardDataMismatchesCount || 0;
    const inconsistenciesCount = auditData.summary.inconsistenciesWithCardDefCount || 0;
    const combinedDuplicateMint0Count = (auditData.summary.trueDuplicateCardInstancesAcrossUsersCount || 0) + (auditData.summary.mint0CardsCount || 0);

    return (
        <div className="page">
            <div className="section-card">
                <h2>Audit Summary</h2>
                <button onClick={loadAuditData} className="action-button" style={{ float: 'right' }}>Refresh Audit</button>
                <p>Status: <span style={{ color: auditData.status === 'success' ? '#4CAF50' : '#f44336' }}>{auditData.status}</span></p>
                <p>Timestamp: {new Date(auditData.timestamp).toLocaleString()}</p>

                <h3>Overall Statistics:</h3>
                <ul>
                    <li>Total Users Scanned: <strong>{auditData.summary.totalUsersScanned}</strong></li>
                    <li>Total Cards Scanned: <strong>{auditData.summary.totalCardsScanned}</strong></li>
                </ul>

                <hr style={{ borderColor: '#333', margin: '1.5rem 0' }} />

                <h2>Fixable Issues & Maintenance</h2>

                <div className="fix-section">
                    <h4>Legacy "Glitch " Name Issues: <strong>{legacyGlitchCount}</strong></h4>
                    <p className="fix-description">A card's name has the outdated "Glitch " prefix and should be updated to "Glitched ".</p>
                    {legacyGlitchCount > 0 && (
                        <div>
                            <button onClick={() => handleFixLegacyGlitchNames(false)} className="action-button" style={{ backgroundColor: '#6c757d' }} disabled={legacyGlitchFixStatus?.status === 'pending'}>Dry Run Fix</button>
                            {legacyGlitchFixStatus && legacyGlitchFixStatus.isDryRun && legacyGlitchFixStatus.details.updatedCards > 0 && (
                                <button onClick={() => handleFixLegacyGlitchNames(true)} className="action-button" style={{ backgroundColor: '#dc3545' }} disabled={legacyGlitchFixStatus?.status === 'pending'}>Confirm Fix</button>
                            )}
                        </div>
                    )}
                    {legacyGlitchFixStatus && (
                        <div className={`status-box ${legacyGlitchFixStatus.status}`}>
                            <strong>Legacy Fix Status:</strong> {legacyGlitchFixStatus.message}
                            {legacyGlitchFixStatus.details && (
                                <p>Report: {legacyGlitchFixStatus.details.updatedCards} cards would be updated across {legacyGlitchFixStatus.details.updatedUsers} users. Failed updates: {legacyGlitchFixStatus.details.failedUpdates.length}.</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="fix-section">
                    <h4>Missing Modifier Prefix Issues: <strong>{prefixIssueCount}</strong></h4>
                    <p className="fix-description">A card's name is missing a prefix (e.g., "Glitched ") that is required by its assigned <strong>modifier</strong>.</p>
                    {prefixIssueCount > 0 && (
                        <div>
                            <button onClick={() => handleFixMissingPrefixes(false)} className="action-button" style={{ backgroundColor: '#6c757d' }} disabled={prefixFixStatus?.status === 'pending'}>Dry Run Fix</button>
                            {prefixFixStatus && prefixFixStatus.isDryRun && prefixFixStatus.details.updatedCards > 0 && (
                                <button onClick={() => handleFixMissingPrefixes(true)} className="action-button" style={{ backgroundColor: '#dc3545' }} disabled={prefixFixStatus?.status === 'pending'}>Confirm Fix</button>
                            )}
                        </div>
                    )}
                    {prefixFixStatus && (
                        <div className={`status-box ${prefixFixStatus.status}`}>
                            <strong>Prefix Fix Status:</strong> {prefixFixStatus.message}
                            {prefixFixStatus.details && (
                                <p>Report: {prefixFixStatus.details.updatedCards} cards would be updated across {prefixFixStatus.details.updatedUsers} users. Failed updates: {prefixFixStatus.details.failedUpdates.length}.</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="fix-section">
                    <h4>Card Data Mismatches: <strong>{mismatchCount}</strong></h4>
                    <p className="fix-description">User cards have data (image, flavor text) that doesn't match the master card definition.</p>
                    {mismatchCount > 0 && (
                        <div>
                            <button onClick={() => handleFixMismatches(false)} className="action-button" style={{ backgroundColor: '#6c757d' }} disabled={mismatchFixStatus?.status === 'pending'}>Dry Run Fix</button>
                            {mismatchFixStatus && mismatchFixStatus.isDryRun && mismatchFixStatus.details.updatedCards > 0 && (
                                <button onClick={() => handleFixMismatches(true)} className="action-button" style={{ backgroundColor: '#dc3545' }} disabled={mismatchFixStatus?.status === 'pending'}>Confirm Fix</button>
                            )}
                        </div>
                    )}
                    {mismatchFixStatus && (
                        <div className={`status-box ${mismatchFixStatus.status}`}>
                            <strong>Mismatch Fix Status:</strong> {mismatchFixStatus.message}
                            {mismatchFixStatus.details && (
                                <p>Report: {mismatchFixStatus.details.updatedCards} cards would be updated across {mismatchFixStatus.details.updatedUsers} users. Failed updates: {mismatchFixStatus.details.failedUpdates.length}.</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="fix-section">
                    <h4>Inconsistencies with Card Definition: <strong>{inconsistenciesCount}</strong></h4>
                    <p className="fix-description">A user owns a card with a mint number that is still marked as 'available' in the master card definition.</p>
                    {inconsistenciesCount > 0 && (
                        <div>
                            <button onClick={() => handleFixInconsistencies(false)} className="action-button" style={{ backgroundColor: '#6c757d' }} disabled={fixStatus?.status === 'pending'}>Dry Run Fix</button>
                            {fixStatus && fixStatus.isDryRun && fixStatus.fixedCount > 0 && (
                                <button onClick={() => handleFixInconsistencies(true)} className="action-button" style={{ backgroundColor: '#dc3545' }} disabled={fixStatus?.status === 'pending'}>Confirm Fix</button>
                            )}
                        </div>
                    )}
                    {fixStatus && (
                        <div className={`status-box ${fixStatus.status}`}>
                            <strong>Inconsistency Fix Status:</strong> {fixStatus.message}
                            {typeof fixStatus.fixedCount !== 'undefined' && <p>Fixed: {fixStatus.fixedCount}, Failed: {fixStatus.failedCount}</p>}
                            {fixStatus.failedFixes && fixStatus.failedFixes.length > 0 && (
                                <div className="failed-fixes"><strong>Failed Fix Details:</strong><ul>{fixStatus.failedFixes.map((f, i) => <li key={i}>Card: {f.cardName} MINT-{f.mintNumber}, Reason: {f.reason}</li>)}</ul></div>
                            )}
                        </div>
                    )}
                </div>

                <div className="fix-section">
                    <h4>Duplicates & Mint 0 Cards: <strong>{combinedDuplicateMint0Count}</strong></h4>
                    <p className="fix-description">Two or more users own the exact same card instance (same mint number), or a card has an invalid mint number of 0.</p>
                    {combinedDuplicateMint0Count > 0 && (
                        <div>
                            <button onClick={() => handleFixDuplicateAndMintZeroCards(false)} className="action-button" style={{ backgroundColor: '#6c757d' }} disabled={duplicateFixStatus?.status === 'pending'}>Dry Run Fix</button>
                            {duplicateFixStatus && duplicateFixStatus.isDryRun && duplicateFixStatus.fixPlan?.length > 0 && (
                                <button onClick={() => handleFixDuplicateAndMintZeroCards(true)} className="action-button" style={{ backgroundColor: '#dc3545' }} disabled={duplicateFixStatus?.status === 'pending'}>Confirm Fix</button>
                            )}
                        </div>
                    )}
                    {duplicateFixStatus && (
                        <div className={`status-box ${duplicateFixStatus.status}`}>
                            <strong>Duplicate/Mint 0 Fix Status:</strong> {duplicateFixStatus.message}
                            {duplicateFixStatus.isDryRun && duplicateFixStatus.fixPlan?.length > 0 && <div className="fix-plan"><strong>Dry Run Plan:</strong><ul>{duplicateFixStatus.fixPlan.map((p, i) => <li key={i}>{p.action}: {p.username}'s "{p.cardInstance}"</li>)}</ul></div>}
                            {duplicateFixStatus.fixed && <p>Fixed: {duplicateFixStatus.fixed.removeMint0} mint-0s, {duplicateFixStatus.fixed.rerollDuplicates} duplicates.</p>}
                            {duplicateFixStatus.failed && (duplicateFixStatus.failed.removeMint0.length > 0 || duplicateFixStatus.failed.rerollDuplicates.length > 0) &&
                                <div className="failed-fixes"><strong>Failed Fixes:</strong><ul>{duplicateFixStatus.failed.removeMint0.map((f, i) => <li key={i}>Failed to remove mint 0 for {f.card.username}: {f.reason}</li>)}{duplicateFixStatus.failed.rerollDuplicates.map((f, i) => <li key={i}>Failed to reroll for {f.owner.username}: {f.reason}</li>)}</ul></div>
                            }
                        </div>
                    )}
                </div>

                <div className="fix-section">
                    <h4>Legacy Trade Snapshot Backfill</h4>
                    <p className="fix-description">Finds old trades that are missing historical card data (snapshots) and adds it, ensuring trade history is permanently preserved.</p>
                    <div>
                        <button onClick={() => handleBackfillTradeSnapshots(false)} className="action-button" style={{ backgroundColor: '#6c757d' }} disabled={tradeFixStatus?.status === 'pending'}>Dry Run Scan</button>
                        {tradeFixStatus && tradeFixStatus.isDryRun && tradeFixStatus.tradesToUpdate > 0 && (
                            <button onClick={() => handleBackfillTradeSnapshots(true)} className="action-button" style={{ backgroundColor: '#dc3545' }} disabled={tradeFixStatus?.status === 'pending'}>Confirm Fix</button>
                        )}
                    </div>
                    {tradeFixStatus && (
                        <div className={`status-box ${tradeFixStatus.status}`}>
                            <strong>Trade Fix Status:</strong> {tradeFixStatus.message}
                            {typeof tradeFixStatus.updatedCount !== 'undefined' && <p>Trades to process: {tradeFixStatus.tradesToUpdate}, Successfully updated: {tradeFixStatus.updatedCount}</p>}
                        </div>
                    )}
                </div>
            </div>

            <div className="section-card">
                <h2>Audit Details</h2>

                <div className="detail-section">
                    <h3>Legacy "Glitch " Name Issues ({legacyGlitchCount})
                        {auditData.details.legacyGlitchNameIssues?.length > 0 && (
                            <button onClick={() => toggleDetails('legacyGlitchNameIssues')} className="toggle-button">
                                {showDetails.legacyGlitchNameIssues ? 'Hide' : 'Show'}
                            </button>
                        )}
                    </h3>
                    {showDetails.legacyGlitchNameIssues && auditData.details.legacyGlitchNameIssues?.length > 0 && (
                        <div>{auditData.details.legacyGlitchNameIssues.map((item, index) => (
                            <div key={index} className="section-card detail-item">
                                <p><strong>User:</strong> {item.username} (ID: {item.userId})</p>
                                <div className="mismatch-diff">
                                    <p className="diff-old"><span>Original Name:</span> {item.originalName}</p>
                                    <p className="diff-new"><span>Suggested Name:</span> {item.suggestedName}</p>
                                </div>
                            </div>
                        ))}</div>
                    )}
                </div>

                <div className="detail-section">
                    <h3>Missing Modifier Prefix Issues ({prefixIssueCount})
                        {auditData.details.missingModifierPrefixIssues?.length > 0 && (
                            <button onClick={() => toggleDetails('missingModifierPrefixIssues')} className="toggle-button">
                                {showDetails.missingModifierPrefixIssues ? 'Hide' : 'Show'}
                            </button>
                        )}
                    </h3>
                    {showDetails.missingModifierPrefixIssues && auditData.details.missingModifierPrefixIssues?.length > 0 && (
                        <div>{auditData.details.missingModifierPrefixIssues.map((item, index) => (
                            <div key={index} className="section-card detail-item">
                                <p><strong>User:</strong> {item.username} (ID: {item.userId})</p>
                                <p><strong>Issue:</strong> Name is missing prefix for its assigned modifier.</p>
                                <div className="mismatch-diff">
                                    <p className="diff-old"><span>Original Name:</span> {item.originalName}</p>
                                    <p className="diff-new"><span>Suggested Name:</span> {item.suggestedName}</p>
                                </div>
                            </div>
                        ))}</div>
                    )}
                </div>

                <div className="detail-section">
                    <h3>Card Data Mismatches ({mismatchCount})
                        {auditData.details.cardDataMismatches?.length > 0 && (
                            <button onClick={() => toggleDetails('cardDataMismatches')} className="toggle-button">
                                {showDetails.cardDataMismatches ? 'Hide' : 'Show'}
                            </button>
                        )}
                    </h3>
                    {showDetails.cardDataMismatches && auditData.details.cardDataMismatches?.length > 0 && (
                        <div>{auditData.details.cardDataMismatches.map((item, index) => (
                            <div key={index} className="section-card detail-item">
                                <p><strong>User:</strong> {item.username} (ID: {item.userId})</p>
                                <p><strong>Card:</strong> {item.userCard.name} ({item.userCard.rarity}) Mint: {item.userCard.mintNumber}</p>
                                <h4>Mismatches:</h4>
                                {item.mismatches.map((m, i) => (
                                    <div key={i} className="mismatch-diff">
                                        <strong>{m.field}:</strong>
                                        <p className="diff-old"><span>User Card:</span> {m.userValue}</p>
                                        <p className="diff-new"><span>Base Card:</span> {m.baseValue}</p>
                                    </div>
                                ))}
                            </div>
                        ))}</div>
                    )}
                </div>

                {/* --- ALL OLD DETAIL SECTIONS ARE PRESERVED BELOW --- */}
                <div className="detail-section">
                    <h3>Inconsistencies with Card Definition ({auditData.details.duplicateMintNumbersInCardDef.length})
                        {auditData.details.duplicateMintNumbersInCardDef.length > 0 && (
                            <button onClick={() => toggleDetails('duplicateMintNumbersInCardDef')} className="toggle-button">
                                {showDetails.duplicateMintNumbersInCardDef ? 'Hide' : 'Show'}
                            </button>
                        )}
                    </h3>
                    {showDetails.duplicateMintNumbersInCardDef && auditData.details.duplicateMintNumbersInCardDef.length > 0 && (
                        <div>
                            {auditData.details.duplicateMintNumbersInCardDef.map((item, index) => (
                                <div key={index} className="section-card detail-item">
                                    <p><strong>User:</strong> {item.username} (ID: {item.userId})</p>
                                    <p><strong>Card:</strong> {item.cardName} (cleaned: {item.cleanedCardName}) ({item.rarity}) Mint: {item.mintNumber}</p>
                                    <p><strong>Issue:</strong> Mint number owned by user is still marked as 'available' in card definition.</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="detail-section">
                    <h3>True Duplicate Card Instances Across Users ({auditData.details.trueDuplicateCardInstancesAcrossUsers.length})
                        {auditData.details.trueDuplicateCardInstancesAcrossUsers.length > 0 && (
                            <button onClick={() => toggleDetails('trueDuplicateCardInstancesAcrossUsers')} className="toggle-button">
                                {showDetails.trueDuplicateCardInstancesAcrossUsers ? 'Hide' : 'Show'}
                            </button>
                        )}
                    </h3>
                    {showDetails.trueDuplicateCardInstancesAcrossUsers && auditData.details.trueDuplicateCardInstancesAcrossUsers.length > 0 && (
                        <div>{auditData.details.trueDuplicateCardInstancesAcrossUsers.map((item, index) => (
                            <div key={index} className="section-card detail-item">
                                <p><strong>Card Instance:</strong> {item.cardInstance}</p>
                                <h4>Owners:</h4>
                                <div style={{ paddingLeft: '15px' }}>{item.owners.map((owner, oIndex) => (
                                    <p key={oIndex} className={owner.isFirstOwner ? 'first-owner' : ''}>
                                        User: {owner.username} (ID: {owner.userId}) {owner.isFirstOwner && <span>(FIRST OWNER)</span>}<br/>
                                        Acquired At: {owner.acquiredAt ? new Date(owner.acquiredAt).toLocaleString() : 'N/A'}
                                    </p>
                                ))}</div>
                            </div>
                        ))}</div>
                    )}
                </div>

                <div className="detail-section">
                    <h3>Cards with Mint Number 0 ({auditData.summary.mint0CardsCount || 0})
                        {auditData.details.mint0Cards?.length > 0 && (
                            <button onClick={() => toggleDetails('mint0Cards')} className="toggle-button">
                                {showDetails.mint0Cards ? 'Hide' : 'Show'}
                            </button>
                        )}
                    </h3>
                    {showDetails.mint0Cards && auditData.details.mint0Cards?.length > 0 && (
                        <div>{auditData.details.mint0Cards.map((item, index) => (
                            <div key={index} className="section-card detail-item">
                                <p><strong>User:</strong> {item.username} (ID: {item.userId})</p>
                                <p><strong>Card:</strong> {item.userCard.name} ({item.userCard.rarity}) Mint: {item.userCard.mintNumber}</p>
                            </div>
                        ))}</div>
                    )}
                </div>

                <div className="detail-section">
                    <h3>Malformed User Cards ({auditData.details.malformedUserCards.length})
                        {auditData.details.malformedUserCards.length > 0 && (
                            <button onClick={() => toggleDetails('malformedUserCards')} className="toggle-button">
                                {showDetails.malformedUserCards ? 'Hide' : 'Show'}
                            </button>
                        )}
                    </h3>
                    {showDetails.malformedUserCards && auditData.details.malformedUserCards.length > 0 && (
                        <div>{auditData.details.malformedUserCards.map((item, index) => (
                            <div key={index} className="section-card detail-item">
                                <p><strong>User:</strong> {item.username} (ID: {item.userId})</p>
                                <p><strong>Issue:</strong> {item.issue}</p>
                                <pre>{JSON.stringify(item.userCardData, null, 2)}</pre>
                            </div>
                        ))}</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminCardAudit;
