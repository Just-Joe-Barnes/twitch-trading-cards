// src/utils/api.js
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const fetchWithAuth = async (endpoint, options = {}) => {
    try {
        const token = localStorage.getItem("token");
        const headers = {
            "Content-Type": "application/json",
            ...options.headers,
        };

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
            console.error("[API] HTTP error:", response.status, response.statusText);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return response.json();
    } catch (error) {
        console.error("[API] Error in fetchWithAuth:", error.message, { endpoint, options });
        throw error;
    }
};

// Fetch user's packs
export const fetchMyPacks = async () => {
    return fetchWithAuth("/api/packs/mypacks", { method: "GET" });
};

// Fetch logged-in user's profile
export const fetchUserProfile = async () => {
    return fetchWithAuth("/api/users/me", { method: "GET" });
};

// Fetch a user profile by username
export const fetchUserProfileByUsername = async (username) => {
    try {
        return fetchWithAuth(`/api/users/profile/${username}`, { method: "GET" });
    } catch (error) {
        console.error("[API] Error fetching profile by username:", error.message);
        throw error;
    }
};

// Fetch user collection (cards and packs)
export const fetchUserCollection = async (userId) => {
    try {
        const response = await fetchWithAuth(`/api/users/${userId}/collection`, { method: "GET" });
        console.log("[API] Fetched User Collection:", response);
        return response;
    } catch (error) {
        console.error("[API] Error fetching user collection:", error.message);
        throw error;
    }
};

// Fetch all cards recursively with pagination support
export const fetchCards = async ({ search = "", rarity = "", sort = "", page = 1, limit = 50 }) => {
    const queryParams = new URLSearchParams({ search, rarity, sort, page, limit });
    try {
        const response = await fetchWithAuth(`/api/cards?${queryParams.toString()}`, { method: "GET" });
        if (response.cards?.length === limit) {
            const nextPageData = await fetchCards({ search, rarity, sort, page: page + 1, limit });
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
    return fetchWithAuth("/api/packs/firstlogin", { method: "POST" });
};

// Redeem channel points for a pack
export const redeemChannelPointsPack = async () => {
    return fetchWithAuth("/api/packs/redeem", { method: "POST" });
};

// Fetch user subscriptions
export const fetchUserSubscriptions = async () => {
    return fetchWithAuth("/api/users/subscriptions", { method: "GET" });
};

// Handle gifted subscriptions
export const handleGiftedSubscription = async (giftCount) => {
    return fetchWithAuth("/api/packs/gift", {
        method: "POST",
        body: JSON.stringify({ giftCount }),
    });
};

// Fetch featured cards for the logged-in user
export const fetchFeaturedCards = async () => {
    try {
        const response = await fetchWithAuth("/api/users/featured-cards", { method: "GET" });
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
            body: JSON.stringify({ featuredCards }),
        });
        console.log("[API] Updated Featured Cards:", response);
        return response;
    } catch (error) {
        console.error("[API] Error updating featured cards:", error.message);
        throw error;
    }
};

// Create a new trade
export const createTrade = async (tradeData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/trades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(tradeData),
        });

        if (!response.ok) {
            let errorMessage = `HTTP error! Status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.popupMessage) {
                    errorMessage = errorData.popupMessage;
                }
            } catch (parseError) {
                console.error('Error parsing JSON error response:', parseError);
            }
            throw new Error(errorMessage);
        }

        return await response.json();
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
export const fetchPendingTrades = async (userId, status = 'Pending') => {
    try {
        const response = await fetchWithAuth(`/api/trades/${userId}?status=${status}`);
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
            body: JSON.stringify({ status: "accepted" }),
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
            body: JSON.stringify({ status: "rejected" }),
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
            body: JSON.stringify({ status: "cancelled" }),
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
            body: JSON.stringify({ status }),
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
        const response = await fetchWithAuth(`/api/users/search?query=${query}`, { method: "GET" });
        console.log("[API] User search results:", response);
        return response;
    } catch (error) {
        console.error("[API] Error searching users:", error.message);
        throw error;
    }
};

// Fetch all notifications for the logged-in user
export const fetchNotifications = async () => {
    return fetchWithAuth('/api/notifications', { method: 'GET' });
};

// Mark all notifications as read (called when the dropdown opens)
export const markNotificationsAsRead = async () => {
    return fetchWithAuth('/api/notifications/read', { method: 'PUT' });
};

// Delete a single notification by its ID
export const deleteNotification = async (notificationId) => {
    return fetchWithAuth(`/api/notifications/${notificationId}`, { method: 'DELETE' });
};

// Optionally, delete all notifications
export const clearNotifications = async () => {
    return fetchWithAuth('/api/notifications/clear', { method: 'DELETE' });
};
