const User = require('../models/userModel'); // Ensure this is the correct path

/**
 * Retrieves a user's card collection by their ID.
 */
const getCollection = async (req, res) => {
    try {
        const { userId } = req.params; // Extract userId from the URL parameters
        console.log(`Fetching collection for userId: ${userId}`);

        // Fetch user by their ID
        const user = await User.findById(userId).select('cards'); // Only fetch the 'cards' field
        if (!user) {
            console.error(`User not found for ID: ${userId}`);
            return res.status(404).json({ message: 'User not found.' });
        }

        // Log the cards array for debugging
        console.log('User collection retrieved successfully:', user.cards);

        // Respond with the cards collection
        res.status(200).json({ cards: user.cards });
    } catch (error) {
        console.error('Error fetching user collection:', error.message);
        res.status(500).json({ error: true, message: 'Failed to fetch collection.' });
    }
};

module.exports = { getCollection };
