// Set up environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';
process.env.PORT = 5000;
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';

// Increase timeout for tests
jest.setTimeout(10000);

// Silence console logs during tests unless there's an error
const originalError = console.error;
const originalLog = console.log;
const originalWarn = console.warn;

console.error = (...args) => {
  if (args[0]?.includes('Warning:')) return;
  originalError.call(console, ...args);
};

console.log = (...args) => {
  if (process.env.DEBUG) {
    originalLog.call(console, ...args);
  }
};

console.warn = (...args) => {
  if (process.env.DEBUG) {
    originalWarn.call(console, ...args);
  }
}; 