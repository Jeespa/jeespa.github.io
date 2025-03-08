import * as THREE from "../lib/three.module.js";
import { GLTFLoader } from "../lib/GLTFLoader.module.js";
import { OrbitControls } from "../lib/OrbitControls.module.js";
import { TWEEN } from "../lib/tween.module.min.js";
import { GUI } from "../lib/lil-gui.module.min.js";

let scene, camera, renderer, controls;
let loadedModels = {}
let cameras = {};

// Paths for models
const models = [
    { name: "iPhone", displayName: "iPhone 16 Pro Max", path: "../models/iPhone16/iphone_16_pro_max.glb", position: new THREE.Vector3(0, 1, 0), scale: 1 },
    { name: "Samsung", displayName: "Samsung S24 Ultra", path: "../models/Samsung/samsung_s24_ultra.glb", position: new THREE.Vector3(1.5, 1.01, 0), scale: 0.39 }
];

// Camera positions
const cameraPositions = {
    main: {
        main: { position: new THREE.Vector3(1, 2, 7), lookAt: new THREE.Vector3(0.75, 1, 0) },
    },
    iPhone: {
        main: { position: new THREE.Vector3(-1, 1.5, 5), lookAt: new THREE.Vector3(0, 1, 0) },
        front: { position: new THREE.Vector3(0, 1, 4), lookAt: new THREE.Vector3(0, 1, 0) },
        zoom: { position: new THREE.Vector3(0, 1, 3), lookAt: new THREE.Vector3(0, 1, 0) },
        top: { position: new THREE.Vector3(0, 2.5, 0), lookAt: new THREE.Vector3(0, 1, 0) },
        back: { position: new THREE.Vector3(0, 1, -4), lookAt: new THREE.Vector3(0, 1, 0) }
    },
    Samsung: {
        main: { position: new THREE.Vector3(2.5, 1.5, 5), lookAt: new THREE.Vector3(1.5, 1, 0) },
        front: { position: new THREE.Vector3(1.5, 1, 4), lookAt: new THREE.Vector3(1.5, 1, 0) },
        zoom: { position: new THREE.Vector3(1.5, 1, 3), lookAt: new THREE.Vector3(1.5, 1, 0) },
        top: { position: new THREE.Vector3(1.5, 2.5, 0), lookAt: new THREE.Vector3(1.5, 1, 0) },
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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const aspect = window.innerWidth / window.innerHeight;
    cameras = {}; // Reset camera storage

    // Create Cameras for Each Section (Including "Main" Now)
    Object.keys(cameraPositions).forEach(phone => {
        cameras[phone] = {}; // Ensure cameras[phone] exists

        Object.keys(cameraPositions[phone]).forEach(view => {
            let targetPosition = cameraPositions[phone][view];

            if (!targetPosition) {
                console.error(`Error: Missing camera position for ${phone} - ${view}`);
                return;
            }

            let cam;
            if (view === "top") {
                cam = new THREE.OrthographicCamera(-2.5 * aspect, 2.5 * aspect, 2.5, -2.5, 0.1, 100);
            } else {
                cam = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
            }

            cam.position.copy(targetPosition.position);
            cam.lookAt(targetPosition.lookAt);
            cameras[phone][view] = cam; // Store the camera correctly
        });
    });

    // Set the default camera
    camera = cameras.main.main; // Use the new structured main camera

    // Initialize orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0.75, 1, 0);
    controls.update();

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(3.4, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Floor
    // Calculate the midpoint between iPhone and Samsung positions
    const phone1 = models[0].position; // iPhone position
    const phone2 = models[1].position; // Samsung position

    const centerX = (phone1.x + phone2.x) / 2;
    const centerZ = (phone1.z + phone2.z) / 2;

    // Determine the largest distance (to ensure a square shape)
    const phoneDistance = Math.abs(phone2.x - phone1.x);
    const floorSize = Math.max(phoneDistance + 5, 15); // Ensure it's at least 15x15

    // Create and position the floor (Square)
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(floorSize, floorSize), // Square shape
        new THREE.MeshStandardMaterial({ color: 0xcccccc })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(centerX, 0, centerZ); // Centered between the phones
    floor.receiveShadow = true;
    scene.add(floor);


    window.addEventListener("resize", onWindowResize);
}


function loadProducts() {
    const loader = new GLTFLoader();
    let loadedCount = 0;

    // Create video element and texture
    const video = document.createElement("video");
    video.src = "../videos/test.mp4"; // Adjust path if needed
    video.loop = true;
    video.muted = true;  
    video.play();

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;

    models.forEach(({ name, path, position, scale }) => {
        loader.load(path, (gltf) => {
            const model = gltf.scene;
            model.position.copy(position);
            model.scale.set(scale, scale, scale);

            // Create a parent group to manage position & rotation
            let group = new THREE.Group();
            group.add(model);
            group.position.copy(position);
            group.userData.isFlipped = false;
            group.userData.isSpinning = false;

            model.position.set(0, 0, 0); // Ensure model is centered in the group

            // Adjust rotations per phone model
            if (name.toLowerCase() === "samsung") {
                model.rotation.x = Math.PI;
                model.rotation.z = Math.PI;
            }
            if (name.toLowerCase() === "iphone") {
                model.rotation.y = Math.PI / 2;
            }

            // Fix pivot point
            let box = new THREE.Box3().setFromObject(model);
            let center = new THREE.Vector3();
            box.getCenter(center);
            model.position.sub(center);

            // Apply shadows
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    if (name === "iPhone" && child.name === "Cube014_screen001_0") {
                        console.log("Applying video to iPhone screen...");
                    
                        child.material = new THREE.MeshBasicMaterial({
                            map: videoTexture,
                            side: THREE.BackSide, 
                        });
                    
                        // Ensure proper texture wrapping to avoid stretching
                        videoTexture.wrapS = THREE.ClampToEdgeWrapping;
                        videoTexture.wrapT = THREE.ClampToEdgeWrapping;
                        videoTexture.minFilter = THREE.LinearFilter;
                        videoTexture.magFilter = THREE.LinearFilter;
                        videoTexture.generateMipmaps = false;
                    
                        // Auto-scale to fit screen
                        const aspectRatio = videoTexture.image.videoWidth / videoTexture.image.videoHeight;
                        if (aspectRatio > 1) {
                            child.material.map.repeat.set(1, 1 / aspectRatio);
                        } else {
                            child.material.map.repeat.set(aspectRatio, 1);
                        }
                        
                        child.material.map.offset.set(0, 0);
                        child.material.map.needsUpdate = true;
                    }
                    
                    if (name === "Samsung" && child.name === "Object_9") {  
                        console.log("Applying video to Samsung screen...");
                    
                        child.material = new THREE.MeshBasicMaterial({
                            map: videoTexture,
                            side: THREE.FrontSide,  
                        });
                    
                        // Ensure proper texture wrapping to avoid stretching
                        videoTexture.wrapS = THREE.ClampToEdgeWrapping;
                        videoTexture.wrapT = THREE.ClampToEdgeWrapping;
                        videoTexture.minFilter = THREE.LinearFilter;
                        videoTexture.magFilter = THREE.LinearFilter;
                        videoTexture.generateMipmaps = false;
                    
                        // Auto-scale to fit screen
                        const aspectRatio = videoTexture.image.videoWidth / videoTexture.image.videoHeight;
                        if (aspectRatio > 1) {
                            child.material.map.repeat.set(1, 1 / aspectRatio);
                        } else {
                            child.material.map.repeat.set(aspectRatio, 1);
                        }
                    
                        child.material.map.offset.set(0, 0);
                        child.material.map.needsUpdate = true;
                    }                                                                                                                                                                                                                                              
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

function resetScene() {
    // Reset Camera to Main View
    switchCamera("main", "main");

    // Reset Phones (Position, Rotation, Spinning)
    Object.keys(loadedModels).forEach(name => {
        let modelGroup = loadedModels[name];
        let initialPosition = models.find(m => m.name === name).position;

        // Animate reset position
        new TWEEN.Tween(modelGroup.position)
            .to({ x: initialPosition.x, y: initialPosition.y, z: initialPosition.z }, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        // Animate reset rotation
        new TWEEN.Tween(modelGroup.rotation)
            .to({ x: 0, y: 0, z: 0 }, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        // Stop spinning
        modelGroup.userData.isSpinning = false;
    });
}

function setupGUI() {
    const gui = new GUI();

    // Camera Views
    Object.keys(cameraPositions).forEach(phone => {
        const folder = gui.addFolder(`${phone === "main" ? "General" : phone} Camera Views`);

        Object.keys(cameraPositions[phone]).forEach(view => {
            folder.add({ [view]: () => switchCamera(phone, view) }, view).name(`${view.charAt(0).toUpperCase() + view.slice(1)} View`);
        });

        folder.open();
    });

    // Flip Phones
    const flipFolder = gui.addFolder("Flip Phones");
    models.forEach(({ name, displayName }) => {
        if (loadedModels[name]) {
            flipFolder.add({ flip: () => toggleFlip(loadedModels[name]) }, "flip").name(`Flip ${displayName}`);
        }
    });
    flipFolder.open();

    // Spin Controls
    const spinFolder = gui.addFolder("Enable/Disable Rotation");
    models.forEach(({ name, displayName }) => {
        if (loadedModels[name]) {
            spinFolder.add(loadedModels[name].userData, "isSpinning").name(`Spin ${displayName}`);
        }
    });
    spinFolder.open();

    // Add Reset Button
    gui.add({ reset: resetScene }, "reset").name("Reset Scene");
}

function switchCamera(phone, view) {
    if (!cameraPositions[phone] || !cameraPositions[phone][view]) {
        console.error(`Error: Camera position not found for ${phone} - ${view}`);
        return;
    }

    let targetPosition = cameraPositions[phone][view];

    let startPos = camera.position.clone();
    let endPos = targetPosition.position.clone();
    let startLookAt = controls.target.clone();
    let endLookAt = targetPosition.lookAt.clone();

    let tween = new TWEEN.Tween({ t: 0 })
        .to({ t: 1 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(obj => {
            camera.position.lerpVectors(startPos, endPos, obj.t);
            controls.target.lerpVectors(startLookAt, endLookAt, obj.t);
            camera.lookAt(controls.target);
        })
        .onComplete(() => {
            controls.target.copy(endLookAt);
            camera.lookAt(controls.target);
            controls.update();
        })
        .start();
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

    // Rotate only if spinning is enabled
    Object.keys(loadedModels).forEach(name => {
        if (loadedModels[name] && loadedModels[name].userData.isSpinning) {
            loadedModels[name].rotation.y += 0.002; // Slow rotation
        }
    });

    renderer.render(scene, camera);
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;

    // Loop through all cameras, including "main"
    Object.keys(cameras).forEach(phone => {
        Object.keys(cameras[phone]).forEach(view => {
            let cam = cameras[phone][view];

            if (!cam) {
                console.warn(`Warning: Missing camera for ${phone} - ${view}`);
                return;
            }

            // Update perspective cameras
            if (cam.isPerspectiveCamera) {
                cam.aspect = aspect;
                cam.updateProjectionMatrix();
            } 
            // Update orthographic cameras (top view)
            else if (cam.isOrthographicCamera) {
                let orthoSize = 2.5; // Adjust this value for closer zoom
                cam.left = -orthoSize * aspect;
                cam.right = orthoSize * aspect;
                cam.top = orthoSize;
                cam.bottom = -orthoSize;
                cam.updateProjectionMatrix();
            }
        });
    });

    // Resize renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
}
