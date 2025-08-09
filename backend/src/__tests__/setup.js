const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
    // Start a new in-memory MongoDB server
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    // Store the server instance and URI in global variables
    // so we can access them in the teardown script and test files
    global.__MONGOD__ = mongod;
    process.env.MONGO_URI_TEST = uri; // Set the env variable for your tests

    // You can optionally connect here if needed by all tests,
    // but often it's better to let each test file connect/disconnect
    // using the URI we've just set.
    console.log(`\nJest Setup: In-memory MongoDB started at ${uri}`);
};
