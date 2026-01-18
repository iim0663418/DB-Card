# ADR-002: 信封加密架構

## 狀態
已接受 (2026-01-17)

## 背景
名片資料需要安全儲存，同時支援 KEK 輪換而不需重新加密所有資料。

## 決策
採用信封加密 (Envelope Encryption) 架構：

### 架構設計
1. **KEK (Key Encryption Key)**: 儲存於環境變數，用於加密 DEK
2. **DEK (Data Encryption Key)**: 每張名片獨立的 AES-256-GCM 金鑰
3. **加密流程**:
   - 生成隨機 DEK
   - 使用 DEK 加密名片資料
   - 使用 KEK 加密 DEK
   - 儲存 encrypted_dek 和 ciphertext

### KEK 輪換策略
- 事件觸發: 安全事件發生時
- 定期輪換: 每 90 天
- 輪換流程: 使用新 KEK 重新包裝所有 DEK

### 授權會話機制
- **ReadSession**: 24 小時 TTL，可撤銷
- **名片類型策略**: personal (20 次)、event_booth (50 次)、sensitive (5 次)
- **撤銷機制**: 重新觸碰 NFC 卡片可撤銷上一個會話

## 後果

### 正面
- KEK 輪換不需重新加密所有資料
- 每張名片獨立加密，洩露影響範圍小
- 支援細粒度的存取控制

### 負面
- 實作複雜度較高
- 需要額外的 DEK 儲存空間

## 實作細節
- 加密演算法: AES-256-GCM
- KEK 長度: 256 bits (hex 編碼 64 字元)
- DEK 長度: 256 bits
- Session Token: 32 bytes 隨機值 (hex 編碼)

## 相關決策
- ADR-001: 隱私優先設計原則
