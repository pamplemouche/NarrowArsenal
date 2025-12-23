const canvas = document.querySelector("#glCanvas");
const gl = canvas.getContext("webgl");

// 1. SHADERS avec Brouillard (pour cacher les lignes au loin)
const vs = `
    attribute vec4 aPos; attribute vec4 aCol; uniform mat4 uM; varying vec4 vC; varying float vDist;
    void main() { 
        gl_Position = uM * aPos; 
        vC = aCol; 
        vDist = gl_Position.w; 
    }`;
const fs = `
    precision mediump float; varying vec4 vC; varying float vDist;
    void main() { 
        float fog = clamp((vDist - 10.0) / 40.0, 0.0, 1.0);
        gl_FragColor = mix(vC, vec4(0.5, 0.8, 1.0, 1.0), fog); 
    }`;

function compile(gl, type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s;
}
const prog = gl.createProgram();
gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vs));
gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs));
gl.linkProgram(prog); gl.useProgram(prog);
const uM = gl.getUniformLocation(prog, "uM");

// 2. ÉTAT DU JEU
let player = { x: 0, y: 1.7, z: 8, rY: 0, rX: 0 };
let move = { x: 0, y: 0 };
let verts = [], colors = [], indices = [];

// 3. CONSTRUCTION (On utilise des tailles fixes pour éviter les bugs)
function addBox(x, y, z, w, h, d, r, g, b) {
    let s = verts.length / 3;
    verts.push(x-w,y,z-d, x+w,y,z-d, x+w,y+h,z-d, x-w,y+h,z-d, x-w,y,z+d, x+w,y,z+d, x+w,y+h,z+d, x-w,y+h,z+d);
    for(let i=0; i<8; i++) colors.push(r, g, b);
    let f = [0,1,2, 0,2,3, 4,5,6, 4,6,7, 0,4,7, 0,7,3, 1,5,6, 1,6,2, 3,2,6, 3,6,7, 0,1,5, 0,5,4];
    f.forEach(v => indices.push(s + v));
}

addBox(0, -0.1, 0, 100, 0.1, 100, 0.2, 0.5, 0.2); // Sol large
addBox(0, 0, -5, 1, 2, 1, 0.8, 0.2, 0.2);       // Cube cible

const pB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pB); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
const cB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cB); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
const iB = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iB); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

// 4. TOUCHES
let lX, lY;
canvas.ontouchstart = (e) => { lX = e.touches[0].clientX; lY = e.touches[0].clientY; };
canvas.ontouchmove = (e) => {
    let t = e.touches[0];
    if(t.clientX > window.innerWidth/2) {
        player.rY -= (t.clientX - lX) * 0.005;
        player.rX = Math.max(-1.5, Math.min(1.5, player.rX - (t.clientY - lY) * 0.005));
        lX = t.clientX; lY = t.clientY;
    }
};
document.getElementById('joystick-zone').ontouchmove = (e) => {
    let r = e.currentTarget.getBoundingClientRect(); let t = e.touches[0];
    move.x = (t.clientX - (r.left+60))/60; move.y = (t.clientY - (r.top+60))/60;
};
document.getElementById('joystick-zone').ontouchend = () => { move.x = 0; move.y = 0; };

// 5. FONCTIONS MATHS (Version stable)
function multiply(a, b) {
    let c = new Float32Array(16);
    for(let i=0; i<4; i++) for(let j=0; j<4; j++) for(let k=0; k<4; k++) c[i*4+j]+=a[i*4+k]*b[k*4+j];
    return c;
}

// 6. RENDU
function draw() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.8, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // Mouvement simplifié
    player.z += (Math.cos(player.rY) * move.y - Math.sin(player.rY) * move.x) * 0.15;
    player.x += (Math.sin(player.rY) * move.y + Math.cos(player.rY) * move.x) * 0.15;

    // Projection
    let asp = canvas.width / canvas.height;
    let proj = [1/asp,0,0,0, 0,1,0,0, 0,0,-1.02,-1, 0,0,-0.2,0];

    // Matrice de vue (Rotation puis translation)
    let cY = Math.cos(player.rY), sY = Math.sin(player.rY);
    let cX = Math.cos(player.rX), sX = Math.sin(player.rX);
    
    let view = [cY, sX*sY, cX*sY, 0, 0, cX, -sX, 0, -sY, sX*cY, cX*cY, 0, 0, 0, 0, 1];
    let pos = [1,0,0,0, 0,1,0,0, 0,0,1,0, -player.x, -player.y, -player.z, 1];

    gl.uniformMatrix4fv(uM, false, multiply(proj, multiply(view, pos)));

    gl.bindBuffer(gl.ARRAY_BUFFER, pB);
    let pL = gl.getAttribLocation(prog, "aPos"); gl.enableVertexAttribArray(pL); gl.vertexAttribPointer(pL, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, cB);
    let cL = gl.getAttribLocation(prog, "aCol"); gl.enableVertexAttribArray(cL); gl.vertexAttribPointer(cL, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iB);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(draw);
}
draw();