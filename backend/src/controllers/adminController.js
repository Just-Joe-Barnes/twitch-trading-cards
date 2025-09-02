const Card = require('../models/cardModel');
const User = require('../models/userModel');

const getAdminDashboardData = async (req, res) => {
    // Placeholder for admin dashboard data logic
    res.json({ message: 'Admin dashboard data' });
};

/**
 * FINAL CORRECTED VERSION: Updates a card and cascades ALL changes to user collections.
 */
const updateCard = async (req, res) => {
    try {
        const { cardId } = req.params;
        const {
            name,
            flavorText,
            imageUrl,
            lore,
            loreAuthor,
            availableFrom,
            availableTo
        } = req.body;

        const card = await Card.findById(cardId);
        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        const oldName = card.name;

        // Update the main card document's properties in memory
        card.name = name;
        card.flavorText = flavorText;
        card.imageUrl = imageUrl;
        card.lore = lore;
        card.loreAuthor = loreAuthor;
        card.availableFrom = availableFrom;
        card.availableTo = availableTo;

        // IMPORTANT: Check for modifications *before* saving the document.
        // This is when Mongoose knows the document is "dirty".
        const hasCascadingChanges = card.isModified('name') || card.isModified('imageUrl') || card.isModified('flavorText') || card.isModified('lore') || card.isModified('loreAuthor');

        // Now, save the main card to the database
        const updatedCard = await card.save();

        // If there were changes, proceed to update user collections
        if (hasCascadingChanges) {
            const updatePayload = {};
            const fieldsToCascade = { name, imageUrl, flavorText, lore, loreAuthor };

            for (const [key, value] of Object.entries(fieldsToCascade)) {
                if (value !== undefined) {
                    updatePayload[`cards.$[elem].${key}`] = value;
                }
            }

            if (Object.keys(updatePayload).length > 0) {
                const userCardArrays = ['cards', 'featuredCards', 'openedCards'];

                for (const arrayName of userCardArrays) {
                    const filter = { [`${arrayName}.name`]: oldName };

                    const specificUpdatePayload = {};
                    for (const key in updatePayload) {
                        specificUpdatePayload[key.replace('cards.', `${arrayName}.`)] = updatePayload[key];
                    }

                    await User.updateMany(
                        filter,
                        { $set: specificUpdatePayload },
                        { arrayFilters: [{ 'elem.name': oldName }] }
                    );
                }
            }
        }

        res.json({ message: 'Card updated successfully', card: updatedCard });

    } catch (error) {
        console.error('Error updating card:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { getAdminDashboardData, updateCard };
