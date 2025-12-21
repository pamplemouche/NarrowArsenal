import * as THREE from './libs/three.module.js';

// 1. Création de la Scène
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Un beau ciel bleu

// 2. Caméra (Perspective)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5); // Hauteur d'homme (1.6m)

// 3. Le Rendu (Renderer)
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 4. Ajout d'un sol (Pour ne pas flotter dans le vide)
const grid = new THREE.GridHelper(100, 100);
scene.add(grid);

// 5. Un cube test (Le futur joueur ou une cible)
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
cube.position.y = 0.5;
scene.add(cube);

// 6. Boucle d'animation
function animate() {
    requestAnimationFrame(animate);
    
    // Petite rotation pour vérifier que ça tourne
    cube.rotation.y += 0.01;
    
    renderer.render(scene, camera);
}

// Gérer le redimensionnement de l'écran (iPad rotation)
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();