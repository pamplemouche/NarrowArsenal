const canvas = document.querySelector("#glCanvas");
const gl = canvas.getContext("webgl");

// 1. SHADERS (Ultra-basiques pour éviter les bugs)
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

// 2. ÉTAT DU JOUEUR
let p = { x: 0, y: 1.7, z: 10, rx: 0, ry: 0 };
let input = { x: 0, y: 0 };

// 3. GÉOMÉTRIE (Sol + Cube Central + Arc)
let v = [], c = [], ind = [];
function addBox(x, y, z, w, h, d, r, g, b) {
    let s = v.length / 3;
    v.push(x-w,y,z-d, x+w,y,z-d, x+w,y+h,z-d, x-w,y+h,z-d, x-w,y,z+d, x+w,y,z+d, x+w,y+h,z+d, x-w,y+h,z+d);
    for(let i=0; i<8; i++) c.push(r, g, b);
    let f = [0,1,2, 0,2,3, 4,5,6, 4,6,7, 0,4,7, 0,7,3, 1,5,6, 1,6,2, 3,2,6, 3,6,7, 0,1,5, 0,5,4];
    f.forEach(i => ind.push(s + i));
}

addBox(0, -0.1, 0, 500, 0.1, 500, 0.3, 0.6, 0.3); // Le Sol
addBox(0, 0, 0, 1, 3, 1, 0.8, 0.2, 0.2);          // Cube de repère (Rouge)

const pB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pB); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
const cB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cB); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(c), gl.STATIC_DRAW);
const iB = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iB); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ind), gl.STATIC_DRAW);

// 4. MATHS DE ROTATION (FPS FIXE)
function getU(p) {
    let asp = canvas.width / canvas.height;
    let f = 1.0 / Math.tan(1.0 / 2), n = 0.1, fa = 1000;
    let proj = [f/asp,0,0,0, 0,f,0,0, 0,0,(n+fa)/(n-fa),-1, 0,0,(2*n*fa)/(n-fa),0];
    
    // Rotation X (Haut/Bas)
    let cx = Math.cos(p.rx), sx = Math.sin(p.rx);
    let rx = [1,0,0,0, 0,cx,sx,0, 0,-sx,cx,0, 0,0,0,1];
    
    // Rotation Y (Gauche/Droite)
    let cy = Math.cos(p.ry), sy = Math.sin(p.ry);
    let ry = [cy,0,-sy,0, 0,1,0,0, sy,0,cy,0, 0,0,0,1];
    
    // Position
    let t = [1,0,0,0, 0,1,0,0, 0,0,1,0, -p.x, -p.y, -p.z, 1];

    // Multiplication manuelle Proj * Rx * Ry * T
    const mult = (a, b) => {
        let res = new Float32Array(16);
        for(let i=0; i<4; i++) for(let j=0; j<4; j++) for(let k=0; k<4; k++) res[i*4+j]+=a[i*4+k]*b[k*4+j];
        return res;
    };
    return mult(proj, mult(rx, mult(ry, t)));
}

// 5. CONTRÔLES
let lX, lY;
canvas.ontouchstart = (e) => { lX = e.touches[0].clientX; lY = e.touches[0].clientY; };
canvas.ontouchmove = (e) => {
    let t = e.touches[0];
    if(t.clientX > window.innerWidth / 2) {
        p.ry -= (t.clientX - lX) * 0.005;
        p.rx = Math.max(-1.4, Math.min(1.4, p.rx - (t.clientY - lY) * 0.005));
        lX = t.clientX; lY = t.clientY;
    }
};
document.getElementById('joystick-zone').ontouchmove = (e) => {
    let r = e.currentTarget.getBoundingClientRect(); let t = e.touches[0];
    input.x = (t.clientX - (r.left+60))/60; input.y = (t.clientY - (r.top+60))/60;
};
document.getElementById('joystick-zone').ontouchend = () => { input.x = 0; input.y = 0; };

// 6. RENDER
function draw() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.8, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    p.z += (Math.cos(p.ry) * input.y - Math.sin(p.ry) * input.x) * 0.2;
    p.x += (Math.sin(p.ry) * input.y + Math.cos(p.ry) * input.x) * 0.2;

    gl.uniformMatrix4fv(uM, false, getU(p));

    gl.bindBuffer(gl.ARRAY_BUFFER, pB);
    let pL = gl.getAttribLocation(prog, "aPos"); gl.enableVertexAttribArray(pL); gl.vertexAttribPointer(pL, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, cB);
    let cL = gl.getAttribLocation(prog, "aCol"); gl.enableVertexAttribArray(cL); gl.vertexAttribPointer(cL, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iB);
    gl.drawElements(gl.TRIANGLES, ind.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(draw);
}
draw();