const canvas = document.querySelector("#glCanvas");
const gl = canvas.getContext("webgl");

if (!gl) { alert("WebGL non supporté"); }

// --- 1. CONFIGURATION DU JOUEUR ---
let player = { 
    x: 0, y: 1.6, z: 10, 
    rotY: 0, rotX: 0,
    velY: 0, isJumping: false 
};

const sensitivity = 0.005;
const moveSpeed = 0.15;
let moveInput = { x: 0, y: 0 };

// --- 2. INTERFACE TACTILE ---
const joyZone = document.getElementById('joystick-zone');
const joyStick = document.getElementById('joystick');
let lastTouchX = null, lastTouchY = null;

// Joystick (Partie gauche)
joyZone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    let rect = joyZone.getBoundingClientRect();
    let t = e.touches[0];
    moveInput.x = Math.min(1, Math.max(-1, (t.clientX - (rect.left + 60)) / 60));
    moveInput.y = Math.min(1, Math.max(-1, (t.clientY - (rect.top + 60)) / 60));
    joyStick.style.transform = `translate(${moveInput.x * 30}px, ${moveInput.y * 30}px)`;
}, {passive: false});

joyZone.addEventListener('touchend', () => {
    moveInput = { x: 0, y: 0 };
    joyStick.style.transform = `translate(0,0)`;
});

// Saut
document.getElementById('jump-btn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if(!player.isJumping) { player.velY = 0.2; player.isJumping = true; }
});

// Regard (Partie droite)
canvas.addEventListener('touchstart', (e) => {
    let t = e.touches[0];
    if (t.clientX > window.innerWidth / 2) {
        lastTouchX = t.clientX; lastTouchY = t.clientY;
    }
});

canvas.addEventListener('touchmove', (e) => {
    let t = e.touches[0];
    if (t.clientX > window.innerWidth / 2 && lastTouchX !== null) {
        player.rotY -= (t.clientX - lastTouchX) * sensitivity;
        player.rotX -= (t.clientY - lastTouchY) * sensitivity;
        player.rotX = Math.max(-1.5, Math.min(1.5, player.rotX));
        lastTouchX = t.clientX; lastTouchY = t.clientY;
    }
}, {passive: false});

canvas.addEventListener('touchend', () => { lastTouchX = null; lastTouchY = null; });

// --- 3. INITIALISATION WEBGL ---
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

const matrixLoc = gl.getUniformLocation(program, "uMatrix");

// --- 4. GÉOMÉTRIE (SOL + POTEAU + NUAGES) ---
let vertList = [
    // SOL
    -100, 0, -100,   100, 0, -100,   100, 0, 100,  -100, 0, 100,
    // POTEAU (Repère visuel bleu)
    -0.5, 0, -5,     0.5, 0, -5,     0.5, 8, -5,   -0.5, 8, -5
];

let colorList = [
    // SOL (Vert sombre)
    0.2, 0.4, 0.2,  0.3, 0.5, 0.3,  0.2, 0.4, 0.2,  0.3, 0.5, 0.3,
    // POTEAU (Bleu)
    0.2, 0.2, 1.0,  0.2, 0.2, 1.0,  0.2, 0.2, 1.0,  0.2, 0.2, 1.0
];

let indexList = [
    0, 1, 2, 0, 2, 3, // Sol
    4, 5, 6, 4, 6, 7  // Poteau
];

// Génération des Nuages
for (let i = 0; i < 30; i++) {
    let nx = (Math.random() - 0.5) * 150;
    let ny = 20 + Math.random() * 10;
    let nz = (Math.random() - 0.5) * 150;
    let nw = 3 + Math.random() * 7;
    
    let startIdx = vertList.length / 3;
    vertList.push(nx-nw, ny, nz-nw, nx+nw, ny, nz-nw, nx+nw, ny, nz+nw, nx-nw, ny, nz+nw);
    let c = 0.9 + Math.random() * 0.1;
    for(let j=0; j<4; j++) colorList.push(c, c, c);
    indexList.push(startIdx, startIdx+1, startIdx+2, startIdx, startIdx+2, startIdx+3);
}

const posBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertList), gl.STATIC_DRAW);

const colBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorList), gl.STATIC_DRAW);

const idxBuf = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexList), gl.STATIC_DRAW);

// --- 5. MATHS DE MATRICE ---
function perspective(fov, aspect, near, far) {
    let f = 1.0 / Math.tan(fov / 2), inv = 1 / (near - far);
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

// --- 6. BOUCLE DE RENDU ---
function render() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.8, 1.0, 1.0); // Ciel bleu
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // Mouvement & Gravité
    if (player.isJumping) {
        player.y += player.velY; player.velY -= 0.01;
        if (player.y <= 1.6) { player.y = 1.6; player.isJumping = false; }
    }
    player.z += (Math.cos(player.rotY) * moveInput.y - Math.sin(player.rotY) * moveInput.x) * moveSpeed;
    player.x += (Math.sin(player.rotY) * moveInput.y + Math.cos(player.rotY) * moveInput.x) * moveSpeed;

    // Matrice de Vue
    let proj = perspective(1.0, canvas.width/canvas.height, 0.1, 500);
    let rx = [1,0,0,0, 0,Math.cos(player.rotX),Math.sin(player.rotX),0, 0,-Math.sin(player.rotX),Math.cos(player.rotX),0, 0,0,0,1];
    let ry = [Math.cos(player.rotY),0,-Math.sin(player.rotY),0, 0,1,0,0, Math.sin(player.rotY),0,Math.cos(player.rotY),0, 0,0,0,1];
    let pos = [1,0,0,0, 0,1,0,0, 0,0,1,0, -player.x, -player.y, -player.z, 1];

    let view = multiply(multiply(rx, ry), pos);
    gl.uniformMatrix4fv(matrixLoc, false, multiply(new Float32Array(proj), view));

    // Dessin
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    let pL = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(pL); gl.vertexAttribPointer(pL, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    let cL = gl.getAttribLocation(program, "aColor");
    gl.enableVertexAttribArray(cL); gl.vertexAttribPointer(cL, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.drawElements(gl.TRIANGLES, indexList.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
}
render();