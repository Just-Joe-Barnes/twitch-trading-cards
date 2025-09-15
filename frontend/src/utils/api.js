// src/utils/api.js
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://192.168.0.136:5000';

export const fetchWithAuth = async (endpoint, options = {}) => {
    try {
        const token = localStorage.getItem("token");
        const headers = {
            ...options.headers,
        };

        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            credentials: "include",
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem("token");
                window.location.href = "/login";
            }
            let errorMessage = `HTTP error! Status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData?.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                // Ignore JSON parse errors, keep default message
            }
            console.error("[API] HTTP error:", response.status, response.statusText, errorMessage);
            throw new Error(errorMessage);
        }

        return response.json();
    } catch (error) {
        console.error("[API] Error in fetchWithAuth:", error.message, {endpoint, options});
        throw error;
    }
};

// Fetch user's packs
export const fetchMyPacks = async () => {
    return fetchWithAuth("/api/packs/mypacks", {method: "GET"});
};

// Fetch logged-in user's profile
export const fetchUserProfile = async () => {
    return fetchWithAuth("/api/users/me", {method: "GET"});
};

// Fetch a user profile by username
export const fetchUserProfileByUsername = async (username) => {
    try {
        return fetchWithAuth(`/api/users/profile/${username}`, {method: "GET"});
    } catch (error) {
        console.error("[API] Error fetching profile by username:", error.message);
        throw error;
    }
};

// Fetch user collection (cards and packs)
export const fetchUserCollection = async (userId) => {
    try {
        const response = await fetchWithAuth(`/api/users/${userId}/collection`, {method: "GET"});
        console.log("[API] Fetched User Collection:", response);
        return response;
    } catch (error) {
        console.error("[API] Error fetching user collection:", error.message);
        throw error;
    }
};

// Fetch all cards recursively with pagination support
export const fetchCards = async ({search = "", rarity = "", sort = "", page = 1, limit = 50}) => {
    const queryParams = new URLSearchParams({search, rarity, sort, page, limit});
    try {
        const response = await fetchWithAuth(`/api/cards?${queryParams.toString()}`, {method: "GET"});
        if (response.cards?.length === limit) {
            const nextPageData = await fetchCards({search, rarity, sort, page: page + 1, limit});
            return {
                cards: [...response.cards, ...nextPageData.cards],
                totalCards: nextPageData.totalCards || response.totalCards,
            };
        }
        console.log(`[API] Fetched Cards from Page ${page}:`, response.cards);
        return response;
    } catch (error) {
        console.error("[API] Error fetching cards:", error.message);
        throw error;
    }
};

// NEW: Search cards by name (for admin card search tool)
export const searchCardsByName = async (query) => {
    try {
        const response = await fetchWithAuth(`/api/cards/search?name=${encodeURIComponent(query)}`, {
            method: "GET",
        });
        return response.cards || [];
    } catch (error) {
        console.error('[API] Error searching cards by name:', error.message);
        return [];
    }
};

// Award a pack for first login
export const awardFirstLoginPack = async () => {
    return fetchWithAuth("/api/packs/firstlogin", {method: "POST"});
};

// Redeem channel points for a pack
export const redeemChannelPointsPack = async () => {
    return fetchWithAuth("/api/packs/redeem", {method: "POST"});
};

// Fetch user subscriptions
export const fetchUserSubscriptions = async () => {
    return fetchWithAuth("/api/users/subscriptions", {method: "GET"});
};

// Handle gifted subscriptions
export const handleGiftedSubscription = async (giftCount) => {
    return fetchWithAuth("/api/packs/gift", {
        method: "POST",
        body: JSON.stringify({giftCount}),
    });
};

// Fetch featured cards for the logged-in user
export const fetchFeaturedCards = async () => {
    try {
        const response = await fetchWithAuth("/api/users/featured-cards", {method: "GET"});
        console.log("[API] Fetched Featured Cards:", response);
        return response;
    } catch (error) {
        console.error("[API] Error fetching featured cards:", error.message);
        throw error;
    }
};

// Update the featured cards for the logged-in user
export const updateFeaturedCards = async (featuredCards) => {
    try {
        const response = await fetchWithAuth("/api/users/featured-cards", {
            method: "PUT",
            body: JSON.stringify({featuredCards}),
        });
        console.log("[API] Updated Featured Cards:", response);
        return response;
    } catch (error) {
        console.error("[API] Error updating featured cards:", error.message);
        throw error;
    }
};

// Fetch featured achievements for the logged-in user
export const fetchFeaturedAchievements = async () => {
    try {
        const response = await fetchWithAuth('/api/users/featured-achievements', {method: 'GET'});
        return response;
    } catch (error) {
        console.error('[API] Error fetching featured achievements:', error.message);
        throw error;
    }
};

// Update the featured achievements for the logged-in user
export const updateFeaturedAchievements = async (achievements) => {
    try {
        const response = await fetchWithAuth('/api/users/featured-achievements', {
            method: 'PUT',
            body: JSON.stringify({achievements}),
        });
        return response;
    } catch (error) {
        console.error('[API] Error updating featured achievements:', error.message);
        throw error;
    }
};

// Fetch favorite card for the logged-in user
export const fetchFavoriteCard = async () => {
    try {
        const response = await fetchWithAuth("/api/users/favorite-card", {method: "GET"});
        return response.favoriteCard;
    } catch (error) {
        console.error("[API] Error fetching favorite card:", error.message);
        throw error;
    }
};

// Update favorite card for the logged-in user
export const updateFavoriteCard = async (name, rarity) => {
    try {
        const response = await fetchWithAuth("/api/users/favorite-card", {
            method: "PUT",
            body: JSON.stringify({name, rarity}),
        });
        return response.favoriteCard;
    } catch (error) {
        console.error("[API] Error updating favorite card:", error.message);
        throw error;
    }
};

// Fetch preferred pack for the logged-in user
export const fetchPreferredPack = async () => {
    try {
        const response = await fetchWithAuth('/api/users/preferred-pack', {method: 'GET'});
        return response.preferredPack;
    } catch (error) {
        console.error('[API] Error fetching preferred pack:', error.message);
        throw error;
    }
};

// Update preferred pack for the logged-in user
export const updatePreferredPack = async (packId) => {
    try {
        const response = await fetchWithAuth('/api/users/preferred-pack', {
            method: 'PUT',
            body: JSON.stringify({packId}),
        });
        return response.preferredPack;
    } catch (error) {
        console.error('[API] Error updating preferred pack:', error.message);
        throw error;
    }
};

// Fetch list of all packs (public)
export const fetchAllPacks = async () => {
    try {
        const res = await fetchWithAuth('/api/admin/packs', {method: 'GET'});
        return res.packs || [];
    } catch (err) {
        console.error('[API] Error fetching packs:', err.message);
        throw err;
    }
};

// Create a new trade
export const createTrade = async (tradeData) => {
    // This function was not using fetchWithAuth, so I'm updating it to do so.
    try {
        const response = await fetchWithAuth('/api/trades', {
            method: 'POST',
            body: JSON.stringify(tradeData),
        });
        return response;
    } catch (error) {
        console.error('Error creating trade:', error);
        throw error;
    }
};

// Fetch trades (incoming and outgoing)
export const fetchTrades = async (userId) => {
    try {
        const response = await fetchWithAuth(`/api/trades/${userId}`);
        console.log("[API] Fetched trades:", response);
        return response;
    } catch (error) {
        console.error("[API] Error fetching trades:", error.message);
        throw error;
    }
};

// Fetch pending trades with status filtering
// Fetch pending trades for a user
export const fetchPendingTrades = async (userId) => {
    try {
        const response = await fetchWithAuth(`/api/trades/${userId}/pending`);
        console.log("[API] Fetched Pending Trades:", response);
        return response;
    } catch (error) {
        console.error("[API] Error fetching pending trades:", error.message);
        throw error;
    }
};

// Accept a trade
export const acceptTrade = async (tradeId) => {
    try {
        const response = await fetchWithAuth(`/api/trades/${tradeId}/status`, {
            method: "PUT",
            body: JSON.stringify({status: "accepted"}),
        });
        console.log("[API] Trade accepted:", response);
        return response;
    } catch (error) {
        console.error("[API] Error accepting trade:", error.message);
        throw error;
    }
};

// Reject a trade
export const rejectTrade = async (tradeId) => {
    try {
        const response = await fetchWithAuth(`/api/trades/${tradeId}/status`, {
            method: "PUT",
            body: JSON.stringify({status: "rejected"}),
        });
        console.log("[API] Trade rejected:", response);
        return response;
    } catch (error) {
        console.error("[API] Error rejecting trade:", error.message);
        throw error;
    }
};

// Cancel a trade (for outgoing trades)
export const cancelTrade = async (tradeId) => {
    try {
        const response = await fetchWithAuth(`/api/trades/${tradeId}/status`, {
            method: "PUT",
            body: JSON.stringify({status: "cancelled"}),
        });
        console.log("[API] Trade cancelled:", response);
        return response;
    } catch (error) {
        console.error("[API] Error cancelling trade:", error.message);
        throw error;
    }
};

// Update trade status (accept, reject)
export const updateTradeStatus = async (tradeId, status) => {
    try {
        const response = await fetchWithAuth(`/api/trades/${tradeId}`, {
            method: "PUT",
            body: JSON.stringify({status}),
        });
        console.log("[API] Trade status updated:", response);
        return response;
    } catch (error) {
        console.error("[API] Error updating trade status:", error.message);
        throw error;
    }
};

// Search for users by username
export const searchUsers = async (query) => {
    try {
        const response = await fetchWithAuth(`/api/users/search?query=${query}`, {method: "GET"});
        console.log("[API] User search results:", response);
        return response;
    } catch (error) {
        console.error("[API] Error searching users:", error.message);
        throw error;
    }
};

// Fetch all notifications for the logged-in user
export const fetchNotifications = async () => {
    return fetchWithAuth('/api/notifications', {method: 'GET'});
};

// Mark all notifications as read (called when the dropdown opens)
export const markNotificationsAsRead = async () => {
    return fetchWithAuth('/api/notifications/read', {method: 'PUT'});
};

// Delete a single notification by its ID
export const deleteNotification = async (notificationId) => {
    return fetchWithAuth(`/api/notifications/${notificationId}`, {method: 'DELETE'});
};

// Optionally, delete all notifications
export const clearNotifications = async () => {
    return fetchWithAuth('/api/notifications/clear', {method: 'DELETE'});
};

// Fetch active market listings for a specific user
export const fetchUserMarketListings = async (userId, limit = 3) => {
    try {
        const response = await fetchWithAuth(`/api/market/user/${userId}/listings?limit=${limit}`);
        return {
            listings: response.listings || [],
            total: response.total || 0,
        };
    } catch (error) {
        console.error('[API] Error fetching user market listings:', error.message);
        throw error;
    }
};

// Fetch achievements and progress for the logged in user
export const fetchAchievements = async () => {
    try {
        const response = await fetchWithAuth('/api/achievements', {method: 'GET'});
        return response;
    } catch (error) {
        console.error('[API] Error fetching achievements:', error.message);
        throw error;
    }
};

// Claim a reward for a specific achievement name
export const claimAchievement = async (name) => {
    try {
        return await fetchWithAuth('/api/achievements/claim', {
            method: 'POST',
            body: JSON.stringify({name}),
        });
    } catch (error) {
        console.error('[API] Error claiming achievement reward:', error.message);
        throw error;
    }
};

// Grade a specific card for a user (admin only)
export const gradeCard = async (userId, cardId) => {
    try {
        return await fetchWithAuth('/api/grading/grade-card', {
            method: 'POST',
            body: JSON.stringify({userId, cardId}),
        });
    } catch (error) {
        console.error('[API] Error starting grading:', error.message);
        throw error;
    }
};

export const completeGrading = async (userId, cardId) => {
    try {
        return await fetchWithAuth('/api/grading/grade-card/complete', {
            method: 'POST',
            body: JSON.stringify({userId, cardId}),
        });
    } catch (error) {
        console.error('[API] Error completing grading:', error.message);
        throw error;
    }
};

export const revealGradedCard = async (userId, cardId) => {
    try {
        return await fetchWithAuth('/api/grading/grade-card/reveal', {
            method: 'POST',
            body: JSON.stringify({userId, cardId}),
        });
    } catch (error) {
        console.error('[API] Error revealing grade:', error.message);
        throw error;
    }
};

export const fetchAdminCardAudit = async () => {
    // Uses fetchWithAuth for consistency
    return fetchWithAuth('/api/admin/audit-cards', {method: 'GET'});
};

export const fixCardDefinitionInconsistencies = async (dryRun = true) => { // Default to dryRun
    // Uses fetchWithAuth for consistency
    const url = `/api/admin/fix-card-definition-inconsistencies?dryRun=${dryRun}`;
    return fetchWithAuth(url, {
        method: 'POST',
        // fetchWithAuth automatically handles Content-Type and Authorization for JSON body
    });
};

export const fixCardDataMismatches = async (data) => {
    return await fetchWithAuth('/api/admin/fix-card-data-mismatches', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const fixDuplicateAndMintZeroCards = async (dryRun) => {
    const url = `/api/admin/fix-duplicate-mint-numbers?dryRun=${dryRun}`;
    try {
        const response = await fetchWithAuth(url, {
            method: 'POST',
        });
        return response;
    } catch (error) {
        console.error('Error in fixDuplicateAndMintZeroCards:', error.message);
        throw error;
    }
};

export const backfillTradeSnapshots = async (payload) => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/admin/trades/backfill-snapshots', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to backfill trade snapshots');
    }
    return response.json();
};

export const fixLegacyGlitchNames = async (options = { dryRun: true }) => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/fix-legacy-glitch-names', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dryRun: options.dryRun })
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fix legacy glitch names');
    }

    return res.json();
};

export const fixMissingModifierPrefixes = async (options = { dryRun: true }) => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/fix-missing-modifier-prefixes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dryRun: options.dryRun })
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fix missing modifier prefixes');
    }

    return res.json();
};

// Add a log entry to the backend with a timestamp and a user reference
export const logEvent = async (logMessage) => {
    try {
        const response = await fetchWithAuth("/api/log", {
            method: "POST",
            body: JSON.stringify({ message: logMessage }),
        });
        console.log("[API] Logged event:", logMessage);
        return response;
    } catch (error) {
        console.error("[API] Error logging event:", error.message);
        // We don't want the app to crash if logging fails, so we'll just log the error.
        return null;
    }
};
