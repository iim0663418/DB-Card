// DB-Card Particles Module (Three.js)
// Extracted from user-portal-init.js — self-contained particle network animation
/* global THREE */

let scene, camera, renderer, mesh, grid;
let animationId = null;
let started = false;
const particles = [];
let mouseX = 0, mouseY = 0;

function createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
}

function initThree() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fb);
    scene.fog = new THREE.Fog(0xf8f9fb, 20, 80);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 50);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Resize handler
    window.addEventListener('resize', () => {
        if (camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    });

    // Mouse tracking
    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) - 0.5;
        mouseY = -(e.clientY / window.innerHeight) + 0.5;
    });

    // Ground Grid
    const gridGeo = new THREE.PlaneGeometry(200, 200, 40, 40);
    const gridMat = new THREE.MeshBasicMaterial({
        color: 0x6868ac,
        wireframe: true,
        transparent: true,
        opacity: 0.1
    });
    grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -15;
    scene.add(grid);

    // Particle Network
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * 100;
        const y = Math.random() * 40 - 10;
        const z = (Math.random() - 0.5) * 80 - 20;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        particles.push({
            x, y, z,
            vx: (Math.random() - 0.5) * 0.01,
            vy: (Math.random() - 0.5) * 0.01,
            vz: (Math.random() - 0.5) * 0.005
        });
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    mesh = new THREE.Points(particleGeo, new THREE.PointsMaterial({
        size: 0.5,
        color: 0x6868ac,
        transparent: true,
        opacity: 0.4,
        map: createCircleTexture(),
        alphaTest: 0.01,
        sizeAttenuation: true
    }));
    scene.add(mesh);

    // Connection lines
    const lineMat = new THREE.LineBasicMaterial({
        color: 0x6868ac,
        transparent: true,
        opacity: 0.25
    });
    const lineGeo = new THREE.BufferGeometry();
    const maxConnections = particleCount * 5;
    const linePositions = new Float32Array(maxConnections * 6);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeo.setDrawRange(0, 0);
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    let frameCount = 0;
    let lineIndex = 0;

    function animate() {
        animationId = requestAnimationFrame(animate);
        frameCount++;
        const updateLines = frameCount % 2 === 0;

        const positions = mesh.geometry.attributes.position.array;
        const linePositions = lines.geometry.attributes.position.array;
        const maxDistance = 15;
        if (updateLines) lineIndex = 0;

        for (let i = 0; i < particleCount; i++) {
            const particle = particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.z += particle.vz;

            if (Math.abs(particle.x) > 50) particle.vx *= -1;
            if (particle.y > 30 || particle.y < -10) particle.vy *= -1;
            if (particle.z > 20 || particle.z < -60) particle.vz *= -1;

            if (mouseX !== 0 || mouseY !== 0) {
                const dx = mouseX * 50 - particle.x;
                const dy = mouseY * 30 - particle.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 20) {
                    particle.vx += dx * 0.0001;
                    particle.vy += dy * 0.0001;
                }
            }

            positions[i * 3] = particle.x;
            positions[i * 3 + 1] = particle.y;
            positions[i * 3 + 2] = particle.z;

            for (let j = i + 1; updateLines && j < particleCount; j++) {
                const other = particles[j];
                const dx = particle.x - other.x;
                const dy = particle.y - other.y;
                const dz = particle.z - other.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (distance < maxDistance && lineIndex < maxConnections * 6) {
                    linePositions[lineIndex++] = particle.x;
                    linePositions[lineIndex++] = particle.y;
                    linePositions[lineIndex++] = particle.z;
                    linePositions[lineIndex++] = other.x;
                    linePositions[lineIndex++] = other.y;
                    linePositions[lineIndex++] = other.z;
                }
            }
        }

        mesh.geometry.attributes.position.needsUpdate = true;
        if (updateLines) {
            lines.geometry.attributes.position.needsUpdate = true;
            lines.geometry.setDrawRange(0, lineIndex / 3);
        }

        renderer.render(scene, camera);
    }
    animate();

    // Pause when tab hidden, resume when visible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (animationId !== null) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        } else if (animationId === null) {
            animate();
        }
    });
}

function loadThree() {
    return new Promise((resolve) => {
        if (typeof THREE !== 'undefined') return resolve(true);
        try {
            const s = document.createElement('script');
            s.src = '/vendor/three.min.js';
            s.integrity = 'sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu';
            s.crossOrigin = 'anonymous';
            s.onload = () => resolve(typeof THREE !== 'undefined');
            s.onerror = () => resolve(false);
            document.head.appendChild(s);
        } catch {
            resolve(false);
        }
    });
}

/**
 * Initialize the particle system.
 * Only runs on desktop (>=1024px) without prefers-reduced-motion.
 * Loads THREE.js on demand if not already present; failures are silent.
 */
export async function initParticles() {
    if (started) return;
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isDesktop || prefersReduced) return;
    started = true;
    try {
        if (!(await loadThree())) return;
        initThree();
    } catch {
        // Decorative only; never affect the page
    }
}

export { initParticles as default };
