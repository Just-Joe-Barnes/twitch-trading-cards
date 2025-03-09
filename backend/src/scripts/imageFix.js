// imageFix.js
const mongoose = require('mongoose');
const User = require('../models/userModel'); // Adjust relative path if necessary

// Replace 'your-database-name' with your actual DB name (in your case, "test" if that's what you're using)
mongoose.connect('mongodb+srv://jobybarnes1:Qazwsx4321!@cluster0.lrqb8.mongodb.net/test', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected:', mongoose.connection.name))
    .catch((err) => console.error('MongoDB connection error:', err));

const updateImageExtensions = async () => {
    try {
        // Find users with cards or featuredCards that have imageUrl ending in .webp or .png.
        const users = await User.find({
            $or: [
                { "cards.imageUrl": { $regex: /\.(webp|png)$/i } },
                { "featuredCards.imageUrl": { $regex: /\.(webp|png)$/i } }
            ]
        });

        console.log(`Found ${users.length} user(s) needing image updates...`);

        for (const user of users) {
            let updated = false;

            // Update the cards array
            if (user.cards && user.cards.length > 0) {
                user.cards = user.cards.map(card => {
                    if (card.imageUrl && card.imageUrl.match(/\.(webp|png)$/i)) {
                        card.imageUrl = card.imageUrl.replace(/\.(webp|png)$/i, '.jpg');
                        updated = true;
                    }
                    return card;
                });
            }

            // Update the featuredCards array
            if (user.featuredCards && user.featuredCards.length > 0) {
                user.featuredCards = user.featuredCards.map(card => {
                    if (card.imageUrl && card.imageUrl.match(/\.(webp|png)$/i)) {
                        card.imageUrl = card.imageUrl.replace(/\.(webp|png)$/i, '.jpg');
                        updated = true;
                    }
                    return card;
                });
            }

            if (updated) {
                await user.save();
                console.log(`Updated images for user ${user.username}`);
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
