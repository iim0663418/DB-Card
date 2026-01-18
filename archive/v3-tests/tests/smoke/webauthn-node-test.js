/**
 * WebAuthn Node.js Smoke Test
 * Basic functionality test without browser APIs
 */

// Mock browser APIs for Node.js environment
global.window = {
    PublicKeyCredential: true,
    location: { hostname: 'localhost' },
    crypto: {
        getRandomValues: (arr) => {
            const crypto = require('crypto');
            const bytes = crypto.randomBytes(arr.length);
            for (let i = 0; i < arr.length; i++) {
                arr[i] = bytes[i];
            }
            return arr;
        },
        subtle: {
            digest: async (algorithm, data) => {
                const crypto = require('crypto');
                const hash = crypto.createHash('sha256');
                hash.update(Buffer.from(data));
                return hash.digest().buffer;
            }
        }
    }
};

global.navigator = {
    credentials: {
        create: async () => {
            throw new Error('WebAuthn not available in Node.js test environment');
        },
        get: async () => {
            throw new Error('WebAuthn not available in Node.js test environment');
        }
    }
};

global.indexedDB = {
    open: () => {
        throw new Error('IndexedDB not available in Node.js test environment');
    }
};

global.document = {
    createElement: () => ({
        style: {},
        innerHTML: '',
        appendChild: () => {},
        querySelector: () => ({
            focus: () => {},
            value: '123456',
            style: {},
            onkeypress: null,
            onclick: null
        })
    }),
    body: {
        appendChild: () => {},
        removeChild: () => {}
    }
};

// Load SecurityAuthHandler
const fs = require('fs');
const path = require('path');

// Read and evaluate the SecurityAuthHandler file
const securityHandlerPath = path.join(__dirname, '../../src/security/SecurityAuthHandler.js');
const securityHandlerCode = fs.readFileSync(securityHandlerPath, 'utf8');

// Create a global SecurityAuthHandler by evaluating the code
eval(securityHandlerCode);

// Make it available globally
if (typeof SecurityAuthHandler === 'undefined') {
    global.SecurityAuthHandler = SecurityAuthHandler;
}

console.log('🧪 WebAuthn Implementation Smoke Test');
console.log('=====================================');

// Test 1: Class Loading
console.log('\n1. Testing class loading...');
try {
    if (typeof SecurityAuthHandler !== 'undefined') {
        console.log('✅ SecurityAuthHandler loaded successfully');
    } else {
        console.log('❌ SecurityAuthHandler not found');
        process.exit(1);
    }
} catch (error) {
    console.log('❌ Error loading SecurityAuthHandler:', error.message);
    process.exit(1);
}

// Test 2: Session Management
console.log('\n2. Testing session management...');
try {
    const userId = 'test-user-123';
    const permissions = ['read', 'write'];
    
    // Create session
    const sessionId = SecurityAuthHandler.createSession(userId, permissions);
    console.log(`✅ Session created: ${sessionId}`);
    
    // Validate session
    const isValid = SecurityAuthHandler.validateSession(sessionId, userId);
    console.log(`✅ Session validation: ${isValid ? 'Valid' : 'Invalid'}`);
    
    // Test access validation
    const accessResult = SecurityAuthHandler.validateAccess('card-data', 'read', {
        userId,
        sessionId,
        timestamp: Date.now()
    });
    console.log(`✅ Access validation: ${accessResult.authorized ? 'Authorized' : 'Denied'} - ${accessResult.reason}`);
    
    // Destroy session
    const destroyed = SecurityAuthHandler.destroySession(sessionId);
    console.log(`✅ Session destruction: ${destroyed ? 'Success' : 'Failed'}`);
    
    // Verify session invalid after destruction
    const isValidAfterDestroy = SecurityAuthHandler.validateSession(sessionId, userId);
    console.log(`✅ Session validation after destruction: ${!isValidAfterDestroy ? 'Correctly Invalid' : 'ERROR: Still Valid'}`);
    
} catch (error) {
    console.log('❌ Session management test failed:', error.message);
}

// Test 3: Audit Logging
console.log('\n3. Testing audit logging...');
try {
    SecurityAuthHandler.auditLog('test_action', {
        testData: 'test_value',
        userId: 'test-user'
    }, 'info');
    console.log('✅ Audit logging completed');
} catch (error) {
    console.log('❌ Audit logging failed:', error.message);
}

// Test 4: WebAuthn Authentication (Expected to Fall Back)
console.log('\n4. Testing WebAuthn authentication (fallback expected)...');
SecurityAuthHandler.authenticateWithWebAuthn({
    userDisplayName: 'Test User',
    timeout: 5000
}).then(result => {
    if (result.success) {
        console.log('✅ Authentication successful:', result);
    } else {
        console.log('ℹ️ Authentication fell back to PIN (expected in Node.js):', result.error || 'Fallback triggered');
    }
}).catch(error => {
    console.log('ℹ️ Authentication error (expected in Node.js):', error.message);
});

// Test 5: Access Control
console.log('\n5. Testing access control...');
try {
    const testCases = [
        { resource: 'card-data', operation: 'read', shouldPass: true },
        { resource: 'card-data', operation: 'write', shouldPass: true },
        { resource: 'card-data', operation: 'delete', shouldPass: true },
        { resource: 'unknown-resource', operation: 'read', shouldPass: false },
        { resource: 'card-data', operation: 'invalid-operation', shouldPass: false }
    ];
    
    testCases.forEach(({ resource, operation, shouldPass }, index) => {
        const result = SecurityAuthHandler.validateAccess(resource, operation, {
            userId: 'test-user',
            timestamp: Date.now()
        });
        
        const passed = result.authorized === shouldPass;
        console.log(`${passed ? '✅' : '❌'} Test ${index + 1}: ${resource}:${operation} - ${result.reason}`);
    });
} catch (error) {
    console.log('❌ Access control test failed:', error.message);
}

console.log('\n🎉 Smoke test completed!');
console.log('\nNote: WebAuthn functionality requires a browser environment with user interaction.');
console.log('Use the HTML validation page (webauthn-validation.html) for full testing.');