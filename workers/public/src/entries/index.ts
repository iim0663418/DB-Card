// DB-Card Index Page Entry
// Vite bundles this as the index.html entry point

// CSS — pre-built by build:css script (Tailwind Vite plugin disabled during migration)
import '../../css/tailwind.css'
import '../../css/components.css'

// Icons (tree-shaken Lucide bundle)
import '../../../src/icons.js'

// Page logic
import '../../js/page-init.js'

// Three.js particles — lazy loaded (589KB, decorative only)
const canvas = document.getElementById('three-canvas')
if (canvas) {
  import('../../vendor/three.min.js').then(() => {
    // three.min.js sets window.THREE
    import('../../js/config.js')
  })
}
