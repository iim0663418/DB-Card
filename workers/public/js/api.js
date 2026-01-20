import { API_BASE } from './config.js';

/**
 * Tap a card to initiate a session
 * @param {string} uuid - Card UUID
 * @returns {Promise<{session_id: string, expires_at: string, reads_remaining: number}>}
 */
export async function tapCard(uuid) {
  const response = await fetch(`${API_BASE}/api/nfc/tap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ card_uuid: uuid }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error = new Error(errorData.error?.message || errorData.message || 'Failed to tap card');
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
 * @returns {Promise<{data: object, session_info: object}>}
 */
export async function readCard(uuid, sessionId) {
  const CACHE_TTL = 300000; // 5 minutes in milliseconds
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
  } catch (e) {
    // Invalid cache data, continue to fetch
  }

  // Scenario 3: No cache or expired - fetch from API
  const response = await fetch(`${API_BASE}/api/read?uuid=${encodeURIComponent(uuid)}&session=${encodeURIComponent(sessionId)}`);

  if (!response.ok) {
    // Scenario 4: API error - don't cache error responses
    const errorData = await response.json();
    const error = new Error(errorData.error?.message || errorData.message || 'Failed to read card');
    error.code = errorData.error?.code;
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
  } catch (e) {
    // sessionStorage full or unavailable, continue without caching
  }

  // Return full result with data and session_info
  return result;
}

/**
 * Create a new card (admin)
 * @param {string} token - Admin token
 * @param {string} cardType - Card type (BASIC, PREMIUM, ELITE)
 * @param {object} data - Card data
 * @returns {Promise<object>}
 */
export async function createCard(token, cardType, data) {
  const response = await fetch(`${API_BASE}/api/admin/cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
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
 * @param {string} token - Admin token
 * @param {string} uuid - Card UUID
 * @param {object} data - Card data to update
 * @returns {Promise<object>}
 */
export async function updateCard(token, uuid, data) {
  const response = await fetch(`${API_BASE}/api/admin/cards/${uuid}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
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
 * @param {string} token - Admin token
 * @param {string} uuid - Card UUID
 * @returns {Promise<object>}
 */
export async function deleteCard(token, uuid) {
  const response = await fetch(`${API_BASE}/api/admin/cards/${uuid}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete card');
  }

  return response.json();
}
