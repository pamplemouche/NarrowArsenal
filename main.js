const canvas = document.querySelector("#glCanvas");
const gl = canvas.getContext("webgl");

if (!gl) { alert("WebGL non supporté"); }

// --- INITIALISATION DES SHADERS ---
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

const vShader = createShader(gl, gl.VERTEX_SHADER, document.getElementById("vs").text);
const fShader = createShader(gl, gl.FRAGMENT_SHADER, document.getElementById("fs").text);
const program = gl.createProgram();
gl.attachShader(program, vShader);
gl.attachShader(program, fShader);
gl.linkProgram(program);
gl.useProgram(program);

// --- DONNÉES DU CUBE (Positions X, Y, Z) ---
const vertices = new Float32Array([
    -0.5,-0.5,0.5,  0.5,-0.5,0.5,  0.5,0.5,0.5, -0.5,0.5,0.5, // Devant
    -0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,0.5,-0.5, -0.5,0.5,-0.5 // Derrière
]);

// Couleurs pour chaque face (RGB)
const colors = new Float32Array([
    1,0,0, 1,0,0, 1,0,0, 1,0,0, // Rouge
    0,1,0, 0,1,0, 0,1,0, 0,1,0  // Vert
]);

const indices = new Uint16Array([
    0,1,2, 0,2,3, // Face avant
    4,5,6, 4,6,7  // Face arrière
]);

// --- BUFFERS ---
function createBuffer(target, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    return buffer;
}

createBuffer(gl.ARRAY_BUFFER, vertices);
const posLoc = gl.getAttribLocation(program, "aPosition");
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

createBuffer(gl.ARRAY_BUFFER, colors);
const colLoc = gl.getAttribLocation(program, "aColor");
gl.enableVertexAttribArray(colLoc);
gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, 0, 0);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

const matrixLoc = gl.getUniformLocation(program, "uMatrix");

// --- MATRICES (Vraie 3D) ---
function getMatrix(angle) {
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    // Matrice de rotation simple pour l'exemple
    return new Float32Array([
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1.5 // Zoom/Perspective
    ]);
}

let rotation = 0;
function render() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    rotation += 0.02;
    gl.uniformMatrix4fv(matrixLoc, false, getMatrix(rotation));

    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    requestAnimationFrame(render);
}

render();