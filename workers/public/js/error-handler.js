import { getCard, deleteSession } from './storage.js';

/**
 * Handle card revoked error
 * @param {string} uuid - Card UUID
 * @returns {Promise<{revoked: boolean, cachedData: object|null}>}
 */
export async function handleCardRevoked(uuid) {
  await deleteSession(uuid);
  const cachedData = await getCard(uuid);

  if (cachedData) {
    showNotification('此名片已被撤銷，顯示快取資料', 'warning');
    return { revoked: true, cachedData };
  }

  showError('此名片已被撤銷且無快取資料');
  return { revoked: true, cachedData: null };
}

/**
 * Handle network errors
 * @param {string} uuid - Card UUID
 * @returns {Promise<{offline: boolean, cachedData: object|null}>}
 */
export async function handleNetworkError(uuid) {
  const cachedData = await getCard(uuid);

  if (cachedData) {
    showNotification('網路連線失敗，顯示快取資料', 'warning');
    return { offline: true, cachedData };
  }

  showError('無法連線到伺服器，且沒有快取資料');
  return { offline: true, cachedData: null };
}

/**
 * Handle session expired error
 * @param {string} uuid - Card UUID
 * @returns {Promise<{expired: boolean, cachedData: object|null}>}
 */
export async function handleSessionExpired(uuid) {
  await deleteSession(uuid);
  const cachedData = await getCard(uuid);

  showNotification('會話已過期，請重新碰觸名片', 'info');

  if (cachedData) {
    showNotification('顯示先前的名片資料', 'info');
    return { expired: true, cachedData };
  }

  return { expired: true, cachedData: null };
}

/**
 * Handle max reads exceeded error
 * @param {string} uuid - Card UUID
 * @returns {Promise<{exceeded: boolean, cachedData: object|null}>}
 */
export async function handleMaxReadsExceeded(uuid) {
  await deleteSession(uuid);
  const cachedData = await getCard(uuid);

  showNotification('已達到最大讀取次數，請重新碰觸名片', 'info');

  if (cachedData) {
    showNotification('顯示先前的名片資料', 'info');
    return { exceeded: true, cachedData };
  }

  return { exceeded: true, cachedData: null };
}

/**
 * Show error message in UI
 * @param {string} message - Error message
 */
export function showError(message) {
  const errorContainer = document.getElementById('error-container');
  if (errorContainer) {
    errorContainer.innerHTML = `
      <div class="error-message">
        <i data-lucide="alert-circle"></i>
        <span>${message}</span>
      </div>
    `;
    errorContainer.style.display = 'block';
  } else {
    console.error(message);
  }
}

/**
 * Show notification message in UI
 * @param {string} message - Notification message
 * @param {string} type - Notification type ('info', 'warning', 'success', 'error')
 */
export function showNotification(message, type = 'info') {
  const notificationContainer = document.getElementById('notification-container');
  if (notificationContainer) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    const icons = {
      info: 'info',
      warning: 'alert-triangle',
      success: 'check-circle',
      error: 'alert-circle'
    };

    notification.innerHTML = `
      <i data-lucide="${icons[type] || 'info'}"></i>
      <span>${message}</span>
    `;

    notificationContainer.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  } else {
    console.log(`[${type}] ${message}`);
  }
}
