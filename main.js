const canvas = document.querySelector("#glCanvas");
const gl = canvas.getContext("webgl");

if (!gl) { alert("WebGL non supporté"); }

// --- CONFIGURATION ---
let player = { 
    x: 0, y: 1.6, z: 10, // On commence un peu plus loin
    rotY: 0, rotX: 0,
    velY: 0, isJumping: false 
};

const sensitivity = 0.005;
const moveSpeed = 0.15;
let moveInput = { x: 0, y: 0 };

// --- INTERFACE ---
const joyZone = document.getElementById('joystick-zone');
const joyStick = document.getElementById('joystick');
let lastTouchX = null, lastTouchY = null;

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

document.getElementById('jump-btn').addEventListener('touchstart', (e) => {
    if(!player.isJumping) { player.velY = 0.2; player.isJumping = true; }
});

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

// --- WEBGL CORE ---
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

// --- GÉOMÉTRIE (SOL + REPERES) ---
const vertices = new Float32Array([
    // SOL (immense)
    -100, 0, -100,   100, 0, -100,   100, 0, 100,  -100, 0, 100,
    // POTEAU CENTRE (Bleu)
    -0.2, 0, -5,   0.2, 0, -5,   0.2, 5, -5,  -0.2, 5, -5
]);

const colors = new Float32Array([
    // SOL (Gris-Vert)
    0.3, 0.5, 0.3,  0.4, 0.6, 0.4,  0.3, 0.5, 0.3,  0.4, 0.6, 0.4,
    // POTEAU
    0.2, 0.2, 1.0,  0.2, 0.2, 1.0,  0.2, 0.2, 1.0,  0.2, 0.2, 1.0
]);

const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3, // Sol
    4, 5, 6, 4, 6, 7  // Poteau
]);

const posBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const colBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

const idxBuf = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// --- MATHS MATRICES ---
function perspective(fov, aspect, near, far) {
    let f = 1.0 / Math.tan(fov / 2), rangeInv = 1 / (near - far);
    return [f/aspect,0,0,0, 0,f,0,0, 0,0,(near+far)*rangeInv,-1, 0,0,near*far*rangeInv*2,0];
}

function multiply(a, b) {
    let c = new Float32Array(16);
    for(let i=0; i<4; i++) {
        for(let j=0; j<4; j++) {
            for(let k=0; k<4; k++) {
                c[i*4+j] += a[i*4+k] * b[k*4+j];
            }
        }
    }
    return c;
}

// --- BOUCLE ---
function render() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.8, 1.0, 1.0); // CIEL
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // Mouvement
    if (player.isJumping) {
        player.y += player.velY; player.velY -= 0.01;
        if (player.y <= 1.6) { player.y = 1.6; player.isJumping = false; }
    }
    player.z += (Math.cos(player.rotY) * moveInput.y - Math.sin(player.rotY) * moveInput.x) * moveSpeed;
    player.x += (Math.sin(player.rotY) * moveInput.y + Math.cos(player.rotY) * moveInput.x) * moveSpeed;

    // Camera (Vue FPS)
    let p = perspective(1.0, canvas.width/canvas.height, 0.1, 500);
    
    // Rotation X
    let cx = Math.cos(player.rotX), sx = Math.sin(player.rotX);
    let rx = [1,0,0,0, 0,cx,sx,0, 0,-sx,cx,0, 0,0,0,1];
    
    // Rotation Y
    let cy = Math.cos(player.rotY), sy = Math.sin(player.rotY);
    let ry = [cy,0,-sy,0, 0,1,0,0, sy,0,cy,0, 0,0,0,1];
    
    // Position
    let pos = [1,0,0,0, 0,1,0,0, 0,0,1,0, -player.x, -player.y, -player.z, 1];

    // Calcul Final : Projection * RotationX * RotationY * Translation
    let view = multiply(ry, pos);
    view = multiply(rx, view);
    let final = multiply(new Float32Array(p), view);

    gl.uniformMatrix4fv(matrixLoc, false, final);

    // Dessin
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    let pL = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(pL); gl.vertexAttribPointer(pL, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    let cL = gl.getAttribLocation(program, "aColor");
    gl.enableVertexAttribArray(cL); gl.vertexAttribPointer(cL, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.drawElements(gl.TRIANGLES, 12, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
}
render();