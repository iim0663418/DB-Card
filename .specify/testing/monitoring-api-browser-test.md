# 監控 API 測試 - 瀏覽器 Console 方式

## 方法 1: 瀏覽器 Console 測試（最簡單）

### 步驟：
1. 打開 Admin Dashboard: https://db-card-api.csw30454.workers.dev/admin-dashboard.html
2. 使用 SETUP_TOKEN 登入（不要用 Passkey）
3. 打開 DevTools Console (F12)
4. 執行以下測試代碼

---

### 測試 1: 健康檢查

```javascript
// 測試健康檢查 API
fetch('/api/admin/monitoring/health', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => {
  console.log('Health Check:', data);
  console.log('Status:', data.status);
  console.log('Database:', data.checks.database);
  console.log('R2:', data.checks.r2);
  console.log('KV:', data.checks.kv);
});
```

**預期結果**:
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "ok", "latency": 12 },
    "r2": { "status": "ok", "latency": 45 },
    "kv": { "status": "ok", "latency": 3 }
  },
  "alerts": [],
  "timestamp": 1738051200000
}
```

---

### 測試 2: 系統總覽

```javascript
// 測試系統總覽 API
fetch('/api/admin/monitoring/overview', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => {
  console.log('Overview:', data);
  console.log('Upload Stats:', data.upload);
  console.log('Read Stats:', data.read);
  console.log('Rate Limit:', data.rate_limit);
  console.log('Errors:', data.errors);
  console.log('Alerts:', data.alerts);
});
```

**預期結果**:
```json
{
  "upload": {
    "total": 0,
    "success": 0,
    "failed": 0,
    "success_rate": 100
  },
  "read": {
    "total": 0,
    "success": 0,
    "failed": 0,
    "success_rate": 100
  },
  "rate_limit": {
    "upload_triggered": 0,
    "read_triggered": 0,
    "trigger_rate": 0
  },
  "errors": {
    "total": 0,
    "by_type": {}
  },
  "alerts": []
}
```

---

### 測試 3: 觸發一些活動後再查看

```javascript
// 先上傳一張圖片（會觸發指標記錄）
// 在 Admin Dashboard 的「實體孿生」Tab 上傳圖片

// 等待 5 秒後查看指標
setTimeout(() => {
  fetch('/api/admin/monitoring/overview', {
    credentials: 'include'
  })
  .then(r => r.json())
  .then(data => {
    console.log('Updated Overview:', data);
    console.log('Upload Total:', data.upload.total);
    console.log('Upload Success:', data.upload.success);
  });
}, 5000);
```

---

### 測試 4: 完整測試腳本

```javascript
// 完整測試腳本
async function testMonitoringAPI() {
  console.log('=== 監控 API 測試 ===\n');
  
  // 1. 健康檢查
  console.log('1. 測試健康檢查...');
  const health = await fetch('/api/admin/monitoring/health', {
    credentials: 'include'
  }).then(r => r.json());
  console.log('✅ Status:', health.status);
  console.log('✅ DB Latency:', health.checks.database.latency, 'ms');
  console.log('✅ R2 Latency:', health.checks.r2.latency, 'ms');
  console.log('✅ KV Latency:', health.checks.kv.latency, 'ms\n');
  
  // 2. 系統總覽
  console.log('2. 測試系統總覽...');
  const overview = await fetch('/api/admin/monitoring/overview', {
    credentials: 'include'
  }).then(r => r.json());
  console.log('✅ Upload Total:', overview.upload.total);
  console.log('✅ Upload Success Rate:', overview.upload.success_rate, '%');
  console.log('✅ Read Total:', overview.read.total);
  console.log('✅ Read Success Rate:', overview.read.success_rate, '%');
  console.log('✅ Errors Total:', overview.errors.total);
  console.log('✅ Alerts:', overview.alerts.length, 'alerts\n');
  
  // 3. 測試快取
  console.log('3. 測試快取機制...');
  const start1 = performance.now();
  await fetch('/api/admin/monitoring/overview', {
    credentials: 'include'
  });
  const time1 = performance.now() - start1;
  console.log('✅ 第一次請求:', time1.toFixed(2), 'ms');
  
  const start2 = performance.now();
  await fetch('/api/admin/monitoring/overview', {
    credentials: 'include'
  });
  const time2 = performance.now() - start2;
  console.log('✅ 第二次請求 (快取):', time2.toFixed(2), 'ms');
  console.log('✅ 快取加速:', (time1 / time2).toFixed(1), 'x\n');
  
  console.log('=== 測試完成 ===');
  return { health, overview };
}

// 執行測試
testMonitoringAPI();
```

---

## 方法 2: 本地開發環境測試

```bash
# 啟動本地開發環境
cd /Users/shengfanwu/GitHub/DB-Card/workers
npx wrangler dev

# 在另一個終端測試
curl http://localhost:8787/api/admin/monitoring/health \
  -H "Cookie: admin_token=YOUR_TOKEN"
```

---

## 方法 3: Mock 數據測試（前端開發用）

在 Admin Dashboard 加入 Mock 數據：

```javascript
// 在 Console 執行
const mockOverview = {
  upload: {
    total: 150,
    success: 145,
    failed: 5,
    success_rate: 96.67
  },
  read: {
    total: 3420,
    success: 3398,
    failed: 22,
    success_rate: 99.36
  },
  rate_limit: {
    upload_triggered: 3,
    read_triggered: 12,
    trigger_rate: 0.44
  },
  errors: {
    total: 27,
    by_type: {
      file_too_large: 5,
      invalid_format: 3,
      unauthorized: 15,
      not_found: 4
    }
  },
  alerts: [
    {
      level: 'warning',
      message: 'Upload success rate below target: 96.67%',
      metric: 'upload_success_rate',
      value: 96.67,
      threshold: 95,
      timestamp: new Date().toISOString()
    }
  ]
};

console.log('Mock Overview:', mockOverview);
```

---

## 驗收檢查清單

在 Console 執行測試後，檢查：

### 基本功能
- [ ] health API 返回 status: "healthy"
- [ ] overview API 返回完整數據結構
- [ ] 所有 checks.status = "ok"
- [ ] latency < 100ms

### 數據結構
- [ ] upload 包含 total, success, failed, success_rate
- [ ] read 包含 total, success, failed, success_rate
- [ ] rate_limit 包含 upload_triggered, read_triggered, trigger_rate
- [ ] errors 包含 total, by_type

### 快取機制
- [ ] 第二次請求明顯更快
- [ ] 快取加速 > 2x

---

## 快速驗證命令

```javascript
// 一鍵驗證
Promise.all([
  fetch('/api/admin/monitoring/health', {credentials: 'include'}).then(r => r.json()),
  fetch('/api/admin/monitoring/overview', {credentials: 'include'}).then(r => r.json())
]).then(([health, overview]) => {
  console.log('✅ Health:', health.status);
  console.log('✅ Overview:', overview.upload.total, 'uploads');
  console.log('✅ API 正常運作！');
});
```

---

**推薦方式**: 方法 1（瀏覽器 Console）  
**最快驗證**: 執行「一鍵驗證命令」  
**完整測試**: 執行「完整測試腳本」
