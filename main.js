window.onload = function() {
    // --- 1. CONFIGURATION SCÈNE ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a12);
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("glCanvas"), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Lumières
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(10, 20, 10);
    scene.add(sun);

    // --- 2. MAP VOID COMPLÈTE ---
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    
    // Sol
    const base = new THREE.Mesh(new THREE.BoxGeometry(40, 1, 60), stoneMat);
    base.position.y = -0.5;
    scene.add(base);

    // Murs & Tours
    function createWall(w, x, z, rotY) {
        const wallGroup = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, 3, 1), stoneMat);
        body.position.y = 1.5;
        wallGroup.add(body);
        for(let i = -w/2 + 0.5; i < w/2; i += 2) {
            const block = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), stoneMat);
            block.position.set(i, 3.4, 0);
            wallGroup.add(block);
        }
        wallGroup.position.set(x, 0, z);
        wallGroup.rotation.y = rotY;
        scene.add(wallGroup);
    }
    createWall(40, 0, -30, 0); 
    createWall(60, -20, 0, Math.PI/2);
    createWall(60, 20, 0, Math.PI/2);

    // --- 3. ARC N°3 (COMPOUND) ---
    const bowGroup = new THREE.Group();
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), darkMat);
    bowGroup.add(handle);

    const limbGeo = new THREE.BoxGeometry(0.05, 0.4, 0.05);
    const topLimb = new THREE.Mesh(limbGeo, darkMat);
    topLimb.position.set(0, 0.4, -0.1); topLimb.rotation.x = -0.5;
    bowGroup.add(topLimb);

    const botLimb = new THREE.Mesh(limbGeo, darkMat);
    botLimb.position.set(0, -0.4, -0.1); botLimb.rotation.x = 0.5;
    bowGroup.add(botLimb);

    bowGroup.position.set(0.5, -0.5, -1);
    camera.add(bowGroup);
    scene.add(camera);

    // --- 4. PHYSIQUE & CONTRÔLES ---
    let velY = 0;
    let canJump = true;
    let joyMove = { x: 0, y: 0 };
    let lookY = 0;

    // Joystick
    const knob = document.getElementById('joy-knob');
    const container = document.getElementById('joy-container');
    
    container.addEventListener('touchmove', (e) => {
        const t = e.touches[0];
        const r = container.getBoundingClientRect();
        const dx = t.clientX - (r.left + 50);
        const dy = t.clientY - (r.top + 50);
        const dist = Math.min(Math.sqrt(dx*dx + dy*dy), 40);
        const angle = Math.atan2(dy, dx);
        knob.style.transform = `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px)`;
        joyMove.x = Math.cos(angle) * (dist/40);
        joyMove.y = Math.sin(angle) * (dist/40);
    });

    container.addEventListener('touchend', () => {
        knob.style.transform = `translate(0,0)`;
        joyMove = { x: 0, y: 0 };
    });

    // Rotation et Verrouillage Paysage
    window.addEventListener('touchmove', (e) => {
        if(e.touches[0].clientX > window.innerWidth / 2) {
            lookY -= (e.movementX || 0) * 0.005;
            camera.rotation.y = lookY;
        }
    }, { passive: false });

    document.getElementById('jump-btn').addEventListener('touchstart', () => {
        if(canJump) { velY = 0.15; canJump = false; }
        // Tentative de verrouillage paysage au premier clic
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{});
    });

    // Redimensionnement
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    camera.position.set(0, 1.7, 20);

    // --- 5. BOUCLE ANIMATION ---
    function animate() {
        requestAnimationFrame(animate);

        velY -= 0.008; // Gravité
        camera.position.y += velY;
        if(camera.position.y < 1.7) { camera.position.y = 1.7; velY = 0; canJump = true; }

        const speed = 0.15;
        camera.position.z += (Math.cos(camera.rotation.y) * joyMove.y + Math.sin(camera.rotation.y) * joyMove.x) * speed;
        camera.position.x += (Math.sin(camera.rotation.y) * joyMove.y - Math.cos(camera.rotation.y) * joyMove.x) * speed;

        // Chute
        if(Math.abs(camera.position.x) > 21 || Math.abs(camera.position.z) > 31) {
            if(camera.position.y < -5) camera.position.set(0, 1.7, 20);
        }

        renderer.render(scene, camera);
    }
    animate();
};