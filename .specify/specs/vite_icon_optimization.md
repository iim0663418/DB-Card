# BDD Spec: Vite Icon Optimization Implementation

## Feature: ES Module + Vite Tree-Shaking for Icons
**As a** developer  
**I want** to use Vite bundler with tree-shaking  
**So that** only used icons are included in the bundle

---

## Scenario 1: Vite Setup
**Given** the project uses plain JavaScript without bundler  
**When** I set up Vite  
**Then** 
- Vite config is created
- Build scripts are added to package.json
- Development server works
- Production build generates optimized bundles

---

## Scenario 2: Icon Import Migration
**Given** HTML uses `<i data-lucide="icon-name">`  
**When** I migrate to ES Module imports  
**Then**
- Icons are imported from 'lucide'
- Tree-shaking removes unused icons
- Bundle size reduces from 379 KB to ~50 KB
- All icons render correctly

---

## Scenario 3: Build Output
**Given** Vite build completes  
**When** I check the output  
**Then**
- Bundle size is ~50 KB (gzipped ~20 KB)
- Only 64 used icons are included
- Source maps are generated
- Assets are hashed for cache busting

---

## Technical Requirements

### 1. Install Dependencies
```bash
npm install -D vite
npm install lucide
```

### 2. Create vite.config.js
```javascript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'public/dist',
    rollupOptions: {
      input: {
        icons: resolve(__dirname, 'src/icons.js')
      },
      output: {
        entryFileNames: '[name].[hash].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[hash].[ext]'
      }
    },
    minify: 'terser',
    sourcemap: true
  }
});
```

### 3. Create src/icons.js
```javascript
import {
  Check, Copy, X, QrCode, AlertTriangle, Smartphone,
  ShieldCheck, ShieldAlert, Phone, MapPin, Mail, Globe,
  RefreshCw, Image, Fingerprint, ChevronDown, ArrowRight,
  Zap, Youtube, UserPlus, User, Twitter, Shield, Loader2,
  Linkedin, Instagram, Info, Inbox, Github, Facebook,
  Download, CreditCard, Contact, Clock, CheckCircle,
  Briefcase, ZoomOut, ZoomIn, XCircle, UserX, UserCircle,
  UploadCloud, Sparkles, Settings, Search, Save, RotateCw,
  RotateCcw, PlusCircle, Maximize, LogOut, Lock, List,
  Link2, Lightbulb, LayoutDashboard, Home, FileCheck,
  Component, ChevronRight, ChevronLeft, ArrowLeft, ArrowDown,
  AlertCircle
} from 'lucide';

// Icon registry
const icons = {
  'check': Check,
  'copy': Copy,
  'x': X,
  'qr-code': QrCode,
  'alert-triangle': AlertTriangle,
  'smartphone': Smartphone,
  'shield-check': ShieldCheck,
  'shield-alert': ShieldAlert,
  'phone': Phone,
  'map-pin': MapPin,
  'mail': Mail,
  'globe': Globe,
  'refresh-cw': RefreshCw,
  'image': Image,
  'fingerprint': Fingerprint,
  'chevron-down': ChevronDown,
  'arrow-right': ArrowRight,
  'zap': Zap,
  'youtube': Youtube,
  'user-plus': UserPlus,
  'user': User,
  'twitter': Twitter,
  'shield': Shield,
  'loader-2': Loader2,
  'linkedin': Linkedin,
  'instagram': Instagram,
  'info': Info,
  'inbox': Inbox,
  'github': Github,
  'facebook': Facebook,
  'download': Download,
  'credit-card': CreditCard,
  'contact': Contact,
  'clock': Clock,
  'check-circle': CheckCircle,
  'briefcase': Briefcase,
  'zoom-out': ZoomOut,
  'zoom-in': ZoomIn,
  'x-circle': XCircle,
  'user-x': UserX,
  'user-circle': UserCircle,
  'upload-cloud': UploadCloud,
  'sparkles': Sparkles,
  'settings': Settings,
  'search': Search,
  'save': Save,
  'rotate-cw': RotateCw,
  'rotate-ccw': RotateCcw,
  'plus-circle': PlusCircle,
  'maximize': Maximize,
  'log-out': LogOut,
  'lock': Lock,
  'list': List,
  'link-2': Link2,
  'lightbulb': Lightbulb,
  'layout-dashboard': LayoutDashboard,
  'home': Home,
  'file-check': FileCheck,
  'component': Component,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'arrow-left': ArrowLeft,
  'arrow-down': ArrowDown,
  'alert-circle': AlertCircle
};

// Initialize icons
export function initIcons() {
  document.querySelectorAll('[data-lucide]').forEach(element => {
    const iconName = element.getAttribute('data-lucide');
    const IconComponent = icons[iconName];
    
    if (IconComponent) {
      const svg = IconComponent.toSvg({
        class: element.className,
        width: element.getAttribute('width') || 24,
        height: element.getAttribute('height') || 24
      });
      element.outerHTML = svg;
    }
  });
}

// Auto-init on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIcons);
} else {
  initIcons();
}

// Export for manual calls
window.initIcons = initIcons;
```

### 4. Update package.json
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### 5. Update HTML files
```html
<!-- Remove old lucide.min.js -->
<!-- <script src="/vendor/lucide.min.js" ...></script> -->

<!-- Add Vite bundle -->
<script type="module" src="/dist/icons.[hash].js"></script>
```

---

## Acceptance Criteria

- [ ] Vite config created and working
- [ ] All 64 icons imported in src/icons.js
- [ ] Build generates bundle ~50 KB
- [ ] All HTML pages render icons correctly
- [ ] No console errors
- [ ] Performance improved (FCP < 500ms)
- [ ] TypeScript compilation passes

---

## Implementation Steps

### Phase 1: Setup (1-2 hours)
1. Install Vite and lucide
2. Create vite.config.js
3. Create src/icons.js
4. Update package.json scripts

### Phase 2: Migration (2-3 hours)
1. Build with Vite
2. Update HTML to use dist bundle
3. Test all pages
4. Fix any issues

### Phase 3: Optimization (1-2 hours)
1. Add source maps
2. Configure minification
3. Test production build
4. Deploy to staging

### Phase 4: Verification (1 hour)
1. Performance testing
2. Cross-browser testing
3. Lighthouse audit
4. Deploy to production

---

## Testing Strategy

### Unit Tests
```javascript
// Test icon registry
test('all icons are registered', () => {
  expect(Object.keys(icons).length).toBe(64);
});

// Test initIcons function
test('initIcons replaces data-lucide elements', () => {
  document.body.innerHTML = '<i data-lucide="check"></i>';
  initIcons();
  expect(document.querySelector('svg')).toBeTruthy();
});
```

### Integration Tests
- Test all HTML pages load correctly
- Test icons render on all pages
- Test dynamic icon updates

### Performance Tests
- Bundle size < 50 KB
- FCP < 500ms
- LCP < 1000ms
- CLS < 0.1

---

## Rollback Plan

If issues occur:
1. Revert HTML changes
2. Restore lucide.min.js
3. Remove Vite bundle
4. Investigate and fix
5. Re-deploy

---

## Success Metrics

- Bundle size: 379 KB → 50 KB (86.8% reduction)
- FCP: Improved by 50%
- LCP: Improved by 40%
- Lighthouse Score: +10 points
- No functionality regressions
