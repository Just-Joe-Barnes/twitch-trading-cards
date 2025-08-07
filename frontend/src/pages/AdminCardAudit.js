import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchUserProfile,
    fetchAdminCardAudit,
    fixCardDefinitionInconsistencies,
    fixDuplicateAndMintZeroCards,
    fixCardDataMismatches // Added new import
} from '../utils/api';
import NavAdmin from "../components/NavAdmin";

const AdminCardAudit = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [auditData, setAuditData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fixStatus, setFixStatus] = useState(null);
    const [duplicateFixStatus, setDuplicateFixStatus] = useState(null);
    const [mismatchFixStatus, setMismatchFixStatus] = useState(null); // Added state for new fix
    const [showDetails, setShowDetails] = useState({
        malformedUserCards: false,
        missingParentCardDefinitions: false,
        missingRarityDefinitions: false,
        duplicateMintNumbersInCardDef: false,
        userCardsToReroll: false,
        noMintNumbersLeftForReroll: false,
        trueDuplicateCardInstancesAcrossUsers: false,
        mint0Cards: false,
        cardDataMismatches: false, // Added state for new details section
    });

    const navigate = useNavigate();

    const loadAuditData = async () => {
        setLoading(true);
        setError(null);
        // Reset statuses on reload to avoid showing old results
        setFixStatus(null);
        setDuplicateFixStatus(null);
        setMismatchFixStatus(null);
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
                // Updated admin check to match backend
                if (!profile.isAdmin && profile.username !== 'ItchyBeard') {
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

    const mismatchCount = auditData.summary.cardDataMismatchesCount || 0;
    const inconsistenciesCount = auditData.summary.inconsistenciesWithCardDefCount || 0;
    const combinedDuplicateMint0Count = (auditData.summary.trueDuplicateCardInstancesAcrossUsersCount || 0) + (auditData.summary.mint0CardsCount || 0);

    return (
        <div className="page">
            <h1>Admin Card Audit</h1>

            <NavAdmin />

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

                <h2>Fixable Issues</h2>

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
            </div>

            <div className="section-card">
                <h2>Audit Details</h2>

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
