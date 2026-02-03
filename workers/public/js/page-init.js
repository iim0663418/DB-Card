        // Three.js 背景初始化
        let scene, camera, renderer, mesh, grid;
        let particles = [];
        let mouseX = 0, mouseY = 0;
        
        window.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX / window.innerWidth) - 0.5;
            mouseY = -(e.clientY / window.innerHeight) + 0.5;
        });
        
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

            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });
        }

        // i18n 翻譯
        const i18nTexts = {
            // System Status
            'system-status': {
                'zh': '系統運行中',
                'en': 'System Operational'
            },
            // Hero Section
            'hero-title': {
                'zh': '數位名片系統',
                'en': 'Digital Business Card System'
            },
            'hero-subtitle': {
                'zh': '安全預設 | 隱私優先 | 輕量化設計',
                'en': 'Secure by Default | Privacy First | Lightweight Design'
            },
            'loading': {
                'zh': '載入中...',
                'en': 'Loading...'
            },
            // Portal Cards
            'user-portal-title': {
                'zh': '使用者入口',
                'en': 'User Portal'
            },
            'user-portal-desc': {
                'zh': 'Google OAuth 登入，管理個人數位名片',
                'en': 'Google OAuth login, manage your digital business cards'
            },
            'user-portal-btn': {
                'zh': '前往入口',
                'en': 'Go to Portal'
            },
            'admin-portal-title': {
                'zh': '管理後台',
                'en': 'Admin Dashboard'
            },
            'admin-portal-desc': {
                'zh': '完整 CRUD 操作與安全監控儀表板',
                'en': 'Full CRUD operations and security monitoring dashboard'
            },
            'admin-portal-btn': {
                'zh': '管理系統',
                'en': 'Manage System'
            },
            // NFC Card
            'nfc-card-title': {
                'zh': 'NFC 卡片選購',
                'en': 'NFC Card Selection'
            },
            'nfc-card-desc': {
                'zh': '如何選擇正確規格的 NFC 卡片',
                'en': 'How to choose the right NFC card specification'
            },
            'nfc-recommended-chip': {
                'zh': '✓ 推薦晶片',
                'en': '✓ Recommended Chips'
            },
            'nfc-memory-requirement': {
                'zh': '✓ 記憶體需求',
                'en': '✓ Memory Requirements'
            },
            'nfc-memory-detail': {
                'zh': '最少 144 bytes（NTAG213 即可）',
                'en': 'Minimum 144 bytes (NTAG213 is sufficient)'
            },
            'nfc-purchase-channel': {
                'zh': '✓ 購買管道',
                'en': '✓ Purchase Channels'
            },
            'nfc-purchase-detail': {
                'zh': '電商平台搜尋「NTAG213 白卡」',
                'en': 'Search "NTAG213 blank card" on e-commerce platforms'
            },
            'nfc-write-tool': {
                'zh': '✓ 寫入工具',
                'en': '✓ Writing Tools'
            },
            // Use Cases
            'use-cases-title': {
                'zh': '適用場景',
                'en': 'Use Cases'
            },
            // How to Use
            'how-to-use-title': {
                'zh': '如何使用',
                'en': 'How to Use'
            },
            'step-1-label': {
                'zh': '步驟 1',
                'en': 'Step 1'
            },
            'step-1-title': {
                'zh': '碰觸 NFC 卡片',
                'en': 'Tap NFC Card'
            },
            'step-1-desc': {
                'zh': '手機靠近卡片，自動開啟數位名片',
                'en': 'Bring phone near card, automatically opens digital business card'
            },
            'step-2-label': {
                'zh': '步驟 2',
                'en': 'Step 2'
            },
            'step-2-title': {
                'zh': '掃描 QR Code',
                'en': 'Scan QR Code'
            },
            'step-2-desc': {
                'zh': '快速分享聯絡資訊，無需實體接觸',
                'en': 'Quickly share contact info without physical contact'
            },
            'step-3-label': {
                'zh': '步驟 3',
                'en': 'Step 3'
            },
            'step-3-title': {
                'zh': '下載 vCard',
                'en': 'Download vCard'
            },
            'step-3-desc': {
                'zh': '一鍵加入手機通訊錄',
                'en': 'One-click add to phone contacts'
            },
            // Features
            'features-title': {
                'zh': '核心特色',
                'en': 'Core Features'
            },
            'feature-privacy-title': {
                'zh': '隱私優先設計',
                'en': 'Privacy-First Design'
            },
            'feature-privacy-1': {
                'zh': '資料加密儲存於雲端資料庫',
                'en': 'Data encrypted and stored in cloud database'
            },
            'feature-privacy-2': {
                'zh': 'NFC 卡片僅含 UUID，無個資外洩風險',
                'en': 'NFC card contains only UUID, no personal data leakage risk'
            },
            'feature-privacy-3': {
                'zh': 'IP 地址自動匿名化（審計日誌）',
                'en': 'IP addresses automatically anonymized (audit logs)'
            },
            'feature-encryption-title': {
                'zh': '信封加密技術',
                'en': 'Envelope Encryption'
            },
            'feature-encryption-1': {
                'zh': '每張名片獨立 DEK（Data Encryption Key）',
                'en': 'Each card has independent DEK (Data Encryption Key)'
            },
            'feature-encryption-2': {
                'zh': 'KEK（Key Encryption Key）定期輪換',
                'en': 'KEK (Key Encryption Key) rotated regularly'
            },
            'feature-encryption-3': {
                'zh': '符合安全標準',
                'en': 'Compliant with security standards'
            },
            'feature-session-title': {
                'zh': '授權會話機制',
                'en': 'Authorized Session Mechanism'
            },
            'feature-session-1': {
                'zh': '24 小時 TTL，可隨時撤銷',
                'en': '24-hour TTL, revocable anytime'
            },
            'feature-session-2': {
                'zh': '同時讀取數限制，防止濫用',
                'en': 'Concurrent read limit to prevent abuse'
            },
            'feature-session-3': {
                'zh': 'NFC 重新觸碰即可撤銷上一個會話',
                'en': 'Re-tap NFC to revoke previous session'
            },
            'feature-qr-title': {
                'zh': 'QR 快速捷徑',
                'en': 'QR Quick Shortcut'
            },
            'feature-qr-1': {
                'zh': '加到主畫面，一鍵顯示 QR Code',
                'en': 'Add to home screen, one-tap to show QR Code'
            },
            'feature-qr-2': {
                'zh': '支援多張名片，類型清楚區分',
                'en': 'Support multiple cards, clearly categorized'
            },
            'feature-qr-3': {
                'zh': 'iOS / Android 完美支援',
                'en': 'Perfect support for iOS / Android'
            },
            'feature-design-title': {
                'zh': '現代化設計體驗',
                'en': 'Modern Design Experience'
            },
            'feature-design-1': {
                'zh': 'Glassmorphism 玻璃質感設計',
                'en': 'Glassmorphism design aesthetic'
            },
            'feature-design-2': {
                'zh': 'Three.js 動態粒子背景',
                'en': 'Three.js dynamic particle background'
            },
            'feature-design-3': {
                'zh': '響應式設計，手機桌面完美適配',
                'en': 'Responsive design, perfect for mobile and desktop'
            },
            'feature-revoke-title': {
                'zh': '可隨時撤銷存取',
                'en': 'Revocable Access Anytime'
            },
            'feature-revoke-1': {
                'zh': '使用者自助撤銷（User Portal）',
                'en': 'User self-service revocation (User Portal)'
            },
            'feature-revoke-2': {
                'zh': '管理員緊急撤銷（Admin Dashboard）',
                'en': 'Admin emergency revocation (Admin Dashboard)'
            },
            'feature-revoke-3': {
                'zh': '撤銷後所有會話立即失效',
                'en': 'All sessions invalidated immediately after revocation'
            },
            // Security Scan
            'security-scan-title': {
                'zh': '安全掃描結果',
                'en': 'Security Scan Results'
            },
            'security-scan-intro': {
                'zh': '已通過三項安全掃描工具驗證（2026-02-01）',
                'en': 'Verified by three security scanning tools (2026-02-01)'
            },
            'security-zap-desc': {
                'zh': 'Web 應用程式安全掃描',
                'en': 'Web application security scanning'
            },
            'security-npm-desc': {
                'zh': 'Node.js 依賴安全掃描',
                'en': 'Node.js dependency security scanning'
            },
            'security-osv-desc': {
                'zh': '多語言依賴安全掃描',
                'en': 'Multi-language dependency security scanning'
            },
            'security-improvements': {
                'zh': '最新安全改進 (2026-02-01)',
                'en': 'Latest Security Improvements (2026-02-01)'
            },
            'csp-directives': {
                'zh': '完整 CSP 指令',
                'en': 'Complete CSP Directives'
            },
            'sri-protection': {
                'zh': 'SRI 完整性保護',
                'en': 'SRI Integrity Protection'
            },
            'scan-reports': {
                'zh': '掃描報告',
                'en': 'Scan Reports'
            }
        };

        // 自動偵測瀏覽器語言
        function detectLanguage() {
            const browserLang = navigator.language || navigator.userLanguage;
            return browserLang.startsWith('zh') ? 'zh' : 'en';
        }

        let currentLanguage = detectLanguage();

        function updateLanguage(lang) {
            currentLanguage = lang;
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (i18nTexts[key] && i18nTexts[key][lang]) {
                    el.textContent = i18nTexts[key][lang];
                }
            });
        }

        // 初始化
        document.addEventListener('DOMContentLoaded', () => {
            lucide.createIcons();
            initThree();
            
            // 初始化語言
            const langToggle = document.getElementById('lang-toggle');
            if (langToggle) {
                langToggle.textContent = currentLanguage === 'zh' ? 'EN' : '中';
                updateLanguage(currentLanguage);
                
                // 語言切換
                langToggle.addEventListener('click', () => {
                    const newLang = currentLanguage === 'zh' ? 'en' : 'zh';
                    updateLanguage(newLang);
                    langToggle.textContent = newLang === 'zh' ? 'EN' : '中';
                });
            }
        });
