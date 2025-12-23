window.onload = function() {
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e); // Bleu nuit profond (Void)
    
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    var renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("glCanvas"), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Lumières pour le relief des pierres
    var ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    var sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 10, 7);
    scene.add(sun);

    // --- MATÉRIAUX ---
    var stoneMat = new THREE.MeshLambertMaterial({ color: 0x666666 }); // Gris pierre
    var darkMat = new THREE.MeshLambertMaterial({ color: 0x444444 });  // Gris foncé

    // --- FONCTIONS DE CONSTRUCTION ---
    function createBox(w, h, d, x, y, z, mat) {
        var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, y + h/2, z);
        scene.add(mesh);
        return mesh;
    }

    // 1. PLATEFORME PRINCIPALE
    createBox(30, 1, 40, 0, -1, 0, stoneMat);

    // 2. MURS EXTÉRIEURS AVEC CRÉNEAUX
    function createFortifiedWall(w, x, z, rotY) {
        var wallGroup = new THREE.Group();
        // Le mur de base
        var base = new THREE.Mesh(new THREE.BoxGeometry(w, 4, 1), stoneMat);
        base.position.y = 2;
        wallGroup.add(base);

        // Les créneaux (petits blocs sur le mur)
        for (var i = -w/2 + 0.5; i < w/2; i += 2) {
            var block = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), stoneMat);
            block.position.set(i, 4.5, 0);
            wallGroup.add(block);
        }
        
        wallGroup.position.set(x, 0, z);
        wallGroup.rotation.y = rotY;
        scene.add(wallGroup);
    }

    // On place les murs
    createFortifiedWall(30, 0, -20, 0);          // Fond
    createFortifiedWall(40, -15, 0, Math.PI/2);  // Gauche
    createFortifiedWall(40, 15, 0, Math.PI/2);   // Droite

    // 3. TOURS D'ANGLE
    function createTower(x, z) {
        createBox(5, 10, 5, x, 0, z, darkMat); // Corps
        createBox(6, 1, 6, x, 10, z, stoneMat); // Sommet large
    }
    createTower(-15, -20);
    createTower(15, -20);

    // 4. OBSTACLES AU CENTRE
    createBox(4, 6, 4, -5, 0, -5, darkMat);
    createBox(4, 2, 8, 7, 0, -15, stoneMat);

    // --- SETUP JOUEUR ---
    camera.position.set(0, 1.7, 15);
    var moveForward = 0, lookY = 0;

    // --- CONTRÔLES ---
    window.addEventListener('touchstart', (e) => {
        if (e.touches[0].clientX < window.innerWidth / 2) moveForward = 0.2;
    });
    window.addEventListener('touchmove', (e) => {
        if (e.touches[0].clientX > window.innerWidth / 2) {
            lookY -= 0.02;
            camera.rotation.y = lookY;
        }
        e.preventDefault();
    }, { passive: false });
    window.addEventListener('touchend', () => moveForward = 0);

    // --- BOUCLE DE RENDU ---
    function animate() {
        requestAnimationFrame(animate);
        
        if (moveForward > 0) {
            camera.position.z -= Math.cos(camera.rotation.y) * moveForward;
            camera.position.x -= Math.sin(camera.rotation.y) * moveForward;
            
            // Chute dans le vide
            if (Math.abs(camera.position.x) > 17 || Math.abs(camera.position.z) > 22) {
                camera.position.y -= 0.5;
                if (camera.position.y < -15) camera.position.set(0, 1.7, 15);
            }
        }
        renderer.render(scene, camera);
    }
    animate();
};