# .specify/ 目錄說明

此目錄包含 DB-Card 專案的開發輔助文件與記憶系統。

## 目錄結構

### memory/ - AI 記憶系統
- `knowledge_graph.mem` - 長期知識圖譜（三元組格式）
- `progress.md` - 短期開發進度追蹤

### archive/ - 開發過程歸檔
- `v4.0-v4.5/` - v4.0-v4.5 開發過程文件（200+ 個）
  - `specs/` - BDD 規格與技術設計（139 個）
  - `reports/` - 測試報告與驗收文件（42 個）
  - `analysis/` - 技術分析與評估（8 個）
  - `testing/` - 測試指南
  - `deployment/` - 部署檢查清單

### guides/ - 操作指南
- `REVOKE-AND-NEW-CARD-GUIDE.md` - 撤銷與新建名片指南

### scripts/ - 輔助腳本
開發與維護用腳本

---

## 歸檔說明

### 為什麼歸檔？
- 保持專案目錄整潔
- 保留完整開發歷程
- 方便查閱特定功能的設計過程

### 歸檔內容
`archive/v4.0-v4.5/` 包含：
- 2025-2026 年間的所有開發文件
- BDD 規格、測試報告、技術分析
- 功能設計、安全改進、效能優化記錄

### 如何使用歸檔
```bash
# 搜尋特定功能的設計文件
grep -r "consent management" .specify/archive/v4.0-v4.5/specs/

# 查看特定測試報告
ls .specify/archive/v4.0-v4.5/reports/*test*.md
```

---

## 當前文檔位置

最新的正式文檔請參閱：
- `docs/` - 正式文檔（API、安全、架構）
- `README.md` - 專案說明
- `CHANGELOG.md` - 版本變更記錄

---

**最後更新**: 2026-02-02  
**歸檔版本**: v4.0.0 - v4.5.x
