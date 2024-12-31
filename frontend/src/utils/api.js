// File: frontend/src/utils/api.js

// Base API URL
const API_BASE_URL = ''; // Leave empty because the `proxy` in package.json will handle this

/**
 * A generic function to make API requests.
 * @param {string} endpoint - The endpoint to call, e.g., "/auth/login".
 * @param {string} method - HTTP method, e.g., "GET", "POST".
 * @param {object} [body] - Optional body data for POST/PUT requests.
 * @returns {Promise<object>} - The JSON response from the server.
 */
export const apiRequest = async (endpoint, method = 'GET', body = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      credentials: 'include', // Ensures cookies/session data are sent
      body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(
        `Request failed: ${response.status} ${response.statusText} - ${errorMessage}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`API Request Error: ${error.message}`);
    throw error;
  }
};

// Convenience wrapper for GET requests
export const get = (endpoint) => apiRequest(endpoint, 'GET');
