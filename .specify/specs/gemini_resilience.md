# Scenario: Gemini API Resilience - Retry & Fallback

## Problem
- 前端遇到 Gemini 錯誤時直接崩潰
- 沒有重試機制處理暫時性錯誤（429 配額）
- 沒有降級機制處理永久性錯誤（412 安全過濾）

## Solution Architecture

### 1. Retry Mechanism (429 Quota Errors)
**Given**: Gemini API 返回 429 QUOTA_EXCEEDED
**When**: unified_extract 呼叫 Gemini
**Then**: 
- 重試 3 次，指數退避 (1s, 2s, 4s) + jitter
- 第 3 次失敗後降級到純 OCR

### 2. Fallback Mechanism (412 Safety Errors)
**Given**: Gemini API 返回 412 SAFETY_FILTER
**When**: unified_extract 呼叫 Gemini
**Then**:
- 不重試，直接降級到純 OCR
- 返回 ocr_only: true 標記
- 前端顯示「部分資訊已提取，建議手動補充」

### 3. Pure OCR Fallback
**Given**: Gemini 完全失敗（重試耗盡或 412）
**When**: 需要降級
**Then**:
- 使用 Gemini Vision OCR（不含 Web Search）
- 返回基本欄位：name, title, company, phone, email
- 設定 ocr_status = 'completed', ocr_only = true

## Technical Requirements
- 在 unified_extract.ts 加入 retryWithBackoff 函式
- 429 錯誤重試 3 次
- 412 錯誤直接降級
- 降級時呼叫 fallbackToOCR() 函式
- 前端 received-cards.js 處理 ocr_only 狀態
- 顯示警告訊息：「⚠️ 部分資訊已提取（僅 OCR），建議手動補充」

## Error Handling Matrix
| Error Type | Retry | Fallback | User Message |
|-----------|-------|----------|--------------|
| 429 QUOTA | 3x | Yes | 部分資訊已提取 |
| 412 SAFETY | No | Yes | 部分資訊已提取 |
| 500 SERVER | 3x | Yes | 部分資訊已提取 |
| Network | 3x | No | 上傳失敗，請重試 |
