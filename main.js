const canvas = document.querySelector("#glCanvas");
const gl = canvas.getContext("webgl");

// --- 1. SHADERS (Version simplifiée au maximum) ---
const vs = `attribute vec4 aPos; attribute vec4 aCol; uniform mat4 uM; varying vec4 vC;
void main() { gl_Position = uM * aPos; vC = aCol; }`;
const fs = `precision mediump float; varying vec4 vC; void main() { gl_FragColor = vC; }`;

function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return s;
}
const prog = gl.createProgram();
gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vs));
gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs));
gl.linkProgram(prog); gl.useProgram(prog);
const uM = gl.getUniformLocation(prog, "uM");

// --- 2. CONFIGURATION JOUEUR ---
let player = { x: 0, y: 1.7, z: 10, rotY: 0, rotX: 0, vY: 0, jump: false };
let input = { x: 0, y: 0 };
const sens = 0.005, speed = 0.15;

// --- 3. GÉOMÉTRIE (SOL + CUBE + ARC) ---
let verts = [], colors = [], indices = [];

function addBox(x, y, z, w, h, d, r, g, b) {
    let s = verts.length / 3;
    // Sommets
    verts.push(x-w/2,y,z-d/2, x+w/2,y,z-d/2, x+w/2,y+h,z-d/2, x-w/2,y+h,z-d/2, // Front
               x-w/2,y,z+d/2, x+w/2,y,z+d/2, x+w/2,y+h,z+d/2, x-w/2,y+h,z+d/2, // Back
               x-w/2,y+h,z-d/2, x+w/2,y+h,z-d/2, x+w/2,y+h,z+d/2, x-w/2,y+h,z+d/2, // Top
               x-w/2,y,z-d/2, x+w/2,y,z-d/2, x+w/2,y,z+d/2, x-w/2,y,z+d/2); // Bottom
    // Couleurs simples (ombrage par face)
    for(let i=0; i<4; i++) colors.push(r, g, b);           // Front
    for(let i=0; i<4; i++) colors.push(r*0.7, g*0.7, b*0.7); // Back
    for(let i=0; i<4; i++) colors.push(r*1.1, g*1.1, b*1.1); // Top
    for(let i=0; i<4; i++) colors.push(r*0.5, g*0.5, b*0.5); // Bottom
    // Indices
    let f = [0,1,2, 0,2,3, 4,5,6, 4,6,7, 8,9,10, 8,10,11, 12,13,14, 12,14,15, 0,4,7, 0,7,3, 1,5,6, 1,6,2];
    f.forEach(v => indices.push(s + v));
}

// OBJETS DE LA SCÈNE
addBox(0, -0.1, 0, 500, 0.1, 500, 0.2, 0.5, 0.2); // Le SOL (Vert)
addBox(0, 0, -5, 2, 2, 2, 0.8, 0.2, 0.2);       // Le CUBE (Rouge) devant toi
addBox(0.4, 1.2, 44.2, 0.05, 0.4, 0.05, 0.9, 0.9, 0.9); // L'ARC (Bâton blanc)

const pB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pB);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
const cB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cB);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
const iB = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iB);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

// --- 4. MATHS MATRICES ---
function mPersp(fov, asp, n, f) {
    let t = 1/Math.tan(fov/2);
    return [t/asp,0,0,0, 0,t,0,0, 0,0,(n+f)/(n-f),-1, 0,0,(2*n*f)/(n-f),0];
}
function mMult(a, b) {
    let c = new Float32Array(16);
    for(let i=0; i<4; i++) for(let j=0; j<4; j++) for(let k=0; k<4; k++) c[i*4+j]+=a[i*4+k]*b[k*4+j];
    return c;
}

// --- 5. ENTRÉES ---
let lX, lY;
document.getElementById('joystick-zone').ontouchmove = (e) => {
    let r = e.currentTarget.getBoundingClientRect(); let t = e.touches[0];
    input.x = (t.clientX - (r.left+60))/60; input.y = (t.clientY - (r.top+60))/60;
};
document.getElementById('joystick-zone').ontouchend = () => { input.x = 0; input.y = 0; };
document.getElementById('jump-btn').ontouchstart = () => { if(!player.jump){ player.vY=0.2; player.jump=true; }};
canvas.ontouchstart = (e) => { if(e.touches[0].clientX > window.innerWidth/2){ lX=e.touches[0].clientX; lY=e.touches[0].clientY; }};
canvas.ontouchmove = (e) => {
    let t = e.touches[0];
    if(t.clientX > window.innerWidth/2 && lX!=null){
        player.rotY -= (t.clientX - lX)*sens; 
        player.rotX -= (t.clientY - lY)*sens;
        player.rotX = Math.max(-1.4, Math.min(1.4, player.rotX)); 
        lX=t.clientX; lY=t.clientY;
    }
};

// --- 6. RENDER ---
function draw() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(0.5, 0.8, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // Physique
    if(player.jump){ player.y+=player.vY; player.vY-=0.01; if(player.y<=1.7){player.y=1.7; player.jump=false;}}
    player.z += (Math.cos(player.rotY)*input.y - Math.sin(player.rotY)*input.x)*speed;
    player.x += (Math.sin(player.rotY)*input.y + Math.cos(player.rotY)*input.x)*speed;

    // Matrice Camera
    let proj = mPersp(1, canvas.width/canvas.height, 0.1, 1000);
    let cX = Math.cos(player.rotX), sX = Math.sin(player.rotX);
    let rX = [1,0,0,0, 0,cX,sX,0, 0,-sX,cX,0, 0,0,0,1];
    let cY = Math.cos(player.rotY), sY = Math.sin(player.rotY);
    let rY = [cY,0,-sy,0, 0,1,0,0, sy,0,cy,0, 0,0,0,1]; // Note: correction mineure sur sy/cY
    
    // Simplification de la vue pour éviter les lignes obliques
    let view = mMult(rX, mMult([cY,0,-sY,0, 0,1,0,0, sY,0,cY,0, 0,0,0,1], [1,0,0,0, 0,1,0,0, 0,0,1,0, -player.x, -player.y, -player.z, 1]));
    
    gl.uniformMatrix4fv(uM, false, mMult(new Float32Array(proj), view));

    // Attribs
    gl.bindBuffer(gl.ARRAY_BUFFER, pB);
    let pL = gl.getAttribLocation(prog, "aPos"); gl.enableVertexAttribArray(pL); gl.vertexAttribPointer(pL, 3, gl.FLOAT, false, 0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER, cB);
    let cL = gl.getAttribLocation(prog, "aCol"); gl.enableVertexAttribArray(cL); gl.vertexAttribPointer(cL, 3, gl.FLOAT, false, 0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iB);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(draw);
}
draw();