// DB-Card User Portal — ES Module Entry Point
// Phase 2: particles module activated; i18n remains in classic script (35 consumers)

import { initParticles } from './particles.js'

// Initialize particles when THREE.js is available
// Module scripts are deferred — THREE.js (also deferred) executes in document order before this
if (typeof THREE !== 'undefined') {
    setTimeout(() => initParticles(), 100)
} else {
    window.addEventListener('load', () => {
        if (typeof THREE !== 'undefined') initParticles()
    })
}
