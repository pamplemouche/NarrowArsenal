const canvas = document.querySelector("#glCanvas");
const gl = canvas.getContext("webgl");

// --- CONFIGURATION DU JOUEUR ---
let player = { 
    x: 0, y: 1.6, z: 5, 
    rotY: 0, rotX: 0,
    velY: 0, isJumping: false 
};

// --- LOGIQUE TACTILE ---
let moveInput = { x: 0, y: 0 };
const joyZone = document.getElementById('joystick-zone');
const joyStick = document.getElementById('joystick');

joyZone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    let rect = joyZone.getBoundingClientRect();
    let touch = e.touches[0];
    let dx = (touch.clientX - (rect.left + 60)) / 60;
    let dy = (touch.clientY - (rect.top + 60)) / 60;
    let dist = Math.min(1, Math.sqrt(dx*dx + dy*dy));
    let angle = Math.atan2(dy, dx);
    moveInput.x = Math.cos(angle) * dist;
    moveInput.y = Math.sin(angle) * dist;
    joyStick.style.transform = `translate(${moveInput.x * 30}px, ${moveInput.y * 30}px)`;
});

joyZone.addEventListener('touchend', () => {
    moveInput = { x: 0, y: 0 };
    joyStick.style.transform = `translate(0,0)`;
});

document.getElementById('jump-btn').addEventListener('touchstart', () => {
    if(!player.isJumping) { player.velY = 0.15; player.isJumping = true; }
});

// Zone droite de l'écran pour tourner la caméra
let lastTouchX = 0;
canvas.addEventListener('touchstart', (e) => { lastTouchX = e.touches[0].clientX; });
canvas.addEventListener('touchmove', (e) => {
    let dx = e.touches[0].clientX - lastTouchX;
    player.rotY -= dx * 0.005;
    lastTouchX = e.touches[0].clientX;
});

// --- WEBGL SETUP ---
function createShader(gl, type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return s;
}

const vS = createShader(gl, gl.VERTEX_SHADER, document.getElementById("vs").text);
const fS = createShader(gl, gl.FRAGMENT_SHADER, document.getElementById("fs").text);
const program = gl.createProgram();
gl.attachShader(program, vS); gl.attachShader(program, fS);
gl.linkProgram(program); gl.useProgram(program);

// --- GÉOMÉTRIE (SOL) ---
const gridVertices = new Float32Array([
    -50, 0, -50,   50, 0, -50,   50, 0,  50,  -50, 0,  50
]);
const gridColors = new Float32Array([
    0.2, 0.7, 0.2,  0.2, 0.7, 0.2,  0.2, 0.7, 0.2,  0.2, 0.7, 0.2
]);
const gridIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);

const posBuffer = gl.createBuffer();
const colBuffer = gl.createBuffer();
const idxBuffer = gl.createBuffer();
const matrixLoc = gl.getUniformLocation(program, "uMatrix");

// --- MATHS 3D ---
function multiply(a, b) {
    let c = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            for (let k = 0; k < 4; k++) c[i*4+j] += a[i*4+k] * b[k*4+j];
        }
    }
    return c;
}

function perspective(fov, aspect, near, far) {
    let f = Math.tan(Math.PI * 0.5 - 0.5 * fov);
    let inv = 1.0 / (near - far);
    return [f/aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (near+far)*inv, -1, 0, 0, near*far*inv*2, 0];
}

// --- RENDU ---
function render() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.8, 1.0, 1.0); // CIEL
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // Physique du saut
    if (player.isJumping) {
        player.y += player.velY;
        player.velY -= 0.008; // Gravité
        if (player.y <= 1.6) { player.y = 1.6; player.isJumping = false; }
    }

    // Mouvement
    player.x += (Math.sin(player.rotY) * moveInput.y + Math.cos(player.rotY) * moveInput.x) * 0.1;
    player.z += (Math.cos(player.rotY) * moveInput.y - Math.sin(player.rotY) * moveInput.x) * 0.1;

    // Matrice de vue
    let p = perspective(1.0, canvas.width / canvas.height, 0.1, 100);
    let v = [1,0,0,0, 0,1,0,0, 0,0,1,0, -player.x, -player.y, -player.z, 1];
    let ry = [Math.cos(player.rotY), 0, -Math.sin(player.rotY), 0, 0, 1, 0, 0, Math.sin(player.rotY), 0, Math.cos(player.rotY), 0, 0, 0, 0, 1];
    
    let finalMatrix = multiply(new Float32Array(p), multiply(ry, v));
    gl.uniformMatrix4fv(matrixLoc, false, finalMatrix);

    // Dessiner le sol
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, gridVertices, gl.STATIC_DRAW);
    let pLoc = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(pLoc);
    gl.vertexAttribPointer(pLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, gridColors, gl.STATIC_DRAW);
    let cLoc = gl.getAttribLocation(program, "aColor");
    gl.enableVertexAttribArray(cLoc);
    gl.vertexAttribPointer(cLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, gridIndices, gl.STATIC_DRAW);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
}
render();