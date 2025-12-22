const canvas = document.querySelector("#glCanvas");
const gl = canvas.getContext("webgl");

if (!gl) { alert("WebGL non supporté"); }

// --- 1. SHADERS INTÉGRÉS (Plus fiable sur iPad) ---
const vsSource = `
    attribute vec4 aPosition;
    attribute vec4 aColor;
    uniform mat4 uMatrix;
    varying vec4 vColor;
    void main() {
        gl_Position = uMatrix * aPosition;
        vColor = aColor;
    }
`;

const fsSource = `
    precision mediump float;
    varying vec4 vColor;
    void main() {
        gl_FragColor = vColor;
    }
`;

function initShaderProgram(gl, vsSource, fsSource) {
    const vS = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vS, vsSource); gl.compileShader(vS);
    const fS = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fS, fsSource); gl.compileShader(fS);
    const prog = gl.createProgram();
    gl.attachShader(prog, vS); gl.attachShader(prog, fS);
    gl.linkProgram(prog);
    return prog;
}

const program = initShaderProgram(gl, vsSource, fsSource);
gl.useProgram(program);

// --- 2. CONFIGURATION DU JOUEUR ---
let player = { x: 0, y: 1.6, z: 40, rotY: 0, rotX: 0, velY: 0, isJumping: false };
const sensitivity = 0.006;
const moveSpeed = 0.2;
let moveInput = { x: 0, y: 0 };

// --- 3. GÉOMÉTRIE (CASTLE) ---
let vertList = [];
let colorList = [];
let indexList = [];

function addBox(x, y, z, w, h, d, r, g, b) {
    let s = vertList.length / 3;
    vertList.push(
        x-w/2,y,z-d/2, x+w/2,y,z-d/2, x+w/2,y+h,z-d/2, x-w/2,y+h,z-d/2,
        x-w/2,y,z+d/2, x+w/2,y,z+d/2, x+w/2,y+h,z+d/2, x-w/2,y+h,z+d/2,
        x-w/2,y+h,z-d/2, x+w/2,y+h,z-d/2, x+w/2,y+h,z+d/2, x-w/2,y+h,z+d/2,
        x-w/2,y,z-d/2, x+w/2,y,z-d/2, x+w/2,y,z+d/2, x-w/2,y,z+d/2
    );
    for(let i=0; i<4; i++) colorList.push(r, g, b);           
    for(let i=0; i<4; i++) colorList.push(r*0.7, g*0.7, b*0.7); 
    for(let i=0; i<4; i++) colorList.push(r*1.1, g*1.1, b*1.1); 
    for(let i=0; i<4; i++) colorList.push(r*0.5, g*0.5, b*0.5); 
    let f = [0,1,2,0,2,3, 4,5,6,4,6,7, 8,9,10,8,10,11, 12,13,14,12,14,15, 0,4,7,0,7,3, 1,5,6,1,6,2];
    f.forEach(v => indexList.push(s + v));
}

// Construction de la Map
addBox(0, -0.2, 0, 1000, 0.2, 1000, 0.3, 0.55, 0.3); // Sol géant
addBox(0, 0, -20, 40, 7, 2, 0.6, 0.6, 0.6); // Murs
addBox(0, 0, 20, 15, 7, 2, 0.6, 0.6, 0.6);  
addBox(12, 0, 20, 15, 7, 2, 0.6, 0.6, 0.6); 
addBox(-20, 0, 0, 2, 7, 40, 0.55, 0.55, 0.55); 
addBox(20, 0, 0, 2, 7, 40, 0.55, 0.55, 0.55);
addBox(0, 0, 0, 12, 20, 12, 0.7, 0.7, 0.7); // Donjon
for(let i=0; i<40; i++){ // Nuages
    addBox((Math.random()-0.5)*400, 30+Math.random()*10, (Math.random()-0.5)*400, 10, 0.5, 10, 1,1,1);
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

const matrixLoc = gl.getUniformLocation(program, "uMatrix");

// --- 4. MATHS ---
function perspective(fov, aspect, near, far) {
    let f = 1.0 / Math.tan(fov / 2), inv = 1 / (near - far);
    return [f/aspect,0,0,0, 0,f,0,0, 0,0,(near+far)*inv,-1, 0,0,near*far*inv*2,0];
}
function multiply(a, b) {
    let c = new Float32Array(16);
    for(let i=0; i<4; i++) for(let j=0; j<4; j++) for(let k=0; k<4; k++) c[i*4+j]+=a[i*4+k]*b[k*4+j];
    return c;
}

// --- 5. TACTILE ---
const joyZone = document.getElementById('joystick-zone');
const joyStick = document.getElementById('joystick');
let lX = null, lY = null;

joyZone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    let r = joyZone.getBoundingClientRect();
    let t = e.touches[0];
    moveInput.x = Math.min(1, Math.max(-1, (t.clientX - (r.left + 60)) / 60));
    moveInput.y = Math.min(1, Math.max(-1, (t.clientY - (r.top + 60)) / 60));
    joyStick.style.transform = `translate(${moveInput.x * 30}px, ${moveInput.y * 30}px)`;
}, {passive: false});

joyZone.addEventListener('touchend', () => { moveInput = {x:0,y:0}; joyStick.style.transform = `translate(0,0)`; });
document.getElementById('jump-btn').addEventListener('touchstart', (e) => { if(!player.isJumping){ player.velY=0.22; player.isJumping=true; } });

canvas.addEventListener('touchstart', (e) => { let t=e.touches[0]; if(t.clientX > window.innerWidth/2){ lX=t.clientX; lY=t.clientY; } });
canvas.addEventListener('touchmove', (e) => {
    let t=e.touches[0];
    if(t.clientX > window.innerWidth/2 && lX!==null){
        player.rotY -= (t.clientX - lX) * sensitivity;
        player.rotX -= (t.clientY - lY) * sensitivity;
        player.rotX = Math.max(-1.5, Math.min(1.5, player.rotX));
        lX=t.clientX; lY=t.clientY;
    }
}, {passive: false});

// --- 6. RENDU ---
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

    let p = perspective(1.0, canvas.width/canvas.height, 0.1, 1500);
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