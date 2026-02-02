# DB-Card 數位名片系統隱私權政策
# Privacy Policy for DB-Card Digital Business Card System

**版本 (Version)**: 2.0.0  
**生效日期 (Effective Date)**: 2026-01-18  
**最後更新 (Last Updated)**: 2026-01-18  
**適用範圍 (Scope)**: DB-Card v4.0.0+ (後端化架構)

---

## 🇹🇼 中文版本

### 1. 政策概述

DB-Card 數位名片系統重視您的隱私權。本隱私權政策說明我們如何收集、使用、儲存及保護您的個人資料。

**重要變更通知**：自 v4.0.0 起，DB-Card 系統已從純前端架構轉型為後端儲存架構，您的名片資料將儲存於我們的伺服器中。

### 2. 資料控制者

**服務提供者**：DB-Card 專案團隊  
**聯絡信箱**：privacy@db-card.example.com  
**資料保護負責人**：[專案負責人姓名]  
**服務網址**：https://db-card.example.com

### 3. 收集的個人資料

#### 3.1 名片資料 (必要資料)
- 姓名 (中文/英文)
- 職稱
- 部門/組織
- 電子郵件
- 電話號碼 (辦公室/手機)
- 辦公地址

#### 3.2 選填資料
- 大頭照 (照片 URL)
- 社群媒體連結 (Facebook, Instagram, LINE)
- 個人問候語

#### 3.3 系統自動收集資料
- NFC 卡片 UUID (唯一識別碼)
- 名片訪問時間與次數
- 訪問者 IP 地址 (匿名化，僅記錄前 3 段)
- 裝置類型 (User-Agent)

### 4. 資料收集目的與法律依據

#### 4.1 收集目的
- **主要目的**：提供數位名片展示與交換服務
- **次要目的**：系統安全維護、統計分析、服務改善

#### 4.2 法律依據
- **台灣個人資料保護法**：特定目的外之利用 (第 20 條)
- **GDPR Article 6(1)(a)**：使用者明確同意
- **GDPR Article 6(1)(f)**：合法利益 (系統安全維護)

### 5. 資料使用方式

我們**僅**將您的資料用於以下目的：

✅ **允許的使用**：
- 在您的數位名片頁面上展示資料
- 生成 vCard 聯絡人檔案供他人下載
- 生成 QR 碼供離線分享
- 系統安全監控與異常偵測
- 匿名化統計分析 (不包含個人識別資訊)

❌ **禁止的使用**：
- 未經同意的行銷或廣告
- 出售或出租給第三方
- 用於原始目的外的其他用途

### 6. 資料儲存與安全措施

#### 6.1 儲存位置
- **伺服器**：Cloudflare Workers (全球邊緣運算網路)
- **資料庫**：Cloudflare D1 (SQLite-based, 加密儲存)
- **地理位置**：資料可能儲存於 Cloudflare 全球資料中心

#### 6.2 安全措施
- **傳輸加密**：TLS 1.3 強制加密
- **儲存加密**：AES-256-GCM 加密所有名片資料
- **存取控制**：基於角色的權限管理 (RBAC)
- **審計日誌**：完整記錄所有資料存取操作
- **定期備份**：每日自動備份，保留 30 天
- **安全監控**：24/7 異常行為偵測

#### 6.3 資料保存期限
- **活躍名片**：無限期保存 (直到您要求刪除)
- **已刪除名片**：軟刪除後保留 90 天 (合規要求)，之後永久刪除
- **審計日誌**：保留 1 年 (法規要求)
- **備份資料**：保留 30 天

### 7. 資料分享與第三方

#### 7.1 不分享原則
我們**不會**將您的個人資料分享給第三方，除非：
- 法律要求 (法院命令、檢調機關調查)
- 緊急情況 (保護生命安全)
- 您明確授權

#### 7.2 第三方服務
我們使用以下第三方服務，但**不傳輸您的名片資料**：
- **Cloudflare**：基礎設施提供商 (符合 GDPR)
- **GitHub**：程式碼託管與 CI/CD (不接觸使用者資料)

### 8. 您的權利

根據 GDPR 和台灣個資法，您享有以下權利：

#### 8.1 存取權 (Right to Access)
- 您可隨時查看您的名片資料
- 請求方式：登入系統或聯絡 privacy@db-card.example.com

#### 8.2 更正權 (Right to Rectification)
- 您可隨時更新或修正您的名片資料
- 操作方式：使用 NFC 生成器重新寫入卡片

#### 8.3 刪除權 (Right to Erasure / Right to be Forgotten)
- 您可要求刪除您的名片資料
- 請求方式：聯絡 privacy@db-card.example.com
- 處理時間：7 個工作天內完成

#### 8.4 限制處理權 (Right to Restriction)
- 您可要求暫停處理您的資料
- 請求方式：聯絡 privacy@db-card.example.com

#### 8.5 資料可攜權 (Right to Data Portability)
- 您可要求以機器可讀格式匯出您的資料
- 格式：JSON 或 vCard (.vcf)

#### 8.6 反對權 (Right to Object)
- 您可反對我們處理您的資料
- 請求方式：聯絡 privacy@db-card.example.com

### 9. Cookie 與本地儲存

#### 9.1 使用的技術
- **IndexedDB**：PWA 離線快取 (儲存於您的裝置)
- **Service Worker**：離線功能支援
- **LocalStorage**：語言偏好設定

#### 9.2 Cookie 聲明
我們**不使用** Cookie 進行追蹤或廣告。

### 10. 兒童隱私

本服務不針對 13 歲以下兒童。如發現未成年人資料，我們將立即刪除。

### 11. 跨境資料傳輸

您的資料可能儲存於 Cloudflare 全球資料中心。Cloudflare 符合以下標準：
- **GDPR 合規**：歐盟標準契約條款 (SCC)
- **隱私盾 (Privacy Shield) 繼承者**：適當保護措施

### 12. 政策變更通知

我們可能更新本隱私權政策。重大變更時，我們將：
- 在網站上公告 30 天
- 發送電子郵件通知 (如您有提供)
- 要求重新同意 (如法律要求)

### 13. 聯絡我們

如有任何隱私權疑問或行使您的權利，請聯絡：

**DB-Card 資料保護團隊**  
📧 Email: privacy@db-card.example.com  
🌐 網站: https://db-card.example.com  
📝 GitHub: https://github.com/[your-username]/DB-Card

---

## 🇬🇧 English Version

### 1. Policy Overview

DB-Card Digital Business Card System values your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal data.

**Important Change Notice**: Starting from v4.0.0, DB-Card has transitioned from a pure frontend architecture to a backend storage system. Your business card data will now be stored on our servers.

### 2. Data Controller

**Service Provider**: DB-Card Project Team  
**Contact Email**: privacy@db-card.example.com  
**Data Protection Officer**: [Project Lead Name]  
**Service URL**: https://db-card.example.com

### 3. Personal Data We Collect

#### 3.1 Business Card Data (Required)
- Name (Chinese/English)
- Job Title
- Department/Organization
- Email Address
- Phone Numbers (Office/Mobile)
- Office Address

#### 3.2 Optional Data
- Profile Photo (Photo URL)
- Social Media Links (Facebook, Instagram, LINE)
- Personal Greetings

#### 3.3 Automatically Collected Data
- NFC Card UUID (Unique Identifier)
- Card Access Time and Count
- Visitor IP Address (Anonymized, first 3 segments only)
- Device Type (User-Agent)

### 4. Purpose and Legal Basis

#### 4.1 Purpose of Collection
- **Primary**: Provide digital business card display and exchange services
- **Secondary**: System security, statistical analysis, service improvement

#### 4.2 Legal Basis
- **Taiwan Personal Data Protection Act**: Article 20
- **GDPR Article 6(1)(a)**: User Consent
- **GDPR Article 6(1)(f)**: Legitimate Interest (Security)

### 5. How We Use Your Data

We **only** use your data for:

✅ **Permitted Uses**:
- Display data on your digital business card page
- Generate vCard contact files for download
- Generate QR codes for offline sharing
- System security monitoring and anomaly detection
- Anonymized statistical analysis (no PII)

❌ **Prohibited Uses**:
- Marketing or advertising without consent
- Selling or renting to third parties
- Any purpose beyond the original intent

### 6. Data Storage and Security

#### 6.1 Storage Location
- **Server**: Cloudflare Workers (Global Edge Network)
- **Database**: Cloudflare D1 (SQLite-based, Encrypted)
- **Geographic Location**: Data may be stored in Cloudflare's global data centers

#### 6.2 Security Measures
- **Encryption in Transit**: TLS 1.3 enforced
- **Encryption at Rest**: AES-256-GCM for all card data
- **Access Control**: Role-Based Access Control (RBAC)
- **Audit Logs**: Complete logging of all data access
- **Regular Backups**: Daily automated backups, 30-day retention
- **Security Monitoring**: 24/7 anomaly detection

#### 6.3 Data Retention Period
- **Active Cards**: Indefinite (until you request deletion)
- **Deleted Cards**: Soft-deleted for 90 days (compliance), then permanently deleted
- **Audit Logs**: 1 year (legal requirement)
- **Backup Data**: 30 days

### 7. Data Sharing and Third Parties

#### 7.1 No Sharing Policy
We **do not** share your personal data with third parties, except:
- Legal requirements (court orders, law enforcement)
- Emergency situations (protecting life safety)
- Your explicit authorization

#### 7.2 Third-Party Services
We use the following services but **do not transmit your card data**:
- **Cloudflare**: Infrastructure provider (GDPR compliant)
- **GitHub**: Code hosting and CI/CD (no user data access)

### 8. Your Rights

Under GDPR and Taiwan's Personal Data Protection Act, you have:

#### 8.1 Right to Access
- View your business card data anytime
- Request via: Login or email privacy@db-card.example.com

#### 8.2 Right to Rectification
- Update or correct your card data anytime
- Method: Use NFC generator to rewrite card

#### 8.3 Right to Erasure (Right to be Forgotten)
- Request deletion of your card data
- Request via: privacy@db-card.example.com
- Processing time: Within 7 business days

#### 8.4 Right to Restriction
- Request suspension of data processing
- Request via: privacy@db-card.example.com

#### 8.5 Right to Data Portability
- Request export in machine-readable format
- Formats: JSON or vCard (.vcf)

#### 8.6 Right to Object
- Object to our data processing
- Request via: privacy@db-card.example.com

### 9. Cookies and Local Storage

#### 9.1 Technologies Used
- **IndexedDB**: PWA offline cache (stored on your device)
- **Service Worker**: Offline functionality
- **LocalStorage**: Language preferences

#### 9.2 Cookie Statement
We **do not** use cookies for tracking or advertising.

### 10. Children's Privacy

This service is not intended for children under 13. We will immediately delete any minor's data discovered.

### 11. Cross-Border Data Transfer

Your data may be stored in Cloudflare's global data centers. Cloudflare complies with:
- **GDPR Compliance**: EU Standard Contractual Clauses (SCC)
- **Privacy Shield Successor**: Adequate protection measures

### 12. Policy Change Notification

We may update this Privacy Policy. For significant changes, we will:
- Announce on website for 30 days
- Send email notification (if provided)
- Request re-consent (if legally required)

### 13. Contact Us

For privacy questions or to exercise your rights, contact:

**DB-Card Data Protection Team**  
📧 Email: privacy@db-card.example.com  
🌐 Website: https://db-card.example.com  
📝 GitHub: https://github.com/[your-username]/DB-Card

---

## 附錄 A: 資料處理活動記錄 (GDPR Article 30)

| 項目 | 內容 |
|------|------|
| 處理目的 | 數位名片展示與交換服務 |
| 資料類別 | 姓名、職稱、聯絡方式、照片 |
| 資料主體 | 服務使用者及其聯絡人 |
| 接收者 | 無 (不分享給第三方) |
| 跨境傳輸 | Cloudflare 全球資料中心 (SCC 保護) |
| 保存期限 | 活躍期間 + 90 天軟刪除期 |
| 安全措施 | AES-256-GCM 加密、TLS 1.3、RBAC |

## 附錄 B: 同意聲明範本

```
我已閱讀並理解 DB-Card 隱私權政策 (v2.0.0)，並同意：

☑ DB-Card 服務收集並儲存我的名片資料於 Cloudflare 伺服器
☑ 我的資料將用於數位名片展示與交換服務
☑ 我理解我的資料將以 AES-256-GCM 加密儲存
☑ 我知道我可隨時行使存取、更正、刪除等權利

簽署日期：__________
簽署方式：☐ 電子簽章  ☐ 系統勾選同意
```

---

**文件版本控制**  
- v1.0.0 (2025-06): 純前端架構隱私政策 (開源專案)
- v2.0.0 (2026-01): 後端化架構隱私政策 (個人專案)
