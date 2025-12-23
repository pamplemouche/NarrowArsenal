// Attendre que la page soit totalement prête
window.onload = function() {
    if (typeof THREE === 'undefined') {
        alert("Three.js n'est toujours pas détecté par le code.");
        return;
    }

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    var renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("glCanvas") });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // On utilise MeshBasicMaterial : pas besoin de lumière pour voir l'objet
    var geometry = new THREE.BoxGeometry(2, 2, 2);
    var material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    var cube = new THREE.Mesh(geometry, material);
    
    scene.add(cube);
    camera.position.z = 5;

    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }

    animate();
};