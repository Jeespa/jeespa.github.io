import * as THREE from "../lib/three.module.js";
import { GLTFLoader } from "../lib/GLTFLoader.module.js";
import { OrbitControls } from "../lib/OrbitControls.module.js";
import { TWEEN } from "../lib/tween.module.min.js";
import { GUI } from "../lib/lil-gui.module.min.js";

let scene, camera, renderer, controls;
let loadedModels = {}
let cameras = {};
//const initialColor = { color: "#000000" };

// Paths for models
const models = [
    { name: "iPhone", displayName: "iPhone 16 Pro Max", path: "../models/iPhone16/iphone_16_pro_max.glb", position: new THREE.Vector3(0, 1, 0), scale: 1 },
    { name: "samsung", displayName: "Samsung S24 Ultra", path: "../models/Samsung/samsung_s24_ultra.glb", position: new THREE.Vector3(1.5, 1.01, 0), scale: 0.39 }
];

// Camera positions
const cameraPositions = {
    main: { // General view showing both phones
        position: new THREE.Vector3(1, 2, 7), // Higher and further back
        lookAt: new THREE.Vector3(0.75, 1, 0) // Between both phones
    },
    iPhone: {
        main: { position: new THREE.Vector3(-1, 1.5, 5), lookAt: new THREE.Vector3(0, 1, 0) },
        zoom: { position: new THREE.Vector3(0, 1, 3), lookAt: new THREE.Vector3(0, 1, 0) },
        top: { position: new THREE.Vector3(0, 5, 0), lookAt: new THREE.Vector3(0, 1, 0) },
        front: { position: new THREE.Vector3(0, 1, 4), lookAt: new THREE.Vector3(0, 1, 0) },
        back: { position: new THREE.Vector3(0, 1, -4), lookAt: new THREE.Vector3(0, 1, 0) }
    },
    samsung: {
        main: { position: new THREE.Vector3(2, 1.5, 5), lookAt: new THREE.Vector3(1.5, 1, 0) },
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
    cameras = {}; // Initialize cameras object

    // ✅ Create General Main Camera
    if (cameraPositions.main) {
        cameras.main = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
        cameras.main.position.copy(cameraPositions.main.position);
        cameras.main.lookAt(cameraPositions.main.lookAt);
    } else {
        console.error("Error: cameraPositions.main is missing!");
    }

    // ✅ Create Cameras for Each Phone
    Object.keys(cameraPositions).forEach(phone => {
        if (phone === "main") return; // Already initialized the general camera

        cameras[phone] = {}; // ✅ Ensure cameras[phone] exists

        Object.keys(cameraPositions[phone]).forEach(view => {
            let targetPosition = cameraPositions[phone][view];

            if (!targetPosition) {
                console.error(`Error: Missing camera position for ${phone} - ${view}`);
                return;
            }

            let cam;
            if (view === "top") {
                cam = new THREE.OrthographicCamera(-5 * aspect, 5 * aspect, 5, -5, 0.1, 100);
            } else {
                cam = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
            }

            cam.position.copy(targetPosition.position);
            cam.lookAt(targetPosition.lookAt);
            cameras[phone][view] = cam; // ✅ Store the camera correctly
        });
    });

    // ✅ Set the default camera to the general main view
    camera = cameras.main || Object.values(cameras)[0]; // Fallback to any available camera

    // Initialize orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0.75, 1, 0);
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
        new THREE.PlaneGeometry(50, 50),
        new THREE.MeshStandardMaterial({ color: 0xcccccc })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    window.addEventListener("resize", onWindowResize);
}

function loadProducts() {
    const loader = new GLTFLoader();
    let loadedCount = 0;

    models.forEach(({ name, path, position, scale }) => {
        loader.load(path, (gltf) => {
            const model = gltf.scene;
            model.position.copy(position);
            model.scale.set(scale, scale, scale);
            model.userData.isFlipped = false;

            let group = new THREE.Group();
            group.add(model);

            model.position.set(0, 0, 0);
            group.position.copy(position);

            // ✅ Correct rotation logic
            if (name === "samsung") {
                model.rotation.x = Math.PI;
                model.rotation.z = Math.PI;
            }

            if (name === "iPhone") {
                model.rotation.y = Math.PI / 2;
            }

            // ✅ Fix pivot point
            let box = new THREE.Box3().setFromObject(model);
            let center = new THREE.Vector3();
            box.getCenter(center);
            model.position.sub(center);

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            scene.add(group);
            loadedModels[name] = group;

            loadedCount++;
            if (loadedCount === models.length) {
                setupGUI();
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

    // General Main Camera
    const generalViewFolder = gui.addFolder("General Camera Views");
    generalViewFolder.add({ main: () => switchCamera("main", "main") }, "main").name("Main View");
    generalViewFolder.open();

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

    // Flip Phones
    const flipFolder = gui.addFolder("Flip Phones");

    models.forEach(({ name, displayName }) => {
        flipFolder.add({ flip: () => toggleFlip(loadedModels[name]) }, "flip").name(`Flip ${displayName}`);
    });

    flipFolder.open();
}

function switchCamera(phone, view) {
    let targetPosition;

    if (phone === "main") {
        targetPosition = cameraPositions.main;
        camera = cameras.main;
    } else {
        if (!cameraPositions[phone] || !cameraPositions[phone][view]) {
            console.error(`Error: Camera position not found for ${phone} - ${view}`);
            return;
        }

        targetPosition = cameraPositions[phone][view];
        camera = cameras[phone][view];
    }

    if (!targetPosition) return;

    // ✅ Correct aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

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

    // ✅ Update the general main camera separately
    if (cameras.main) {
        cameras.main.aspect = aspect;
        cameras.main.updateProjectionMatrix();
    }

    // ✅ Update all phone cameras dynamically
    Object.keys(cameras).forEach(phone => {
        Object.keys(cameras[phone]).forEach(view => {
            let cam = cameras[phone][view];

            if (!cam) {
                console.warn(`Warning: Missing camera for ${phone} - ${view}`);
                return;
            }

            if (cam.isPerspectiveCamera) {
                cam.aspect = aspect;
                cam.updateProjectionMatrix();
            } else if (cam.isOrthographicCamera) {
                cam.left = -5 * aspect;
                cam.right = 5 * aspect;
                cam.top = 5;
                cam.bottom = -5;
                cam.updateProjectionMatrix();
            }
        });
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
}