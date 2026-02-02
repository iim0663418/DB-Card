-- Update privacy policy v1.0.0 to change data controller from MODA to DB-Card system
-- Date: 2026-02-02

UPDATE privacy_policy_versions
SET 
  content_zh = '【DB-Card 數位名片系統 個人資料蒐集同意書】

一、蒐集者名稱
DB-Card 數位名片系統（DB-Card Digital Business Card System）

二、蒐集目的
本系統依據《個人資料保護法》，基於以下法定目的蒐集您的個人資料：
• 069 契約、類似契約或其他法律關係事務
• 090 消費者、客戶管理與服務
• 135 資訊（通訊）服務
• 157 統計研究分析

三、蒐集之個人資料類別
(1) 從 OAuth 取得（僅作為系統識別，不用於聯繫）：
    • 姓名
    • Email（僅作為帳號識別碼）
    • 大頭貼圖片
    • Google User ID

(2) 您自行輸入的名片資料：
    • 職稱（中文/英文）
    • 部門（中文/英文）
    • 電話
    • 網站 URL
    • 地址
    • 社群連結（LinkedIn, GitHub 等）
    • 個人簡介（中文/英文）

(3) 系統自動記錄：
    • IP 位址（匿名化處理，僅保留前 3 段）
    • 存取時間
    • 瀏覽器資訊
    • 操作日誌
    • NFC 觸碰記錄

四、資料利用期間、地區、對象及方式
• 利用期間：帳號存續期間 + 刪除後 90 天
• 利用地區：全球（透過 Cloudflare 全球分散式網路）
• 利用對象：本系統、Cloudflare（技術服務提供商）
• 利用方式：
  - 展示於數位名片頁面
  - 生成 vCard 檔案與 QR Code
  - 系統認證
  - 安全稽核與異常偵測
  - 匿名統計分析（去識別化）

五、您的權利
依據《個人資料保護法》第 3 條，您享有以下權利：
• 查詢或請求閱覽
• 請求製給複製本
• 請求補充或更正
• 請求停止蒐集、處理或利用
• 請求刪除

您可於使用者入口的「個資管理」區塊行使上述權利。

六、不提供資料之影響
若您選擇不提供個人資料或撤回同意，將無法使用數位名片服務。

七、技術服務提供商
本系統使用 Cloudflare Workers 平台，資料儲存於 Cloudflare D1 Database。Cloudflare 作為技術服務提供商，受其隱私政策約束，不會存取或使用您的個人資料。

八、資料保存與刪除
• 帳號存續期間：保留資料以提供服務
• 帳號刪除後：90 天後永久刪除
• 審計日誌：90 天後自動刪除

九、聯絡方式
如有任何疑問，請透過系統內的客服功能聯繫我們。

版本：v1.0.0
生效日期：2026 年 2 月 2 日',
  content_en = '【DB-Card Digital Business Card System - Personal Data Collection Consent】

1. Data Controller
DB-Card Digital Business Card System

2. Purpose of Collection
In accordance with the Personal Data Protection Act, we collect your personal data for the following statutory purposes:
• 069 Contract, similar contract, or other legal relationship matters
• 090 Consumer and customer management and services
• 135 Information (communication) services
• 157 Statistical research and analysis

3. Categories of Personal Data Collected
(1) Obtained from OAuth (used for system identification only, not for contact):
    • Name
    • Email (used as account identifier only)
    • Profile picture
    • Google User ID

(2) Data you provide for business cards:
    • Job title (Chinese/English)
    • Department (Chinese/English)
    • Phone number
    • Website URL
    • Address
    • Social media links (LinkedIn, GitHub, etc.)
    • Personal bio (Chinese/English)

(3) Automatically recorded by system:
    • IP address (anonymized, first 3 segments only)
    • Access time
    • Browser information
    • Operation logs
    • NFC tap records

4. Period, Region, Recipients, and Methods of Use
• Period: Duration of account + 90 days after deletion
• Region: Global (via Cloudflare global distributed network)
• Recipients: This system, Cloudflare (technical service provider)
• Methods:
  - Display on digital business card pages
  - Generate vCard files and QR codes
  - System authentication
  - Security audit and anomaly detection
  - Anonymous statistical analysis (de-identified)

5. Your Rights
Under Article 3 of the Personal Data Protection Act, you have the right to:
• Inquire or request access
• Request a copy
• Request supplement or correction
• Request cessation of collection, processing, or use
• Request deletion

You may exercise these rights in the "Personal Data Management" section of the User Portal.

6. Consequences of Not Providing Data
If you choose not to provide personal data or withdraw consent, you will not be able to use the digital business card service.

7. Technical Service Provider
This system uses Cloudflare Workers platform, with data stored in Cloudflare D1 Database. Cloudflare, as a technical service provider, is bound by its privacy policy and does not access or use your personal data.

8. Data Retention and Deletion
• During account existence: Data is retained to provide services
• After account deletion: Data will be permanently deleted after 90 days
• Audit logs: Automatically deleted after 90 days

9. Contact Information
If you have any questions, please contact us through the customer service function in the system.

Version: v1.0.0
Effective Date: February 2, 2026'
WHERE version = 'v1.0.0';
