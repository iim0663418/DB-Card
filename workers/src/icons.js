// Vite Icon Bundle - Tree-shaken Lucide Icons
// Only includes 64 icons actually used in the project

import { createElement } from 'lucide/dist/esm/lucide/src/lucide.js';
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
  AlertCircle, Megaphone
} from 'lucide/dist/esm/lucide/src/lucide.js';

// Icon registry (kebab-case → PascalCase mapping)
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
  'alert-circle': AlertCircle,
  'megaphone': Megaphone
};

// Initialize icons - replaces [data-lucide] elements with SVG
export function initIcons() {
  document.querySelectorAll('[data-lucide]').forEach(element => {
    const iconName = element.getAttribute('data-lucide');
    const iconData = icons[iconName];
    
    if (iconData) {
      // Create SVG element using Lucide's createElement
      const svg = createElement(iconData, {
        width: element.getAttribute('width') || '24',
        height: element.getAttribute('height') || '24',
        'stroke-width': element.getAttribute('stroke-width') || '2',
        class: element.className
      });
      
      element.replaceWith(svg);
    } else {
      console.warn(`[Icons] Icon not found: ${iconName}`);
    }
  });
}

// Auto-init on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIcons);
} else {
  initIcons();
}

// Export for manual calls (e.g., dynamic content)
window.initIcons = initIcons;
