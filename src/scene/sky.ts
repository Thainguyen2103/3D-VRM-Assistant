import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { camera } from './setup';

let sky: Sky;
let sun: THREE.Vector3;
let stars: THREE.Points;
let cloudMesh: THREE.InstancedMesh;
const maxClouds = 150;
let cloudData: any[] = [];

// Create a simple cloud canvas texture
function createCloudTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    return new THREE.CanvasTexture(canvas);
}

export function initSky(scene: THREE.Scene) {
    // 1. SKY
    sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);
    
    sun = new THREE.Vector3();

    const uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = 10;
    uniforms['rayleigh'].value = 2;
    uniforms['mieCoefficient'].value = 0.002;
    uniforms['mieDirectionalG'].value = 0.99;

    // 2. STARS
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 2000;
    const posArray = new Float32Array(starsCount * 3);
    for(let i=0; i<starsCount*3; i+=3) {
        // Random points on upper hemisphere radius ~ 400
        const r = 400 + Math.random() * 100;
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(Math.random()); // only upper half
        posArray[i] = r * Math.sin(phi) * Math.cos(theta);
        posArray[i+1] = r * Math.cos(phi); // Y up
        posArray[i+2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starsMaterial = new THREE.PointsMaterial({
        size: 2.5,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: false
    });
    stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // 3. CLOUDS
    const cloudTex = createCloudTexture();
    const cloudGeo = new THREE.PlaneGeometry(15, 15);
    const cloudMat = new THREE.MeshBasicMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false
    });
    cloudMesh = new THREE.InstancedMesh(cloudGeo, cloudMat, maxClouds);
    const dummy = new THREE.Object3D();
    
    let currentClusterCenter = new THREE.Vector3();
    let clusterSpeed = 1.0;

    for (let i = 0; i < maxClouds; i++) {
        if (i % 15 === 0) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 60 + Math.random() * 80;
            currentClusterCenter.set(
                Math.cos(angle) * radius,
                30 + Math.random() * 30, 
                Math.sin(angle) * radius
            );
            clusterSpeed = (0.5 + Math.random() * 1.5) * (Math.random() > 0.5 ? 1 : -1);
        }
        
        const x = currentClusterCenter.x + (Math.random() - 0.5) * 20;
        const y = currentClusterCenter.y + (Math.random() - 0.5) * 10;
        const z = currentClusterCenter.z + (Math.random() - 0.5) * 20;
        
        dummy.position.set(x, y, z);
        dummy.lookAt(0, 0, 0); // Initial orientation
        
        const s = 1 + Math.random() * 2.0;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        cloudMesh.setMatrixAt(i, dummy.matrix);

        cloudData.push({
            speed: clusterSpeed
        });
    }
    cloudMesh.instanceMatrix.needsUpdate = true;
    scene.add(cloudMesh);
}

// Function to calculate sun position
function updateSunPosition(elevation: number, azimuth: number) {
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms['sunPosition'].value.copy(sun);
}

export function updateSkyTime(timeMode: string, directionalLight: THREE.DirectionalLight) {
    if (!sky || !stars || !cloudMesh) return;
    const uniforms = sky.material.uniforms;
    const starsMat = stars.material as THREE.PointsMaterial;
    const cloudMat = cloudMesh.material as THREE.MeshBasicMaterial;

    if (timeMode === 'morning') {
        updateSunPosition(15, -90); // East, low
        uniforms['turbidity'].value = 8;
        uniforms['rayleigh'].value = 1;
        starsMat.opacity = 0;
        cloudMat.color.setHex(0xffffff);
        cloudMat.opacity = 0.8;
        directionalLight.position.copy(sun).multiplyScalar(10);
    } 
    else if (timeMode === 'noon') {
        updateSunPosition(80, 0); // High in sky
        uniforms['turbidity'].value = 2;
        uniforms['rayleigh'].value = 0.2;
        starsMat.opacity = 0;
        cloudMat.color.setHex(0xffffff);
        cloudMat.opacity = 0.4;
        directionalLight.position.copy(sun).multiplyScalar(10);
    } 
    else if (timeMode === 'sunset') {
        updateSunPosition(5, 90); // West, low
        uniforms['turbidity'].value = 15;
        uniforms['rayleigh'].value = 3;
        starsMat.opacity = 0;
        cloudMat.color.setHex(0xff9966); // Tint clouds orange
        cloudMat.opacity = 0.9;
        directionalLight.position.copy(sun).multiplyScalar(10);
    } 
    else if (timeMode === 'night') {
        updateSunPosition(-10, 0); // Below horizon
        starsMat.opacity = 1.0;
        cloudMat.color.setHex(0x555566);
        cloudMat.opacity = 0.2; // Barely visible clouds at night
        // For night, directional light acts like moonlight
        directionalLight.position.set(2, 10, -5); 
    }
}

export function animateSky(deltaTime: number) {
    if (!cloudMesh || !stars) return;
    
    // Slowly move clouds
    const dummy = new THREE.Object3D();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < maxClouds; i++) {
        cloudMesh.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(position, rotation, scale);
        
        position.x += cloudData[i].speed * deltaTime;
        
        // Loop position if it goes too far
        if (position.x > 150) position.x = -150;
        if (position.x < -150) position.x = 150;

        dummy.position.copy(position);
        dummy.lookAt(camera.position); // Billboard to always face camera
        dummy.scale.copy(scale);
        dummy.updateMatrix();
        cloudMesh.setMatrixAt(i, dummy.matrix);
    }
    cloudMesh.instanceMatrix.needsUpdate = true;
    
    // Slow star rotation
    const starsMat = stars.material as THREE.PointsMaterial;
    if (starsMat.opacity > 0) {
        stars.rotation.y += deltaTime * 0.01;
    }
}
