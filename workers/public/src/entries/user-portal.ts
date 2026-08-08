// User Portal Entry
// Vite bundles this as the user-portal.html entry point

import '../../vendor/purify.min.js'
import '../../vendor/browser-image-compression.min.js'

import '../../js/api-client.js'
import '../../js/error-policy.js'
import '../../js/feature-api.js'
import '../../js/social-link-validation.js'
import '../../js/social-link-integration.js'
import '../../js/search-orchestrator.js'
import '../../js/received-cards.js'
import '../../js/user-portal-init.js'

// Three.js — lazy loaded (decorative particles, 589KB)
const canvas = document.getElementById('three-canvas')
if (canvas) {
  import('../../vendor/three.min.js')
}
