const canvas = document.querySelector("#glCanvas");
const gl = canvas.getContext("webgl");

// --- 1. SHADERS (Ultra-stables) ---
const vs = `attribute vec4 aPos; attribute vec4 aCol; uniform mat4 uM; varying vec4 vC;
void main() { gl_Position = uM * aPos; vC = aCol; }`;
const fs = `precision mediump float; varying vec4 vC; void main() { gl_FragColor = vC; }`;

function createProg(gl, vs, fs) {
    const p = gl.createProgram();
    const s = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    gl.attachShader(p, s(gl.VERTEX_SHADER, vs)); gl.attachShader(p, s(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p); return p;
}
const program = createProg(gl, vs, fs); gl.useProgram(program);
const uM = gl.getUniformLocation(program, "uM");

// --- 2. SETUP JOUEUR ---
let player = { x: 0, y: 1.7, z: 45, rotY: 0, rotX: 0, vY: 0, jump: false };
let input = { x: 0, y: 0 };
const sens = 0.005, speed = 0.2;

// --- 3. GÉOMÉTRIE ---
let verts = [], colors = [], indices = [];
function box(x, y, z, w, h, d, r, g, b) {
    let s = verts.length / 3;
    verts.push(x-w/2,y,z-d/2, x+w/2,y,z-d/2, x+w/2,y+h,z-d/2, x-w/2,y+h,z-d/2,
               x-w/2,y,z+d/2, x+w/2,y,z+d/2, x+w/2,y+h,z+d/2, x-w/2,y+h,z+d/2,
               x-w/2,y+h,z-d/2, x+w/2,y+h,z-d/2, x+w/2,y+h,z+d/2, x-w/2,y+h,z+d/2,
               x-w/2,y,z-d/2, x+w/2,y,z-d/2, x+w/2,y,z+d/2, x-w/2,y,z+d/2);
    for(let i=0; i<4; i++) colors.push(r,g,b, r*0.7,g*0.7,b*0.7, r*1.1,g*1.1,b*1.1, r*0.5,g*0.5,b*0.5);
    let f = [0,1,2,0,2,3, 4,5,6,4,6,7, 8,9,10,8,10,11, 12,13,14,12,14,15, 0,4,7,0,7,3, 1,5,6,1,6,2];
    f.forEach(v => indices.push(s + v));
}

// Map: Sol + Château + Arc
box(0, -0.1, 0, 1000, 0.1, 1000, 0.3, 0.6, 0.3); // Sol
box(0, 0, -20, 40, 8, 2, 0.6, 0.6, 0.6); // Mur
box(0, 0, 0, 10, 20, 10, 0.5, 0.5, 0.5); // Donjon
// ARC (Placé par rapport au joueur, on le dessinera avec une matrice spéciale)
box(0.5, -0.5, -1, 0.1, 0.6, 0.1, 0.9, 0.9, 0.9); // Main/Arc

const pB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pB); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
const cB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cB); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
const iB = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iB); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

// --- 4. MATHS MATRICES ---
function identity() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
function perspective(fovy, asp, n, f) {
    let t = 1/Math.tan(fovy/2);
    return [t/asp,0,0,0, 0,t,0,0, 0,0,(n+f)/(n-f),-1, 0,0,(2*n*f)/(n-f),0];
}
function multiply(a, b) {
    let c = new Float32Array(16);
    for(let i=0; i<4; i++) for(let j=0; j<4; j++) for(let k=0; k<4; k++) c[i*4+j]+=a[i*4+k]*b[k*4+j];
    return c;
}

// --- 5. TACTILE ---
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
        player.rotY -= (t.clientX - lX)*sens; player.rotX -= (t.clientY - lY)*sens;
        player.rotX = Math.max(-1.5, Math.min(1.5, player.rotX)); lX=t.clientX; lY=t.clientY;
    }
};

// --- 6. RENDER ---
function draw() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(0.5, 0.8, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    if(player.jump){ player.y+=player.vY; player.vY-=0.01; if(player.y<=1.7){player.y=1.7; player.jump=false;}}
    player.z += (Math.cos(player.rotY)*input.y - Math.sin(player.rotY)*input.x)*speed;
    player.x += (Math.sin(player.rotY)*input.y + Math.cos(player.rotY)*input.x)*speed;

    let proj = perspective(1, canvas.width/canvas.height, 0.1, 1000);
    
    // CALCUL CAMERA (L'ordre est vital pour éviter l'inclinaison)
    let cam = identity();
    // 1. Rotation Haut/Bas (X)
    let cX = Math.cos(player.rotX), sX = Math.sin(player.rotX);
    let rX = [1,0,0,0, 0,cX,sX,0, 0,-sX,cX,0, 0,0,0,1];
    // 2. Rotation Gauche/Droite (Y)
    let cY = Math.cos(player.rotY), sY = Math.sin(player.rotY);
    let rY = [cY,0,-sY,0, 0,1,0,0, sY,0,cY,0, 0,0,0,1];
    // 3. Position
    let t = [1,0,0,0, 0,1,0,0, 0,0,1,0, -player.x, -player.y, -player.z, 1];

    let view = multiply(rX, multiply(rY, t));
    gl.uniformMatrix4fv(uM, false, multiply(new Float32Array(proj), view));

    gl.bindBuffer(gl.ARRAY_BUFFER, pB); let pL = gl.getAttribLocation(program, "aPos"); gl.enableVertexAttribArray(pL); gl.vertexAttribPointer(pL, 3, gl.FLOAT, false, 0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER, cB); let cL = gl.getAttribLocation(program, "aCol"); gl.enableVertexAttribArray(cL); gl.vertexAttribPointer(cL, 3, gl.FLOAT, false, 0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iB);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(draw);
}
draw();