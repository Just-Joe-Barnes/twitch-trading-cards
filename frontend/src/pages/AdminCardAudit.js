import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchUserProfile,
    fetchAdminCardAudit,
    fixCardDefinitionInconsistencies,
    fixDuplicateAndMintZeroCards
} from '../utils/api';

const AdminCardAudit = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [auditData, setAuditData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fixStatus, setFixStatus] = useState(null);
    const [duplicateFixStatus, setDuplicateFixStatus] = useState(null);
    const [showDetails, setShowDetails] = useState({
        malformedUserCards: false,
        missingParentCardDefinitions: false,
        missingRarityDefinitions: false,
        duplicateMintNumbersInCardDef: false,
        userCardsToReroll: false,
        noMintNumbersLeftForReroll: false,
        trueDuplicateCardInstancesAcrossUsers: false,
        mint0Cards: false,
    });

    const navigate = useNavigate();

    const loadAuditData = async () => {
        setLoading(true);
        setError(null);
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

    const handleFixInconsistencies = async (performActualFix = false) => {
        const confirmationMessage = performActualFix
            ? "Are you absolutely sure you want to PERMANENTLY fix ALL 'Inconsistencies with Card Definition'?\n\n" +
            "This action will modify the database by removing problematic mint numbers from master card definitions " +
            "and decrementing remaining copies. This action cannot be undone."
            : "Initiating a DRY RUN for 'Inconsistencies with Card Definition'.\n\n" +
            "This will show you what *would* be fixed without making any changes to the database. Proceed?";

        const isConfirmed = window.confirm(confirmationMessage);

        if (!isConfirmed) {
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

        const isConfirmed = window.confirm(confirmationMessage);

        if (!isConfirmed) {
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
                fixedCount: result.fixedCount,
                failedCount: result.failedCount,
                isDryRun: result.isDryRun,
                fixPlan: result.fixPlan || [],
                failedFixes: result.failedFixes || []
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

    const inconsistenciesCount = auditData.summary.inconsistenciesWithCardDefCount;
    const mint0Count = (auditData.details.mint0Cards ? auditData.details.mint0Cards.length : 0);
    const combinedDuplicateMint0Count = (auditData.summary.trueDuplicateCardInstancesAcrossUsersCount || 0) + mint0Count;


    return (
        <div className="page">
            <h1>Admin Card Audit</h1>
            <div className="section-card">
                <h2>Audit Summary</h2>
                <p>Status: <span style={{ color: auditData.status === 'success' ? '#4CAF50' : '#f44336' }}>{auditData.status}</span></p>
                <p>Message: {auditData.message}</p>
                <p>Timestamp: {new Date(auditData.timestamp).toLocaleString()}</p>

                {fixStatus && (
                    <div style={{
                        marginTop: '15px',
                        padding: '10px',
                        borderRadius: '5px',
                        backgroundColor: fixStatus.status === 'success' ? '#4CAF5033' :
                            fixStatus.status === 'error' ? '#f4433633' :
                                fixStatus.status === 'pending' ? '#ffeb3b33' : '#2196f333',
                        border: `1px solid ${fixStatus.status === 'success' ? '#4CAF50' :
                            fixStatus.status === 'error' ? '#f44336' :
                                fixStatus.status === 'pending' ? '#ffeb3b' : '#2196f3'}`
                    }}>
                        <strong>Operation Status:</strong> {fixStatus.message}
                        {fixStatus.isDryRun && fixStatus.fixedCount !== undefined && fixStatus.fixedCount > 0 &&
                            <p>Would have affected: {fixStatus.fixedCount} inconsistencies. No actual database changes were made. Please perform the 'Confirm Fix' to apply.</p>
                        }
                        {fixStatus.isDryRun && fixStatus.fixedCount !== undefined && fixStatus.fixedCount === 0 &&
                            <p>No inconsistencies found in dry run that require fixing.</p>
                        }
                        {!fixStatus.isDryRun && fixStatus.fixedCount !== undefined &&
                            <>
                                <p>Fixed: {fixStatus.fixedCount}, Failed: {fixStatus.failedCount}</p>
                                {fixStatus.failedFixes && fixStatus.failedFixes.length > 0 && (
                                    <div style={{ marginTop: '10px', color: '#f44336' }}>
                                        <strong>Details of Failed Fixes:</strong>
                                        <ul>
                                            {fixStatus.failedFixes.map((fail, idx) => (
                                                <li key={idx}>
                                                    Card: {fail.cardName} ({fail.rarity}, Mint: {fail.mintNumber})<br/>
                                                    Reason: {fail.reason}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        }
                        {fixStatus.status === 'pending' && <p>Please wait...</p>}
                    </div>
                )}

                <hr style={{ borderColor: '#333', margin: '1.5rem 0' }} />

                <h3>Overall Statistics:</h3>
                <ul>
                    <li>Total Users Scanned: <strong>{auditData.summary.totalUsersScanned}</strong></li>
                    <li>Total Cards Scanned Across All Users: <strong>{auditData.summary.totalCardsScanned}</strong></li>
                </ul>

                <h3>Counts of Issues:</h3>
                <ul>
                    <li>Malformed User Cards: <strong>{auditData.summary.malformedUserCardsCount}</strong></li>
                    <li>Missing Parent Card Definitions: <strong>{auditData.summary.missingParentCardDefinitionsCount}</strong></li>
                    <li>Missing Rarity Definitions: <strong>{auditData.summary.missingRarityDefinitionsCount}</strong></li>
                    <li>Inconsistencies with Card Definition (Mint available): <strong>{inconsistenciesCount}</strong>
                        {inconsistenciesCount > 0 && (
                            <>
                                <button
                                    onClick={() => handleFixInconsistencies(false)}
                                    className="action-button"
                                    style={{ marginLeft: '10px', backgroundColor: '#6c757d' }}
                                    disabled={fixStatus?.status === 'pending'}
                                >
                                    {fixStatus?.status === 'pending' ? 'Running Dry Run...' : 'Dry Run Fix'}
                                </button>
                                {fixStatus && fixStatus.isDryRun && fixStatus.fixedCount > 0 && fixStatus.status !== 'pending' && (
                                    <button
                                        onClick={() => handleFixInconsistencies(true)}
                                        className="action-button"
                                        style={{ marginLeft: '10px', backgroundColor: '#dc3545' }}
                                        disabled={fixStatus?.status === 'pending'}
                                    >
                                        {fixStatus?.status === 'pending' ? 'Confirming Fix...' : 'Confirm Fix'}
                                    </button>
                                )}
                            </>
                        )}
                    </li>
                    <li>Suggested Rerolls: <strong>{auditData.summary.suggestedRerollsCount}</strong></li>
                    <li>No Reroll Possible: <strong>{auditData.summary.noRerollPossibleCount}</strong></li>
                    <li>True Duplicate Card Instances Across Users: <strong>{auditData.summary.trueDuplicateCardInstancesAcrossUsersCount}</strong></li>
                    {auditData.details.mint0Cards && <li>Mint 0 Cards: <strong>{auditData.details.mint0Cards.length}</strong></li>}
                </ul>

                <hr style={{ borderColor: '#333', margin: '1.5rem 0' }} />

                <h3 style={{ marginTop: '40px' }}>Fix Duplicate & Mint 0 Card Instances ({combinedDuplicateMint0Count})</h3>
                {(combinedDuplicateMint0Count > 0) && (
                    <>
                        <button
                            onClick={() => handleFixDuplicateAndMintZeroCards(false)}
                            className="action-button"
                            style={{ marginLeft: '10px', backgroundColor: '#6c757d' }}
                            disabled={duplicateFixStatus?.status === 'pending'}
                        >
                            {duplicateFixStatus?.status === 'pending' ? 'Running Dry Run...' : 'Dry Run Fix Duplicates & Mint 0s'}
                        </button>
                        {/*{duplicateFixStatus && duplicateFixStatus.isDryRun && duplicateFixStatus.fixedCount > 0 && duplicateFixStatus.status !== 'pending' && (*/}
                            <button
                                onClick={() => handleFixDuplicateAndMintZeroCards(true)}
                                className="action-button"
                                style={{ marginLeft: '10px', backgroundColor: '#dc3545' }}
                                disabled={duplicateFixStatus?.status === 'pending'}
                            >
                                {duplicateFixStatus?.status === 'pending' ? 'Confirming Fix...' : 'Confirm Fix Duplicates & Mint 0s'}
                            </button>
                        {/*)}*/}
                    </>
                )}

                {duplicateFixStatus && (
                    <div style={{
                        marginTop: '15px',
                        padding: '10px',
                        borderRadius: '5px',
                        backgroundColor: duplicateFixStatus.status === 'success' ? '#4CAF5033' :
                            duplicateFixStatus.status === 'error' ? '#f4433633' :
                                duplicateFixStatus.status === 'pending' ? '#ffeb3b33' : '#2196f333',
                        border: `1px solid ${duplicateFixStatus.status === 'success' ? '#4CAF50' :
                            duplicateFixStatus.status === 'error' ? '#f44336' :
                                duplicateFixStatus.status === 'pending' ? '#ffeb3b' : '#2196f3'}`
                    }}>
                        <strong>Operation Status (Duplicates & Mint 0s):</strong> {duplicateFixStatus.message}
                        {duplicateFixStatus.isDryRun && duplicateFixStatus.fixedCount !== undefined && duplicateFixStatus.fixedCount > 0 &&
                            <>
                                <p>Would have affected: {duplicateFixStatus.fixedCount} cards. No actual database changes were made.</p>
                                <div style={{ maxHeight: '300px', overflowY: 'scroll', border: '1px solid #555', padding: '10px', marginTop: '10px' }}>
                                    <h5>Details of Issues Identified in Dry Run:</h5>
                                    <ul>
                                        {(duplicateFixStatus.fixPlan || []).map((item, idx) => (
                                            <li key={idx} style={{ marginBottom: '5px' }}>
                                                User: {item.username || 'N/A'} (ID: {item.userId})<br/>
                                                Card: {item.cardName} ({item.rarity}) Mint: {item.oldMintNumber}<br/>
                                                Action: <strong style={{ color: item.action === 'REMOVE_MINT_0' ? '#f44336' : '#2196f3' }}>{item.action}</strong><br/>
                                                Reason: {item.reason}
                                                {item.action === 'REROLL_DUPLICATE' && item.newMint ? ` (Would reroll to: ${item.newMint})` : ''}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <p style={{ marginTop: '10px' }}>Please perform the 'Confirm Fix' to apply.</p>
                            </>
                        }
                        {duplicateFixStatus.isDryRun && duplicateFixStatus.fixedCount !== undefined && duplicateFixStatus.fixedCount === 0 &&
                            <p>No duplicate mint numbers or mint 0 cards found in dry run that require fixing.</p>
                        }
                        {!duplicateFixStatus.isDryRun && duplicateFixStatus.fixedCount !== undefined &&
                            <>
                                <p>Fixed: {duplicateFixStatus.fixedCount}, Failed: {duplicateFixStatus.failedCount}</p>
                                {duplicateFixStatus.failedFixes && duplicateFixStatus.failedFixes.length > 0 && (
                                    <div style={{ marginTop: '10px', color: '#f44336' }}>
                                        <strong>Details of Failed Fixes:</strong>
                                        <ul>
                                            {duplicateFixStatus.failedFixes.map((fail, idx) => (
                                                <li key={idx}>
                                                    Card: {fail.cardName} ({fail.rarity}, Mint: {fail.oldMintNumber})<br/>
                                                    Reason: {fail.reason || fail.error}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        }
                        {duplicateFixStatus.status === 'pending' && <p>Please wait...</p>}
                    </div>
                )}


                <hr style={{ borderColor: '#333', margin: '1.5rem 0' }} />

                <h2>Audit Details</h2>

                <div className="detail-section">
                    <h3>Malformed User Cards ({auditData.details.malformedUserCards.length})
                        <button onClick={() => toggleDetails('malformedUserCards')} className="toggle-button">
                            {showDetails.malformedUserCards ? 'Hide' : 'Show'}
                        </button>
                    </h3>
                    {showDetails.malformedUserCards && auditData.details.malformedUserCards.length > 0 && (
                        <div>
                            {auditData.details.malformedUserCards.map((item, index) => (
                                <div key={index} className="section-card" style={{ marginBottom: '10px' }}>
                                    <p><strong>User:</strong> {item.username} (ID: {item.userId})</p>
                                    <p><strong>Issue:</strong> {item.issue}</p>
                                    <pre>{JSON.stringify(item.userCardData, null, 2)}</pre>
                                </div>
                            ))}
                        </div>
                    )}
                    {showDetails.malformedUserCards && auditData.details.malformedUserCards.length === 0 && (
                        <p>No malformed user cards found.</p>
                    )}
                </div>

                <div className="detail-section">
                    <h3>Inconsistencies with Card Definition (Mint in `availableMintNumbers`) ({auditData.details.duplicateMintNumbersInCardDef.length})
                        <button onClick={() => toggleDetails('duplicateMintNumbersInCardDef')} className="toggle-button">
                            {showDetails.duplicateMintNumbersInCardDef ? 'Hide' : 'Show'}
                        </button>
                    </h3>
                    {showDetails.duplicateMintNumbersInCardDef && auditData.details.duplicateMintNumbersInCardDef.length > 0 && (
                        <div>
                            {auditData.details.duplicateMintNumbersInCardDef.map((item, index) => (
                                <div key={index} className="section-card" style={{ marginBottom: '10px' }}>
                                    <p><strong>User:</strong> {item.username} (ID: {item.userId})</p>
                                    <p><strong>Card:</strong> {item.cardName} (cleaned: {item.cleanedCardName}) ({item.rarity}) Mint: {item.mintNumber}</p>
                                    <p><strong>Issue:</strong> Mint number owned by user is still marked as 'available' in card definition.</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {showDetails.duplicateMintNumbersInCardDef && auditData.details.duplicateMintNumbersInCardDef.length === 0 && (
                        <p>No inconsistencies with card definitions found.</p>
                    )}
                </div>

                <div className="detail-section">
                    <h3>Missing Parent Card Definitions ({auditData.details.missingParentCardDefinitions.length})
                        <button onClick={() => toggleDetails('missingParentCardDefinitions')} className="toggle-button">
                            {showDetails.missingParentCardDefinitions ? 'Hide' : 'Show'}
                        </button>
                    </h3>
                    {showDetails.missingParentCardDefinitions && auditData.details.missingParentCardDefinitions.length > 0 && (
                        <div>
                            {auditData.details.missingParentCardDefinitions.map((item, index) => (
                                <div key={index} className="section-card" style={{ marginBottom: '10px' }}>
                                    <p><strong>User:</strong> {item.username} (ID: {item.userId})</p>
                                    <p><strong>Card:</strong> {item.userCardData.name} (cleaned: {item.cleanedCardName}) ({item.userCardData.rarity}) Mint: {item.userCardData.mintNumber}</p>
                                    <p><strong>Issue:</strong> {item.issue}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {showDetails.missingParentCardDefinitions && auditData.details.missingParentCardDefinitions.length === 0 && (
                        <p>No missing parent card definitions found.</p>
                    )}
                </div>

                <div className="detail-section">
                    <h3>Missing Rarity Definitions ({auditData.details.missingRarityDefinitions.length})
                        <button onClick={() => toggleDetails('missingRarityDefinitions')} className="toggle-button">
                            {showDetails.missingRarityDefinitions ? 'Hide' : 'Show'}
                        </button>
                    </h3>
                    {showDetails.missingRarityDefinitions && auditData.details.missingRarityDefinitions.length > 0 && (
                        <div>
                            {auditData.details.missingRarityDefinitions.map((item, index) => (
                                <div key={index} className="section-card" style={{ marginBottom: '10px' }}>
                                    <p><strong>User:</strong> {item.username} (ID: {item.userId})</p>
                                    <p><strong>Card:</strong> {item.userCardData.name} (cleaned: {item.cleanedCardName}) ({item.userCardData.rarity}) Mint: {item.userCardData.mintNumber}</p>
                                    <p><strong>Issue:</strong> {item.issue}</p>
                                    <p><strong>Parent Card ID:</strong> {item.parentCardId}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {showDetails.missingRarityDefinitions && auditData.details.missingRarityDefinitions.length === 0 && (
                        <p>No missing rarity definitions found.</p>
                    )}
                </div>

                <div className="detail-section">
                    <h3>Suggested Rerolls ({auditData.details.userCardsToReroll.length})
                        <button onClick={() => toggleDetails('userCardsToReroll')} className="toggle-button">
                            {showDetails.userCardsToReroll ? 'Hide' : 'Show'}
                        </button>
                    </h3>
                    {showDetails.userCardsToReroll && auditData.details.userCardsToReroll.length > 0 && (
                        <div>
                            {auditData.details.userCardsToReroll.map((item, index) => (
                                <div key={index} className="section-card" style={{ marginBottom: '10px' }}>
                                    <p><strong>User:</strong> {item.username} (ID: {item.userId})</p>
                                    <p><strong>Card:</strong> {item.cardName} (cleaned: {item.cleanedCardName}) ({item.rarity})</p>
                                    <p><strong>Old Mint:</strong> {item.oldMintNumber} <span style={{ color: '#007bff' }}>--&gt;</span> <strong>Suggested New Mint:</strong> {item.suggestedNewMintNumber}</p>
                                    <p><strong>Issue:</strong> {item.issue}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {showDetails.userCardsToReroll && auditData.details.userCardsToReroll.length === 0 && (
                        <p>No cards suggested for reroll.</p>
                    )}
                </div>

                <div className="detail-section">
                    <h3>No Mint Numbers Left for Reroll ({auditData.details.noMintNumbersLeftForReroll.length})
                        <button onClick={() => toggleDetails('noMintNumbersLeftForReroll')} className="toggle-button">
                            {showDetails.noMintNumbersLeftForReroll ? 'Hide' : 'Show'}
                        </button>
                    </h3>
                    {showDetails.noMintNumbersLeftForReroll && auditData.details.noMintNumbersLeftForReroll.length > 0 && (
                        <div>
                            {auditData.details.noMintNumbersLeftForReroll.map((item, index) => (
                                <div key={index} className="section-card" style={{ marginBottom: '10px' }}>
                                    <p><strong>User:</strong> {item.username} (ID: {item.userId})</p>
                                    <p><strong>Card:</strong> {item.cardName} (cleaned: {item.cleanedCardName}) ({item.rarity}) Mint: {item.mintNumber}</p>
                                    <p><strong>Issue:</strong> {item.issue}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {showDetails.noMintNumbersLeftForReroll && auditData.details.noMintNumbersLeftForReroll.length === 0 && (
                        <p>No cards identified with no remaining mint numbers for reroll.</p>
                    )}
                </div>

                <div className="detail-section">
                    <h3>True Duplicate Card Instances Across Users ({auditData.details.trueDuplicateCardInstancesAcrossUsers.length})
                        <button onClick={() => toggleDetails('trueDuplicateCardInstancesAcrossUsers')} className="toggle-button">
                            {showDetails.trueDuplicateCardInstancesAcrossUsers ? 'Hide' : 'Show'}
                        </button>
                    </h3>
                    {showDetails.trueDuplicateCardInstancesAcrossUsers && auditData.details.trueDuplicateCardInstancesAcrossUsers.length > 0 && (
                        <div>
                            {auditData.details.trueDuplicateCardInstancesAcrossUsers.map((item, index) => (
                                <div key={index} className="section-card" style={{ marginBottom: '10px' }}>
                                    <p><strong>Card Instance:</strong> {item.cardInstance}</p>
                                    <h4>Owners:</h4>
                                    <div style={{ paddingLeft: '15px' }}>
                                        {item.owners.map((owner, oIndex) => (
                                            <p key={oIndex} style={{
                                                backgroundColor: owner.isFirstOwner ? '#4CAF5033' : 'transparent',
                                                padding: '5px',
                                                borderRadius: '3px',
                                                borderLeft: owner.isFirstOwner ? '3px solid #00e676' : 'none',
                                                marginBottom: '5px',
                                            }}>
                                                User: {owner.username} (ID: {owner.userId}) {owner.isFirstOwner && <span style={{ color: '#00e676', fontWeight: 'bold' }}>(FIRST OWNER)</span>}<br/>
                                                Acquired At: {owner.acquiredAt ? new Date(owner.acquiredAt).toLocaleString() : 'N/A'}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {showDetails.trueDuplicateCardInstancesAcrossUsers && auditData.details.trueDuplicateCardInstancesAcrossUsers.length === 0 && (
                        <p>No true duplicate card instances found across users.</p>
                    )}
                </div>

                {auditData.details.mint0Cards && (
                    <div className="detail-section">
                        <h3>Cards with Mint Number 0 ({auditData.details.mint0Cards.length})
                            <button onClick={() => toggleDetails('mint0Cards')} className="toggle-button">
                                {showDetails.mint0Cards ? 'Hide' : 'Show'}
                            </button>
                        </h3>
                        {showDetails.mint0Cards && auditData.details.mint0Cards.length > 0 && (
                            <div>
                                {auditData.details.mint0Cards.map((item, index) => (
                                    <div key={index} className="section-card" style={{ marginBottom: '10px' }}>
                                        <p><strong>User:</strong> {item.username} (ID: {item.userId})</p>
                                        <p><strong>Card:</strong> {item.cardName} ({item.rarity}) Mint: {item.mintNumber}</p>
                                        <p><strong>Issue:</strong> Card has an invalid mint number 0.</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {showDetails.mint0Cards && auditData.details.mint0Cards.length === 0 && (
                            <p>No cards with mint number 0 found.</p>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default AdminCardAudit;
