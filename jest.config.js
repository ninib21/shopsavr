module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/node_modules/**',
    '!backend/coverage/**',
    '!tests/**'
  ],
  moduleDirectories: ['node_modules', 'backend/node_modules'],
  testTimeout: 30000
};