const mongoose = require('mongoose');

module.exports = async () => {
    // Disconnect Mongoose
    await mongoose.disconnect();
    // Stop the in-memory MongoDB server
    if (global.__MONGOD__) {
        await global.__MONGOD__.stop();
    }
    console.log('\nJest Teardown: In-memory MongoDB stopped.');
};
