import * as THREE from 'three';

// Initialisation rapide
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222); // Gris foncé

 const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Création d'un sol pour vérifier la perspective
const grid = new THREE.GridHelper(10, 10, 0xffffff, 0x555555);
scene.add(grid);

// Un cube qui représente notre futur arsenal
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
cube.position.y = 0.5;
scene.add(cube);

camera.position.set(2, 2, 5);
camera.lookAt(0, 0, 0);

function animate() {
    requestAnimationFrame(animate);
cube.rotation.y += 0.01;
    renderer.render(scene, camera);
}
 animate();