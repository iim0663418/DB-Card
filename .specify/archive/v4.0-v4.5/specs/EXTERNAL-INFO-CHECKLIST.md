# External Information Checklist - DB-Card Backend Migration

**Audit Date**: 2026-01-18T01:43:11+08:00  
**Purpose**: 識別實作前需要查詢的外部資訊

---

## ⚠️ P0 - 必須在 Phase 1 前確認

### 1. Cloudflare D1 Foreign Key 支援
**問題**: Schema 設計中使用了 `FOREIGN KEY` 約束
**需確認**: D1 是否支援 Foreign Key Constraints？
**查詢**: https://developers.cloudflare.com/d1/

---

### 2. Cloudflare Workers Secrets 限制
**問題**: 需要儲存 KEK + SETUP_TOKEN
**需確認**: 
- Secrets 數量限制？
- Secrets 大小限制？
**查詢**: https://developers.cloudflare.com/workers/configuration/secrets/

---

### 3. Web Crypto API 在 Workers 環境
**問題**: Envelope Encryption 依賴 `crypto.subtle`
**需確認**: 
- Cloudflare Workers 是否完整支援 Web Crypto API？
- AES-GCM 是否可用？
**查詢**: https://developers.cloudflare.com/workers/runtime-apis/web-crypto/

---

### 4. NFC URL 長度限制
**問題**: `https://db-card.example.com/tap?uuid=xxx` 長度
**需確認**: 
- NDEF URL 最大長度？
- NTAG213/215/216 容量差異？
**查詢**: https://www.nfc-forum.org/

---

## 📋 P1 - Phase 1 實作時確認

### 5. Cloudflare KV Rate Limiting
**問題**: 使用 KV 實作 Rate Limiting
**需確認**: 
- KV 最終一致性延遲？
- 適合的 Rate Limiting 演算法？
**查詢**: https://developers.cloudflare.com/kv/

---

### 6. IndexedDB Dexie.js
**問題**: 前端使用 Dexie.js 操作 IndexedDB
**需確認**: 
- 最新穩定版本？
- Compound Index 支援？
**查詢**: https://dexie.org/

---

### 7. GitHub Actions Wrangler 整合
**問題**: CI/CD 自動部署
**需確認**: 
- Wrangler Action 使用方式？
- D1 Migration 如何執行？
**查詢**: https://github.com/cloudflare/wrangler-action

---

## 🔍 P2 - Phase 2 優化時確認

### 8. GDPR 技術要求
**問題**: AES-256 是否符合 Article 32 要求？
**需確認**: GDPR 加密標準建議
**查詢**: https://gdpr.eu/article-32-security-of-processing/

---

### 9. D1 查詢效能
**問題**: 索引優化策略
**需確認**: D1 索引最佳實踐
**查詢**: https://developers.cloudflare.com/d1/learning/using-indexes/

---

### 10. Envelope Encryption 效能
**問題**: 加密/解密時間影響 API 回應
**需確認**: 本地 Benchmark 測試
**查詢**: 實測

---

## 🚀 建議查詢順序 (總計 2 小時)

### Step 1: Cloudflare 平台 (30 分鐘)
1. D1 Foreign Key Support ⭐
2. Workers Secrets Limits ⭐
3. Workers Crypto API ⭐
4. KV Consistency Model

### Step 2: NFC 規範 (15 分鐘)
1. NDEF URL Length Limit ⭐
2. NFC Tools 相容性

### Step 3: 前端技術 (20 分鐘)
1. Dexie.js Documentation
2. IndexedDB Storage Quotas

### Step 4: CI/CD (15 分鐘)
1. Wrangler GitHub Action
2. D1 Migration Commands

### Step 5: 合規 (40 分鐘)
1. GDPR Article 32
2. 台灣個資法施行細則

---

## ✅ 查詢完成後行動

1. 更新 ARCH-001 (根據平台限制)
2. 更新 ADR-002 (確認加密實作)
3. 創建 Phase 1 詳細任務清單

---

**[END OF CHECKLIST]**
