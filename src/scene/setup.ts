import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { cameraState } from '../core/state';

export const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

export const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(1.0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;

export const groundClipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.05);

export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#fff1eb', 0.015);

export const camera = new THREE.PerspectiveCamera(
  35.0,
  window.innerWidth / window.innerHeight,
  0.1,
  500.0,
);
camera.position.set(0.0, 1.3, 1.5);

export const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0.0, 1.2, 0.0);
controls.enablePan = false;
controls.enableDamping = true;
controls.maxDistance = 20.0;
controls.minDistance = 0.3;
controls.mouseButtons = {
  LEFT: 0, 
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE,
};

export const transformControl = new TransformControls(camera, renderer.domElement);
transformControl.setMode("rotate");
transformControl.setSpace("local");
scene.add(transformControl.getHelper());

export const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
directionalLight.position.set(1.0, 2.0, 2.0);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -15;
directionalLight.shadow.camera.right = 15;
directionalLight.shadow.camera.top = 15;
directionalLight.shadow.camera.bottom = -15;
directionalLight.shadow.bias = -0.001;
scene.add(directionalLight);

export const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

export const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

window.addEventListener("contextmenu", (e) => e.preventDefault());

controls.addEventListener("start", () => {
  cameraState.isAnimating = false; // Hủy tự động di chuyển nếu người dùng tự kéo chuột
});
