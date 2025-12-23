const canvas = document.querySelector("#glCanvas");
const gl = canvas.getContext("webgl");

// 1. SHADERS
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

// 2. ÉTAT DU JOUEUR (Modifié pour être à distance)
let player = { x: 0, y: 1.7, z: 15, rotY: 0, rotX: 0 }; // Départ à Z=15 pour reculer
let input = { x: 0, y: 0 };

// 3. GÉOMÉTRIE
let verts = [], colors = [], indices = [];
function addBox(x, y, z, w, h, d, r, g, b) {
    let s = verts.length / 3;
    verts.push(x-w,y,z-d, x+w,y,z-d, x+w,y+h,z-d, x-w,y+h,z-d, x-w,y,z+d, x+w,y,z+d, x+w,y+h,z+d, x-w,y+h,z+d);
    for(let i=0; i<8; i++) colors.push(r, g, b);
    let f = [0,1,2, 0,2,3, 4,5,6, 4,6,7, 0,4,7, 0,7,3, 1,5,6, 1,6,2, 3,2,6, 3,6,7, 0,1,5, 0,5,4];
    f.forEach(v => indices.push(s + v));
}

// OBJETS : Taille ajustée
addBox(0, -0.1, 0, 100, 0.1, 100, 0.2, 0.5, 0.2); // Sol vert
addBox(0, 0, 0, 1, 2, 1, 0.8, 0.1, 0.1);         // Cube rouge (plus petit)

const pB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pB); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
const cB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cB); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
const iB = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iB); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

// 4. MATHS
function multiply(a, b) {
    let c = new Float32Array(16);
    for(let i=0; i<4; i++) for(let j=0; j<4; j++) for(let k=0; k<4; k++) c[i*4+j]+=a[i*4+k]*b[k*4+j];
    return c;
}

// 5. ENTRÉES
let lX, lY;
canvas.ontouchstart = (e) => { lX = e.touches[0].clientX; lY = e.touches[0].clientY; };
canvas.ontouchmove = (e) => {
    let t = e.touches[0];
    if(t.clientX > window.innerWidth/2) {
        player.rotY -= (t.clientX - lX) * 0.005;
        player.rotX -= (t.clientY - lY) * 0.005;
        player.rotX = Math.max(-1.4, Math.min(1.4, player.rotX));
        lX = t.clientX; lY = t.clientY;
    }
};
document.getElementById('joystick-zone').ontouchmove = (e) => {
    let r = e.currentTarget.getBoundingClientRect(); let t = e.touches[0];
    input.x = (t.clientX - (r.left+60))/60; input.y = (t.clientY - (r.top+60))/60;
};
document.getElementById('joystick-zone').ontouchend = () => { input.x = 0; input.y = 0; };

// 6. RENDU
function draw() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.8, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // Mouvement
    player.z += (Math.cos(player.rotY) * input.y - Math.sin(player.rotY) * input.x) * 0.2;
    player.x += (Math.sin(player.rotY) * input.y + Math.cos(player.rotY) * input.x) * 0.2;

    // Projection & Caméra
    let asp = canvas.width / canvas.height;
    let proj = [1/asp,0,0,0, 0,1,0,0, 0,0,-1.1,-1, 0,0,-0.2,0];
    
    let cY = Math.cos(player.rotY), sY = Math.sin(player.rotY);
    let cX = Math.cos(player.rotX), sX = Math.sin(player.rotX);
    
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