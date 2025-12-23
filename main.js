// On vérifie si Three.js est chargé
if (typeof THREE === 'undefined') {
    alert("Le fichier Three.min.js n'est pas détecté. Vérifie le nom du fichier !");
}

// --- INITIALISATION ---
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
var renderer = new THREE.WebGLRenderer({ 
    canvas: document.getElementById("glCanvas"),
    antialias: true 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x87ceeb, 1); // Ciel bleu

// --- LUMIÈRES ---
var light = new THREE.DirectionalLight(0xffffff, 1.2);
light.position.set(1, 1, 1).normalize();
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

// --- MONDE ---
// Sol vert
var floorGeo = new THREE.PlaneGeometry(500, 500);
var floorMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
var floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Cube rouge (Cible)
var targetGeo = new THREE.BoxGeometry(2, 4, 2);
var targetMat = new THREE.MeshLambertMaterial({ color: 0xb71c1c });
var target = new THREE.Mesh(targetGeo, targetMat);
target.position.set(0, 2, -15);
scene.add(target);

// --- L'ARC (Objet attaché à la caméra) ---
var bow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8),
    new THREE.MeshLambertMaterial({ color: 0x5d4037 })
);
// Positionnement type FPS
bow.position.set(0.4, -0.4, -0.8);
bow.rotation.x = Math.PI / 4;
bow.rotation.z = Math.PI / 4;

camera.add(bow);
scene.add(camera); // Obligatoire pour voir les objets attachés à la caméra

// --- CONTRÔLES ---
camera.position.y = 1.7;
var lookY = 0;
var moveForward = 0;

// Tactile iPad
window.addEventListener('touchstart', function(e) {
    var t = e.touches[0];
    if (t.clientX < window.innerWidth / 2) {
        moveForward = 0.15; // Avancer si on touche à gauche
    }
});

window.addEventListener('touchmove', function(e) {
    var t = e.touches[0];
    if (t.clientX > window.innerWidth / 2) {
        // Rotation horizontale simplifiée pour éviter les bugs d'inclinaison
        lookY -= 0.02; 
        camera.rotation.y = lookY;
    }
    e.preventDefault(); // Empêche la page de trembler
}, { passive: false });

window.addEventListener('touchend', function() {
    moveForward = 0;
});

// --- BOUCLE DE RENDU ---
function animate() {
    requestAnimationFrame(animate);
    
    // Mouvement FPS
    if (moveForward > 0) {
        camera.position.z -= Math.cos(camera.rotation.y) * moveForward;
        camera.position.x -= Math.sin(camera.rotation.y) * moveForward;
    }

    renderer.render(scene, camera);
}

animate();