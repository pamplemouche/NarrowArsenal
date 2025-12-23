window.onload = function() {
    console.log("Démarrage du test...");

    if (typeof THREE === 'undefined') {
        console.error("ERREUR : Three.js n'est pas chargé !");
        document.body.innerHTML = "<h1 style='color:white;text-align:center;'>Three.js est bloqué sur cet appareil.</h1>";
        return;
    }

    // 1. SCÈNE
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Ciel bleu

    // 2. CAMÉRA
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // 3. RENDU
    var renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("glCanvas"), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 4. OBJET (Cube rouge qui tourne)
    var geometry = new THREE.BoxGeometry(2, 2, 2);
    var material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    var cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    console.log("Scène prête !");

    // 5. ANIMATION
    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }

    animate();
};