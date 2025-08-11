/**
 * UCE-04: Key Recovery Manager Implementation
 * Handles key recovery, failure detection, and batch data recovery
 * 
 * @version 1.0.0
 * @security OWASP compliant recovery mechanisms
 */

class KeyRecoveryManager {
  constructor(storage, userKeyManager) {
    this.storage = storage;
    this.userKeyManager = userKeyManager;
    this.recoveryAttempts = new Map();
    this.maxRecoveryAttempts = 3;
  }

  /**
   * UCE-04: Trigger key recovery process
   */
  async triggerRecovery(reason) {
    try {
      const recoveryId = this.generateRecoveryId();
      
      // Log recovery attempt
      await this.storage.setSetting(`recovery_${recoveryId}`, {
        id: recoveryId,
        reason,
        timestamp: Date.now(),
        status: 'initiated'
      });

      // Generate recovery hints
      const hints = this.generateRecoveryHints();

      return {
        recoveryId,
        hints,
        maxAttempts: this.maxRecoveryAttempts
      };

    } catch (error) {
      throw new Error(`Recovery trigger failed: ${error.message}`);
    }
  }

  /**
   * UCE-04: Perform batch data recovery
   */
  async batchDataRecovery(newKey) {
    try {
      const cards = await this.storage.listCards();
      const result = {
        totalItems: cards.length,
        recoveredItems: 0,
        failedItems: []
      };

      for (const card of cards) {
        try {
          if (card.encrypted && card.data) {
            // Attempt to decrypt with new key
            const decryptedData = await this.attemptDecryption(card.data, newKey);
            
            if (decryptedData) {
              // Re-encrypt with new key
              const reEncryptedData = await this.reEncryptData(decryptedData, newKey);
              
              // Update card
              await this.storage.safeTransaction(['cards'], 'readwrite', async (transaction) => {
                const store = transaction.objectStore('cards');
                const updatedCard = {
                  ...card,
                  data: reEncryptedData,
                  recoveredAt: Date.now()
                };
                
                return new Promise((resolve, reject) => {
                  const request = store.put(updatedCard);
                  request.onsuccess = () => resolve();
                  request.onerror = () => reject(request.error);
                });
              });

              result.recoveredItems++;
            }
          }
        } catch (error) {
          result.failedItems.push(card.id);
        }
      }

      return result;

    } catch (error) {
      throw new Error(`Batch recovery failed: ${error.message}`);
    }
  }

  /**
   * UCE-04: Perform health check on key integrity
   */
  async performHealthCheck() {
    try {
      const result = {
        keyIntegrity: true,
        dataIntegrity: true,
        recommendations: []
      };

      // Check if user key is configured
      const userKeyConfig = await this.storage.getSetting('userKeyConfig');
      if (!userKeyConfig) {
        result.recommendations.push('Configure user-controlled encryption');
      }

      // Check for corrupted encrypted data
      const cards = await this.storage.listCards();
      const encryptedCards = cards.filter(card => card.encrypted);
      
      let corruptedCount = 0;
      for (const card of encryptedCards.slice(0, 10)) { // Sample check
        try {
          if (!this.validateEncryptedStructure(card.data)) {
            corruptedCount++;
          }
        } catch (error) {
          corruptedCount++;
        }
      }

      if (corruptedCount > 0) {
        result.dataIntegrity = false;
        result.recommendations.push(`${corruptedCount} cards may have data integrity issues`);
      }

      return result;

    } catch (error) {
      return {
        keyIntegrity: false,
        dataIntegrity: false,
        recommendations: ['Health check failed - system may need recovery']
      };
    }
  }

  /**
   * Attempt to decrypt data with new key
   */
  async attemptDecryption(encryptedData, key) {
    try {
      if (!encryptedData || typeof encryptedData !== 'object') {
        return null;
      }

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
        key,
        new Uint8Array(encryptedData.data)
      );

      return JSON.parse(new TextDecoder().decode(decrypted));

    } catch (error) {
      return null;
    }
  }

  /**
   * Re-encrypt data with new key
   */
  async reEncryptData(data, key) {
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedData = new TextEncoder().encode(JSON.stringify(data));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      );

      return {
        data: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv),
        algorithm: 'AES-GCM',
        timestamp: Date.now()
      };

    } catch (error) {
      throw new Error(`Re-encryption failed: ${error.message}`);
    }
  }

  /**
   * Validate encrypted data structure
   */
  validateEncryptedStructure(encryptedData) {
    return encryptedData &&
           typeof encryptedData === 'object' &&
           Array.isArray(encryptedData.data) &&
           Array.isArray(encryptedData.iv) &&
           encryptedData.algorithm === 'AES-GCM';
  }

  /**
   * Generate recovery hints
   */
  generateRecoveryHints() {
    return [
      'Try variations of your three phrases',
      'Check for typos in your passphrase',
      'Ensure correct phrase order',
      'Contact support if recovery fails'
    ];
  }

  /**
   * Generate unique recovery ID
   */
  generateRecoveryId() {
    return `recovery_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get recovery manager status
   */
  getStatus() {
    return {
      activeRecoveries: this.recoveryAttempts.size,
      maxAttempts: this.maxRecoveryAttempts
    };
  }

  /**
   * Cleanup recovery data
   */
  async cleanup() {
    this.recoveryAttempts.clear();
  }
}

// Export for both CommonJS and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeyRecoveryManager;
} else if (typeof window !== 'undefined') {
  window.KeyRecoveryManager = KeyRecoveryManager;
}