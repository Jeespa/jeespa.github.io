import * as THREE from "../lib/three.module.js";
import { GLTFLoader } from "../lib/GLTFLoader.module.js";
import { OrbitControls } from "../lib/OrbitControls.module.js";
import { TWEEN } from "../lib/tween.module.min.js";
import { GUI } from "../lib/lil-gui.module.min.js";

let scene, camera, renderer, controls;
let mainCamera, topCamera, zoomCamera;
let loadedModels = {}; // Store models and their flip state
const initialColor = { color: "#ff0000" };

// Paths for models
const models = [
    { path: "../models/iPhone16/iphone_16_pro_max.glb", position: new THREE.Vector3(0, 1, 0), scale: 1 },
    { path: "../models/Samsung/samsung_s24_ultra.glb", position: new THREE.Vector3(1.5, 1.02, 0), scale: 0.39 }
];

// Camera positions
const cameraPositions = {
    main: { position: new THREE.Vector3(1.5, 1, 6), lookAt: new THREE.Vector3(0, 1, 0) },
    zoom: { position: new THREE.Vector3(1, 0.5, 3), lookAt: new THREE.Vector3(0, 1, 0) },
    top: { position: new THREE.Vector3(0, 5, 0), lookAt: new THREE.Vector3(0, 0, 0) }
};

init();
loadSkybox();
loadProducts();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    const aspect = window.innerWidth / window.innerHeight;
    mainCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    mainCamera.position.copy(cameraPositions.main.position);
    mainCamera.lookAt(cameraPositions.main.lookAt);

    zoomCamera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    zoomCamera.position.copy(cameraPositions.zoom.position);
    zoomCamera.lookAt(cameraPositions.zoom.lookAt);

    topCamera = new THREE.OrthographicCamera(-5 * aspect, 5 * aspect, 5, -5, 0.1, 100);
    topCamera.position.copy(cameraPositions.top.position);
    topCamera.lookAt(cameraPositions.top.lookAt);

    camera = mainCamera;
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Floor
    /* const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshStandardMaterial({ color: 0xcccccc })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor); */

    window.addEventListener("resize", onWindowResize);
}

function loadProducts() {
    const loader = new GLTFLoader();
    let loadedCount = 0; // Track loaded models count

    models.forEach(({ path, position, scale }) => {
        loader.load(path, (gltf) => {
            const model = gltf.scene;
            model.position.copy(position);
            model.scale.set(scale, scale, scale);
            model.userData.isFlipped = false;

            let group = new THREE.Group(); // Create a new group as the pivot
            group.add(model);

            model.position.set(0, 0, 0); // Reset model position inside group
            group.position.copy(position); // Position the group

            if (path.includes("Samsung")) {
                model.rotation.x = Math.PI;
                model.rotation.z = Math.PI;
            }

            if (path.includes("iPhone")) {
                model.rotation.y = Math.PI / 2;
            }

            // Fix pivot if needed
            let box = new THREE.Box3().setFromObject(model);
            let center = new THREE.Vector3();
            box.getCenter(center);
            model.position.sub(center); // Move to origin

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material.color.set(initialColor.color);
                }
            });

            scene.add(group);
            loadedModels[path] = group; // Store the model

            loadedCount++;
            if (loadedCount === models.length) {
                setupGUI(); // Call GUI setup only after all models are loaded
            }
        });
    });
}

function toggleFlip(model) {
    if (!model) return;

    let targetRotation = {};

    targetRotation.y = model.userData.isFlipped ? model.rotation.y - Math.PI : model.rotation.y + Math.PI;

    new TWEEN.Tween(model.rotation)
        .to(targetRotation, 500) // Animate over 0.5s
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    model.userData.isFlipped = !model.userData.isFlipped; // Toggle state
}

function setupGUI() {
    const gui = new GUI();
    const cameraFolder = gui.addFolder("Camera Views");
    cameraFolder.add({ main: () => switchCamera(mainCamera) }, "main").name("Main View");
    cameraFolder.add({ top: () => switchCamera(topCamera) }, "top").name("Top View");
    cameraFolder.add({ zoom: () => switchCamera(zoomCamera) }, "zoom").name("Zoom View");
    cameraFolder.open();

    // Add buttons to flip models
    const flipFolder = gui.addFolder("Flip Phones");
    Object.keys(loadedModels).forEach((key) => {
        flipFolder.add({ flip: () => toggleFlip(loadedModels[key]) }, "flip").name(`Flip ${key}`);
    });
    flipFolder.open();
}


function switchCamera(newCamera) {
    if (newCamera === mainCamera) {
        mainCamera.position.copy(cameraPositions.main.position);
        mainCamera.lookAt(cameraPositions.main.lookAt);
        controls.target.copy(cameraPositions.main.lookAt);
    } else if (newCamera === zoomCamera) {
        zoomCamera.position.copy(cameraPositions.zoom.position);
        zoomCamera.lookAt(cameraPositions.zoom.lookAt);
        controls.target.copy(cameraPositions.zoom.lookAt);
    } else if (newCamera === topCamera) {
        topCamera.position.copy(cameraPositions.top.position);
        topCamera.lookAt(cameraPositions.top.lookAt);
        controls.target.copy(cameraPositions.top.lookAt);
        topCamera.up.set(0, 0, -1);

        const aspect = window.innerWidth / window.innerHeight;
        topCamera.left = -5 * aspect;
        topCamera.right = 5 * aspect;
        topCamera.top = 5;
        topCamera.bottom = -5;
        topCamera.updateProjectionMatrix();
    }

    camera = newCamera;
    controls.object = camera;
    controls.update();
}

function loadSkybox() {
    const textureLoader = new THREE.TextureLoader();

    function createMaterial(imagePath) {
        const texture = textureLoader.load(imagePath);
        texture.magFilter = THREE.LinearFilter; // Prevents pixelation
        texture.minFilter = THREE.LinearMipMapLinearFilter; // Smooths out seams
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        return new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
    }

    const materials = [
        createMaterial("../textures/skybox/px.png"), // Right
        createMaterial("../textures/skybox/nx.png"), // Left
        createMaterial("../textures/skybox/py.png"), // Top
        createMaterial("../textures/skybox/ny.png"), // Bottom
        createMaterial("../textures/skybox/pz.png"), // Front
        createMaterial("../textures/skybox/nz.png")  // Back
    ];

    const skyboxGeometry = new THREE.BoxGeometry(51, 51, 51); // Large cube
    const skybox = new THREE.Mesh(skyboxGeometry, materials);
    scene.add(skybox);
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    mainCamera.aspect = aspect;
    zoomCamera.aspect = aspect;
    mainCamera.updateProjectionMatrix();
    zoomCamera.updateProjectionMatrix();
    topCamera.left = -5 * aspect;
    topCamera.right = 5 * aspect;
    topCamera.top = 5;
    topCamera.bottom = -5;
    topCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}