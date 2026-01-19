/**
 * Session Cache Helper
 * 實作 sessionStorage 快取機制，符合 ADR-004
 * 快取時效: 1 小時
 * 範圍: Tab 級別
 */

const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 小時

/**
 * 生成快取鍵
 * @param {string} uuid - 名片 UUID
 * @param {string} sessionId - Session ID
 * @returns {string} 快取鍵
 */
function getCacheKey(uuid, sessionId) {
    return `card_cache_${uuid}_${sessionId}`;
}

/**
 * 取得快取的名片資料
 * @param {string} uuid - 名片 UUID
 * @param {string} sessionId - Session ID
 * @returns {Object|null} 快取的名片資料，若無效或過期則返回 null
 */
export function getCachedCard(uuid, sessionId) {
    if (!uuid || !sessionId) {
        return null;
    }

    try {
        const key = getCacheKey(uuid, sessionId);
        const cached = sessionStorage.getItem(key);

        if (!cached) {
            return null;
        }

        const { data, expiresAt } = JSON.parse(cached);

        // 檢查是否過期
        if (Date.now() > expiresAt) {
            sessionStorage.removeItem(key);
            return null;
        }

        return data;
    } catch (error) {
        return null;
    }
}

/**
 * 儲存名片資料到快取
 * @param {string} uuid - 名片 UUID
 * @param {string} sessionId - Session ID
 * @param {Object} cardData - 名片資料
 */
export function setCachedCard(uuid, sessionId, cardData) {
    if (!uuid || !sessionId || !cardData) {
        return;
    }

    try {
        const key = getCacheKey(uuid, sessionId);
        const now = Date.now();
        const cacheEntry = {
            data: cardData,
            timestamp: now,
            expiresAt: now + CACHE_EXPIRY_MS
        };

        sessionStorage.setItem(key, JSON.stringify(cacheEntry));
    } catch (error) {
        // sessionStorage 可能因為容量限制失敗，靜默處理
    }
}

/**
 * 清理所有過期的快取項目
 * 在頁面載入時調用
 */
export function clearExpiredCache() {
    try {
        const now = Date.now();
        const keysToRemove = [];

        // 遍歷所有 sessionStorage 項目
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);

            // 只處理名片快取
            if (!key || !key.startsWith('card_cache_')) {
                continue;
            }

            try {
                const cached = sessionStorage.getItem(key);
                if (!cached) {
                    continue;
                }

                const { expiresAt } = JSON.parse(cached);

                // 標記過期項目
                if (now > expiresAt) {
                    keysToRemove.push(key);
                }
            } catch {
                // 解析失敗的項目也移除
                keysToRemove.push(key);
            }
        }

        // 移除過期項目
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
    } catch (error) {
        // 靜默處理錯誤
    }
}
