// *** NOUVELLE SYNTAXE : On importe tout de Three.js ***
import * as THREE from 'three'; 


// --- VARIABLES GLOBALES ---
let renderer, scene, camera;
let player;

// Constantes de mouvement
const MOVE_SPEED = 0.05;
const ROTATION_SPEED = 0.03;

// État des touches du clavier
const keys = { w: false, s: false, a: false, d: false };


// --- INITIALISATION DU MOTEUR ---
function init() {
    // 1. SCÈNE
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Ciel bleu

    // 2. CAMÉRA
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // 3. RENDU 
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    // 4. LUMIÈRES & ENVIRONNEMENT
    addLights();
    createFloor();
    
    // 5. JOUEUR ET CONTRÔLES
    createPlayer();
    setupControls();
    
    // 6. Écouteurs pour le redimensionnement
    window.addEventListener('resize', onWindowResize);
    
    // Démarrer la boucle de jeu
    animate(); 
}

function addLights() {
    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
    scene.add(ambientLight);

    // Lumière directionnelle (simule le soleil)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);
}

function createFloor() {
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x6b8e23 }); // Vert olive
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Le sol doit être plat
    scene.add(floor);
}

function createPlayer() {
    // Corps
    const bodyGeometry = new THREE.BoxGeometry(1, 2, 1);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x0077ff });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);

    // Tête
    const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffe0bd });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.4; 

    // Groupe du Joueur (Contient le corps et la tête)
    player = new THREE.Group();
    player.add(body);
    player.add(head);

    player.position.y = 1.0; // Le joueur est posé sur le sol (y=0)
    scene.add(player);
    
    updateCamera();
}

function setupControls() {
    window.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        if (keys.hasOwnProperty(key)) {
            keys[key] = true;
        }
    });

    window.addEventListener('keyup', (event) => {
        const key = event.key.toLowerCase();
        if (keys.hasOwnProperty(key)) {
            keys[key] = false;
        }
    });
}


// --- LOGIQUE DE JEU ---

function updatePlayerMovement() {
    if (!player) return; 

    // Rotation (A et D)
    if (keys.a) {
        player.rotation.y += ROTATION_SPEED; 
    }
    if (keys.d) {
        player.rotation.y -= ROTATION_SPEED; 
    }

    // Mouvement (W et S)
    if (keys.w || keys.s) {
        // Calcule le vecteur de direction basé sur la rotation du joueur
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyQuaternion(player.quaternion); 

        const speedFactor = keys.w ? MOVE_SPEED : -MOVE_SPEED;

        player.position.x += direction.x * speedFactor;
        player.position.z += direction.z * speedFactor;
    }
}

function updateCamera() {
    const cameraDistance = 5; 
    const cameraHeight = 3; 

    // Positionner la caméra derrière et au-dessus du joueur
    camera.position.x = player.position.x;
    camera.position.z = player.position.z + cameraDistance;
    camera.position.y = player.position.y + cameraHeight;

    // Faire pointer la caméra vers la tête du joueur (y+1)
    camera.lookAt(player.position.x, player.position.y + 1, player.position.z);
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


// --- LA BOUCLE D'ANIMATION ---

function animate() {
    requestAnimationFrame(animate); 

    updatePlayerMovement();
    updateCamera();

    renderer.render(scene, camera); 
}


// --- lancement ---
init();
