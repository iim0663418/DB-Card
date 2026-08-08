// DB-Card Particles Module (Three.js)
// Auto-extracted from user-portal-init.js
/* global THREE */

let scene, camera, renderer, points, grid;
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
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fb);
    scene.fog = new THREE.Fog(0xf8f9fb, 20, 80);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 50);
    
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
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
    
    function animate() { 
        requestAnimationFrame(animate);
        
        const positions = mesh.geometry.attributes.position.array;
        const linePositions = lines.geometry.attributes.position.array;
        let lineIndex = 0;
        const maxDistance = 15;
        
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
            
            for (let j = i + 1; j < particleCount; j++) {
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
        lines.geometry.attributes.position.needsUpdate = true;
        lines.geometry.setDrawRange(0, lineIndex / 3);
        
        renderer.render(scene, camera); 
    }
    animate();
}

document.addEventListener('DOMContentLoaded', async () => {
    // Apply i18n translations on page load
    applyTranslations(currentLang);

    if (window.initIcons) window.initIcons();

    if (typeof THREE !== 'undefined') {
        setTimeout(() => initThree(), 100);
    } else {
        window.addEventListener('load', () => {
            if (typeof THREE !== 'undefined') initThree();
        });
    }

    document.getElementById('edit-form').onsubmit = handleFormSubmit;

    // Check if just completed OAuth redirect
    const urlParams = new URLSearchParams(window.location.search);
    const loginStatus = urlParams.get('login');

    if (loginStatus === 'success') {
        // Clear URL parameters
        window.history.replaceState({}, '', '/user-portal.html');

        // Get session ID from URL
        const sessionId = urlParams.get('session');

        if (sessionId) {
            try {
                // Show loading
                document.getElementById('global-loading').classList.remove('hidden');

                // Retrieve user info from backend (one-time use)
                const response = await fetch(`/api/user/oauth-user-info?session=${sessionId}`, {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    const { email, name, picture, csrfToken } = data.data;

                    // Store CSRF token
                    if (csrfToken) {
                        sessionStorage.removeItem('csrfToken'); // 先清除
                        sessionStorage.setItem('csrfToken', csrfToken); // 再設定
                        // CSRF token updated silently
                    }

                    // Store user info
                    const user = { email, name, picture };
                    sessionStorage.setItem('auth_user', JSON.stringify(user));

                    // Set login state
                    state.isLoggedIn = true;
                    state.currentUser = user;
                    window.__sessionExpired = false;

                    // Update user display
                    updateUserDisplay(email, name, picture);

                    // Validate session first
                    const { valid: sessionValid, consentOk } = await validateSessionAndConsent();
                    if (!sessionValid) {
                        // Session invalid - cleanup already done by apiCall
                        document.getElementById('global-loading').classList.add('hidden');
                        return;
                    }

                    // Session valid - check consent status (blocking if needed)
                    if (!consentOk) {
                        // User needs to consent first - modal will be shown
                        document.getElementById('global-loading').classList.add('hidden');
                        return;
                    }

                    // Initialize user state
                    await fetchUserCards();

                    // Show success and switch to selection view
                    showToast('登入成功');
                    showView('selection');
                } else {
                    throw new Error('Failed to retrieve user info');
                }
            } catch (error) {
                console.error('OAuth redirect error:', error);
                showToast('登入失敗，請重試');
                showView('login');
            } finally {
                document.getElementById('global-loading').classList.add('hidden');
            }
            return;
        }
    } else if (loginStatus === 'error') {
        // Clear URL parameters
        window.history.replaceState({}, '', '/user-portal.html');

        // Handle OAuth error
        const error = urlParams.get('error');
        const errorBox = document.getElementById('login-error-box');

        if (error === 'unauthorized_domain') {
            errorBox.innerText = i18n[currentLang]['error-unauthorized'] || '登入失敗：您的 Email 尚未授權';
        } else {
            errorBox.innerText = i18n[currentLang]['error-login-failed'] || '登入失敗，請重試';
        }

        errorBox.classList.remove('hidden');
        showView('login');
        return;
    }

    // 檢查是否有存儲的使用者資訊（token 在 HttpOnly cookie 中）
    const userJson = sessionStorage.getItem('auth_user');

    if (userJson) {
        try {
            const user = JSON.parse(userJson);

            // 恢復登入狀態
            state.isLoggedIn = true;
            state.authToken = null; // No longer needed
            state.currentUser = user;

            // BDD Scenario 5-6: 顯示個人化歡迎訊息
            updateUserDisplay(user.email, user.name, user.picture);

            // 顯示載入中
            document.getElementById('global-loading').classList.remove('hidden');

            // 驗證 session 並載入名片資料
            try {
                // Validate session first
                const { valid: sessionValid, consentOk } = await validateSessionAndConsent();
                if (!sessionValid) {
                    // Session invalid - cleanup already done by apiCall
                    document.getElementById('global-loading').classList.add('hidden');
                    return;
                }

                // Session valid - check consent status
                if (!consentOk) {
                    // User needs to consent - modal will be shown
                    document.getElementById('global-loading').classList.add('hidden');
                    return;
                }

                await fetchUserCards();
                // 只有成功載入才切換視圖和顯示 toast
                if (state.isLoggedIn) {
                    window.__sessionExpired = false;
                    showToast('自動登入成功');
                    showView('selection');
                }
            } catch (err) {
                console.error('Failed to load cards:', err);
                // Session expired - silent logout
                sessionStorage.removeItem('auth_user');
                state.isLoggedIn = false;
                state.currentUser = null;
                showView('login');
            } finally {
                // 隱藏載入中
                document.getElementById('global-loading').classList.add('hidden');
            }
        } catch (err) {
            // 解析失敗，清除並顯示登入頁
            console.error('Auto-login failed:', err);
            sessionStorage.removeItem('auth_user');
            showView('login');
        }
    } else {
        // 沒有使用者資訊，顯示登入頁
        showView('login');
    }

    // 綁定預覽聯動
    document.querySelectorAll('input, textarea, select').forEach(el => el.addEventListener('input', updatePreview));
    document.querySelectorAll('input, textarea, select').forEach(el => el.addEventListener('change', updatePreview));

    // 預覽語言切換
    document.querySelectorAll('#preview-lang-switch button').forEach(btn => {
        btn.onclick = () => {
            previewLang = btn.dataset.lang;
            document.querySelectorAll('#preview-lang-switch button').forEach(b => {
                b.classList.remove('bg-white', 'shadow-sm', 'text-slate-900');
                b.classList.add('text-slate-500');
            });
            btn.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
            btn.classList.remove('text-slate-500');
            updatePreview();
        };
    });

    // 初始化語言切換按鈕狀態（根據自動偵測的語言）
    document.querySelectorAll('#preview-lang-switch button').forEach(btn => {
        if (btn.dataset.lang === previewLang) {
            btn.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
            btn.classList.remove('text-slate-500');
        } else {
            btn.classList.remove('bg-white', 'shadow-sm', 'text-slate-900');
            btn.classList.add('text-slate-500');
        }
    });

    // 地址預設選擇監聽
    document.getElementById('address-preset').addEventListener('change', (e) => {
        const value = e.target.value;
        const customFields = document.getElementById('custom-address-fields');

        if (value === 'custom') {
            customFields.classList.remove('hidden');
        } else if (value && ADDRESS_PRESETS[value]) {
            customFields.classList.add('hidden');
            document.getElementById('address_zh').value = ADDRESS_PRESETS[value].zh;
            document.getElementById('address_en').value = ADDRESS_PRESETS[value].en;
        } else {
            customFields.classList.add('hidden');
            document.getElementById('address_zh').value = '';
            document.getElementById('address_en').value = '';
        }
        updatePreview();
    });

    // 部門預設選擇監聽
    document.getElementById('department-preset').addEventListener('change', (e) => {
        const value = e.target.value;
        const customField = document.getElementById('custom-department-field');

        if (value === 'custom') {
            customField.classList.remove('hidden');
            document.getElementById('department-custom-zh').focus();
        } else {
            customField.classList.add('hidden');
            document.getElementById('department-custom-zh').value = '';
            document.getElementById('department-custom-en').value = '';
        }
        updatePreview();
    });

    // Modal 背景點擊關閉
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop')) {
            closeSuccessModal();
        }
    });
});

window.onresize = () => {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
};

export { initThree };
