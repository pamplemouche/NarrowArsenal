// --- SÉCURITÉ DÉMARRAGE ---
console.log("Démarrage du script...");

// 1. SCÈNE ET RENDU
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// On essaie de récupérer le canvas
var canvasElement = document.getElementById("glCanvas");
var renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x00ffff, 1); // Bleu turquoise pour voir si le moteur marche

// 2. OBJETS (MeshBasicMaterial = visible même sans lumière)
// Sol
var floorGeo = new THREE.PlaneGeometry(100, 100);
var floorMat = new THREE.MeshBasicMaterial({ color: 0x228B22 });
var floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Cube cible (Rouge)
var cubeGeo = new THREE.BoxGeometry(2, 2, 2);
var cubeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
var target = new THREE.Mesh(cubeGeo, cubeMat);
target.position.set(0, 1, -10);
scene.add(target);

// L'Arc (Bâton blanc attaché à la vue)
var bowGeo = new THREE.BoxGeometry(0.1, 0.5, 0.1);
var bowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
var bow = new THREE.Mesh(bowGeo, bowMat);
bow.position.set(0.5, -0.4, -1);
camera.add(bow);
scene.add(camera);

// 3. ÉTAT DU JOUEUR
camera.position.y = 1.7;
var lookY = 0;
var moveForward = 0;

// 4. CONTRÔLES TACTILES (Simplifiés pour v65)
window.addEventListener('touchstart', function(e) {
    if (e.touches[0].clientX < window.innerWidth / 2) {
        moveForward = 0.2; // Avancer
    }
});

window.addEventListener('touchmove', function(e) {
    var t = e.touches[0];
    if (t.clientX > window.innerWidth / 2) {
        // Rotation droite/gauche
        lookY -= 0.03;
        camera.rotation.y = lookY;
    }
    e.preventDefault(); 
}, { passive: false });

window.addEventListener('touchend', function() {
    moveForward = 0;
});

// 5. BOUCLE DE RENDU
function animate() {
    requestAnimationFrame(animate);
    
    // Déplacement FPS
    if (moveForward > 0) {
        camera.position.z -= Math.cos(camera.rotation.y) * moveForward;
        camera.position.x -= Math.sin(camera.rotation.y) * moveForward;
    }
    
    // Animation du cube pour prouver que ça tourne
    target.rotation.y += 0.02;

    renderer.render(scene, camera);
}

// Lancement forcé
if (typeof THREE !== 'undefined') {
    animate();
} else {
    alert("ERREUR : Three.min.js n'est pas chargé !");
}