import * as THREE from "../lib/three.module.js";
import { GLTFLoader } from "../lib/GLTFLoader.module.js";
import { OrbitControls } from "../lib/OrbitControls.module.js";
import { TWEEN } from "../lib/tween.module.min.js";
import { GUI } from "../lib/lil-gui.module.min.js";

let scene, camera, renderer, controls;
let mainCamera, topCamera, zoomCamera;
let loadedModels, cameras = {}; // Store models and their flip state
//const initialColor = { color: "#000000" };

// Paths for models
const models = [
    { 
        name: "iPhone 16 Pro Max", 
        path: "../models/iPhone16/iphone_16_pro_max.glb", 
        position: new THREE.Vector3(0, 1, 0), 
        scale: 1 
    },
    { 
        name: "Samsung S24 Ultra", 
        path: "../models/Samsung/samsung_s24_ultra.glb", 
        position: new THREE.Vector3(1.5, 1.01, 0), 
        scale: 0.39
    }
];


// Camera positions
const cameraPositions = {
    iPhone: {
        main: { position: new THREE.Vector3(0, 1, 6), lookAt: new THREE.Vector3(0, 1, 0) },
        zoom: { position: new THREE.Vector3(0, 1, 3), lookAt: new THREE.Vector3(0, 1, 0) },
        top: { position: new THREE.Vector3(0, 5, 0), lookAt: new THREE.Vector3(0, 1, 0) },
        front: { position: new THREE.Vector3(0, 1, 4), lookAt: new THREE.Vector3(0, 1, 0) },
        back: { position: new THREE.Vector3(0, 1, -4), lookAt: new THREE.Vector3(0, 1, 0) }
    },
    samsung: {
        main: { position: new THREE.Vector3(1.5, 1, 6), lookAt: new THREE.Vector3(1.5, 1, 0) },
        zoom: { position: new THREE.Vector3(1.5, 1, 3), lookAt: new THREE.Vector3(1.5, 1, 0) },
        top: { position: new THREE.Vector3(1.5, 5, 0), lookAt: new THREE.Vector3(1.5, 1, 0) },
        front: { position: new THREE.Vector3(1.5, 1, 4), lookAt: new THREE.Vector3(1.5, 1, 0) },
        back: { position: new THREE.Vector3(1.5, 1, -4), lookAt: new THREE.Vector3(1.5, 1, 0) }
    }
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

    // Initialize cameras dynamically for each phone
    Object.keys(cameraPositions).forEach(phone => {
        cameras[phone] = {}; // Create sub-object for the phone cameras

        Object.keys(cameraPositions[phone]).forEach(view => {
            let cam;
            if (view === "top") {
                // Orthographic camera for top-down views
                cam = new THREE.OrthographicCamera(-5 * aspect, 5 * aspect, 5, -5, 0.1, 100);
            } else {
                // Perspective camera for normal views
                cam = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
            }

            cam.position.copy(cameraPositions[phone][view].position);
            cam.lookAt(cameraPositions[phone][view].lookAt);
            cameras[phone][view] = cam; // Store in cameras object
        });
    });

    // Set default camera (iPhone main view)
    camera = cameras.iPhone.main;
    
    // Initialize orbit controls with default camera
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(4, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Floor
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(75, 75),
        new THREE.MeshStandardMaterial({ color: 0xcccccc })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    window.addEventListener("resize", onWindowResize);
}

function loadProducts() {
    const loader = new GLTFLoader();
    let loadedCount = 0; // Track loaded models count

    models.forEach(({ name, path, position, scale }) => {
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
                    //child.material.color.set(initialColor.color);
                }
            });

            scene.add(group);
            loadedModels[name] = group; // Store the model

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

    // iPhone Cameras
    const iphoneCameraFolder = gui.addFolder("iPhone 16 Pro Max - Camera Views");
    iphoneCameraFolder.add({ main: () => switchCamera("iPhone", "main") }, "main").name("Main View");
    iphoneCameraFolder.add({ zoom: () => switchCamera("iPhone", "zoom") }, "zoom").name("Zoom View");
    iphoneCameraFolder.add({ top: () => switchCamera("iPhone", "top") }, "top").name("Top View");
    iphoneCameraFolder.add({ front: () => switchCamera("iPhone", "front") }, "front").name("Front View");
    iphoneCameraFolder.add({ back: () => switchCamera("iPhone", "back") }, "back").name("Back View");
    iphoneCameraFolder.open();

    // Samsung Cameras
    const samsungCameraFolder = gui.addFolder("Samsung S24 Ultra - Camera Views");
    samsungCameraFolder.add({ main: () => switchCamera("samsung", "main") }, "main").name("Main View");
    samsungCameraFolder.add({ zoom: () => switchCamera("samsung", "zoom") }, "zoom").name("Zoom View");
    samsungCameraFolder.add({ top: () => switchCamera("samsung", "top") }, "top").name("Top View");
    samsungCameraFolder.add({ front: () => switchCamera("samsung", "front") }, "front").name("Front View");
    samsungCameraFolder.add({ back: () => switchCamera("samsung", "back") }, "back").name("Back View");
    samsungCameraFolder.open();

    // Add buttons to flip models
    const flipFolder = gui.addFolder("Flip Phones");
    Object.keys(loadedModels).forEach((key) => {
        flipFolder.add({ flip: () => toggleFlip(loadedModels[key]) }, "flip").name(`Flip ${key}`);
    });
    flipFolder.open();
}



function switchCamera(phone, view) {
    const targetPosition = cameraPositions[phone][view];

    if (!targetPosition) return;

    camera.position.copy(targetPosition.position);
    camera.lookAt(targetPosition.lookAt);
    controls.target.copy(targetPosition.lookAt);
    
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