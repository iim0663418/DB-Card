        // Three.js 背景初始化
        let scene, camera, renderer, mesh, grid;
        function initThree() {
            const canvas = document.getElementById('three-canvas');
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 0, 10);
            renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            // 網格效果
            const gridGeo = new THREE.PlaneGeometry(150, 150, 45, 45);
            const gridMat = new THREE.MeshBasicMaterial({
                color: 0x6868ac,
                wireframe: true,
                transparent: true,
                opacity: 0.08
            });
            grid = new THREE.Mesh(gridGeo, gridMat);
            grid.rotation.x = -Math.PI / 2.2;
            grid.position.y = -6;
            scene.add(grid);
            
            // 星空效果
            const starGeo = new THREE.BufferGeometry();
            const pos = new Float32Array(2000 * 3);
            for(let i=0; i<2000*3; i++) pos[i] = (Math.random() - 0.5) * 50;
            starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            mesh = new THREE.Points(starGeo, new THREE.PointsMaterial({ 
                size: 0.05, 
                color: 0x6868ac, 
                transparent: true, 
                opacity: 0.3 
            }));
            scene.add(mesh);
            
            function animate() { 
                requestAnimationFrame(animate); 
                if(mesh) mesh.rotation.y += 0.0002;
                if(grid) grid.rotation.z += 0.0001;
                renderer.render(scene, camera); 
            }
            animate();

            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });
        }

        // 初始化
        document.addEventListener('DOMContentLoaded', () => {
            lucide.createIcons();
            initThree();
        });
