// --- Basic setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('container').appendChild(renderer.domElement);

const world = new CANNON.World();
world.gravity.set(0, -30, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;

// --- Scene enhancements ---
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.Fog(0x1a1a2e, 50, 100);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffffff, 0.5);
pointLight.position.set(-10, 15, -5);
scene.add(pointLight);

// --- Physics materials ---
const diceMaterial = new CANNON.Material('diceMaterial');
const groundMaterial = new CANNON.Material('groundMaterial');
const contactMaterial = new CANNON.ContactMaterial(groundMaterial, diceMaterial, {
    friction: 0.1,
    restitution: 0.5,
});
world.addContactMaterial(contactMaterial);

// --- Floor ---
const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x0f3460, side: THREE.DoubleSide });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const groundBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
    material: groundMaterial,
});
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(groundBody);

// --- Walls ---
function createWall(position, quaternion) {
    const wallBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: groundMaterial });
    wallBody.position.copy(position);
    wallBody.quaternion.copy(quaternion);
    world.addBody(wallBody);
}
createWall(new CANNON.Vec3(0, 0, -15), new CANNON.Quaternion(0, 0, 0, 1));
createWall(new CANNON.Vec3(0, 0, 15), new CANNON.Quaternion(0, 1, 0, 0));
createWall(new CANNON.Vec3(-15, 0, 0), new CANNON.Quaternion(0, 1, 0, Math.PI / 2));
createWall(new CANNON.Vec3(15, 0, 0), new CANNON.Quaternion(0, -1, 0, Math.PI / 2));


// --- Dice variables ---
let dice = [];
const size = 1;

// --- Controls ---
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- Texture Creation for Dice ---
function createDiceTexture(num) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 128;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);
    
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num, 64, 64);
    
    return new THREE.CanvasTexture(canvas);
}

const diceTextures = [
    createDiceTexture(1),
    createDiceTexture(2),
    createDiceTexture(3),
    createDiceTexture(4),
    createDiceTexture(5),
    createDiceTexture(6)
];

const diceMaterials = [
    new THREE.MeshStandardMaterial({ map: diceTextures }), // Right face (+X): 3
    new THREE.MeshStandardMaterial({ map: diceTextures }), // Left face (-X): 4
    new THREE.MeshStandardMaterial({ map: diceTextures }), // Top face (+Y): 2
    new THREE.MeshStandardMaterial({ map: diceTextures }), // Bottom face (-Y): 5
    new THREE.MeshStandardMaterial({ map: diceTextures }), // Front face (+Z): 1
    new THREE.MeshStandardMaterial({ map: diceTextures })  // Back face (-Z): 6
];


// --- UI Elements ---
const diceCountSlider = document.getElementById('dice-count');
const throwForceSlider = document.getElementById('throw-force');
const throwHeightSlider = document.getElementById('throw-height');
const diceCountValue = document.getElementById('dice-count-value');
const throwForceValue = document.getElementById('throw-force-value');
const throwHeightValue = document.getElementById('throw-height-value');
const throwButton = document.getElementById('throw-button');
const resetButton = document.getElementById('reset-button');
const totalValue = document.getElementById('total-value');
const diceResultsList = document.getElementById('dice-results');

// --- UI Event Listeners ---
diceCountSlider.addEventListener('input', () => diceCountValue.textContent = diceCountSlider.value);
throwForceSlider.addEventListener('input', () => throwForceValue.textContent = throwForceSlider.value);
throwHeightSlider.addEventListener('input', () => throwHeightValue.textContent = throwHeightSlider.value);
throwButton.addEventListener('click', throwDice);
resetButton.addEventListener('click', resetScene);

// --- Camera Position ---
camera.position.set(0, 15, 20);
camera.lookAt(0, 0, 0);

// --- Dice Creation ---
function createDie() {
    const geometry = new THREE.BoxGeometry(size, size, size);
    const mesh = new THREE.Mesh(geometry, diceMaterials);
    mesh.castShadow = true;

    const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2)),
        material: diceMaterial,
        linearDamping: 0.3,
        angularDamping: 0.3,
    });

    scene.add(mesh);
    world.addBody(body);

    return { mesh, body };
}

// --- Main Functions ---
function resetScene() {
    dice.forEach(d => {
        scene.remove(d.mesh);
        world.removeBody(d.body);
    });
    dice = [];
    totalValue.textContent = '0';
    diceResultsList.innerHTML = '';
}

function throwDice() {
    resetScene();
    const count = parseInt(diceCountSlider.value);
    const force = parseInt(throwForceSlider.value);
    const height = parseInt(throwHeightSlider.value);

    for (let i = 0; i < count; i++) {
        const die = createDie();
        
        die.body.position.set(
            (Math.random() - 0.5) * 10,
            height + i * 2,
            (Math.random() - 0.5) * 10
        );
        
        die.body.quaternion.setFromAxisAngle(
            new CANNON.Vec3(Math.random(), Math.random(), Math.random()).unit(),
            Math.random() * Math.PI * 2
        );

        const forceVec = new CANNON.Vec3(
            (Math.random() - 0.5) * force,
            (Math.random() - 0.5) * force,
            (Math.random() - 0.5) * force
        );
        die.body.applyImpulse(forceVec, die.body.position);

        dice.push(die);
    }
    
    throwButton.disabled = true;
    setTimeout(calculateResults, 3000);
}

function calculateResults() {
    let total = 0;
    diceResultsList.innerHTML = '';
    
    dice.forEach((d, index) => {
        const result = getDiceValue(d.body.quaternion);
        total += result;
        const li = document.createElement('li');
        li.textContent = `Dice ${index + 1}: ${result}`;
        diceResultsList.appendChild(li);
    });
    
    totalValue.textContent = total;
    throwButton.disabled = false;
}

function getDiceValue(q) {
    const up = new THREE.Vector3(0, 1, 0);
    let maxDot = -1;
    let result = 0;

    // Dice faces vectors in local space
    const faces = [
        { value: 3, vector: new THREE.Vector3(1, 0, 0) },   // Right face
        { value: 4, vector: new THREE.Vector3(-1, 0, 0) },  // Left face
        { value: 2, vector: new THREE.Vector3(0, 1, 0) },   // Top face
        { value: 5, vector: new THREE.Vector3(0, -1, 0) },  // Bottom face
        { value: 1, vector: new THREE.Vector3(0, 0, 1) },   // Front face
        { value: 6, vector: new THREE.Vector3(0, 0, -1) }   // Back face
    ];

    for (const face of faces) {
        const worldVector = face.vector.clone().applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w));
        const dot = worldVector.dot(up);

        if (dot > maxDot) {
            maxDot = dot;
            result = face.value;
        }
    }
    return result;
}


// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    controls.update();
    world.step(1 / 60);

    dice.forEach(d => {
        d.mesh.position.copy(d.body.position);
        d.mesh.quaternion.copy(d.body.quaternion);
    });

    renderer.render(scene, camera);
}
animate();

// --- Window Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});