// DB-Card User Portal — ES Module Entry Point
// Phase 2 POC: modules co-exist with classic user-portal-init.js
// Once full refactoring is complete, classic script will be removed.

import { currentLang, applyTranslations } from './i18n.js'
// particles.js imported but not called here — classic script still handles Three.js init
// This import validates the module works; activation happens when classic code is removed.
import './particles.js'

