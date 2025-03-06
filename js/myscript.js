import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.138/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.138/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.138/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.18.0/dist/lil-gui.esm.min.js';
import { TWEEN } from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js';

let scene, camera, renderer, controls, productModel;
let mainCamera, topCamera, zoomCamera;
const productPath = "../models/phone/iphone_mini.glb"; // Change to your model

init();
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

    // Cameras
    const aspect = window.innerWidth / window.innerHeight;
    mainCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    mainCamera.position.set(5, 2, 8);
    mainCamera.lookAt(0, 1, 0);
    
    topCamera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    topCamera.position.set(0, 10, 0);
    topCamera.lookAt(0, 0, 0);
    
    zoomCamera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    zoomCamera.position.set(2, 1, 3);
    zoomCamera.lookAt(0, 1, 0);
    
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
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshStandardMaterial({ color: 0xcccccc })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    window.addEventListener('resize', onWindowResize);
}

function loadProduct() {
    const loader = new GLTFLoader();
    loader.load(productPath, (gltf) => {
        productModel = gltf.scene;
        productModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        scene.add(productModel);
    });
}

function setupGUI() {
    const gui = new GUI();
    const cameraFolder = gui.addFolder('Camera Views');
    cameraFolder.add({ main: () => switchCamera(mainCamera) }, 'main').name('Main View');
    cameraFolder.add({ top: () => switchCamera(topCamera) }, 'top').name('Top View');
    cameraFolder.add({ zoom: () => switchCamera(zoomCamera) }, 'zoom').name('Zoom View');
    cameraFolder.open();

    const colorFolder = gui.addFolder('Product Customization');
    colorFolder.addColor({ color: '#ff0000' }, 'color').onChange((value) => {
        productModel.traverse((child) => {
            if (child.isMesh) child.material.color.set(value);
        });
    });
    colorFolder.open();
}

function switchCamera(newCamera) {
    camera = newCamera;
    controls.object = camera;
    controls.update();
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
    topCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
