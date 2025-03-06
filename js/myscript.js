import * as THREE from "../lib/three.module.js";
import { GLTFLoader } from "../lib/GLTFLoader.module.js";
import { OrbitControls } from "../lib/OrbitControls.module.js";
import { TWEEN } from "../lib/tween.module.min.js";
import { GUI } from "../lib/lil-gui.module.min.js";

let scene, camera, renderer, controls, productModel;
let mainCamera, topCamera, zoomCamera;
const productPath = "../models/phone/iphone_mini.glb"; // Change to your model
const initialColor = { color: "#ff0000" }; // Global initial color of the product

// Camera positions & reset points
const cameraPositions = {
    main: { position: new THREE.Vector3(1.5, 1, 2), lookAt: new THREE.Vector3(0, 1, 0) },
    zoom: { position: new THREE.Vector3(1, 0.5, 1), lookAt: new THREE.Vector3(0, 1, 0) },
    top: { position: new THREE.Vector3(0, 1.5, 0), lookAt: new THREE.Vector3(0, 0, 0) }
};

init();
loadSkybox();
loadProduct();
setupGUI();
animate();

function init() {
    // Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Aspect Ratio
    const aspect = window.innerWidth / window.innerHeight;

    // Define Fixed Cameras Using Global Positions
    mainCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    mainCamera.position.copy(cameraPositions.main.position);
    mainCamera.lookAt(cameraPositions.main.lookAt);

    zoomCamera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    zoomCamera.position.copy(cameraPositions.zoom.position);
    zoomCamera.lookAt(cameraPositions.zoom.lookAt);

    topCamera = new THREE.OrthographicCamera(-5 * aspect, 5 * aspect, 5, -5, 0.1, 100);
    topCamera.position.copy(cameraPositions.top.position);
    topCamera.lookAt(cameraPositions.top.lookAt);

    // Default Camera
    camera = mainCamera;

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();

    // Lights
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

function loadProduct() {
    const loader = new GLTFLoader();
    loader.load(productPath, (gltf) => {
        productModel = gltf.scene;

        // Adjust model scale
        productModel.scale.set(2, 2, 2); // Increase size (adjust if needed)

        // Rotate to make it stand upright
        productModel.rotation.x = -Math.PI / 2; // Stand the phone up
        productModel.rotation.y = Math.PI; // Rotate 180° on Y-axis to fix orientation

        // Move slightly up so it doesn’t clip into the floor
        productModel.position.y = 1;

        // Convert initialColor to a Three.js Color
        const appliedColor = new THREE.Color(initialColor.color);

        // Enable shadows and apply the initial color
        productModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Apply the color while keeping the material properties
                if (child.material) {
                    child.material.color.set(appliedColor);
                    child.material.needsUpdate = true;
                }
            }
        });

        scene.add(productModel);
    });
}

function setupGUI() {
    const gui = new GUI();
    const cameraFolder = gui.addFolder("Camera Views");

    cameraFolder.add({ main: () => switchCamera(mainCamera) }, "main").name("Main View");
    cameraFolder.add({ top: () => switchCamera(topCamera) }, "top").name("Top View");
    cameraFolder.add({ zoom: () => switchCamera(zoomCamera) }, "zoom").name("Zoom View");

    cameraFolder.open();

    const colorFolder = gui.addFolder("Product Customization");
    colorFolder.addColor(initialColor, "color").onChange((value) => {
        productModel.traverse((child) => {
            if (child.isMesh) child.material.color.set(value);
        });
    });
    colorFolder.open();
}

function switchCamera(newCamera) {
    // Reset camera position and target dynamically
    if (newCamera === mainCamera) {
        mainCamera.position.copy(cameraPositions.main.position);
        mainCamera.lookAt(cameraPositions.main.lookAt);
        controls.target.copy(cameraPositions.main.lookAt); // Reset controls
    } else if (newCamera === zoomCamera) {
        zoomCamera.position.copy(cameraPositions.zoom.position);
        zoomCamera.lookAt(cameraPositions.zoom.lookAt);
        controls.target.copy(cameraPositions.zoom.lookAt); // Reset controls
    } else if (newCamera === topCamera) {
        // Reset topCamera position & manually set its frustum
        topCamera.position.copy(cameraPositions.top.position);
        topCamera.lookAt(cameraPositions.top.lookAt);
        controls.target.copy(cameraPositions.top.lookAt); // Reset controls

        // Ensure topCamera is looking straight down
        topCamera.up.set(0, 0, -1);

        // Update aspect ratio & projection for topCamera
        const aspect = window.innerWidth / window.innerHeight;
        topCamera.left = -5 * aspect;
        topCamera.right = 5 * aspect;
        topCamera.top = 5;
        topCamera.bottom = -5;
        topCamera.updateProjectionMatrix();
    }

    // Update active camera
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

    // Update topCamera correctly when resizing
    topCamera.left = -5 * aspect;
    topCamera.right = 5 * aspect;
    topCamera.top = 5;
    topCamera.bottom = -5;
    topCamera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}