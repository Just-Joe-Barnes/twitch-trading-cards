// imageFix.js
const mongoose = require('mongoose');
const User = require('../models/userModel'); // Updated relative path

// Connect to your MongoDB - replace 'your-database-name' with your actual database name.
mongoose.connect('mongodb+srv://jobybarnes1:Qazwsx4321!@cluster0.lrqb8.mongodb.net/test', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));

const updateImageExtensions = async () => {
    try {
        // Find users with cards that have an imageUrl ending in .webp or .png
        const users = await User.find({ "cards.imageUrl": { $regex: /\.(webp|png)$/i } });
        for (const user of users) {
            let updated = false;
            // Map through the user's cards and update the URL if needed
            user.cards = user.cards.map(card => {
                if (card.imageUrl.match(/\.(webp|png)$/i)) {
                    card.imageUrl = card.imageUrl.replace(/\.(webp|png)$/i, '.jpg');
                    updated = true;
                }
                return card;
            });
            if (updated) {
                await user.save();
                console.log(`Updated cards for user ${user.username}`);
            }
        }
        console.log('Migration complete.');
    } catch (error) {
        console.error('Error during migration:', error);
    } finally {
        mongoose.connection.close();
    }
};

updateImageExtensions();
