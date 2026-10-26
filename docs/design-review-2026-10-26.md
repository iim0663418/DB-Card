# DB-Card Design Review — 2026-10-26

## Executive Summary

- Overall: 🔴 — 核心名片上傳與分享設定存在鍵盤操作阻斷；現有品牌與元件基礎可保留，優先修復互動、狀態與可讀性。
- Blocking: 1 | Major: 16 | Minor: 4（共 21 項，依 C／U／H／X 問題 ID 去重計數；跨頁重複出現不重複計數）。
- 最需要優先處理的 3 件事：
  1. **U1：恢復上傳與分享開關的鍵盤路徑**，使使用者能獨立完成核心任務。
  2. **U4／U5／U6：修正失敗與等待體驗**：載入失敗不可顯示「尚無名片」；儲存失敗保留草稿；長時間 AI 處理提供取消。
  3. **C3／X1／X2：建立可靠的閱讀與焦點層**：重要狀態不透明化、表單與 modal 可辨識、亮暗色皆有足夠對比。

### 範圍、方法與證據邊界

依序完整讀取 `workers/public/card-display.html`（971 行）、`workers/public/js/main.js`（1,613 行）、`workers/public/user-portal.html`（1,500 行）、`workers/public/js/modules/received-cards.js`（2,845 行）、`workers/public/index.html`（833 行），合計 7,762 行後才撰寫報告。基準為目前工作樹，HEAD `9c5b39e`；開始時工作樹無修改。

補查 `css/tokens.css`、`css/base.css`、`css/tailwind-input.css`、`css/components.css` 相關規則，以及 `js/manifest-loader.js`、`js/page-init.js`、`js/modules/main.js` 的入口／事件路由。**專案已有 design tokens、共用 focus-visible、全域 CSS reduced-motion、部分錯誤重試與刪除確認，不列為缺失。** 未提供 Figma，不宣稱符合或偏離 Figma。

框架採用指定的 Frontend Design Review、UI/UX Craft Discipline、Frontend Aesthetic Direction。產品判斷：公開名片展示＋授權帳號後台；後台偏內部工具，但公開名片與手機收卡使 responsive、accessibility 不宜降權。

使用隔離 headless Chromium 與本機檔案路由驗證，所有外部請求阻擋、使用虛構名片，不登入或操作正式服務。注入原始 JS 並替換 API／入口依賴，測試 DOM、CSS 與部分事件；這不是 production bundle、OAuth、Safari、VoiceOver 的端對端認證。圖片與外部字型未完整載入，影像內容及最終字型觀感不作已驗證結論。遠端 agent-memory 工具未提供，無法 recall／retain，未以本機記憶替代。

嚴重度依影響：blocking＝阻止特定使用者完成核心任務；major＝顯著妨礙使用或可信度；minor＝美術、文案與維護改善。以下程式碼是原始摘錄，`…` 表示省略；建議片段為實作示意，未修改產品程式。

### 核心任務與 ≤3 次互動

| 頁面／起點 | 核心任務 | 現況判斷 |
|---|---|---|
| 已載入名片 | 取得聯絡人檔案 | 點「加入聯絡人」1 次；作業系統實際匯入另計且未驗證，不能宣稱 1 次完成儲存 |
| 已載入名片 | 開啟 QR／切換語言 | 各 1 次；整卡翻面造成語言狀態分岔，見 C1 |
| 已登入選擇頁 | 開名片夾並查看名片 | 開名片夾→查看，2 次；可達成 |
| 已登入名片夾 | 上傳與儲存 | 選檔入口→系統選檔→確認儲存，最短約 3 個階段；校對欄位不能省略，也不能把多次編輯包成 1 次互動；鍵盤目前被 U1 阻斷 |
| 首頁 | 進入自己的工作區 | 點使用者入口 1 次；OAuth、首次同意屬外部／首次流程，不據此宣稱整體 ≤3 次 |

## 1. Card Display 頁面

### Pillar 1: Frictionless

**C1 — major｜翻面與語言狀態不一致，整卡 button 又包住多個互動元件。**

證據：`card-display.html:527` 附近的 `#card`，`main.js:1316` 附近語言按鈕事件與 `main.js:1463` 附近 `toggleFlip`。

```html
<div id="card" class="card-inner" tabindex="0" role="button"
     aria-label="點擊翻面切換語言" data-action="toggleFlip">
```
```js
// 語言按鈕會更新 currentLanguage、URL、html.lang、按鈕文字。
currentLanguage = currentLanguage === 'zh' ? 'en' : 'zh';
// 整卡翻面只更新視覺 class。
card.classList.toggle('is-flipped');
```

影響：點卡片看到英文，下載仍可能按中文狀態產生 vCard；兩條切換路徑給出不同結果。`role="button"` 不會自動實作 Enter／Space；整卡角色也不適合包覆聯絡連結。背面只有 CSS `backface-visibility`，沒有 `inert`／`aria-hidden`，不可假設從可及性樹消失。本機檢查背面 `inert=false`、`aria-hidden=null`。

建議：移除整卡的 button 語意與點擊翻面，保留明確的原生「English／繁體中文」按鈕；若保留視覺翻面，由單一 `setLanguage()` 管理資料、標籤、URL 與面板。只有目前可見面能獲取焦點。

```js
function setLanguage(lang) {
  currentLanguage = lang;
  const en = lang === 'en';
  card.classList.toggle('is-flipped', en);
  front.inert = en;
  back.inert = !en;
  front.setAttribute('aria-hidden', String(en));
  back.setAttribute('aria-hidden', String(!en));
  document.documentElement.lang = en ? 'en' : 'zh-TW';
  // 同步 URL、lang-switch、頁面標題及 session 文案。
  updateButtonTexts();
}
```

驗收：兩種語言顯示、下載姓名、按鈕、`html.lang` 一致；Tab 不進入背面；語言按鈕用 Enter／Space 可操作。

**C2 — major｜同一 Email 連結在手機變成複製，桌面才寄信。**

證據：`card-display.html:835–843`，Email HTML 區塊約 554–568 行。

```js
if (isMobile) {
  event.preventDefault();
  await copyEmailWithToast(event, elementId);
}
```
```html
<a id="email-link" ... data-action="handleEmailClick">
  ...
  <button ... class="hidden md:block ... opacity-0 group-hover:opacity-100">
```

影響：使用者選了「Email 聯絡」卻沒有開信件；桌面複製按鈕僅 hover 出現，鍵盤 focus 可能仍透明；`a` 內再放 button 是不適當的互動巢狀。

建議：`mailto:` 在所有裝置保持一致；外層改為非互動容器，寄信連結與複製按鈕並列。複製有可見名稱，手機也可用；狀態用現有 live region。

```html
<div class="contact-row">
  <a id="email-link" href="mailto:…">寄送電子郵件</a>
  <button type="button" data-action="copyEmail" data-target="user-email"
          aria-label="複製電子郵件地址">複製</button>
</div>
```

驗收：手機與桌面點信箱動作一致；Tab 可見複製焦點；失敗提示包含「長按地址複製」等替代方式。

### Pillar 2: Quality Craft

**C3 — major｜HUD 視覺被用在必要狀態，透明度使載入與期限難讀。**

證據：`card-display.html:303–310`、`:456`、`:715–717`。

```css
.hud-text { opacity: 0.15 !important; font-size: 0.5rem; }
```
```html
<p id="loading-text" class="mt-8 hud-text animate-pulse">雲端資料解密中...</p>
<div id="token-info" class="lg:hidden mt-12 opacity-40 ...">
  <p id="session-expiry" class="hud-text text-[8px] text-slate-400">...</p>
```

本機 computed style 確認 loading opacity 為 `0.15`。期限位於 `opacity-40` 父層，又受子層 opacity 影響；實際字級還會被後載入的 `.hud-text` 覆寫，因此不能僅據 inline CSS 認定最終一定是 8px。核心問題是**資訊與裝飾共用淡化樣式**。

建議：`hud-text` 僅用於 `aria-hidden` 裝飾；載入、QR 說明、期限用語意元件，字級 14px、opacity 1、穩定對比。桌面若要顯示同一連結期限，也不能以 `lg:hidden` 完全拿掉。

```css
.session-meta, .loading-label {
  opacity: 1;
  font-size: .875rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
  letter-spacing: normal;
}
```

移除父層 `opacity-40`，不要只在子元素加 `opacity:1`。驗收：亮暗模式各量測最終混色後對比 ≥4.5:1；讀取慢網路文案不需放大。

### Pillar 3: Trustworthy

已實作：`showError()`、可重試錯誤、漸進載入、7 秒後取消、下載通知、QR modal 的 Escape 關閉。沒有 AI 生成文字的明確證據，名片公開頁不要求無差別新增 AI disclaimer。

**C4 — minor｜「加入聯絡人」與實際下載回饋之間缺少下一步。**

證據：`card-display.html:690`、`main.js` 的 vCard 下載 handler。

```html
<span id="vcard-text" data-i18n="add_to_contacts">加入聯絡人</span>
```
```js
a.click();
showNotification('vCard 已下載', 'success');
```

建議：保留易懂 CTA；附近補「下載後開啟檔案，再確認加入通訊錄」。通知改「已開始下載名片，請在裝置上完成加入」，不要表示已確認寫入通訊錄；提供英文版本。這是結果精準度改善，沒有實測證據顯示下載壞掉。

QR modal 的焦點與窄螢幕問題統一列 X1；動態效果列 X3。

## 2. User Portal 頁面

### Pillar 1: Frictionless

**U1 — blocking｜上傳與分享設定只有滑鼠路徑，阻斷鍵盤核心任務。**

證據：`user-portal.html:328–336`、`received-cards.js:831`、`:1876–1885`。

```html
<div id="upload-area" class="... cursor-pointer ...">
  <input type="file" id="card-image-input" ... class="hidden">
</div>
```
```js
uploadArea.addEventListener('click', () => fileInput.click());
```
```html
<input type="checkbox" class="share-toggle" ... style="display: none;">
<div class="toggle-switch" style="... width:44px; height:24px; ..."></div>
```

本機確認上傳區 `tabIndex=-1`、分享 input computed `display:none`；事件中無上傳鍵盤替代。`label` 不會讓 display:none 的 checkbox 重新進入 Tab 順序。此問題對鍵盤使用者是功能阻斷，不只是 polish。

建議：上傳區內設真正 button，檔案 input 作為程式觸發的隱藏輸入；分享 checkbox 用 `sr-only` 而非 display:none，保留原生 Space 行為與 label。將視覺 switch 的 focus ring 映射至 input。

```html
<div id="upload-area">
  <button type="button" id="choose-card-image">選擇名片照片</button>
  <input type="file" id="card-image-input" accept="image/jpeg,image/png" hidden>
</div>
<label class="share-control">
  <input type="checkbox" class="share-toggle sr-only">
  <span class="toggle-switch" aria-hidden="true"></span>
  <span>分享給其他使用者</span>
</label>
```
```css
.share-control { min-height: 44px; }
.share-toggle:focus-visible + .toggle-switch {
  outline: 2px solid var(--color-primary); outline-offset: 4px;
}
```

同時把既有 `uploadArea.click` 綁定移到 `choose-card-image`，避免 input click 冒泡反覆觸發父層。驗收：從名片夾以 Tab→Enter 選檔、Space 切換分享；失敗會恢復勾選值並宣布原因。

**U2 — major｜收卡列表把辨識資訊擠壓，動作與刪除比姓名更搶眼。**

證據：`received-cards.js:1663`、`:1842–1908`。

```html
<div class="card-thumbnail ... w-20 h-[53px] md:w-[120px] md:h-20 ...">
<h3 class="text-lg font-black text-slate-900 truncate tracking-tight">...</h3>
<p class="text-sm font-bold text-slate-600 truncate">...</p>
```
```html
<button ... style="background: var(--moda-accent); color: white;">查看</button>
<button ... style="background: rgba(59,130,246,0.15); color:#3b82f6;">...</button>
<button ... style="background: rgba(16,185,129,0.15); color:#10b981;">...</button>
<button class="w-full ..." ...>刪除名片</button>
```

1024px 三欄切換時，120px 縮圖、48px padding 與 16px gap 會留給姓名很窄的空間。長姓名、公司、英文名、別名、職稱都 truncate，卡片可辨識度下降。刪除占一整列、標籤無上限，造成不同卡高度與視覺重心分散。

建議：列表縮圖維持 80px 或依容器寬度調整；姓名允許兩行、公司至少兩行；英文別名移詳情；最多露出兩個標籤＋「另 N 個」。主動作保留「查看」，次動作改中性色文字「匯出」，編輯／刪除放可鍵盤操作的更多選單，保留既有刪除確認。

```css
.received-card__identity { display: grid; grid-template-columns: 80px minmax(0, 1fr); gap: 16px; }
.received-card__name { font-size: 20px; line-height: 1.4; overflow-wrap: anywhere; }
.received-card__organization { font-size: 14px; line-height: 1.5; }
.received-card__actions { margin-top: auto; }
```

驗收：320／375／768／1024／1440px 均能辨識長姓名；不同標籤數不使主要動作失去一致位置。縮圖目前 `object-cover` 可保留，但點原圖須改 button、有 accessible name。

**U3 — major｜確認表單只用 placeholder、手機欄位過密，新增／編輯體驗不一致。**

證據：`user-portal.html:495–519`、`:673–741`。

```html
<div class="grid grid-cols-5 gap-2">
  <input id="preview-name-prefix" placeholder="稱謂" class="col-span-1 ...">
  <input id="preview-full-name" placeholder="姓名 *" class="col-span-3 ...">
  <input id="preview-name-suffix" placeholder="後綴" class="col-span-1 ...">
</div>
<label class="...">姓名 *</label>
<input type="text" name="name" required ...>
```

問題：辨識結果填入後 placeholder 消失，使用者無法穩定辨識欄位；編輯 label 沒有 `for`／包住 input。五欄姓名在手機過密，英文公司與別名又與核心欄位並列。自有名片表單部分已用 `aria-label`／`label for`，應沿用。

建議：確認與編輯共用 Field 元件；姓名、公司、職稱、電話、Email 優先，稱謂／後綴／別名置於「更多資訊」。手機單欄，≥640px 才兩欄。Email 用 email、電話用 tel；錯誤就地顯示並以 `aria-describedby` 關聯。

```html
<label for="preview-full-name">姓名（必填）</label>
<input id="preview-full-name" name="full_name" required autocomplete="name">
<p id="preview-name-error" hidden></p>
<details><summary>更多姓名與公司資訊</summary>...</details>
```

驗收：填值後標籤仍在、點標籤聚焦、讀屏能辨識欄位；錯誤焦點移至第一個錯誤欄位。不要把 16px 字級政策誤寫成 WCAG 硬性條款。

### Pillar 2: Quality Craft

可保留：已設置 1／2／3 欄 grid、原生進階 `details`、搜尋 label、結果 `aria-live`、圖示與間距的基本層級。需要改善的字級、色彩、圓角與 motion 統一列 X2–X4；modal 列 X1，避免重複計數。

### Pillar 3: Trustworthy

**U4 — major｜讀取失敗被當作空資料，載入更多失敗只有 console。**

證據：`received-cards.js:1482–1542`、`:1603–1606`、`:1614–1630`。

```js
} catch (_error) {
  this.cards = [];
  this.allCards = [];
  this.renderCards([]);
  resultCount.textContent = '0 張名片';
}
// loadMoreCards
console.warn('Failed to load more cards:', _error);
```

本機替身讓 API 失敗後，畫面確實顯示「尚無名片」。初次 loadCards 也沒有列表層的 loading 設定；空白與尚未載入難以區分。

建議：明確分開 loading／empty／error／ready；失敗保留上次成功內容並顯示「更新失敗，重試」。初次失敗不顯示 0；空狀態提供「上傳第一張名片」。載入更多的按鈕顯示忙碌、disabled、可重試。

```js
try {
  setListState('loading');
  const result = await ReceivedCardsAPI.loadCards();
  // 正規化資料後，才取代 cards。
  setListState(cards.length ? 'ready' : 'empty');
} catch {
  setListState('error', '名片暫時無法載入，請重試');
  // 保留既有 cards；首次沒有資料時也不偽裝成 empty。
}
```

驗收：空帳號、HTTP 500、離線、逾時、第二頁失敗各有不同可操作畫面；只有成功回傳空陣列才顯示空狀態。

**U5 — major｜確認儲存失敗會關閉預覽並清掉草稿。**

證據：`received-cards.js:721–748`。

```js
} catch (error) {
  showToast(`儲存失敗：${error.message}`, 'error');
  saveBtn.disabled = false;
  saveBtn.textContent = originalText || '確認儲存';
  this.reset();
} finally {
  saveBtn.removeEventListener('click', handleSave);
}
```

`reset()` 清除 `currentData`／upload ID 並隱藏 preview。使用者剛校正好的資料失去原本重試路徑。

建議：失敗留在 preview，保留所有輸入與 upload ID；加入持續顯示的 `role="alert"`，讓「重試儲存」重用目前表單。事件 handler 改成初始化一次；只在成功或使用者明確取消時 reset。避免只刪 `reset()` 卻仍在 finally 移除 handler，導致重試按鈕失效。

```js
try {
  await saveCurrentPreview();
  resetAfterSuccess();
} catch {
  previewError.textContent = '尚未儲存，請檢查連線後重試。您的修改已保留。';
} finally {
  saveBtn.disabled = false;
  saveBtn.textContent = '儲存名片';
}
```

驗收：儲存 API 失敗一次後，所有編輯仍在；第二次儲存只送出一次、不需重新上傳。

**U6 — major｜AI 最長等待數分鐘，處理中沒有可用取消入口。**

證據：`received-cards.js:339–345`、`:416–420`、`:464–469`、`user-portal.html:339–357`。

```js
timeoutMs: 240000
// uploading/ocr 都只顯示 ai-processing
const btn = document.getElementById('skip-ai-button');
if (btn) btn.classList.remove('hidden');
```

目標 HTML 未包含 `skip-ai-button`；`processCard()` 也未呼叫 `startSkipAITimer()`。已有 abort controller，但處理中畫面只有階段圖示與文字；錯誤畫面的取消不等於進行中的取消。

建議：新增可見「取消辨識」按鈕，直接 abort 當前 operation 後回 idle；以 operation ID 避免晚到回應覆蓋下一次上傳。7–10 秒後顯示「仍在辨識，可取消後重試」；若提供手動輸入，先定義沒有辨識結果時的空表單契約，不直接把 null data 送 preview。進度標示真實階段，不造假百分比。

```js
function cancelExtraction() {
  CardUploadStateMachine.abortController?.abort();
  CardUploadStateMachine.reset();
  document.getElementById('choose-card-image').focus();
}
```

驗收：慢請求時可立即取消、無成功 toast、遲到回應不能重開 modal。上傳、辨識、取消結果使用 `role="status"` 宣布。

**U7 — major｜AI 標示已有，但詳情摘要在非 completed 狀態下缺少持續來源提醒。**

證據：`user-portal.html:522–531` 已標示「AI 生成摘要」，編輯頁也有 AI badge；`received-cards.js:2295–2302`、`:2319–2343`：

```js
if (card.ai_status !== 'completed') return;
text.textContent = '已使用外部資訊補全';
// renderAISummaries 則只要有 summary 就顯示。
```

問題不是「完全沒有 disclaimer」，而是摘要內容存在時未必帶有該 badge；預覽階段未展示來源連結供使用者校對，已保存詳情才會顯示 sources。綠色完成 badge 也容易被理解為資料已驗證。

建議：摘要區常駐「AI 生成，請核對；可能包含辨識或補全錯誤」；將「完成」與「已驗證」視覺分開。預覽就顯示來源與「無外部來源」狀態；若 API 未提供欄位 provenance，不自行捏造信心分數。已修改摘要需能識別「已由使用者編輯」。

```html
<section aria-labelledby="ai-summary-heading">
  <h4 id="ai-summary-heading">AI 摘要</h4>
  <p class="text-sm">可能有辨識或補全錯誤，儲存前請核對。</p>
  <details><summary>查看參考來源</summary>...</details>
</section>
```

驗收：有摘要但無 sources／ai_status 時仍有提醒；資訊來源可在第一次儲存前查看。

**U8 — major｜分享對象含糊，切換期間缺少 pending 狀態。**

證據：`received-cards.js:1709–1741`、`:1885`、`:2016–2055`。

```js
const isShared = e.target.checked;
// 立即更新 UI，接著 await shareCard/unshareCard；沒有 disabled。
```
```html
<span>分享給其他使用者</span>
```

「其他使用者」未說明組織、帳號群組或全站範圍；本次未審後端權限，不推定真正公開對象。連續切換可產生重疊請求，UI 先顯示成功狀態但還沒確認。

建議：由後端契約確認受眾後，寫成具體範圍與欄位，例如「分享給〔實際群組〕，包含電話與 Email」；若範圍廣，第一次開啟先提供確認。pending 時 disabled＋文字「儲存分享設定…」，成功才顯示穩定狀態、失敗回復。可逆設定不必每次彈確認。

```js
toggle.disabled = true;
try {
  await persistSharing(toggle.checked);
} catch {
  toggle.checked = previousValue;
  announce('分享設定未儲存，請重試');
} finally {
  toggle.disabled = false;
}
```

驗收：受眾與可見欄位在切換前清楚；慢網路下無重複提交；重新渲染與 API 回傳一致。

## 3. 首頁

### Pillar 1: Frictionless

**H1 — major｜使用者入口、管理後台、選購指南同權重，主要任務不夠明顯。**

證據：`index.html:148–210`。

```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
  <article class="glass-card rounded-2xl p-8">...使用者入口...btn-primary...</article>
  <article class="glass-card rounded-2xl p-8">...管理後台...btn-primary...</article>
  <article class="glass-card rounded-2xl p-8">...NFC 卡片選購...</article>
</div>
```

建議：hero 用一句使用者收益「分享自己的名片，整理收到的聯絡人」，放唯一 primary「開啟我的名片工作區」，附近明示「僅限已授權 Google 帳號」。管理入口移至次要文字導覽；NFC 選購與 MCP 放進進階指南。保留原網址，不需增加頁面或改登入流程。

```html
<a href="/user-portal.html" class="btn-primary">開啟我的名片工作區</a>
<p class="supporting-copy">使用已授權的 Google 帳號登入</p>
<a href="/admin-dashboard.html" class="text-link">管理員登入</a>
```

驗收：3 秒辨識 primary action；手機先看到用途與入口，再看到晶片規格。不用單靠顏色區分，應靠版面位置與尺寸。

**H2 — major｜NFC 與 QR 是替代入口，卻被標為連續步驟。**

證據：`index.html:239–266`。

```html
<ol ...>
  ...步驟 1：碰觸 NFC 卡片...
  ...步驟 2：掃描 QR Code...
  ...步驟 3：下載 vCard...
</ol>
```

使用者可能以為必須先碰卡、再掃碼。建議改為真實流程「碰 NFC **或**掃 QR → 查看名片 → 下載並在裝置確認加入」。圖片與文案都依此順序，更新相應 i18n 字典，避免之後啟用翻譯還原舊敘述。

```html
<ol>
  <li>碰觸 NFC 或掃描 QR Code</li>
  <li>確認姓名與聯絡資訊</li>
  <li>下載名片，依裝置提示加入通訊錄</li>
</ol>
```

驗收：新使用者能說明兩個入口是替代方式；不再宣稱掃碼本身即已寫入通訊錄。

### Pillar 2: Quality Craft

**H3 — minor｜功能圖卡只有圖片，卻呈現可點擊的游標與 hover。**

證據：`index.html:217–232`。

```html
<div class="glass-card ... group cursor-pointer" role="listitem">
  <img ... class="... h-32 object-cover ... group-hover:scale-110" ...>
</div>
```

補查 `page-init.js` 未見對該圖卡的 click 綁定。圖片 alt 有意義，是可保留的優點；但可見標題缺少、整排固定裁切也可能隱去圖片內容。因未讀圖像，不判定實際裁切了什麼。

建議：純展示就去除 pointer／放大，改 `figure`＋可見 `figcaption`；若有對應段落，改真實 anchor 並提供焦點樣式。按圖片內容選 `object-position`，不能把所有圖視為同構素材。

```html
<figure class="feature-figure">
  <img src="/images/use-case-2.jpg" alt="AI 辨識名片示意" loading="lazy">
  <figcaption>拍照整理收到的名片</figcaption>
</figure>
```

### Pillar 3: Trustworthy

**H4 — major｜絕對安全／合規與效能文案超過頁面能支持的證據。**

證據：`index.html:289`、`:297`、`:453`、`:648–693`。

```html
<span ...>NFC 卡片僅含 UUID，無個資外洩風險</span>
<span ...>GDPR 合規（100% 符合 Article 7, 12, 13, 15, 20, 30）</span>
<span ...>智慧圖片壓縮（80% 上傳時間減少）</span>
<p ...>已通過四項安全驗證（2026-05-24）</p>
```

本項是**信任設計與證據呈現審查**，不是判定系統違法或存在漏洞；本次未驗證法遵、掃描報告或效能基準。已有日期與報告連結值得保留，但歷史掃描不能讓使用者誤以為涵蓋今天的部署。

建議：改寫可核對的功能事實，例如「NFC 卡片儲存名片識別連結，個資由服務存取規則控制」；合規改為具體的同意、撤回、匯出機制與政策連結，經審核才加合規結論。80% 應附測試條件／日期，否則只說「上傳前壓縮圖片」。掃描區改「歷史檢測紀錄」，列檢測版本、日期、範圍及報告。

```html
<p>提供同意紀錄、撤回與資料匯出功能。</p>
<p>安全檢測紀錄：2026-05-24；適用版本與範圍請見報告。</p>
```

驗收：首頁每個數值／絕對承諾都有可追溯依據；搜尋 meta、JSON-LD 與可見內容一起修正文案。

## 4. 跨頁面共同問題

**X1 — major｜modal 缺少完整焦點生命週期，QR 固定尺寸不適合極窄螢幕。**

證據：`main.js` 的 open-qr／close-qr 只切換 hidden；`user-portal.html:484`、`:542`、`:583` 多個 modal 是無 dialog 語意的 div；`received-cards.js:2251–2254`、`:2573–2603` 沒有焦點進入／歸還。

```js
document.getElementById('qr-modal').classList.remove('hidden');
modal.classList.remove('hidden');
```
```html
<div id="qr-modal" class="... p-10" role="dialog" aria-modal="true" ...>
  <div class="bg-white p-8 ...">
    <div id="qrcode-target" class="w-64 h-64 ...">QR CODE</div>
```

名片 QR 已有 role／label／Escape，不能稱完全無 a11y；欠缺的是開啟焦點、Tab 限制及關閉歸還。本機開啟後 Tab 未落在關閉按鈕，active element 無 id。375px 測得內層面板寬 322px，外層左右 padding 80px，已超出可用內寬；320px 需特別驗證裁切，不因 body overflow hidden 就判定 responsive 合格。

建議：抽出共用原生 `<dialog>` wrapper，或補完整 modal controller；初始焦點依用途放標題／取消，關閉還給觸發者，背景 inert。不能只補 `aria-modal`。圖片預覽的關閉按鈕補 accessible name。QR 保留白底與 quiet zone，依容器生成尺寸，不任意裁切。

```css
.qr-panel { width: min(100%, 320px); padding: 24px; }
.qr-code { width: 100%; aspect-ratio: 1; }
.dialog-actions button { min-height: 44px; }
```

原生 dialog 開啟須用 `showModal()`，移除舊 `hidden`／全螢幕 flex 綁定；既有 ESC 與 delete Promise cleanup 必須整合。驗收：所有 modal 的 Tab／Shift+Tab／Escape／還焦點、320px、200% zoom；刪除後觸發按鈕消失則焦點移到下一張或空狀態 CTA。

**X2 — major｜正文過小、淺色字與品牌按鈕前景沒有依角色定義對比。**

證據：`user-portal.html:221`、`:233`、`:859–881` 的 `text-slate-400`，`index.html:282` 等大量 `text-xs` 正文；`tokens.css` 的 muted 與暗色 primary，`components.css` 的 btn-primary。

```css
--color-text-muted: #94a3b8;
--text-base: clamp(0.875rem, 0.82rem + 0.3vw, 1rem);
/* 暗色 */ --color-primary: oklch(0.75 0.10 280);
.btn-primary { background-color: var(--color-primary); color: white; }
```

`#94a3b8` 放白底／近白底不是足夠的正文對比組合；半透明玻璃、opacity、hover、暗色需測最終混色。暗色把 primary 提亮但仍用白字，前景不會自動同步變好。不要依 `WCAG配色` 註解宣稱已達標。

建議：一般操作與正文 16px／1.5，輔助文 14px，12px 只給非必要 metadata；表單 label 14px、正常 tracking。新增 `--color-on-primary` 與 `--color-action-fill`，按鈕色和文字連結色分離；狀態色也分 text／surface，不把亮綠直接當白底小字。

```css
:root {
  --color-action-fill: #54549A;
  --color-on-primary: #FFFFFF;
  --color-text-secondary: #475569;
}
.btn-primary { background: var(--color-action-fill); color: var(--color-on-primary); }
```

驗收：實際 normal／hover／focus／disabled、亮暗底、半透明背景逐一量測；一般文字 ≥4.5:1，大字 ≥3:1。4.5／3 的標準依 [W3C Contrast Minimum](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)。16px 是本案 craft 目標，44px 是本案觸控目標，不把兩者一概宣稱為 WCAG 2.1 AA 的通用硬性數字。

**X3 — major｜CSS 已有 reduced-motion，但 JS 粒子與視差未尊重偏好；畫布底色與暗色模式衝突。**

證據：`base.css` 有全域 reduced-motion；`main.js:918–929`、`:1031–1032`、`:1490` 附近 parallax；首頁實際入口 `page-init.js` 同樣使用淺色場景與持續 rAF。

```js
scene.background = new THREE.Color(0xf8f9fb);
scene.fog = new THREE.Fog(0xf8f9fb, 20, 80);
function animate() { animationId = requestAnimationFrame(animate); ... }
function initDesktopParallax() {
  if (window.innerWidth < 1024) return;
  // 無 prefers-reduced-motion gate
}
```

建議：以 media query gate 決定是否建立 renderer／註冊 mousemove；偏好改變時取消 rAF、清掉旋轉變數。名片展示保留一次短暫 NFC 呼應，其餘維持靜態；後台取消持續粒子，避免工作區分心。canvas 背景透明或隨語意 surface 色更新，fog 同步。

```js
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
if (!motionQuery.matches) startOptionalEffects();
motionQuery.addEventListener('change', () => {
  stopOptionalEffects(); // cancelAnimationFrame、移除事件、歸零 transform
  if (!motionQuery.matches) startOptionalEffects();
});
```

驗收：reduce 模式無粒子更新或滑鼠傾斜；暗色桌面不出現淺灰畫布底；focus／hover 不造成整個表單跳動。

**X4 — minor｜token 已存在，但頁面仍大量繞過，玻璃與圓角缺乏角色分工。**

證據：`user-portal.html:224`、`:276`、`:1075` 與 `received-cards.js:1842`；`components.css:35–41`。

```html
class="... rounded-[2rem] sm:rounded-[3rem] ..."
```
```css
.glass-card:hover, .glass-panel:hover, .glass-surface:hover {
  transform: translateY(-4px);
}
```

問題不是每個 hardcoded px 都必然錯；縮圖比例、1px border 可合理例外。真正問題是表單／靜態段落也套 hover 位移，32–48px 大圓角到處使用，令所有區塊同等醒目。

建議：延伸現有 tokens，輸入 8px、卡片 16px、modal 24px，48px 大圓角退出工作介面；間距用 4／8／12／16／24／32／48／64，32px 內距桌面、16–24px 手機。只有可互動 card 使用 hover elevation，表單不位移。

```css
.panel { border-radius: var(--radius-md); padding: var(--space-300); }
.panel:hover { transform: none; }
.interactive-card:hover { box-shadow: var(--shadow-md); }
```

驗收：三頁相同語意的 button／input／panel 使用相同 tokens；不新增平行的另一套 design system。

**X5 — minor｜文案混用系統語彙與展示術語，字體人格偏重裝飾。**

證據：`user-portal.html:323`、`:827`、`:1070`、`:1127`，`index.html:171`。

```html
AI-First Card Capture
Self-Service Issuance
Real-time Context
Digital Twin Preview
完整 CRUD 操作與安全監控儀表板
```

這些標籤不直接說明使用者下一步；中文頁大量 uppercase、tracking-widest、font-black，資訊密度高卻缺乏輕重對照。

建議：改「拍照辨識名片」、「編輯自己的名片」、「名片預覽」、「管理名片與存取紀錄」。中文 Noto Sans TC body 400／500、標題 700；Outfit 只保留品牌／大標題，mono 只給實際識別碼與版本。載入目前缺少的所需 weight，避免合成粗體；不因追求獨特而改用 serif。

驗收：去掉所有英文 eyebrow 仍能懂流程；每個英文名詞確實是功能名稱或資料，不是裝飾。

### 10 原則對照

| 原則 | 結論／證據 |
|---|---|
| Clarity First | H1、U2：入口與卡片動作需降噪 |
| Visual Hierarchy | U2、C3、X2：姓名優先，必要狀態不可淡化 |
| Consistency | X4：已有 tokens，但半透明、圓角、inline style 尚未收斂 |
| Accessibility | U1 為阻斷；C1、C2、U3、X1、X2 待修 |
| State Completeness | U4、U5、U6、U8：有狀態基礎，失敗／等待行為仍不完整 |
| Responsive | U2、U3、X1：不是缺 breakpoint，而是斷點內容優先序不夠細 |
| Polish | X4、X5：控制字重、間距、hover 與表面材質 |
| Progressive Disclosure | 自有名片進階 details 可保留；H1、U3 應延伸同模式 |
| Recognizable Patterns | C2、H2：Email 動作一致、替代入口不編成連續步驟 |
| Build to Verify | 已做隔離 Chromium 檢查；正式 bundle、真實設備、讀屏仍待驗收 |

### 狀態覆蓋矩陣

| 區域 | Loading | Empty | Error | Success | Disabled／不可用原因 |
|---|---|---|---|---|---|
| 公開名片 | 有，文字可讀性差 | 無效連結有錯誤；出路文案可改善 | 有，部分可重試 | 下載有通知 | 載入前內容隱藏，合理 |
| 名片列表 | 首次列表回饋不足 | 有，缺首次上傳邀請 | 被誤當 empty | 有列表 | 載入更多未呈現 pending |
| 上傳辨識 | 有階段回饋 | 上傳入口 | 有 retry／cancel | 有確認 modal／儲存 toast | 儲存有 disabled，辨識無可用取消 |
| 編輯／分享 | 編輯提交未呈現忙碌；分享立即變色 | 可選欄位能隱藏 | 有 toast | 有 toast | 分享缺 pending 鎖定，見 U8 |
| 首頁 | 版本 fetch 有 fallback | 純內容不強求 empty | 版本回退可保留 | 導航完成 | 無需為靜態內容硬加 disabled |

本矩陣不另增加問題計數；不是所有靜態區塊都需要機械地製作五態。

## 5. 美學方向評估

### 現況與三大預設

| 預設 | 判斷 |
|---|---|
| Warm Cream Editorial | 不符合：冷白／淡藍紫底，無 serif display 與 terracotta 組合 |
| Dark + Single Accent | 暗色模式有近黑＋紫的表面相似，但不是 acid-green／vermilion；支援系統暗色本身不是設計缺陷，不應因此移除 |
| Broadsheet | 不符合：大圓角、玻璃、卡片式 grid，不是報紙欄與零圓角 |

真正需要減法的是「玻璃卡＋粒子網路＋極粗標題＋大量英文小標」的通用科技感。NFC ripple 與實體名片翻面的隱喻來自主題，可以保留一個；漂浮、傾斜、bounce、網格、粒子全部疊加則稀釋焦點。這是基於 CSS／結構的美術評估，未宣稱檢視了所有正式圖片。

### 建議方向：以名片與聯絡人為主角的清晰工作介面

**Color：**沿用 MODA 紫，讓深紫只代表主動作、冷白承載人物與資料，避免靠大面積暗底或螢光色建立個性。以下為候選基礎色，須再驗證所有亮暗色組合；狀態色沿用既有語意家族並調整前景。

| 角色 | 候選色 | 用途 |
|---|---|---|
| Canvas | `#F8FAFD` | 冷白頁底，沿用現有 surface |
| Surface | `#FFFFFF` | 名片、表單、內容 panel |
| Ink | `#20243A` | 姓名與主文 |
| Secondary | `#475569` | 輔助敘述，降低透明度依賴 |
| Action | `#54549A` | 主按鈕、重要選取 |
| Accent surface | `#E9EAF7` | 輕量 NFC／品牌提示面 |

**Type：**Noto Sans TC 是主閱讀字體；Outfit 保留品牌 DB-Card 與少量數字。姓名 32–40px（手機）／40–48px（桌面），h2 24px，卡片姓名20px，body16px，輔助14px。中文行高 1.5–1.6；正文不使用 italic 或超寬 tracking。`font-black` 限制在品牌與少量主標題。

**Layout：**人物資訊先於特效，操作層固定位置，技術與個資設定按需要展開。

```text
公開名片                  後台名片夾                   首頁
[品牌]       [語言]        [我的名片] [收到的名片]       [品牌] [管理員登入]
[頭像  姓名／職稱]         [搜尋────────] [上傳]         分享與整理聯絡人
[可讀的關於我]            [篩選（可展開）]              [開啟我的名片工作區]
[Email／電話／網站]        [縮圖 姓名／公司] × grid      [實際名片示意]
[加入聯絡人] [QR]         [查看] [匯出] [更多]          [三步驟＋功能]
[有效期限／分享說明]       [列表狀態／載入更多]          [安全紀錄／進階指南]
```

**Signature：**只保留公開名片頭像周圍的一次 NFC 圓弧提示，約 400–600ms，不無限循環；reduce 時靜態。後台用同一圓弧作小型品牌符號，不做背景動畫。主題辨識來自「人與交換名片」，而非把每個表面都做成科技展示。

此方向是現有 UI 的收斂，不要求換框架、增加字型套件或重新建立品牌。若仍保留翻面，必須先完成 C1 的語言／可及性一致性。

## 6. 具體修改建議（按優先級）

### P1（blocking）

| ID | 修改單位 | 完成標準 |
|---|---|---|
| U1 | 上傳 button＋原生 checkbox＋可見 focus | 全鍵盤從名片夾完成選檔與分享設定，不依賴滑鼠 |

### P2（major）

依相依性與使用者影響排序，以下涵蓋全部 16 項 major：

| 順序 | ID | 修改內容 | 驗收重點 |
|---|---|---|---|
| 1 | U4、U5 | 分離讀取失敗與空狀態；保留儲存草稿 | 斷網後可重試，不丟編輯、不誤示 0 張 |
| 2 | U6、U8 | AI 取消與分享 pending | 慢回應／連續操作不產生錯誤 UI 狀態 |
| 3 | X1、U3 | 共用 dialog、Field 與焦點策略 | Tab／Escape／還焦點、label、320px、200% zoom |
| 4 | C1、C2 | 單一語言狀態、Email 分離操作 | 顯示與 vCard 一致，手機桌面語意一致 |
| 5 | C3、X2 | 必要資訊 opacity 1、角色色與字級 | 亮暗色文字對比、焦點及小尺寸可讀性 |
| 6 | U2 | 列表姓名空間、動作層級、標籤上限 | 長姓名／多標籤／各斷點不失去辨識度 |
| 7 | U7、H4 | AI 來源／限制與安全承諾證據 | 儲存前可核對；歷史紀錄不冒充當前保證 |
| 8 | H1、H2 | 首頁入口優先序與真實使用流程 | 唯一 primary；NFC 與 QR 明確為替代入口 |
| 9 | X3 | JS motion gate 與 canvas 主題同步 | reduce 無持續特效，暗色底一致 |

### P3（minor / 美學提升）

| ID | 修改內容 | 完成標準 |
|---|---|---|
| C4 | 下載／匯入下一步文案 | 不把開始下載當成已寫入聯絡人，雙語一致 |
| H3 | 圖卡 caption 與可互動樣式一致 | 純圖片不顯示假連結 affordance |
| X4 | 收斂既有 tokens、圓角、陰影與 hover | 靜態 panel 不漂移；卡片／輸入／modal 角色一致 |
| X5 | 精簡裝飾標籤與字重 | 中文操作文案直接、品牌字體克制使用 |

### Build to Verify：已完成與後續驗收

已完成：五個指定檔案完整閱讀；確認實際 Vite entry 與共用樣式來源；隔離 Chromium 的375px上傳 tabIndex、分享 display、API 失敗呈現、背面 inert／ARIA、HUD computed opacity、QR 開啟後 Tab 與面板寬度。測試只證明上述局部行為，不宣稱後端或正式部署已驗證。

修改後必須補做：

1. 320、375、768、1024、1440px，亮／暗色、200% zoom；長中文姓名、長英文公司、無照片、照片失效、10 個標籤、無社群資料。
2. 全頁 Tab／Shift+Tab／Enter／Space／Escape；VoiceOver 驗證一次完整上傳、確認、儲存、查看與刪除取消流程。modal 依 [W3C APG Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) 驗證進入、限制及歸還焦點。
3. 網路 500／429／離線、慢辨識、儲存失敗後重試、第二頁失敗；保留使用者輸入，無假的空狀態或成功。
4. 語言切換後核對顯示、`html.lang`、vCard、通知；實機 Safari／Android 確認加入通訊錄與 QR 掃描。
5. 使用正式建置的 bundle 再走一次主路徑；本次原始碼注入測試不能替代 bundle 整合驗證。

審查交付範圍：提出設計與樣式修改方案；本報告未實作 UI 修正，也未重新執行安全或法遵稽核。
