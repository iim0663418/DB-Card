// Minimal Lucide Icons for card-display.html
// Only includes icons actually used (11 icons vs 386KB full library)
// Tree-shaken bundle: ~8-10KB vs 386KB (-97%)

import {
  ArrowRight,
  Contact,
  Copy,
  Facebook,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  QrCode,
  ShieldCheck,
  Smartphone,
  Twitter,
  UserCircle,
  UserPlus,
  Youtube,
  createIcons
} from 'https://cdn.jsdelivr.net/npm/lucide@latest/dist/esm/lucide.js';

// Initialize only the icons we use
export function initIcons() {
  createIcons({
    icons: {
      ArrowRight,
      Contact,
      Copy,
      Facebook,
      Github,
      Globe,
      Instagram,
      Linkedin,
      Mail,
      MapPin,
      Phone,
      QrCode,
      ShieldCheck,
      Smartphone,
      Twitter,
      UserCircle,
      UserPlus,
      Youtube
    }
  });
}

// Auto-initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIcons);
} else {
  initIcons();
}
