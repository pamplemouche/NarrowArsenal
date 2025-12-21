const canvas = document.querySelector("#glCanvas");
const gl = canvas.getContext("webgl");

if (!gl) { alert("WebGL non supporté"); }

// --- CONFIGURATION ---
let player = { 
    x: 0, y: 1.6, z: 5, 
    rotY: 0, rotX: 0,
    velY: 0, isJumping: false 
};

const sensitivity = 0.005;
const moveSpeed = 0.1;
let moveInput = { x: 0, y: 0 };

// --- GESTION TACTILE (JOYSTICK & REGARD) ---
const joyZone = document.getElementById('joystick-zone');
const joyStick = document.getElementById('joystick');
let lastTouchX = null, lastTouchY = null;

// Joystick (Partie gauche)
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
}, {passive: false});

joyZone.addEventListener('touchend', () => {
    moveInput = { x: 0, y: 0 };
    joyStick.style.transform = `translate(0,0)`;
});

// Saut
document.getElementById('jump-btn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if(!player.isJumping) { player.velY = 0.15; player.isJumping = true; }
});

// Regard (Partie droite du canvas)
canvas.addEventListener('touchstart', (e) => {
    let t = e.touches[0];
    if (t.clientX > window.innerWidth / 2) {
        lastTouchX = t.clientX;
        lastTouchY = t.clientY;
    }
});

canvas.addEventListener('touchmove', (e) => {
    let t = e.touches[0];
    if (t.clientX > window.innerWidth / 2 && lastTouchX !== null) {
        let dx = t.clientX - lastTouchX;
        let dy = t.clientY - lastTouchY;
        player.rotY -= dx * sensitivity;
        player.rotX -= dy * sensitivity;
        // Limite verticale pour ne pas se retourner
        player.rotX = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, player.rotX));
        lastTouchX = t.clientX;
        lastTouchY = t.clientY;
    }
}, {passive: false});

canvas.addEventListener('touchend', () => { lastTouchX = null; lastTouchY = null; });

// --- INITIALISATION WEBGL ---
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

// Données du Sol (Grand carré vert)
const gridVertices = new Float32Array([-100,0,-100, 100,0,-100, 100,0,100, -100,0,100]);
const gridColors = new Float32Array([0.2,0.6,0.2, 0.2,0.8,0.2, 0.2,0.6,0.2, 0.2,0.8,0.2]);
const gridIndices = new Uint16Array([0,1,2, 0,2,3]);

const posBuf = gl.createBuffer();
const colBuf = gl.createBuffer();
const idxBuf = gl.createBuffer();
const matrixLoc = gl.getUniformLocation(program, "uMatrix");

// --- MATHS DE MATRICE ---
function perspective(fov, aspect, near, far) {
    let f = Math.tan(Math.PI * 0.5 - 0.5 * fov), inv = 1.0/(near-far);
    return [f/aspect,0,0,0, 0,f,0,0, 0,0,(near+far)*inv,-1, 0,0,near*far*inv*2,0];
}

function multiply(a, b) {
    let c = new Float32Array(16);
    for(let i=0; i<4; i++) {
        for(let j=0; j<4; j++) {
            for(let k=0; k<4; k++) c[i*4+j] += a[i*4+k] * b[k*4+j];
        }
    }
    return c;
}

// --- BOUCLE DE RENDU ---
function render() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.8, 1.0, 1.0); // Couleur du ciel
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // Physique du saut
    if (player.isJumping) {
        player.y += player.velY;
        player.velY -= 0.008;
        if (player.y <= 1.6) { player.y = 1.6; player.isJumping = false; }
    }

    // Mouvement relatif à la rotation de la tête
    let moveZ = Math.cos(player.rotY) * moveInput.y - Math.sin(player.rotY) * moveInput.x;
    let moveX = Math.sin(player.rotY) * moveInput.y + Math.cos(player.rotY) * moveInput.x;
    player.z += moveZ * moveSpeed;
    player.x += moveX * moveSpeed;

    // Calcul de la Caméra
    let proj = perspective(1.0, canvas.width/canvas.height, 0.1, 200);
    let rx = [1,0,0,0, 0,Math.cos(player.rotX),Math.sin(player.rotX),0, 0,-Math.sin(player.rotX),Math.cos(player.rotX),0, 0,0,0,1];
    let ry = [Math.cos(player.rotY),0,-Math.sin(player.rotY),0, 0,1,0,0, Math.sin(player.rotY),0,Math.cos(player.rotY),0, 0,0,0,1];
    let pos = [1,0,0,0, 0,1,0,0, 0,0,1,0, -player.x, -player.y, -player.z, 1];

    let view = multiply(ry, pos);
    view = multiply(rx, view);
    let final = multiply(new Float32Array(proj), view);
    gl.uniformMatrix4fv(matrixLoc, false, final);

    // Dessin du Sol
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, gridVertices, gl.STATIC_DRAW);
    let pLoc = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(pLoc); gl.vertexAttribPointer(pLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    gl.bufferData(gl.ARRAY_BUFFER, gridColors, gl.STATIC_DRAW);
    let cLoc = gl.getAttribLocation(program, "aColor");
    gl.enableVertexAttribArray(cLoc); gl.vertexAttribPointer(cLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, gridIndices, gl.STATIC_DRAW);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
}

render();