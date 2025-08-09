module.exports = {
    testEnvironment: 'node',
    clearMocks: true,
    testTimeout: 30000,
    globalSetup: './src/__tests__/setup.js',
    globalTeardown: './src/__tests__/teardown.js',
    testPathIgnorePatterns: [
        "/node_modules/",
        "/setup.js",
        "/teardown.js",
        "/db-handler.js"
    ],
    setupFiles: ['dotenv/config'],
};
