/**
 * BilingualEncryptionSetupUI - 雙語加密設定與解鎖介面
 * 實作 UCE-02 和 UCE-03 任務需求
 * 
 * Features:
 * - 三短語設定對話框 (UCE-02)
 * - 解鎖對話框 (UCE-03)
 * - 雙語支援 (中文/英文)
 * - moda 設計系統整合
 * - 高齡友善設計
 * - 熵值驗證與安全建議
 */

class BilingualEncryptionSetupUI {
  constructor() {
    this.currentLanguage = 'zh-TW';
    this.isDialogOpen = false;
    this.retryAttempts = 0;
    this.maxRetryAttempts = 3;
    
    // 詞庫定義
    this.vocabulary = {
      'zh-TW': {
        adjectives: ['美麗', '聰明', '快樂', '溫暖', '明亮', '安靜', '勇敢', '善良', '活潑', '優雅'],
        nouns: ['花朵', '星星', '海洋', '山峰', '森林', '彩虹', '陽光', '月亮', '雲朵', '河流'],
        verbs: ['飛翔', '歌唱', '跳舞', '微笑', '閃耀', '成長', '探索', '創造', '分享', '夢想']
      },
      'en-US': {
        adjectives: ['beautiful', 'bright', 'happy', 'gentle', 'strong', 'wise', 'calm', 'brave', 'kind', 'creative'],
        nouns: ['flower', 'star', 'ocean', 'mountain', 'forest', 'rainbow', 'sunshine', 'moon', 'cloud', 'river'],
        verbs: ['dance', 'sing', 'smile', 'shine', 'grow', 'explore', 'create', 'share', 'dream', 'inspire']
      }
    };
    
    // 翻譯字典
    this.translations = {
      'zh-TW': {
        setupTitle: '設定您的加密密碼短語',
        unlockTitle: '解鎖您的數位名片',
        setupSubtitle: '請選擇三個詞語組成您的專屬密碼短語',
        unlockSubtitle: '請輸入您的三短語密碼以解鎖',
        adjective: '形容詞',
        noun: '名詞',
        verb: '動詞',
        generate: '重新生成',
        confirm: '確認設定',
        unlock: '解鎖',
        cancel: '取消',
        entropyWeak: '安全性較低，建議選擇更複雜的詞語',
        entropyGood: '安全性良好',
        entropyStrong: '安全性極佳',
        unlockFailed: '密碼短語錯誤，請重試',
        attemptsRemaining: '剩餘嘗試次數',
        recoveryMode: '進入恢復模式',
        preview: '預覽',
        securityTip: '提示：請記住這三個詞語，它們是您唯一的解鎖方式'
      },
      'en-US': {
        setupTitle: 'Set Your Encryption Passphrase',
        unlockTitle: 'Unlock Your Digital Cards',
        setupSubtitle: 'Please choose three words to create your unique passphrase',
        unlockSubtitle: 'Please enter your three-word passphrase to unlock',
        adjective: 'Adjective',
        noun: 'Noun',
        verb: 'Verb',
        generate: 'Regenerate',
        confirm: 'Confirm Setup',
        unlock: 'Unlock',
        cancel: 'Cancel',
        entropyWeak: 'Low security, consider choosing more complex words',
        entropyGood: 'Good security',
        entropyStrong: 'Excellent security',
        unlockFailed: 'Incorrect passphrase, please try again',
        attemptsRemaining: 'Attempts remaining',
        recoveryMode: 'Enter Recovery Mode',
        preview: 'Preview',
        securityTip: 'Tip: Remember these three words - they are your only way to unlock'
      }
    };
  }

  /**
   * 顯示三短語設定對話框 (UCE-02)
   */
  async showSetupDialog(language = 'zh-TW') {
    this.currentLanguage = language;
    
    return new Promise((resolve) => {
      if (this.isDialogOpen) {
        resolve({ cancelled: true });
        return;
      }
      
      this.isDialogOpen = true;
      const dialog = this.createSetupDialog(resolve);
      document.body.appendChild(dialog);
      
      // 初始生成建議詞語
      this.generateSuggestions();
      
      // 焦點管理
      setTimeout(() => {
        const firstInput = dialog.querySelector('input');
        if (firstInput) firstInput.focus();
      }, 100);
    });
  }

  /**
   * 顯示解鎖對話框 (UCE-03)
   */
  async showUnlockDialog(language = 'zh-TW') {
    this.currentLanguage = language;
    this.retryAttempts = 0;
    
    return new Promise((resolve) => {
      if (this.isDialogOpen) {
        resolve({ cancelled: true });
        return;
      }
      
      this.isDialogOpen = true;
      const dialog = this.createUnlockDialog(resolve);
      document.body.appendChild(dialog);
      
      // 焦點管理
      setTimeout(() => {
        const firstInput = dialog.querySelector('input');
        if (firstInput) firstInput.focus();
      }, 100);
    });
  }

  /**
   * 創建設定對話框
   */
  createSetupDialog(resolve) {
    const t = this.translations[this.currentLanguage];
    
    const dialog = document.createElement('div');
    dialog.className = 'encryption-dialog-overlay';
    dialog.innerHTML = `
      <div class="encryption-dialog setup-dialog" role="dialog" aria-labelledby="setup-title">
        <div class="dialog-header">
          <h2 id="setup-title" class="dialog-title">${t.setupTitle}</h2>
          <p class="dialog-subtitle">${t.setupSubtitle}</p>
        </div>
        
        <div class="dialog-content">
          <div class="phrase-inputs">
            <div class="input-group">
              <label for="adjective-input" class="input-label">${t.adjective}</label>
              <div class="input-with-suggestion">
                <input 
                  type="text" 
                  id="adjective-input" 
                  class="phrase-input" 
                  placeholder="${t.adjective}"
                  aria-describedby="adjective-suggestion"
                  autocomplete="off"
                />
                <button type="button" class="suggestion-btn" data-type="adjective" aria-label="使用建議詞語">
                  <span id="adjective-suggestion" class="suggestion-text"></span>
                </button>
              </div>
            </div>
            
            <div class="input-group">
              <label for="noun-input" class="input-label">${t.noun}</label>
              <div class="input-with-suggestion">
                <input 
                  type="text" 
                  id="noun-input" 
                  class="phrase-input" 
                  placeholder="${t.noun}"
                  aria-describedby="noun-suggestion"
                  autocomplete="off"
                />
                <button type="button" class="suggestion-btn" data-type="noun" aria-label="使用建議詞語">
                  <span id="noun-suggestion" class="suggestion-text"></span>
                </button>
              </div>
            </div>
            
            <div class="input-group">
              <label for="verb-input" class="input-label">${t.verb}</label>
              <div class="input-with-suggestion">
                <input 
                  type="text" 
                  id="verb-input" 
                  class="phrase-input" 
                  placeholder="${t.verb}"
                  aria-describedby="verb-suggestion"
                  autocomplete="off"
                />
                <button type="button" class="suggestion-btn" data-type="verb" aria-label="使用建議詞語">
                  <span id="verb-suggestion" class="suggestion-text"></span>
                </button>
              </div>
            </div>
          </div>
          
          <div class="phrase-preview">
            <label class="preview-label">${t.preview}:</label>
            <div class="preview-text" id="phrase-preview" aria-live="polite"></div>
          </div>
          
          <div class="entropy-indicator">
            <div class="entropy-bar">
              <div class="entropy-fill" id="entropy-fill"></div>
            </div>
            <div class="entropy-text" id="entropy-text" aria-live="polite"></div>
          </div>
          
          <div class="security-tip">
            <i class="tip-icon">💡</i>
            <span class="tip-text">${t.securityTip}</span>
          </div>
        </div>
        
        <div class="dialog-actions">
          <button type="button" class="btn btn-secondary" id="generate-btn">
            ${t.generate}
          </button>
          <button type="button" class="btn btn-secondary" id="cancel-btn">
            ${t.cancel}
          </button>
          <button type="button" class="btn btn-primary" id="confirm-btn" disabled>
            ${t.confirm}
          </button>
        </div>
      </div>
    `;
    
    this.attachSetupEventListeners(dialog, resolve);
    return dialog;
  }

  /**
   * 創建解鎖對話框
   */
  createUnlockDialog(resolve) {
    const t = this.translations[this.currentLanguage];
    
    const dialog = document.createElement('div');
    dialog.className = 'encryption-dialog-overlay';
    dialog.innerHTML = `
      <div class="encryption-dialog unlock-dialog" role="dialog" aria-labelledby="unlock-title">
        <div class="dialog-header">
          <h2 id="unlock-title" class="dialog-title">${t.unlockTitle}</h2>
          <p class="dialog-subtitle">${t.unlockSubtitle}</p>
        </div>
        
        <div class="dialog-content">
          <div class="phrase-inputs">
            <div class="input-group">
              <label for="unlock-adjective" class="input-label">${t.adjective}</label>
              <input 
                type="text" 
                id="unlock-adjective" 
                class="phrase-input" 
                placeholder="${t.adjective}"
                autocomplete="off"
              />
            </div>
            
            <div class="input-group">
              <label for="unlock-noun" class="input-label">${t.noun}</label>
              <input 
                type="text" 
                id="unlock-noun" 
                class="phrase-input" 
                placeholder="${t.noun}"
                autocomplete="off"
              />
            </div>
            
            <div class="input-group">
              <label for="unlock-verb" class="input-label">${t.verb}</label>
              <input 
                type="text" 
                id="unlock-verb" 
                class="phrase-input" 
                placeholder="${t.verb}"
                autocomplete="off"
              />
            </div>
          </div>
          
          <div class="unlock-status" id="unlock-status" aria-live="polite"></div>
          
          <div class="retry-info" id="retry-info" style="display: none;">
            <span class="retry-text">${t.attemptsRemaining}: <span id="attempts-count">${this.maxRetryAttempts}</span></span>
          </div>
        </div>
        
        <div class="dialog-actions">
          <button type="button" class="btn btn-secondary" id="unlock-cancel-btn">
            ${t.cancel}
          </button>
          <button type="button" class="btn btn-danger" id="recovery-btn" style="display: none;">
            ${t.recoveryMode}
          </button>
          <button type="button" class="btn btn-primary" id="unlock-confirm-btn">
            ${t.unlock}
          </button>
        </div>
      </div>
    `;
    
    this.attachUnlockEventListeners(dialog, resolve);
    return dialog;
  }

  /**
   * 附加設定對話框事件監聽器
   */
  attachSetupEventListeners(dialog, resolve) {
    const inputs = dialog.querySelectorAll('.phrase-input');
    const generateBtn = dialog.getElementById('generate-btn');
    const cancelBtn = dialog.getElementById('cancel-btn');
    const confirmBtn = dialog.getElementById('confirm-btn');
    const suggestionBtns = dialog.querySelectorAll('.suggestion-btn');
    
    // 輸入變化監聽
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        this.updatePreview(dialog);
        this.validateEntropy(dialog);
      });
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const nextInput = this.getNextInput(input, inputs);
          if (nextInput) {
            nextInput.focus();
          } else if (!confirmBtn.disabled) {
            confirmBtn.click();
          }
        }
      });
    });
    
    // 建議詞語按鈕
    suggestionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const input = dialog.getElementById(`${type}-input`);
        const suggestion = btn.querySelector('.suggestion-text').textContent;
        input.value = suggestion;
        this.updatePreview(dialog);
        this.validateEntropy(dialog);
      });
    });
    
    // 重新生成按鈕
    generateBtn.addEventListener('click', () => {
      this.generateSuggestions();
    });
    
    // 取消按鈕
    cancelBtn.addEventListener('click', () => {
      this.closeDialog(dialog);
      resolve({ cancelled: true });
    });
    
    // 確認按鈕
    confirmBtn.addEventListener('click', () => {
      const phrases = this.collectPhrases(dialog);
      this.closeDialog(dialog);
      resolve({ phrases, cancelled: false });
    });
    
    // ESC 鍵關閉
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        cancelBtn.click();
      }
    });
  }

  /**
   * 附加解鎖對話框事件監聽器
   */
  attachUnlockEventListeners(dialog, resolve) {
    const inputs = dialog.querySelectorAll('.phrase-input');
    const cancelBtn = dialog.getElementById('unlock-cancel-btn');
    const confirmBtn = dialog.getElementById('unlock-confirm-btn');
    const recoveryBtn = dialog.getElementById('recovery-btn');
    
    // 輸入事件
    inputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const nextInput = this.getNextInput(input, inputs);
          if (nextInput) {
            nextInput.focus();
          } else {
            confirmBtn.click();
          }
        }
      });
    });
    
    // 取消按鈕
    cancelBtn.addEventListener('click', () => {
      this.closeDialog(dialog);
      resolve({ cancelled: true });
    });
    
    // 解鎖按鈕
    confirmBtn.addEventListener('click', async () => {
      const phrases = this.collectPhrases(dialog, 'unlock-');
      const isValid = await this.validateUnlockPhrases(phrases);
      
      if (isValid) {
        this.closeDialog(dialog);
        resolve({ phrases, cancelled: false });
      } else {
        this.handleUnlockFailure(dialog);
      }
    });
    
    // 恢復模式按鈕
    recoveryBtn.addEventListener('click', () => {
      this.closeDialog(dialog);
      resolve({ cancelled: true, recoveryMode: true });
    });
    
    // ESC 鍵關閉
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        cancelBtn.click();
      }
    });
  }

  /**
   * 生成建議詞語
   */
  generateSuggestions() {
    const vocab = this.vocabulary[this.currentLanguage];
    
    ['adjective', 'noun', 'verb'].forEach(type => {
      const words = vocab[type + 's'];
      const randomWord = words[Math.floor(Math.random() * words.length)];
      const suggestionElement = document.getElementById(`${type}-suggestion`);
      if (suggestionElement) {
        suggestionElement.textContent = randomWord;
      }
    });
  }

  /**
   * 更新預覽
   */
  updatePreview(dialog) {
    const phrases = this.collectPhrases(dialog);
    const preview = dialog.getElementById('phrase-preview');
    if (preview && phrases.adjective && phrases.noun && phrases.verb) {
      preview.textContent = `${phrases.adjective} ${phrases.noun} ${phrases.verb}`;
    } else {
      preview.textContent = '';
    }
  }

  /**
   * 驗證熵值
   */
  validateEntropy(dialog) {
    const phrases = this.collectPhrases(dialog);
    const entropy = this.calculateEntropy(phrases);
    const t = this.translations[this.currentLanguage];
    
    const entropyFill = dialog.getElementById('entropy-fill');
    const entropyText = dialog.getElementById('entropy-text');
    const confirmBtn = dialog.getElementById('confirm-btn');
    
    let level, message, percentage;
    
    if (entropy < 40) {
      level = 'weak';
      message = t.entropyWeak;
      percentage = Math.min(entropy / 40 * 100, 100);
    } else if (entropy < 60) {
      level = 'good';
      message = t.entropyGood;
      percentage = Math.min((entropy - 40) / 20 * 100 + 50, 100);
    } else {
      level = 'strong';
      message = t.entropyStrong;
      percentage = 100;
    }
    
    entropyFill.style.width = `${percentage}%`;
    entropyFill.className = `entropy-fill entropy-${level}`;
    entropyText.textContent = message;
    
    // 啟用/禁用確認按鈕
    const hasAllPhrases = phrases.adjective && phrases.noun && phrases.verb;
    confirmBtn.disabled = !hasAllPhrases || entropy < 30;
  }

  /**
   * 計算熵值
   */
  calculateEntropy(phrases) {
    if (!phrases.adjective || !phrases.noun || !phrases.verb) {
      return 0;
    }
    
    const vocab = this.vocabulary[this.currentLanguage];
    const baseEntropy = Math.log2(vocab.adjectives.length * vocab.nouns.length * vocab.verbs.length);
    
    // 長度獎勵
    const lengthBonus = (phrases.adjective.length + phrases.noun.length + phrases.verb.length) * 0.5;
    
    // 語言特定調整
    const langMultiplier = this.currentLanguage === 'zh-TW' ? 1.2 : 1.0;
    
    return Math.min((baseEntropy + lengthBonus) * langMultiplier, 100);
  }

  /**
   * 收集短語
   */
  collectPhrases(dialog, prefix = '') {
    return {
      adjective: dialog.getElementById(`${prefix}adjective${prefix ? '' : '-input'}`).value.trim(),
      noun: dialog.getElementById(`${prefix}noun${prefix ? '' : '-input'}`).value.trim(),
      verb: dialog.getElementById(`${prefix}verb${prefix ? '' : '-input'}`).value.trim(),
      language: this.currentLanguage
    };
  }

  /**
   * UCE-FIX-03: 驗證解鎖短語 - 整合真實 UserKeyManager
   */
  async validateUnlockPhrases(phrases) {
    try {
      // 檢查 UserKeyManager 是否可用
      if (typeof window === 'undefined' || !window.UserKeyManager) {
        console.error('[BilingualEncryptionSetupUI] UserKeyManager not available');
        return false;
      }

      // 獲取全域 storage 實例
      const storage = window.pwaStorage || window.storage;
      if (!storage) {
        console.error('[BilingualEncryptionSetupUI] Storage not available');
        return false;
      }

      // 創建或獲取 UserKeyManager 實例
      let userKeyManager;
      if (storage.userKeyManager) {
        userKeyManager = storage.userKeyManager;
      } else {
        userKeyManager = new window.UserKeyManager(storage);
      }

      // 轉換短語格式為 UserKeyManager 期望的格式
      const phraseData = {
        phrase1: phrases.adjective,
        phrase2: phrases.noun,
        phrase3: phrases.verb
      };

      // 調用實際驗證方法
      const result = await userKeyManager.verifyUserPassphrase(phraseData);
      
      return result.success;

    } catch (error) {
      console.error('[BilingualEncryptionSetupUI] Validation error:', error);
      return false;
    }
  }

  /**
   * 處理解鎖失敗
   */
  handleUnlockFailure(dialog) {
    const t = this.translations[this.currentLanguage];
    this.retryAttempts++;
    
    const statusElement = dialog.getElementById('unlock-status');
    const retryInfo = dialog.getElementById('retry-info');
    const attemptsCount = dialog.getElementById('attempts-count');
    const recoveryBtn = dialog.getElementById('recovery-btn');
    
    statusElement.textContent = t.unlockFailed;
    statusElement.className = 'unlock-status error';
    
    const remaining = this.maxRetryAttempts - this.retryAttempts;
    attemptsCount.textContent = remaining;
    retryInfo.style.display = 'block';
    
    if (remaining <= 0) {
      recoveryBtn.style.display = 'inline-block';
      dialog.getElementById('unlock-confirm-btn').disabled = true;
    }
    
    // 清空輸入框並聚焦第一個
    const inputs = dialog.querySelectorAll('.phrase-input');
    inputs.forEach(input => input.value = '');
    if (inputs.length > 0) inputs[0].focus();
  }

  /**
   * 獲取下一個輸入框
   */
  getNextInput(currentInput, inputs) {
    const currentIndex = Array.from(inputs).indexOf(currentInput);
    return inputs[currentIndex + 1] || null;
  }

  /**
   * 關閉對話框
   */
  closeDialog(dialog) {
    this.isDialogOpen = false;
    dialog.remove();
  }

  /**
   * UCE-FIX-03: 設定使用者密碼短語 - 整合 UserKeyManager
   */
  async setupUserPassphrase(phrases) {
    try {
      // 檢查 UserKeyManager 是否可用
      if (typeof window === 'undefined' || !window.UserKeyManager) {
        throw new Error('UserKeyManager not available');
      }

      // 獲取全域 storage 實例
      const storage = window.pwaStorage || window.storage;
      if (!storage) {
        throw new Error('Storage not available');
      }

      // 創建或獲取 UserKeyManager 實例
      let userKeyManager;
      if (storage.userKeyManager) {
        userKeyManager = storage.userKeyManager;
      } else {
        userKeyManager = new window.UserKeyManager(storage);
        storage.userKeyManager = userKeyManager;
      }

      // 轉換短語格式
      const phraseData = {
        phrase1: phrases.adjective,
        phrase2: phrases.noun,
        phrase3: phrases.verb
      };

      // 設定使用者密碼短語
      const result = await userKeyManager.setUserPassphrase(phraseData);
      
      return result;

    } catch (error) {
      console.error('[BilingualEncryptionSetupUI] Setup error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 語言切換
   */
  async switchLanguage(language) {
    this.currentLanguage = language;
    // 如果有打開的對話框，重新渲染
    const openDialog = document.querySelector('.encryption-dialog-overlay');
    if (openDialog) {
      // 重新渲染邏輯可以在這裡實作
      console.log(`Language switched to ${language}`);
    }
  }
}

// 導出類別
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BilingualEncryptionSetupUI;
} else if (typeof window !== 'undefined') {
  window.BilingualEncryptionSetupUI = BilingualEncryptionSetupUI;
}

// 為 Node.js 環境提供全域訪問
if (typeof global !== 'undefined') {
  global.BilingualEncryptionSetupUI = BilingualEncryptionSetupUI;
}