// On vérifie si le lien a bien fonctionné
var statusDiv = document.getElementById("status");

if (typeof THREE !== 'undefined') {
    statusDiv.innerHTML = "Three.js chargé ! Démarrage...";
    setTimeout(function() { statusDiv.style.display = 'none'; }, 2000);
    init();
} else {
    statusDiv.innerHTML = "ERREUR : Le lien Framsticks est bloqué ou inaccessible.";
    statusDiv.style.color = "red";
}

function init() {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    var renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("glCanvas"), antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87ceeb, 1); // Ciel bleu

    // Lumière
    var ambient = new THREE.AmbientLight(0x404040);
    scene.add(ambient);
    var sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(10, 20, 10);
    scene.add(sun);

    // Sol
    var floor = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshLambertMaterial({ color: 0x2e7d32 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Cube Cible
    var target = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshLambertMaterial({ color: 0xff0000 })
    );
    target.position.set(0, 1, -10);
    scene.add(target);

    // Caméra
    camera.position.set(0, 1.7, 5);

    function animate() {
        requestAnimationFrame(animate);
        target.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();
}