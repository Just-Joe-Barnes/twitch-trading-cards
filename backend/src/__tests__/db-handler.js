const mongoose = require('mongoose');

module.exports = {
    mongoose,
    /**
     * Connect to the in-memory database.
     */
    connect: async () => {
        // The URI is set globally by our jest setup.js
        await mongoose.connect(process.env.MONGO_URI_TEST);
    },

    /**
     * Close the database connection.
     */
    closeDatabase: async () => {
        await mongoose.connection.close();
    },

    /**
     * Delete all data from all collections.
     */
    clearDatabase: async () => {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany();
        }
    }
};
