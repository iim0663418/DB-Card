# DB-Card vCard 下載截斷問題分析報告

分析標的：`workers/public/js/main.js` 的 `generateVCard`（line 1151）
相依：`workers/public/js/utils/bilingual.js` 的 `getLocalizedText`、`main.js` line 90 的 `ORG_DEPT_MAPPING`
焦點：英文版（`currentLanguage === 'en'`）vCard 下載

---

## 背景觀察

1. `getLocalizedText(value, language)`（bilingual.js）行為：
   - `string` → 原值返回
   - `object` → `value[language] || value.zh || ''`（**關鍵**：空字串 `''` 為 falsy，會 fallback 到 `value.zh`）
   - 其他 → `''`
2. `generateVCard` 取名字：`const name = getLocalizedText(cardData.name, currentLanguage)`
3. `N` 欄位用 `name.charAt(0)` / `name.substring(1)` 做姓名分割 —— 此邏輯是為中文「姓在前」設計，對英文名完全錯誤。
4. `dept` 取法：`const dept = cardData.department || ''`（**未處理 object 型別**），與 UI 渲染（line 640，有處理 object）行為不一致。

---

## 問題清單

### 問題 1：N 欄位對英文名的 family/given 分割完全錯誤

- **欄位**：`N`（Structured Name）
- **問題程式碼**（line 1161-1165）：
  ```js
  if (name) {
      const familyName = name.charAt(0);
      const givenName = name.substring(1);
      vcard += `N:${escapeVCardValue(familyName)};${escapeVCardValue(givenName)};;;\n`;
  }
  ```
- **截斷場景**（英文名）：
  - name = `"David Chen"` → familyName=`"D"`、givenName=`"avid Chen"`
    產出 `N:D;avid Chen;;;` → 聯絡人 App 顯示姓「D」、名「avid Chen」。
  - name = `"Mary Jane Watson"` → familyName=`"M"`、givenName=`"ary Jane Watson"`。
  - 單字名 name = `"Madonna"` → familyName=`"M"`、givenName=`"adonna"`。
  - 這不是「截斷」而是「切錯位置」，導致姓名欄位內容語義錯誤（第一個字母被硬切成姓）。
- **建議修法**：
  - 依語言分流。英文以空白分割：第一個 token 之外視情況；慣例上 vCard `N` 為 `Family;Given;Additional;Prefix;Suffix`。
  ```js
  if (name) {
      let familyName, givenName;
      if (currentLanguage === 'en') {
          const parts = name.trim().split(/\s+/);
          if (parts.length >= 2) {
              givenName = parts.slice(0, -1).join(' '); // David（+ middle）
              familyName = parts[parts.length - 1];      // Chen（最後一字為姓）
          } else {
              givenName = name;      // 單字名放 given
              familyName = '';
          }
      } else {
          familyName = name.charAt(0);
          givenName = name.substring(1);
      }
      vcard += `N:${escapeVCardValue(familyName)};${escapeVCardValue(givenName)};;;\n`;
  }
  ```
  - 註：英文姓名順序各地慣例不同，若資料來源有獨立 `familyName/givenName` 欄位應優先使用，避免字串拆分猜測。

---

### 問題 2：FN 在英文 name 為空時無 fallback，整個 FN/N 欄位消失

- **欄位**：`FN`（Formatted Name）、連帶影響 `N`
- **問題程式碼**（line 1156-1159 + 1167-1170）：
  ```js
  const name = getLocalizedText(cardData.name, currentLanguage);
  ...
  if (name) {
      vcard += `FN:${escapeVCardValue(name)}\n`;
  }
  ```
- **截斷場景**（英文名為空）：
  - `cardData.name = { zh: '陳大衛', en: '' }`：
    `getLocalizedText({zh:'陳大衛', en:''}, 'en')` → 因 `'' ` falsy → fallback 回傳 `'陳大衛'`。
    這裡**剛好**不會空，但產出的是中文名（語言不一致，使用者切英文卻拿到中文 FN）。
  - `cardData.name = { en: '' }`（無 zh）或 `cardData.name = ''`：
    `getLocalizedText` 回傳 `''` → `if (name)` 為 false → **FN 與 N 完全不輸出**。
    vCard 缺少必填的 `FN`（vCard 3.0 規範 `FN` 為必要欄位），部分聯絡人 App 會匯入失敗或顯示空白聯絡人。
- **建議修法**：
  - 明確處理空值 fallback，並保證 FN 一定存在（可退回 email / org）：
  ```js
  let name = getLocalizedText(cardData.name, currentLanguage);
  if (!name) {
      name = getLocalizedText(cardData.name, 'zh')     // 跨語言 fallback
          || cardData.email
          || organization
          || 'Unknown';
  }
  // FN 無條件輸出（vCard 3.0 必填）
  vcard += `FN:${escapeVCardValue(name)}\n`;
  ```
  - 若維持「語言一致優先」，至少在 `en` 為空時記錄並退回 zh，避免 FN/N 整段消失。

---

### 問題 3：ORG 部門找不到翻譯時殘留中文（英文版語言不一致）

- **欄位**：`ORG`（部門段）
- **問題程式碼**（line 1169-1172 + 1180-1184）：
  ```js
  const departmentTranslated = currentLanguage === 'en' && ORG_DEPT_MAPPING.departments[dept]
      ? ORG_DEPT_MAPPING.departments[dept]
      : dept;
  ...
  if (organization && departmentTranslated) {
      vcard += `ORG:${escapeVCardValue(organization)};${escapeVCardValue(departmentTranslated)}\n`;
  }
  ```
- **截斷場景**（英文版）：
  - `dept = '資通安全署'`（不在 `ORG_DEPT_MAPPING.departments` 表內的新單位）：
    `ORG_DEPT_MAPPING.departments['資通安全署']` → `undefined` → fallback 到 `dept` 原值。
    產出 `ORG:Ministry of Digital Affairs;資通安全署` → 英文 vCard 中混入中文部門名（語言不一致，非截斷但屬錯誤顯示）。
  - 這不是字元截斷，而是翻譯缺漏造成的 mixed-language 輸出；對只識別 ASCII 的舊版匯入器，中文段可能顯示亂碼。
- **建議修法**：
  - 翻譯缺漏時的策略需明確（三選一，建議採 b）：
    - a) 保留中文（現狀）。
    - b) 翻譯缺漏時英文版省略部門段，只輸出 organization，避免混語。
    - c) 記錄缺漏以便補表。
  ```js
  let departmentTranslated = dept;
  if (currentLanguage === 'en') {
      const mapped = ORG_DEPT_MAPPING.departments[dept];
      departmentTranslated = mapped || ''; // 缺翻譯則不輸出中文部門
      if (!mapped && dept) {
          console.warn('[vCard] 缺少部門英譯:', dept);
      }
  }
  ```

---

### 問題 4：dept 為 object 型別時 ORG 直接壞掉（與 UI 渲染不一致）

- **欄位**：`ORG`（部門段）
- **問題程式碼**（line 1168）：
  ```js
  const dept = cardData.department || '';
  ```
  對照 UI 渲染（line 640-647）**有**處理 object：
  ```js
  if (typeof dept === 'object' && dept !== null) {
      deptText = lang === 'en' ? (dept.en || dept.zh || '') : (dept.zh || dept.en || '');
  } else if (typeof dept === 'string') { ... }
  ```
- **截斷場景**：
  - `cardData.department = { zh: '數位策略司', en: 'Department of Digital Strategy' }`：
    `generateVCard` 的 `dept` = 整個 object（`{...} || ''` → object 為 truthy，保留 object）。
    - `ORG_DEPT_MAPPING.departments[dept]` → 以 object 當 key → 查到 `undefined` → fallback 到 `dept`（object）。
    - `escapeVCardValue(dept)`：`dept` 非 string，`value.replace` **拋 TypeError**（object 沒有 `.replace`），或若先被字串化則輸出 `[object Object]`。
  - 結果：ORG 欄位輸出 `[object Object]` 或整個 vCard 產生失敗（例外中斷下載）。
- **建議修法**：
  - 比照 UI 渲染先正規化 dept 為 string，再查表：
  ```js
  let dept = cardData.department || '';
  if (typeof dept === 'object' && dept !== null) {
      dept = currentLanguage === 'en'
          ? (dept.en || dept.zh || '')
          : (dept.zh || dept.en || '');
  } else if (typeof dept !== 'string') {
      dept = '';
  }
  // 之後再做 ORG_DEPT_MAPPING.departments[dept] 查表
  ```

---

### 問題 5：getLocalizedText 對 `{zh:'...', en:''}` 空字串靜默回退，語言不一致

- **欄位**：所有經 `getLocalizedText` 取值的欄位 —— `name`(FN/N)、`title`(TITLE)、`address`(ADR)
- **問題程式碼**（bilingual.js）：
  ```js
  if (typeof value === 'object' && value !== null) {
      return value[language] || value.zh || '';
  }
  ```
- **截斷場景**（英文版，某欄 en 為空字串）：
  - `cardData.title = { zh: '司長', en: '' }`，`currentLanguage='en'`：
    `value['en']` = `''`（falsy）→ `|| value.zh` → 回傳 `'司長'`。
    英文 vCard 的 TITLE 欄位出現中文「司長」（使用者預期英文，卻拿到中文）。
  - 同理 `address = { zh: '台北市...', en: '' }` → ADR 回退中文地址。
  - 行為上「不是截斷」，但從英文使用者角度看等同欄位內容錯誤／語言污染；且 `''`（刻意留空以「英文不顯示此欄」）無法達成，因為會被 zh 覆蓋。
- **建議修法**：
  - 區分「欄位不存在（undefined）」與「刻意留空（''）」兩種語義：
  ```js
  export function getLocalizedText(value, language = 'zh') {
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      // 若該語言的 key 存在（含空字串），尊重其值，不強制回退
      if (Object.prototype.hasOwnProperty.call(value, language)) {
        return value[language] ?? '';
      }
      return value.zh ?? '';
    }
    return '';
  }
  ```
  - 若產品決策是「英文缺值時回退中文」，則應維持現狀但在 vCard 層對語言一致性做標註／告知，不應靜默。需由父 agent／產品負責人確認哪種語義為預期。

---

## 影響彙整

| 問題 | 欄位 | 類型 | 英文版後果 |
|------|------|------|-----------|
| 1 | N | 分割錯誤 | family/given 切錯，姓僅取首字母 |
| 2 | FN / N | 欄位缺失 | name 為空時 FN/N 不輸出，違反 vCard 3.0 必填 |
| 3 | ORG | 翻譯缺漏 | 新部門無英譯時殘留中文（混語） |
| 4 | ORG | 型別未處理 | dept 為 object 時輸出 `[object Object]` 或拋例外中斷 |
| 5 | FN/TITLE/ADR | 語言污染 | en 為 `''` 時靜默回退中文 |

## 優先級建議

1. **問題 4（高）**：可能直接讓 vCard 產生失敗（例外），阻斷下載。
2. **問題 2（高）**：FN 缺失導致匯入失敗，屬規範違反。
3. **問題 1（中）**：英文名姓名切錯，普遍發生於所有英文名。
4. **問題 5 / 問題 3（中）**：語言一致性問題，需產品決策確認預期語義後再修。

> 註：問題 3 與 5 的「正確行為」取決於產品對「英文缺值是否回退中文」的定義。修法前建議先確認需求，避免改動方向與產品意圖相反。
