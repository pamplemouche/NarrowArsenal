window.onerror = function(msg, url, line) {
    const debug = document.createElement('div');
    debug.style = "position:fixed;top:0;left:0;color:red;background:white;z-index:9999;font-size:10px;";
    debug.innerHTML = "ERREUR: " + msg + " Ligne: " + line;
    document.body.appendChild(debug);
};
console.log("Script lancé !");

// --- INITIALISATION ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Ciel bleu
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector("#glCanvas"), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// --- LUMIÈRE (Essentiel pour voir la 3D) ---
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(light);

// --- OBJETS ---
// Le Sol
const floorGeo = new THREE.PlaneGeometry(1000, 1000);
const floorMat = new THREE.MeshLambertMaterial({ color: 0x44aa44 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2; // Le mettre à plat
scene.add(floor);

// Le Cube Cible (Rouge)
const cubeGeo = new THREE.BoxGeometry(2, 2, 2);
const cubeMat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
const cube = new THREE.Mesh(cubeGeo, cubeMat);
cube.position.set(0, 1, -10); // 10 mètres devant
scene.add(cube);

// L'Arc (Bâton blanc attaché à la caméra)
const bowGeo = new THREE.BoxGeometry(0.1, 0.5, 0.1);
const bowMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const bow = new THREE.Mesh(bowGeo, bowMat);
bow.position.set(0.5, -0.4, -0.8); // En bas à droite de l'écran
camera.add(bow); // L'attacher à la caméra pour qu'il la suive
scene.add(camera);

// --- ÉTAT DU JOUEUR ---
camera.position.y = 1.7;
let moveForward = 0, moveRight = 0;
let lookY = 0, lookX = 0;

// --- CONTRÔLES TACTILES ---
let startX, startY;

window.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (t.clientX > window.innerWidth / 2) {
        startX = t.clientX; startY = t.clientY;
    }
});

window.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    // Regarder (Moitié droite)
    if (t.clientX > window.innerWidth / 2) {
        lookY -= (t.clientX - startX) * 0.005;
        lookX -= (t.clientY - startY) * 0.005;
        lookX = Math.max(-Math.PI/2.1, Math.min(Math.PI/2.1, lookX));
        camera.rotation.order = 'YXZ'; // Très important pour FPS
        camera.rotation.set(lookX, lookY, 0);
        startX = t.clientX; startY = t.clientY;
    }
    // Joystick (Moitié gauche)
    const joyZone = document.getElementById('joystick-zone').getBoundingClientRect();
    if (t.clientX < window.innerWidth / 2) {
        moveRight = (t.clientX - (joyZone.left + 60)) / 60;
        moveForward = (t.clientY - (joyZone.top + 60)) / -60;
    }
});

window.addEventListener('touchend', () => { moveForward = 0; moveRight = 0; });

// --- BOUCLE DE JEU ---
function animate() {
    requestAnimationFrame(animate);

    // Déplacement
    camera.translateZ(-moveForward * 0.2);
    camera.translateX(moveRight * 0.2);
    camera.position.y = 1.7; // Garder la tête à hauteur d'homme

    renderer.render(scene, camera);
}
animate();

// Gérer le redimensionnement
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});