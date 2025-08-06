---
version: "v3.1.2-language-architecture"
rev_id: 9
last_updated: "2025-01-27"
owners: ["technical-architect", "code-reviewer", "implementation-planner"]
feature_scope: "unified-language-switching-architecture"
security_level: "standard"
cognitive_complexity: "low"
reuse_policy: "reuse-then-extend-then-build"
code_review_fixes: ["CRS-LANG-001", "CRS-LANG-002", "CRS-LANG-003", "CRS-LANG-004", "CRS-LANG-005", "CRS-LANG-006"]
implementation_status: "design-completed-implementation-pending"
architecture_change: "unified-language-management-integration"
---

# 統一語言切換架構技術設計文檔

## 1. System Architecture Overview

### 1.1 核心架構設計 - 統一語言管理系統
基於現有 PWA LanguageManager 的統一語言切換架構，解決安全組件與主應用語言管理分離問題：

```mermaid
graph TB
    A[PWACardApp] --> B[LanguageManager]
    B --> C[UnifiedLanguageObserver]
    C --> D[SecurityComponentsLanguageAdapter]
    C --> E[PWAUILanguageAdapter]
    
    D --> F[ClientSideUserCommunication]
    D --> G[ClientSideSecurityOnboarding]
    D --> H[SecurityComponentsRegistry]
    
    E --> I[CardListComponent]
    E --> J[DuplicateDialogManager]
    E --> K[NotificationSystem]
    
    B --> L[TranslationRegistry]
    L --> M[SecurityTranslations]
    L --> N[PWATranslations]
    L --> O[AccessibilityTranslations]
    
    F --> P[user-communication-container]
    G --> Q[security-onboarding-modal]
    
    classDef core fill:#4ade80,stroke:#16a34a,color:#000
    classDef adapter fill:#fbbf24,stroke:#f59e0b,color:#000
    classDef component fill:#94a3b8,stroke:#64748b,color:#000
    classDef container fill:#f87171,stroke:#dc2626,color:#000
    
    class B,C,L core
    class D,E adapter
    class F,G,H,I,J,K component
    class P,Q container
```

### 1.2 語言切換事件流程
```mermaid
sequenceDiagram
    participant User as 使用者
    participant LM as LanguageManager
    participant ULO as UnifiedLanguageObserver
    participant SCA as SecurityComponentsAdapter
    participant PWA as PWAUIAdapter
    participant UC as UserCommunication
    participant SO as SecurityOnboarding

    User->>LM: toggleLanguage()
    LM->>LM: switchLanguage(newLang)
    LM->>ULO: notifyObservers(newLang)
    
    par Security Components Update
        ULO->>SCA: updateSecurityComponents(newLang)
        SCA->>UC: updateLanguage(newLang)
        UC->>UC: updateNotificationTexts()
        SCA->>SO: updateLanguage(newLang)
        SO->>SO: updateModalContent()
    and PWA Components Update
        ULO->>PWA: updatePWAComponents(newLang)
        PWA->>PWA: updateAllUIElements()
    end
    
    ULO-->>LM: languageUpdateComplete
    LM-->>User: 語言切換完成通知
```

### 1.3 模組責任劃分
- **LanguageManager** 🔄: 擴展現有語言管理器，新增安全組件翻譯支援
- **UnifiedLanguageObserver** 🆕: 統一語言變更事件分發器，協調所有組件更新
- **SecurityComponentsLanguageAdapter** 🆕: 安全組件語言適配器，處理安全相關翻譯
- **PWAUILanguageAdapter** 🔄: PWA UI 語言適配器，擴展現有 UI 更新邏輯
- **TranslationRegistry** 🆕: 統一翻譯註冊表，管理所有翻譯資源
- **AccessibilityLanguageManager** 🆕: 無障礙語言管理器，處理 ARIA 標籤雙語支援

## 2. Data Models

### 2.1 統一翻譯資料結構
```typescript
interface UnifiedTranslationSchema {
  // 核心翻譯結構
  translations: {
    [language: string]: {
      // PWA 核心翻譯
      pwa: PWATranslations;
      // 安全組件翻譯
      security: SecurityTranslations;
      // 無障礙翻譯
      accessibility: AccessibilityTranslations;
      // 通知系統翻譯
      notifications: NotificationTranslations;
    };
  };
  
  // 翻譯元數據
  metadata: {
    version: string;
    lastUpdated: Date;
    supportedLanguages: string[];
    fallbackLanguage: string;
  };
}

interface SecurityTranslations {
  // 使用者溝通系統
  userCommunication: {
    containerLabel: string;           // "系統通知" / "System Notifications"
    messageTypes: {
      [key: string]: string;         // 訊息類型翻譯
    };
    actions: {
      close: string;                 // "關閉" / "Close"
      dismiss: string;               // "忽略" / "Dismiss"
      learnMore: string;             // "了解更多" / "Learn More"
    };
  };
  
  // 安全引導系統
  onboarding: {
    title: string;                   // "安全功能設定" / "Security Features Setup"
    subtitle: string;
    features: {
      [featureKey: string]: {
        name: string;
        description: string;
        benefits: string[];
        risks: string[];
      };
    };
    actions: {
      skip: string;                  // "稍後設定" / "Set up later"
      confirm: string;               // "確認設定" / "Confirm Settings"
    };
  };
}

interface AccessibilityTranslations {
  ariaLabels: {
    [elementType: string]: {
      [language: string]: string;
    };
  };
  screenReaderTexts: {
    [context: string]: {
      [language: string]: string;
    };
  };
}
```

### 2.2 語言觀察者註冊表
```typescript
interface LanguageObserverRegistry {
  observers: Map<string, LanguageObserver>;
  adapters: Map<string, LanguageAdapter>;
  updateQueue: LanguageUpdateTask[];
  isUpdating: boolean;
}

interface LanguageObserver {
  id: string;
  priority: number;                  // 更新優先級 (1-10)
  updateMethod: (language: string) => Promise<void>;
  errorHandler: (error: Error) => void;
  dependencies: string[];           // 依賴的其他觀察者
}

interface LanguageUpdateTask {
  observerId: string;
  language: string;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}
```

## 3. API Design

### 3.1 統一語言管理器擴展 (CRS-LANG-001 & CRS-LANG-002)
```typescript
class EnhancedLanguageManager extends LanguageManager {
  constructor() {
    super();
    this.translationRegistry = new TranslationRegistry();
    this.unifiedObserver = new UnifiedLanguageObserver();
    this.securityAdapter = new SecurityComponentsLanguageAdapter();
    this.accessibilityManager = new AccessibilityLanguageManager();
    this.isUpdating = false;
    this.updateQueue = [];
  }

  /**
   * 擴展語言切換邏輯，支援安全組件
   * @param {string} lang - 目標語言
   * @returns {Promise<string>} 切換後的語言
   */
  async switchLanguage(lang) {
    if (!['zh', 'en'].includes(lang)) {
      console.warn('[EnhancedLanguageManager] Invalid language:', lang);
      return this.currentLanguage;
    }

    if (this.isUpdating) {
      console.log('[EnhancedLanguageManager] Language update in progress, queuing request');
      return this.queueLanguageUpdate(lang);
    }

    this.isUpdating = true;
    const previousLanguage = this.currentLanguage;

    try {
      // 1. 更新核心語言狀態
      this.currentLanguage = lang;
      document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en';
      localStorage.setItem('pwa-language', lang);

      // 2. 批次更新所有組件
      await this.unifiedObserver.notifyAllObservers(lang, previousLanguage);

      // 3. 更新無障礙屬性
      await this.accessibilityManager.updateAccessibilityAttributes(lang);

      // 4. 處理佇列中的更新請求
      await this.processUpdateQueue();

      console.log(`[EnhancedLanguageManager] Language switched: ${previousLanguage} -> ${lang}`);
      return lang;

    } catch (error) {
      console.error('[EnhancedLanguageManager] Language switch failed:', error);
      
      // 回滾到前一個語言
      this.currentLanguage = previousLanguage;
      document.documentElement.lang = previousLanguage === 'zh' ? 'zh-TW' : 'en';
      
      throw error;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 獲取統一翻譯文字
   * @param {string} key - 翻譯鍵值，支援點記法 (e.g., 'security.userCommunication.containerLabel')
   * @param {string} lang - 語言代碼
   * @returns {string} 翻譯文字
   */
  getUnifiedText(key, lang = null) {
    const targetLang = lang || this.currentLanguage;
    
    try {
      // 解析點記法鍵值
      const keyParts = key.split('.');
      let translation = this.translationRegistry.getTranslation(targetLang);
      
      for (const part of keyParts) {
        if (translation && typeof translation === 'object' && part in translation) {
          translation = translation[part];
        } else {
          console.warn(`[EnhancedLanguageManager] Translation key not found: ${key} for language: ${targetLang}`);
          return key; // 返回原始鍵值作為備用
        }
      }
      
      return typeof translation === 'string' ? translation : key;
    } catch (error) {
      console.error('[EnhancedLanguageManager] Translation retrieval failed:', error);
      return key;
    }
  }

  /**
   * 註冊語言觀察者
   * @param {string} id - 觀察者ID
   * @param {LanguageObserver} observer - 觀察者配置
   */
  registerObserver(id, observer) {
    this.unifiedObserver.registerObserver(id, observer);
  }

  /**
   * 移除語言觀察者
   * @param {string} id - 觀察者ID
   */
  unregisterObserver(id) {
    this.unifiedObserver.unregisterObserver(id);
  }

  /**
   * 佇列語言更新請求
   */
  async queueLanguageUpdate(lang) {
    return new Promise((resolve) => {
      this.updateQueue.push({
        language: lang,
        resolve: resolve,
        timestamp: Date.now()
      });
    });
  }

  /**
   * 處理佇列中的更新請求
   */
  async processUpdateQueue() {
    while (this.updateQueue.length > 0) {
      const request = this.updateQueue.shift();
      if (request.language !== this.currentLanguage) {
        // 遞迴處理不同語言的請求
        await this.switchLanguage(request.language);
      }
      request.resolve(this.currentLanguage);
    }
  }
}
```

### 3.2 統一語言觀察者 (CRS-LANG-004)
```typescript
class UnifiedLanguageObserver {
  constructor() {
    this.observers = new Map();
    this.adapters = new Map();
    this.updateInProgress = false;
    this.errorHandlers = new Map();
  }

  /**
   * 註冊語言觀察者
   * @param {string} id - 觀察者唯一ID
   * @param {LanguageObserver} observer - 觀察者配置
   */
  registerObserver(id, observer) {
    if (this.observers.has(id)) {
      console.warn(`[UnifiedLanguageObserver] Observer ${id} already registered, updating...`);
    }

    // 驗證觀察者配置
    if (!observer.updateMethod || typeof observer.updateMethod !== 'function') {
      throw new Error(`Observer ${id} must have a valid updateMethod`);
    }

    this.observers.set(id, {
      id,
      priority: observer.priority || 5,
      updateMethod: observer.updateMethod,
      errorHandler: observer.errorHandler || this.defaultErrorHandler,
      dependencies: observer.dependencies || [],
      lastUpdate: null,
      updateCount: 0
    });

    console.log(`[UnifiedLanguageObserver] Registered observer: ${id} (priority: ${observer.priority || 5})`);
  }

  /**
   * 移除語言觀察者
   * @param {string} id - 觀察者ID
   */
  unregisterObserver(id) {
    if (this.observers.has(id)) {
      this.observers.delete(id);
      console.log(`[UnifiedLanguageObserver] Unregistered observer: ${id}`);
    }
  }

  /**
   * 通知所有觀察者語言變更
   * @param {string} newLanguage - 新語言
   * @param {string} previousLanguage - 前一個語言
   */
  async notifyAllObservers(newLanguage, previousLanguage) {
    if (this.updateInProgress) {
      console.warn('[UnifiedLanguageObserver] Update already in progress, skipping...');
      return;
    }

    this.updateInProgress = true;
    const startTime = Date.now();

    try {
      // 按優先級排序觀察者
      const sortedObservers = Array.from(this.observers.values())
        .sort((a, b) => b.priority - a.priority);

      console.log(`[UnifiedLanguageObserver] Notifying ${sortedObservers.length} observers of language change: ${previousLanguage} -> ${newLanguage}`);

      // 分批處理觀察者更新
      const batches = this.createUpdateBatches(sortedObservers);
      
      for (const batch of batches) {
        await this.processBatch(batch, newLanguage, previousLanguage);
      }

      const duration = Date.now() - startTime;
      console.log(`[UnifiedLanguageObserver] All observers notified successfully in ${duration}ms`);

    } catch (error) {
      console.error('[UnifiedLanguageObserver] Failed to notify observers:', error);
      throw error;
    } finally {
      this.updateInProgress = false;
    }
  }

  /**
   * 創建更新批次，處理依賴關係
   * @param {Array} observers - 已排序的觀察者列表
   * @returns {Array<Array>} 批次陣列
   */
  createUpdateBatches(observers) {
    const batches = [];
    const processed = new Set();
    const remaining = [...observers];

    while (remaining.length > 0) {
      const batch = [];
      
      // 找出沒有未滿足依賴的觀察者
      for (let i = remaining.length - 1; i >= 0; i--) {
        const observer = remaining[i];
        const unmetDependencies = observer.dependencies.filter(dep => !processed.has(dep));
        
        if (unmetDependencies.length === 0) {
          batch.push(observer);
          processed.add(observer.id);
          remaining.splice(i, 1);
        }
      }

      if (batch.length === 0 && remaining.length > 0) {
        // 檢測到循環依賴，強制處理剩餘觀察者
        console.warn('[UnifiedLanguageObserver] Circular dependency detected, processing remaining observers');
        batch.push(...remaining);
        remaining.length = 0;
      }

      if (batch.length > 0) {
        batches.push(batch);
      }
    }

    return batches;
  }

  /**
   * 處理觀察者批次
   * @param {Array} batch - 觀察者批次
   * @param {string} newLanguage - 新語言
   * @param {string} previousLanguage - 前一個語言
   */
  async processBatch(batch, newLanguage, previousLanguage) {
    const promises = batch.map(async (observer) => {
      try {
        const updateStart = Date.now();
        await observer.updateMethod(newLanguage, previousLanguage);
        
        observer.lastUpdate = new Date();
        observer.updateCount++;
        
        const updateDuration = Date.now() - updateStart;
        console.log(`[UnifiedLanguageObserver] Observer ${observer.id} updated in ${updateDuration}ms`);
        
      } catch (error) {
        console.error(`[UnifiedLanguageObserver] Observer ${observer.id} update failed:`, error);
        
        try {
          await observer.errorHandler(error, newLanguage, previousLanguage);
        } catch (handlerError) {
          console.error(`[UnifiedLanguageObserver] Error handler for ${observer.id} failed:`, handlerError);
        }
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * 預設錯誤處理器
   */
  defaultErrorHandler(error, newLanguage, previousLanguage) {
    console.error('[UnifiedLanguageObserver] Default error handler:', {
      error: error.message,
      newLanguage,
      previousLanguage,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 獲取觀察者狀態
   */
  getObserverStatus() {
    const status = {
      totalObservers: this.observers.size,
      updateInProgress: this.updateInProgress,
      observers: []
    };

    for (const [id, observer] of this.observers) {
      status.observers.push({
        id,
        priority: observer.priority,
        lastUpdate: observer.lastUpdate,
        updateCount: observer.updateCount,
        dependencies: observer.dependencies
      });
    }

    return status;
  }
}
```

### 3.3 安全組件語言適配器 (CRS-LANG-001 & CRS-LANG-003)
```typescript
class SecurityComponentsLanguageAdapter {
  constructor() {
    this.components = new Map();
    this.translationCache = new Map();
    this.updateStrategies = new Map();
  }

  /**
   * 註冊安全組件
   * @param {string} componentId - 組件ID
   * @param {Object} component - 組件實例
   * @param {string} updateStrategy - 更新策略: 'dom-update' | 'recreation' | 'hybrid'
   */
  registerSecurityComponent(componentId, component, updateStrategy = 'dom-update') {
    this.components.set(componentId, component);
    this.updateStrategies.set(componentId, updateStrategy);
    
    console.log(`[SecurityComponentsLanguageAdapter] Registered component: ${componentId} with strategy: ${updateStrategy}`);
  }

  /**
   * 更新所有安全組件語言
   * @param {string} newLanguage - 新語言
   * @param {string} previousLanguage - 前一個語言
   */
  async updateSecurityComponents(newLanguage, previousLanguage) {
    const updatePromises = [];

    for (const [componentId, component] of this.components) {
      const strategy = this.updateStrategies.get(componentId);
      
      updatePromises.push(
        this.updateComponent(componentId, component, newLanguage, strategy)
          .catch(error => {
            console.error(`[SecurityComponentsLanguageAdapter] Failed to update ${componentId}:`, error);
            return { componentId, error: error.message };
          })
      );
    }

    const results = await Promise.allSettled(updatePromises);
    const failures = results
      .filter(result => result.status === 'rejected' || result.value?.error)
      .map(result => result.reason || result.value);

    if (failures.length > 0) {
      console.warn(`[SecurityComponentsLanguageAdapter] ${failures.length} components failed to update:`, failures);
    }

    console.log(`[SecurityComponentsLanguageAdapter] Updated ${this.components.size - failures.length}/${this.components.size} components`);
  }

  /**
   * 更新單一組件
   * @param {string} componentId - 組件ID
   * @param {Object} component - 組件實例
   * @param {string} language - 目標語言
   * @param {string} strategy - 更新策略
   */
  async updateComponent(componentId, component, language, strategy) {
    switch (strategy) {
      case 'dom-update':
        return this.updateComponentDOM(componentId, component, language);
      
      case 'recreation':
        return this.recreateComponent(componentId, component, language);
      
      case 'hybrid':
        return this.hybridUpdate(componentId, component, language);
      
      default:
        throw new Error(`Unknown update strategy: ${strategy}`);
    }
  }

  /**
   * DOM 更新策略 - 僅更新文字內容，不重建 DOM
   * @param {string} componentId - 組件ID
   * @param {Object} component - 組件實例
   * @param {string} language - 目標語言
   */
  async updateComponentDOM(componentId, component, language) {
    if (componentId === 'user-communication') {
      return this.updateUserCommunicationDOM(component, language);
    } else if (componentId === 'security-onboarding') {
      return this.updateSecurityOnboardingDOM(component, language);
    }
    
    // 通用 DOM 更新邏輯
    if (component.updateLanguage && typeof component.updateLanguage === 'function') {
      await component.updateLanguage(language);
    }
  }

  /**
   * 使用者溝通系統 DOM 更新 (CRS-LANG-001 & CRS-LANG-005)
   */
  async updateUserCommunicationDOM(component, language) {
    const container = document.getElementById('user-communication-container');
    if (!container) return;

    // 更新容器 aria-label
    const containerLabel = window.languageManager.getUnifiedText('security.userCommunication.containerLabel', language);
    container.setAttribute('aria-label', containerLabel);

    // 更新現有訊息的文字內容
    const messages = container.querySelectorAll('.communication-message');
    messages.forEach(messageEl => {
      this.updateMessageTexts(messageEl, language);
    });

    // 更新組件內部語言狀態
    if (component.currentLanguage !== undefined) {
      component.currentLanguage = language;
    }

    console.log(`[SecurityComponentsLanguageAdapter] Updated user-communication DOM for language: ${language}`);
  }

  /**
   * 更新訊息文字內容
   */
  updateMessageTexts(messageEl, language) {
    // 更新關閉按鈕 aria-label
    const closeBtn = messageEl.querySelector('.message-close');
    if (closeBtn) {
      const closeLabel = window.languageManager.getUnifiedText('security.userCommunication.actions.close', language);
      closeBtn.setAttribute('aria-label', closeLabel);
    }

    // 更新操作按鈕文字
    const actionBtns = messageEl.querySelectorAll('.message-action');
    actionBtns.forEach(btn => {
      const actionKey = btn.dataset.actionKey;
      if (actionKey) {
        const actionText = window.languageManager.getUnifiedText(`security.userCommunication.actions.${actionKey}`, language);
        btn.textContent = actionText;
      }
    });
  }

  /**
   * 安全引導模態框 DOM 更新 (CRS-LANG-003)
   */
  async updateSecurityOnboardingDOM(component, language) {
    const modal = document.getElementById('security-onboarding-modal');
    if (!modal || modal.classList.contains('hidden')) return;

    // 儲存當前焦點元素
    const focusedElement = document.activeElement;
    const focusedElementId = focusedElement?.id;

    try {
      // 更新標題和副標題
      const title = modal.querySelector('#onboarding-title');
      const subtitle = modal.querySelector('.onboarding-subtitle');
      
      if (title) {
        title.textContent = window.languageManager.getUnifiedText('security.onboarding.title', language);
      }
      if (subtitle) {
        subtitle.textContent = window.languageManager.getUnifiedText('security.onboarding.subtitle', language);
      }

      // 更新隱私聲明
      const privacyNotice = modal.querySelector('.privacy-notice');
      if (privacyNotice) {
        const privacyTitle = window.languageManager.getUnifiedText('security.onboarding.privacyTitle', language);
        const privacyText = window.languageManager.getUnifiedText('security.onboarding.privacyNotice', language);
        privacyNotice.innerHTML = `<strong>${privacyTitle}</strong>${privacyText}`;
      }

      // 更新功能卡片
      await this.updateFeatureCards(modal, language);

      // 更新按鈕
      const skipBtn = modal.querySelector('.onboarding-btn.secondary');
      const confirmBtn = modal.querySelector('.onboarding-btn.primary');
      
      if (skipBtn) {
        skipBtn.textContent = window.languageManager.getUnifiedText('security.onboarding.actions.skip', language);
      }
      if (confirmBtn) {
        confirmBtn.textContent = window.languageManager.getUnifiedText('security.onboarding.actions.confirm', language);
      }

      // 恢復焦點
      if (focusedElementId) {
        const elementToFocus = document.getElementById(focusedElementId);
        if (elementToFocus && elementToFocus.isConnected) {
          elementToFocus.focus();
        }
      }

      console.log(`[SecurityComponentsLanguageAdapter] Updated security-onboarding DOM for language: ${language}`);

    } catch (error) {
      console.error('[SecurityComponentsLanguageAdapter] Failed to update security onboarding DOM:', error);
      throw error;
    }
  }

  /**
   * 更新功能卡片內容
   */
  async updateFeatureCards(modal, language) {
    const featureCards = modal.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
      const featureKey = card.id?.replace('feature-', '');
      if (!featureKey) return;

      // 更新功能名稱
      const nameLabel = card.querySelector('.feature-name');
      if (nameLabel) {
        nameLabel.textContent = window.languageManager.getUnifiedText(`security.onboarding.features.${featureKey}.name`, language);
      }

      // 更新功能描述
      const description = card.querySelector('.feature-description');
      if (description) {
        description.textContent = window.languageManager.getUnifiedText(`security.onboarding.features.${featureKey}.description`, language);
      }

      // 更新優點列表
      const benefitsList = card.querySelector('.feature-benefits ul');
      if (benefitsList) {
        const benefits = window.languageManager.getUnifiedText(`security.onboarding.features.${featureKey}.benefits`, language);
        if (Array.isArray(benefits)) {
          benefitsList.innerHTML = benefits.map(benefit => `<li>${benefit}</li>`).join('');
        }
      }

      // 更新注意事項列表
      const risksList = card.querySelector('.feature-risks ul');
      if (risksList) {
        const risks = window.languageManager.getUnifiedText(`security.onboarding.features.${featureKey}.risks`, language);
        if (Array.isArray(risks)) {
          risksList.innerHTML = risks.map(risk => `<li>${risk}</li>`).join('');
        }
      }
    });
  }

  /**
   * 混合更新策略 - 智慧選擇更新方式
   */
  async hybridUpdate(componentId, component, language) {
    // 檢查組件是否可見
    const isVisible = this.isComponentVisible(componentId);
    
    if (isVisible) {
      // 可見組件使用 DOM 更新
      await this.updateComponentDOM(componentId, component, language);
    } else {
      // 不可見組件延遲更新
      this.scheduleDelayedUpdate(componentId, component, language);
    }
  }

  /**
   * 檢查組件是否可見
   */
  isComponentVisible(componentId) {
    const elementMap = {
      'user-communication': 'user-communication-container',
      'security-onboarding': 'security-onboarding-modal'
    };

    const elementId = elementMap[componentId];
    if (!elementId) return false;

    const element = document.getElementById(elementId);
    return element && !element.classList.contains('hidden') && element.style.display !== 'none';
  }

  /**
   * 排程延遲更新
   */
  scheduleDelayedUpdate(componentId, component, language) {
    // 當組件變為可見時更新
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
          
          if (this.isComponentVisible(componentId)) {
            this.updateComponentDOM(componentId, component, language);
            observer.disconnect();
          }
        }
      });
    });

    const elementMap = {
      'user-communication': 'user-communication-container',
      'security-onboarding': 'security-onboarding-modal'
    };

    const element = document.getElementById(elementMap[componentId]);
    if (element) {
      observer.observe(element, { attributes: true });
    }
  }
}
```

### 3.4 無障礙語言管理器 (CRS-LANG-005)
```typescript
class AccessibilityLanguageManager {
  constructor() {
    this.ariaLabelMap = new Map();
    this.screenReaderTextMap = new Map();
    this.accessibilityObserver = null;
  }

  /**
   * 更新無障礙屬性
   * @param {string} language - 目標語言
   */
  async updateAccessibilityAttributes(language) {
    try {
      // 更新 ARIA 標籤
      await this.updateAriaLabels(language);
      
      // 更新螢幕閱讀器文字
      await this.updateScreenReaderTexts(language);
      
      // 更新表單標籤
      await this.updateFormLabels(language);
      
      console.log(`[AccessibilityLanguageManager] Updated accessibility attributes for language: ${language}`);
    } catch (error) {
      console.error('[AccessibilityLanguageManager] Failed to update accessibility attributes:', error);
      throw error;
    }
  }

  /**
   * 更新 ARIA 標籤
   */
  async updateAriaLabels(language) {
    const ariaElements = document.querySelectorAll('[aria-label]');
    
    ariaElements.forEach(element => {
      const currentLabel = element.getAttribute('aria-label');
      const labelKey = this.getAriaLabelKey(element, currentLabel);
      
      if (labelKey) {
        const newLabel = window.languageManager.getUnifiedText(`accessibility.ariaLabels.${labelKey}`, language);
        if (newLabel !== labelKey) {
          element.setAttribute('aria-label', newLabel);
        }
      }
    });
  }

  /**
   * 獲取 ARIA 標籤鍵值
   */
  getAriaLabelKey(element, currentLabel) {
    // 根據元素 ID 或類別推斷標籤鍵值
    const elementId = element.id;
    const elementClass = element.className;
    
    if (elementId === 'user-communication-container') {
      return 'systemNotifications';
    } else if (elementClass.includes('message-close')) {
      return 'closeNotification';
    } else if (elementClass.includes('modal-close')) {
      return 'closeModal';
    } else if (elementClass.includes('nav-item')) {
      return 'navigationItem';
    }
    
    return null;
  }

  /**
   * 更新螢幕閱讀器文字
   */
  async updateScreenReaderTexts(language) {
    const srElements = document.querySelectorAll('.sr-only, .screen-reader-text');
    
    srElements.forEach(element => {
      const textKey = element.dataset.textKey;
      if (textKey) {
        const newText = window.languageManager.getUnifiedText(`accessibility.screenReaderTexts.${textKey}`, language);
        if (newText !== textKey) {
          element.textContent = newText;
        }
      }
    });
  }

  /**
   * 更新表單標籤
   */
  async updateFormLabels(language) {
    const labels = document.querySelectorAll('label[for]');
    
    labels.forEach(label => {
      const forId = label.getAttribute('for');
      const labelKey = this.getFormLabelKey(forId);
      
      if (labelKey) {
        const newText = window.languageManager.getUnifiedText(`accessibility.formLabels.${labelKey}`, language);
        if (newText !== labelKey) {
          label.textContent = newText;
        }
      }
    });
  }

  /**
   * 獲取表單標籤鍵值
   */
  getFormLabelKey(forId) {
    const labelKeyMap = {
      'card-search': 'searchCards',
      'card-filter': 'filterCards',
      'import-url': 'importUrl',
      'export-format': 'exportFormat'
    };
    
    return labelKeyMap[forId] || null;
  }

  /**
   * 註冊無障礙元素
   * @param {string} elementId - 元素ID
   * @param {string} labelKey - 標籤鍵值
   * @param {string} type - 類型: 'aria-label' | 'screen-reader' | 'form-label'
   */
  registerAccessibilityElement(elementId, labelKey, type = 'aria-label') {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`[AccessibilityLanguageManager] Element not found: ${elementId}`);
      return;
    }

    switch (type) {
      case 'aria-label':
        this.ariaLabelMap.set(elementId, labelKey);
        break;
      case 'screen-reader':
        this.screenReaderTextMap.set(elementId, labelKey);
        element.dataset.textKey = labelKey;
        break;
      case 'form-label':
        // 表單標籤通過 for 屬性自動處理
        break;
    }
  }
}
```

## 4. Process & Module Structure

### 4.1 語言切換完整流程
```mermaid
flowchart TD
    A[使用者點擊語言切換] --> B{檢查更新狀態}
    B -->|更新中| C[加入佇列等待]
    B -->|空閒| D[開始語言切換]
    
    D --> E[更新核心語言狀態]
    E --> F[通知統一觀察者]
    
    F --> G[按優先級排序觀察者]
    G --> H[創建更新批次]
    H --> I[處理依賴關係]
    
    I --> J[批次1: 高優先級組件]
    J --> K[批次2: 中優先級組件]
    K --> L[批次3: 低優先級組件]
    
    J --> M[安全組件適配器]
    K --> N[PWA UI 適配器]
    L --> O[無障礙管理器]
    
    M --> P[DOM 更新策略]
    N --> Q[UI 元素更新]
    O --> R[ARIA 標籤更新]
    
    P --> S[檢查組件可見性]
    S -->|可見| T[立即更新 DOM]
    S -->|不可見| U[排程延遲更新]
    
    T --> V[更新完成]
    U --> V
    Q --> V
    R --> V
    
    V --> W[處理佇列請求]
    W --> X[語言切換完成]
    
    C --> Y[等待當前更新完成]
    Y --> D
```

### 4.2 錯誤處理與恢復機制
```mermaid
sequenceDiagram
    participant User as 使用者
    participant LM as LanguageManager
    participant ULO as UnifiedObserver
    participant Comp as Component
    participant EH as ErrorHandler

    User->>LM: switchLanguage('en')
    LM->>ULO: notifyAllObservers('en')
    ULO->>Comp: updateMethod('en')
    
    alt 組件更新成功
        Comp-->>ULO: 更新完成
        ULO-->>LM: 所有組件更新完成
        LM-->>User: 語言切換成功
    else 組件更新失敗
        Comp-->>ULO: 更新失敗 (Error)
        ULO->>EH: handleError(error, component)
        EH->>EH: 記錄錯誤
        EH->>Comp: 嘗試恢復更新
        
        alt 恢復成功
            Comp-->>EH: 恢復完成
            EH-->>ULO: 繼續處理其他組件
        else 恢復失敗
            EH->>LM: 報告嚴重錯誤
            LM->>LM: 回滾語言狀態
            LM-->>User: 語言切換失敗，已回滾
        end
    end
```

## 5. Security & Best Practices Appendix

### 5.1 語言切換安全原則
- **輸入驗證**: 嚴格驗證語言參數，僅允許支援的語言代碼
- **狀態一致性**: 確保所有組件語言狀態同步，避免混合語言顯示
- **錯誤隔離**: 單一組件更新失敗不影響其他組件
- **回滾機制**: 更新失敗時自動回滾到前一個穩定狀態
- **記憶體管理**: 適當清理觀察者和事件監聽器，防止記憶體洩漏
- **XSS 防護**: 翻譯文字輸出前進行適當的 HTML 轉義

### 5.2 效能最佳化策略
- **批次更新**: 將多個組件更新合併為批次操作
- **延遲更新**: 不可見組件延遲到可見時才更新
- **快取機制**: 翻譯結果快取，避免重複查詢
- **依賴優化**: 智慧依賴解析，最小化更新順序約束
- **非同步處理**: 使用 Promise.allSettled 並行處理組件更新
- **DOM 最小化**: 僅更新必要的 DOM 元素，避免全量重建

### 5.3 無障礙最佳實踐
- **ARIA 標籤同步**: 確保所有 ARIA 標籤與當前語言一致
- **螢幕閱讀器支援**: 提供適當的螢幕閱讀器文字
- **焦點管理**: 語言切換時保持焦點狀態
- **鍵盤導航**: 確保鍵盤導航在語言切換後正常工作
- **語言聲明**: 正確設定 HTML lang 屬性
- **文字方向**: 支援 RTL 語言的文字方向設定

## 6. Performance Requirements

### 6.1 語言切換效能目標
- **切換響應時間**: ≤ 300ms (使用者感知即時)
- **組件更新時間**: ≤ 100ms per component
- **DOM 更新效率**: ≤ 50ms for visible components
- **記憶體使用**: 峰值記憶體增長 ≤ 10MB
- **CPU 使用**: 語言切換期間 CPU 使用率 ≤ 30%

### 6.2 可用性需求
- **更新成功率**: ≥ 99.9%
- **錯誤恢復率**: ≥ 95%
- **狀態一致性**: 100% 組件語言狀態同步
- **使用者體驗**: 無明顯卡頓或閃爍

## 7. Spec↔Design Mapping

| Code Review Issue | 設計模組 | 實作方法 | 測試策略 | 優先級 |
|-------------------|---------|---------|---------|--------|
| CRS-LANG-001 | SecurityComponentsLanguageAdapter | updateUserCommunicationDOM() | 安全組件語言切換測試 | P0 |
| CRS-LANG-002 | EnhancedLanguageManager | getUnifiedText() | 翻譯系統整合測試 | P0 |
| CRS-LANG-003 | SecurityComponentsLanguageAdapter | updateSecurityOnboardingDOM() | 模態框語言切換測試 | P0 |
| CRS-LANG-004 | UnifiedLanguageObserver | notifyAllObservers() | 事件系統整合測試 | P1 |
| CRS-LANG-005 | AccessibilityLanguageManager | updateAccessibilityAttributes() | 無障礙雙語支援測試 | P1 |
| CRS-LANG-006 | UnifiedLanguageObserver | 觀察者生命週期管理 | 記憶體洩漏測試 | P2 |

## 8. Implementation Priority & Rollout Plan

### 8.1 Phase 1: 核心架構 (P0 - 2-3 days)
**目標**: 建立統一語言管理基礎架構
- 實作 `EnhancedLanguageManager`
- 實作 `UnifiedLanguageObserver`
- 實作 `TranslationRegistry`
- 基礎翻譯資料結構

### 8.2 Phase 2: 安全組件整合 (P0 - 2-3 days)
**目標**: 解決 CRS-LANG-001, CRS-LANG-002, CRS-LANG-003
- 實作 `SecurityComponentsLanguageAdapter`
- 整合 `ClientSideUserCommunication` 語言切換
- 優化 `ClientSideSecurityOnboarding` 語言切換邏輯
- DOM 更新策略實作

### 8.3 Phase 3: 無障礙支援 (P1 - 1-2 days)
**目標**: 解決 CRS-LANG-005
- 實作 `AccessibilityLanguageManager`
- ARIA 標籤動態更新
- 螢幕閱讀器文字支援
- 表單標籤雙語化

### 8.4 Phase 4: 整合測試與優化 (P1 - 1-2 days)
**目標**: 解決 CRS-LANG-004, CRS-LANG-006
- 完整整合測試
- 效能優化
- 記憶體洩漏檢測
- 錯誤處理完善

### 8.5 Testing Strategy
- **單元測試**: 各模組獨立功能測試
- **整合測試**: 語言切換完整流程測試
- **無障礙測試**: WCAG 2.1 AA 相容性測試
- **效能測試**: 語言切換響應時間測試
- **記憶體測試**: 長時間使用記憶體洩漏測試

## 9. File Outputs

### 9.1 需要建立的檔案
```
pwa-card-storage/src/core/enhanced-language-manager.js
pwa-card-storage/src/core/unified-language-observer.js
pwa-card-storage/src/core/security-components-language-adapter.js
pwa-card-storage/src/core/accessibility-language-manager.js
pwa-card-storage/src/core/translation-registry.js
```

### 9.2 需要修改的檔案
```
pwa-card-storage/src/core/language-manager.js (擴展現有功能)
src/security/ClientSideUserCommunication.js (整合語言管理器)
src/security/ClientSideSecurityOnboarding.js (優化語言切換邏輯)
pwa-card-storage/src/app.js (整合新的語言管理架構)
```

### 9.3 翻譯資源檔案
```
pwa-card-storage/assets/translations/security-zh.json
pwa-card-storage/assets/translations/security-en.json
pwa-card-storage/assets/translations/accessibility-zh.json
pwa-card-storage/assets/translations/accessibility-en.json
```

### 9.4 測試檔案
```
tests/core/enhanced-language-manager.test.js
tests/core/unified-language-observer.test.js
tests/integration/language-switching-integration.test.js
tests/accessibility/bilingual-accessibility.test.js
```

---

**總結**: 本設計通過建立統一的語言管理架構，解決了安全組件與 PWA 主應用語言管理分離的問題。核心策略是擴展現有 `LanguageManager`，新增統一觀察者模式和專門的安全組件適配器，實現高效、一致的語言切換體驗，同時確保無障礙支援和效能最佳化。