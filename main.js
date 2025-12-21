const canvas = document.querySelector("#glCanvas");
const gl = canvas.getContext("webgl");

if (!gl) { alert("WebGL non supporté"); }

// --- CONFIGURATION JOUEUR ---
let player = { 
    x: 0, y: 1.6, z: 60, // Position de départ face au château
    rotY: 0, rotX: 0,
    velY: 0, isJumping: false 
};

const sensitivity = 0.006;
const moveSpeed = 0.2;
let moveInput = { x: 0, y: 0 };

// --- INTERFACE TACTILE ---
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
    e.preventDefault();
    if(!player.isJumping) { player.velY = 0.22; player.isJumping = true; }
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

// --- GÉNÉRATEUR DE MAP (CASTLE) ---
let vertList = [];
let colorList = [];
let indexList = [];

function addBox(x, y, z, w, h, d, r, g, b) {
    let s = vertList.length / 3;
    // Sommets du cube (Positions)
    vertList.push(
        x-w/2,y,z-d/2, x+w/2,y,z-d/2, x+w/2,y+h,z-d/2, x-w/2,y+h,z-d/2, // Front
        x-w/2,y,z+d/2, x+w/2,y,z+d/2, x+w/2,y+h,z+d/2, x-w/2,y+h,z+d/2, // Back
        x-w/2,y+h,z-d/2, x+w/2,y+h,z-d/2, x+w/2,y+h,z+d/2, x-w/2,y+h,z+d/2, // Top
        x-w/2,y,z-d/2, x+w/2,y,z-d/2, x+w/2,y,z+d/2, x-w/2,y,z+d/2 // Bottom
    );
    // Couleurs avec fausse ombre
    for(let i=0; i<4; i++) colorList.push(r, g, b); // Front
    for(let i=0; i<4; i++) colorList.push(r*0.7, g*0.7, b*0.7); // Back
    for(let i=0; i<4; i++) colorList.push(r*1.1, g*1.1, b*1.1); // Top
    for(let i=0; i<4; i++) colorList.push(r*0.5, g*0.5, b*0.5); // Bottom
    // Triangles
    let faces = [0,1,2,0,2,3, 4,5,6,4,6,7, 8,9,10,8,10,11, 12,13,14,12,14,15, 0,4,7,0,7,3, 1,5,6,1,6,2];
    faces.forEach(f => indexList.push(s + f));
}

// Construction de la Map Castle
addBox(0, -0.2, 0, 200, 0.2, 200, 0.3, 0.6, 0.3); // Sol Herbe
addBox(0, 0, -20, 40, 6, 2, 0.6, 0.6, 0.6); // Mur Nord
addBox(0, 0, 20, 40, 6, 2, 0.6, 0.6, 0.6);  // Mur Sud
addBox(-20, 0, 0, 2, 6, 40, 0.6, 0.6, 0.6); // Mur Ouest
addBox(20, 0, 0, 2, 6, 40, 0.6, 0.6, 0.6);  // Mur Est

// Tours d'angle
const ts = 5; const th = 12;
addBox(-20,0,-20, ts, th, ts, 0.5, 0.5, 0.5);
addBox(20,0,-20, ts, th, ts, 0.5, 0.5, 0.5);
addBox(-20,0,20, ts, th, ts, 0.5, 0.5, 0.5);
addBox(20,0,20, ts, th, ts, 0.5, 0.5, 0.5);

// Donjon et Drapeau
addBox(0, 0, 0, 12, 18, 12, 0.7, 0.7, 0.7);
addBox(0, 18, 0, 0.3, 5, 0.3, 0.2, 0.2, 0.2); // Mât
addBox(1.5, 21, 0, 3, 1.5, 0.1, 0.8, 0.1, 0.1); // Drapeau Rouge

// Nuages
for(let i=0; i<40; i++){
    let nx=(Math.random()-0.5)*180, ny=25+Math.random()*10, nz=(Math.random()-0.5)*180;
    addBox(nx, ny, nz, 6, 0.5, 6, 1, 1, 1);
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

// --- MATHS ---
function perspective(fov, aspect, near, far) {
    let f = 1.0 / Math.tan(fov / 2), inv = 1 / (near - far);
    return [f/aspect,0,0,0, 0,f,0,0, 0,0,(near+far)*inv,-1, 0,0,near*far*inv*2,0];
}
function multiply(a, b) {
    let c = new Float32Array(16);
    for(let i=0; i<4; i++) for(let j=0; j<4; j++) for(let k=0; k<4; k++) c[i*4+j]+=a[i*4+k]*b[k*4+j];
    return c;
}

// --- BOUCLE ---
function render() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.8, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    if (player.isJumping) {
        player.y += player.velY; player.velY -= 0.01;
        if (player.y <= 1.6) { player.y = 1.6; player.isJumping = false; }
    }
    player.z += (Math.cos(player.rotY) * moveInput.y - Math.sin(player.rotY) * moveInput.x) * moveSpeed;
    player.x += (Math.sin(player.rotY) * moveInput.y + Math.cos(player.rotY) * moveInput.x) * moveSpeed;

    let p = perspective(1.0, canvas.width/canvas.height, 0.1, 1000);
    let rx = [1,0,0,0, 0,Math.cos(player.rotX),Math.sin(player.rotX),0, 0,-Math.sin(player.rotX),Math.cos(player.rotX),0, 0,0,0,1];
    let ry = [Math.cos(player.rotY),0,-Math.sin(player.rotY),0, 0,1,0,0, Math.sin(player.rotY),0,Math.cos(player.rotY),0, 0,0,0,1];
    let pos = [1,0,0,0, 0,1,0,0, 0,0,1,0, -player.x, -player.y, -player.z, 1];

    let view = multiply(multiply(rx, ry), pos);
    gl.uniformMatrix4fv(matrixLoc, false, multiply(new Float32Array(p), view));

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