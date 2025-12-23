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

    // --- 2. CONSTRUCTION DE LA MAP (VOID) ---
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    
    // Plateforme
    const base = new THREE.Mesh(new THREE.BoxGeometry(30, 1, 50), stoneMat);
    base.position.y = -0.5;
    scene.add(base);

    // Murs Fortifiés
    function createWall(w, x, z, rotY) {
        const wallGroup = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, 3, 0.8), stoneMat);
        body.position.y = 1.5;
        wallGroup.add(body);
        
        for(let i = -w/2 + 0.5; i < w/2; i += 2) {
            const creneau = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.8), stoneMat);
            creneau.position.set(i, 3.4, 0);
            wallGroup.add(creneau);
        }
        wallGroup.position.set(x, 0, z);
        wallGroup.rotation.y = rotY;
        scene.add(wallGroup);
    }
    createWall(30, 0, -25, 0); 
    createWall(50, -15, 0, Math.PI/2);
    createWall(50, 15, 0, Math.PI/2);

    // --- 3. ARC N°3 (COMPOUND BOW) ---
    const bowGroup = new THREE.Group();
    const ironMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.15), ironMat);
    bowGroup.add(handle);

    const limbGeo = new THREE.BoxGeometry(0.05, 0.4, 0.05);
    const topLimb = new THREE.Mesh(limbGeo, ironMat);
    topLimb.position.set(0, 0.4, -0.1); topLimb.rotation.x = -0.5;
    bowGroup.add(topLimb);

    const botLimb = new THREE.Mesh(limbGeo, ironMat);
    botLimb.position.set(0, -0.4, -0.1); botLimb.rotation.x = 0.5;
    bowGroup.add(botLimb);

    const string = new THREE.Mesh(new THREE.BoxGeometry(0.005, 1.2, 0.005), new THREE.MeshBasicMaterial({color: 0xffffff}));
    string.position.z = -0.2;
    bowGroup.add(string);

    bowGroup.position.set(0.5, -0.5, -1);
    camera.add(bowGroup);
    scene.add(camera);

    // --- 4. CONTRÔLES ET PHYSIQUE ---
    let velocityY = 0;
    let canJump = true;
    let joyMove = { x: 0, y: 0 };
    let lookY = 0;

    // Joystick
    const knob = document.getElementById('joy-knob');
    const container = document.getElementById('joy-container');
    
    container.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        const dx = touch.clientX - (rect.left + 50);
        const dy = touch.clientY - (rect.top + 50);
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

    // Rotation Caméra (Zone droite)
    window.addEventListener('touchmove', (e) => {
        if(e.touches[0].clientX > window.innerWidth / 2) {
            lookY -= e.movementX * 0.005 || 0;
            camera.rotation.y = lookY;
        }
    }, { passive: false });

    // Saut
    document.getElementById('jump-btn').addEventListener('touchstart', () => {
        if(canJump) { velocityY = 0.15; canJump = false; }
    });

    camera.position.set(0, 1.7, 15);

    // --- 5. BOUCLE DE RENDU ---
    function animate() {
        requestAnimationFrame(animate);

        // Gravité
        velocityY -= 0.008;
        camera.position.y += velocityY;
        if(camera.position.y < 1.7) {
            camera.position.y = 1.7; velocityY = 0; canJump = true;
        }

        // Mouvement
        const speed = 0.15;
        camera.position.z += (Math.cos(camera.rotation.y) * joyMove.y + Math.sin(camera.rotation.y) * joyMove.x) * speed;
        camera.position.x += (Math.sin(camera.rotation.y) * joyMove.y - Math.cos(camera.rotation.y) * joyMove.x) * speed;

        // Limites du vide
        if(Math.abs(camera.position.x) > 16 || Math.abs(camera.position.z) > 26) {
            if(camera.position.y < -5) camera.position.set(0, 1.7, 15);
        }

        renderer.render(scene, camera);
    }
    animate();
};