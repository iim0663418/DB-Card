# BDD Spec: Deploy Refined index.html

## Scenario: Apply Design Prototype to Production index.html

### Given
- Design prototype exists at `docs/DB-Card 系統首頁設計雛形.html`
- Production file at `workers/public/index.html` (333 lines)
- Current system uses `/api/health` endpoint (not `/health`)

### When
- Copy design prototype structure to production
- Apply necessary adjustments for production environment

### Then

#### Required Adjustments

1. **API Endpoint Correction**
   ```javascript
   // Change: checkSystemHealth() function
   // From: fetch('/health')
   // To: fetch('/api/health')
   ```

2. **Keep Existing Performance Optimizations**
   - ✅ CDN preconnect (already in prototype)
   - ✅ Three.js defer (already in prototype)
   - ✅ Delayed initialization (already in prototype)

3. **Verify All Links**
   - `/user-portal.html` ✓
   - `/admin-dashboard.html` ✓
   - `https://github.com/iim0663418/DB-Card` ✓
   - `mailto:support@moda.gov.tw` ✓

4. **Production-Ready Adjustments**
   - Remove "Checking..." initial state (use real API call)
   - Ensure error handling for health check
   - Add fallback for Three.js load failure

#### Implementation Steps

1. Replace entire `workers/public/index.html` with prototype content
2. Modify `checkSystemHealth()` function:
   ```javascript
   async function checkSystemHealth() {
       const badge = document.getElementById('health-status-badge');
       const versionEl = document.getElementById('kek-version');
       const progress = document.getElementById('health-progress');
       
       badge.innerText = "Checking...";
       if (progress) progress.style.width = "10%";

       try {
           const res = await fetch('/api/health');
           const data = await res.json();
           
           if (badge) {
               badge.innerText = data.status === 'healthy' ? 'Operational' : 'Degraded';
               badge.className = data.status === 'healthy' 
                   ? 'bg-green-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter'
                   : 'bg-yellow-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter';
           }
           if (versionEl) versionEl.innerText = `v${data.kek?.version || 0}`;
           if (progress) progress.style.width = "100%";
       } catch (err) {
           if (badge) {
               badge.innerText = "Offline";
               badge.className = 'bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter';
           }
           if (progress) progress.style.width = "0%";
       }
   }
   ```

3. Auto-call health check on page load:
   ```javascript
   document.addEventListener('DOMContentLoaded', () => {
       lucide.createIcons();
       updateLanguage();
       checkSystemHealth(); // Auto-call on load
       setTimeout(initThree, 100);
   });
   ```

#### Acceptance Criteria
- [ ] File replaced with new design
- [ ] Health check calls `/api/health` correctly
- [ ] All links functional
- [ ] Language switch works
- [ ] Three.js background renders
- [ ] Responsive on mobile and desktop
- [ ] No console errors
- [ ] Performance optimizations intact
