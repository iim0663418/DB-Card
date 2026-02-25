import { API_BASE } from './config.js';
import { fetchWithRetry } from './api-retry.js';

/**
 * Tap a card to initiate a session
 * @param {string} uuid - Card UUID
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<{session_id: string, expires_at: string, reads_remaining: number}>}
 */
export async function tapCard(uuid, signal = null) {
  const response = await fetchWithRetry(
    (internalSignal) => {
      // Combine external signal with internal signal (timeout)
      let combinedSignal = internalSignal;

      if (signal) {
        if (AbortSignal.any) {
          combinedSignal = AbortSignal.any([internalSignal, signal]);
        } else {
          // Fallback: manual combination
          const controller = new AbortController();
          const onAbort = () => controller.abort();
          internalSignal.addEventListener('abort', onAbort, { once: true });
          signal.addEventListener('abort', onAbort, { once: true });
          combinedSignal = controller.signal;
        }
      }

      return fetch(`${API_BASE}/api/nfc/tap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ card_uuid: uuid }),
        signal: combinedSignal,
      });
    },
    {
      maxAttempts: 3,
      timeoutMs: 4000,
    }
  );

  if (!response.ok) {
    // Check content-type before parsing JSON
    const contentType = response.headers.get('content-type');
    let errorData;

    if (contentType?.includes('application/json')) {
      errorData = await response.json();
    } else {
      // Non-JSON response (502, Cloudflare error, etc.)
      const text = await response.text();
      errorData = { error: text || 'Network error, please try again' };
    }

    const error = new Error(errorData.error?.message || errorData.message || errorData.error || 'Failed to tap card');
    error.code = errorData.error?.code;
    error.data = errorData;
    throw error;
  }

  const result = await response.json();
  return result.data || result;
}

/**
 * Read card data using session ID
 * @param {string} uuid - Card UUID
 * @param {string} sessionId - Session ID from tap
 * @param {AbortSignal} externalSignal - Optional external abort signal (e.g., cancel button)
 * @returns {Promise<{data: object, session_info: object}>}
 */
export async function readCard(uuid, sessionId, externalSignal = null) {
  const CACHE_TTL = 3600000; // 1 hour in milliseconds (aligned with ReadSession TTL)
  const cacheKey = `card:${uuid}`;

  // Scenario 1 & 2: Check cache validity
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();

      // Scenario 1: Cache hit - return cached data
      if (now - timestamp < CACHE_TTL) {
        return data;
      }
      // Scenario 2: Cache expired - continue to fetch
    }
  } catch {
    // Invalid cache data, continue to fetch
  }

  // Scenario 3: No cache or expired - fetch from API with retry
  const response = await fetchWithRetry(
    (signal) => {
      // Combine external signal (cancel button) with internal signal (timeout)
      let combinedSignal = signal;
      
      if (externalSignal) {
        if (AbortSignal.any) {
          combinedSignal = AbortSignal.any([signal, externalSignal]);
        } else {
          // Fallback: manual combination
          const controller = new AbortController();
          const onAbort = () => controller.abort();
          signal.addEventListener('abort', onAbort, { once: true });
          externalSignal.addEventListener('abort', onAbort, { once: true });
          combinedSignal = controller.signal;
        }
      }
      
      return fetch(
        `${API_BASE}/api/read?uuid=${encodeURIComponent(uuid)}&session=${encodeURIComponent(sessionId)}`,
        { signal: combinedSignal }
      );
    },
    {
      maxAttempts: 3,
      timeoutMs: 4000,
      onRetry: (attempt, max, delay, status) => {
        if (window.DEBUG) {
          console.log(`[Retry] ${attempt}/${max} after ${delay}ms${status ? ` (HTTP ${status})` : ''}`);
        }
        if (window.updateRetryProgress) {
          window.updateRetryProgress(attempt, max);
        }
      }
    }
  );

  if (!response.ok) {
    // Scenario 4: API error - don't cache error responses
    const errorData = await response.json();
    const error = new Error(errorData.error?.message || errorData.message || 'Failed to read card');
    error.code = errorData.error?.code;
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  const result = await response.json();

  // Cache successful response with timestamp
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: result,
      timestamp: Date.now()
    }));
  } catch {
    // sessionStorage full or unavailable, continue without caching
  }

  // Return full result with data and session_info
  return result;
}

/**
 * Create a new card (admin)
 * @param {string} cardType - Card type (BASIC, PREMIUM, ELITE)
 * @param {object} data - Card data
 * @returns {Promise<object>}
 */
export async function createCard(cardType, data) {
  const response = await fetch(`${API_BASE}/api/admin/cards`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ card_type: cardType, ...data }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create card');
  }

  return response.json();
}

/**
 * Update a card (admin)
 * @param {string} uuid - Card UUID
 * @param {object} data - Card data to update
 * @returns {Promise<object>}
 */
export async function updateCard(uuid, data) {
  const response = await fetch(`${API_BASE}/api/admin/cards/${uuid}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update card');
  }

  return response.json();
}

/**
 * Delete a card (admin)
 * @param {string} uuid - Card UUID
 * @returns {Promise<object>}
 */
export async function deleteCard(uuid) {
  const response = await fetch(`${API_BASE}/api/admin/cards/${uuid}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete card');
  }

  return response.json();
}
