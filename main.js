const canvas = document.querySelector("#glCanvas");
const gl = canvas.getContext("webgl");

const vs = `attribute vec4 aPos; attribute vec4 aCol; uniform mat4 uM; varying vec4 vC;
void main() { gl_Position = uM * aPos; vC = aCol; }`;
const fs = `precision mediump float; varying vec4 vC; void main() { gl_FragColor = vC; }`;

function compile(gl, type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s;
}
const prog = gl.createProgram();
gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vs));
gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs));
gl.linkProgram(prog); gl.useProgram(prog);
const uM = gl.getUniformLocation(prog, "uM");

// --- JOUEUR (Position très reculée par rapport à la taille des objets) ---
let cam = { x: 0, y: 0.5, z: 4, rx: 0, ry: 0 };
let move = { x: 0, y: 0 };

// --- GÉOMÉTRIE MINIATURE ---
let v = [], c = [], ind = [];
function addBox(x, y, z, w, h, d, r, g, b) {
    let s = v.length / 3;
    v.push(x-w,y,z-d, x+w,y,z-d, x+w,y+h,z-d, x-w,y+h,z-d, x-w,y,z+d, x+w,y,z+d, x+w,y+h,z+d, x-w,y+h,z+d);
    for(let i=0; i<8; i++) c.push(r, g, b);
    let f = [0,1,2, 0,2,3, 4,5,6, 4,6,7, 0,4,7, 0,7,3, 1,5,6, 1,6,2, 3,2,6, 3,6,7, 0,1,5, 0,5,4];
    f.forEach(i => ind.push(s + i));
}

// Un sol de 20m et un petit cube de 0.5m
addBox(0, -0.01, 0, 10, 0.01, 10, 0.2, 0.5, 0.2); // Sol
addBox(0, 0, 0, 0.2, 0.4, 0.2, 0.8, 0.1, 0.1);    // Petit cube rouge

const pB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pB); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
const cB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cB); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(c), gl.STATIC_DRAW);
const iB = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iB); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ind), gl.STATIC_DRAW);

// --- CONTRÔLES ---
let lX, lY;
canvas.ontouchstart = (e) => { lX = e.touches[0].clientX; lY = e.touches[0].clientY; };
canvas.ontouchmove = (e) => {
    let t = e.touches[0];
    if(t.clientX > window.innerWidth / 2) {
        cam.ry -= (t.clientX - lX) * 0.005;
        cam.rx = Math.max(-1.4, Math.min(1.4, cam.rx - (t.clientY - lY) * 0.005));
        lX = t.clientX; lY = t.clientY;
    }
};
document.getElementById('joystick-zone').ontouchmove = (e) => {
    let r = e.currentTarget.getBoundingClientRect(); let t = e.touches[0];
    move.x = (t.clientX - (r.left+60))/60; move.y = (t.clientY - (r.top+60))/60;
};
document.getElementById('joystick-zone').ontouchend = () => { move.x = 0; move.y = 0; };

// --- RENDU ---
function draw() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.8, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    cam.z += (Math.cos(cam.ry) * move.y - Math.sin(cam.ry) * move.x) * 0.05;
    cam.x += (Math.sin(cam.ry) * move.y + Math.cos(cam.ry) * move.x) * 0.05;

    let asp = canvas.width / canvas.height;
    let f = 1.0 / Math.tan(1.0 / 2);
    let proj = [f/asp,0,0,0, 0,f,0,0, 0,0,-1,-1, 0,0,-0.2,0];
    
    let cx = Math.cos(cam.rx), sx = Math.sin(cam.rx);
    let cy = Math.cos(cam.ry), sy = Math.sin(cam.ry);
    
    // Matrice de vue FPS Corrigée
    let view = [
        cy, sx*sy, cx*sy, 0,
        0, cx, -sx, 0,
        -sy, sx*cy, cx*cy, 0,
        -cam.x*cy + cam.z*sy, -cam.x*sx*sy - cam.y*cx - cam.z*sx*cy, -cam.x*cx*sy + cam.y*sx - cam.z*cx*cy, 1
    ];

    const mult = (a, b) => {
        let res = new Float32Array(16);
        for(let i=0; i<4; i++) for(let j=0; j<4; j++) for(let k=0; k<4; k++) res[i*4+j]+=a[i*4+k]*b[k*4+j];
        return res;
    };

    gl.uniformMatrix4fv(uM, false, mult(proj, view));
    gl.bindBuffer(gl.ARRAY_BUFFER, pB);
    let pL = gl.getAttribLocation(prog, "aPos"); gl.enableVertexAttribArray(pL); gl.vertexAttribPointer(pL, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, cB);
    let cL = gl.getAttribLocation(prog, "aCol"); gl.enableVertexAttribArray(cL); gl.vertexAttribPointer(cL, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iB);
    gl.drawElements(gl.TRIANGLES, ind.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(draw);
}
draw();