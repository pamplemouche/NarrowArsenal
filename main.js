const canvas = document.querySelector("#glCanvas");
const gl = canvas.getContext("webgl");

if (!gl) { alert("WebGL non supporté"); }

// --- 1. CONFIGURATION DU JOUEUR ---
// Placé à z=45 pour être juste devant la porte du château
let player = { 
    x: 0, y: 1.6, z: 45, 
    rotY: 0, rotX: 0,
    velY: 0, isJumping: false 
};

const sensitivity = 0.006;
const moveSpeed = 0.2;
let moveInput = { x: 0, y: 0 };

// --- 2. GESTION DES ENTRÉES TACTILES ---
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

// --- 3. MOTEUR DE GÉOMÉTRIE (CASTLE) ---
let vertList = [];
let colorList = [];
let indexList = [];

function addBox(x, y, z, w, h, d, r, g, b) {
    let s = vertList.length / 3;
    // Positions (8 sommets, 24 vertices pour des couleurs par face)
    vertList.push(
        x-w/2,y,z-d/2, x+w/2,y,z-d/2, x+w/2,y+h,z-d/2, x-w/2,y+h,z-d/2, // Devant
        x-w/2,y,z+d/2, x+w/2,y,z+d/2, x+w/2,y+h,z+d/2, x-w/2,y+h,z+d/2, // Derrière
        x-w/2,y+h,z-d/2, x+w/2,y+h,z-d/2, x+w/2,y+h,z+d/2, x-w/2,y+h,z+d/2, // Haut
        x-w/2,y,z-d/2, x+w/2,y,z-d/2, x+w/2,y,z+d/2, x-w/2,y,z+d/2  // Bas
    );
    // Couleurs avec ombrage basique
    for(let i=0; i<4; i++) colorList.push(r, g, b);           // Devant
    for(let i=0; i<4; i++) colorList.push(r*0.7, g*0.7, b*0.7); // Derrière
    for(let i=0; i<4; i++) colorList.push(r*1.1, g*1.1, b*1.1); // Haut
    for(let i=0; i<4; i++) colorList.push(r*0.5, g*0.5, b*0.5); // Bas
    
    let faces = [0,1,2,0,2,3, 4,5,6,4,6,7, 8,9,10,8,10,11, 12,13,14,12,14,15, 0,4,7,0,7,3, 1,5,6,1,6,2];
    faces.forEach(f => indexList.push(s + f));
}

// -- GÉNÉRATION DE LA MAP --
// Sol immense (1km x 1km)
addBox(0, -0.2, 0, 1000, 0.2, 1000, 0.3, 0.55, 0.3);

// Murs du château
addBox(0, 0, -20, 40, 7, 2, 0.6, 0.6, 0.6); // Nord
addBox(0, 0, 20, 15, 7, 2, 0.6, 0.6, 0.6);  // Sud (partie gauche de la porte)
addBox(12, 0, 20, 15, 7, 2, 0.6, 0.6, 0.6); // Sud (partie droite de la porte)
addBox(-20, 0, 0, 2, 7, 40, 0.55, 0.55, 0.55); // Ouest
addBox(20, 0, 0, 2, 7, 40, 0.55, 0.55, 0.55);  // Est

// Tours
const th = 14; const tw = 6;
addBox(-20, 0, -20, tw, th, tw, 0.45, 0.45, 0.45);
addBox(20, 0, -20, tw, th, tw, 0.45, 0.45, 0.45);
addBox(-20, 0, 20, tw, th, tw, 0.45, 0.45, 0.45);
addBox(20, 0, 20, tw, th, tw, 0.45, 0.45, 0.45);

// Donjon Central
addBox(0, 0, 0, 12, 20, 12, 0.7, 0.7, 0.7);
addBox(0, 20, 0, 0.4, 6, 0.4, 0.2, 0.2, 0.2); // Mât
addBox(2, 24, 0, 4, 2, 0.1, 0.9, 0.1, 0.1);   // Drapeau rouge

// Nuages
for(let i=0; i<50; i++){
    let nx=(Math.random()-0.5)*400, ny=30+Math.random()*15, nz=(Math.random()-0.5)*400;
    addBox(nx, ny, nz, 10, 0.5, 10, 1, 1, 1);
}

// -- INITIALISATION BUFFERS --
const vS = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vS, document.getElementById("vs").text); gl.compileShader(vS);
const fS = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fS, document.getElementById("fs").text); gl.compileShader(fS);
const program = gl.createProgram();
gl.attachShader(program, vS); gl.attachShader(program, fS);
gl.linkProgram(program); gl.useProgram(program);

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

// --- 4. MATHÉMATIQUES ---
function perspective(fov, aspect, near, far) {
    let f = 1.0 / Math.tan(fov / 2), rangeInv = 1 / (near - far);
    return [f/aspect,0,0,0, 0,f,0,0, 0,0,(near+far)*rangeInv,-1, 0,0,near*far*inv*2,0];
}
function multiply(a, b) {
    let c = new Float32Array(16);
    for(let i=0; i<4; i++) for(let j=0; j<4; j++) for(let k=0; k<4; k++) c[i*4+j]+=a[i*4+k]*b[k*4+j];
    return c;
}

// --- 5. BOUCLE DE RENDU ---
function render() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.8, 1.0, 1.0); // Ciel
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // Mouvements
    if (player.isJumping) {
        player.y += player.velY; player.velY -= 0.01;
        if (player.y <= 1.6) { player.y = 1.6; player.isJumping = false; }
    }
    player.z += (Math.cos(player.rotY) * moveInput.y - Math.sin(player.rotY) * moveInput.x) * moveSpeed;
    player.x += (Math.sin(player.rotY) * moveInput.y + Math.cos(player.rotY) * moveInput.x) * moveSpeed;

    // Camera FPS
    let p = perspective(1.0, canvas.width/canvas.height, 0.1, 1500);
    let cx = Math.cos(player.rotX), sx = Math.sin(player.rotX);
    let rx = [1,0,0,0, 0,cx,sx,0, 0,-sx,cx,0, 0,0,0,1];
    let cy = Math.cos(player.rotY), sy = Math.sin(player.rotY);
    let ry = [cy,0,-sy,0, 0,1,0,0, sy,0,cy,0, 0,0,0,1];
    let pos = [1,0,0,0, 0,1,0,0, 0,0,1,0, -player.x, -player.y, -player.z, 1];

    let view = multiply(multiply(rx, ry), pos);
    gl.uniformMatrix4fv(matrixLoc, false, multiply(new Float32Array(p), view));

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