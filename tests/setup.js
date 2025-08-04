// Test setup file
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock crypto for Node.js environment
const crypto = require('crypto');
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: async (algorithm, data) => {
        const hash = crypto.createHash('sha256');
        hash.update(data);
        return hash.digest();
      }
    }
  }
});

// Mock IndexedDB
require('fake-indexeddb/auto');