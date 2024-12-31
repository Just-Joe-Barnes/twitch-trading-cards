export const API_BASE_URL = ""; // Leave empty to rely on proxy from package.json

export const fetchWithAuth = async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: "include",
    });
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
};
