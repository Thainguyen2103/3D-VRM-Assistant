import * as THREE from 'three';
import { scene } from './setup';
import { applyWeatherToTrees } from './environment';
import { appState } from '../core/state';

const MAX_PETALS = 300; 
export let currentPetalCount = 80; 
const petalGeometry = new THREE.PlaneGeometry(0.12, 0.12); 
const petalData: any[] = [];

const treeZones = [
  { x: -1, z: -1.5, radius: 2.5, height: 4.2 },   
  { x: -2, z: 0.5, radius: 2.0, height: 3.2 },    
  { x: 2.5, z: 1.5, radius: 1.5, height: 2.6 },  
];

for (let i = 0; i < MAX_PETALS; i++) {
  const zone = treeZones[Math.floor(Math.random() * treeZones.length)];
  const r = Math.random() * zone.radius;
  const theta = Math.random() * Math.PI * 2;

  petalData.push({
    x: zone.x + r * Math.cos(theta),
    y: (zone.height / 2) + Math.random() * (zone.height / 2),
    z: zone.z + r * Math.sin(theta),
    rotX: Math.random() * Math.PI * 2,
    rotY: Math.random() * Math.PI * 2,
    rotZ: Math.random() * Math.PI * 2,
    velY: 0.15 + Math.random() * 0.3, 
    velX: (Math.random() - 0.5) * 0.8,
    velZ: (Math.random() - 0.5) * 0.8,
    rotSpeedX: (Math.random() - 0.5) * 3, 
    rotSpeedY: (Math.random() - 0.5) * 3,
    rotSpeedZ: (Math.random() - 0.5) * 3,
    oscillationSpeed: 0.5 + Math.random() * 1.5,
    oscillationWidth: 0.2 + Math.random() * 0.5
  });
}

function createRainTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 8, 64);
  return new THREE.CanvasTexture(canvas);
}

const textureLoader = new THREE.TextureLoader();
const petalTexture = textureLoader.load('/Map/sakura_leaves.png');
petalTexture.colorSpace = THREE.SRGBColorSpace;
const rainTexture = createRainTexture();

const snowGeometry = new THREE.SphereGeometry(0.015, 6, 6); 

const petalMaterial = new THREE.MeshLambertMaterial({
  map: petalTexture,
  transparent: true,
  opacity: 1.0,
  alphaTest: 0.05,
  depthWrite: false,
  side: THREE.DoubleSide 
});

export const petalSystem = new THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>(petalGeometry, petalMaterial, MAX_PETALS);
petalSystem.count = currentPetalCount; 
const dummy = new THREE.Object3D(); 
scene.add(petalSystem);

export function updateWeatherSystem(weather: string) {
  (appState as any).currentWeather = weather;
  applyWeatherToTrees(weather);

  if (weather === 'clear') {
    petalSystem.visible = false;
  } else {
    petalSystem.visible = true;
    if (weather === 'petals') {
      petalSystem.geometry = petalGeometry;
      petalMaterial.map = petalTexture;
      petalMaterial.opacity = 1.0;
      petalMaterial.alphaTest = 0.05;
      petalMaterial.needsUpdate = true;
    } else if (weather === 'rain') {
      petalSystem.geometry = petalGeometry;
      petalMaterial.map = rainTexture;
      petalMaterial.opacity = 0.6;
      petalMaterial.alphaTest = 0.0;
      petalMaterial.needsUpdate = true;
    } else if (weather === 'snow') {
      petalSystem.geometry = snowGeometry;
      petalMaterial.map = null; 
      petalMaterial.opacity = 0.8;
      petalMaterial.alphaTest = 0.01;
      petalMaterial.needsUpdate = true;
    }
  }
}

export function setPetalCount(count: number) {
  currentPetalCount = count;
  petalSystem.count = count;
}

export function updateWeatherAnimation(deltaTime: number, time: number) {
  for (let i = 0; i < currentPetalCount; i++) {
    const data = petalData[i];

    if ((appState as any).currentWeather === 'rain') {
      data.y -= data.velY * deltaTime * 15.0; 
      data.x += data.velX * deltaTime * 0.2; 
      data.z += data.velZ * deltaTime * 0.2;

      dummy.position.set(data.x, data.y, data.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.1, 1.5, 0.1); 
    } else if ((appState as any).currentWeather === 'snow') {
      data.y -= data.velY * deltaTime * 0.5; 

      data.x += (Math.sin(time * data.oscillationSpeed * 0.5) * data.oscillationWidth * deltaTime) + (data.velX * deltaTime * 0.5);
      data.z += (Math.cos(time * data.oscillationSpeed * 0.5) * data.oscillationWidth * deltaTime) + (data.velZ * deltaTime * 0.5);

      data.rotX += data.rotSpeedX * deltaTime * 0.2;
      data.rotY += data.rotSpeedY * deltaTime * 0.2;
      data.rotZ += data.rotSpeedZ * deltaTime * 0.2;

      dummy.position.set(data.x, data.y, data.z);
      dummy.rotation.set(data.rotX, data.rotY, data.rotZ);

      let scale = 1.2;
      if (data.y < 0.8) scale = Math.max(0, (data.y / 0.8) * 1.2);
      dummy.scale.set(scale, scale, scale);
    } else {
      data.y -= data.velY * deltaTime;

      data.x += (Math.sin(time * data.oscillationSpeed) * data.oscillationWidth * deltaTime) + (data.velX * deltaTime);
      data.z += (Math.cos(time * data.oscillationSpeed) * data.oscillationWidth * deltaTime) + (data.velZ * deltaTime);

      data.rotX += data.rotSpeedX * deltaTime;
      data.rotY += data.rotSpeedY * deltaTime;
      data.rotZ += data.rotSpeedZ * deltaTime;

      let scale = 1.0;
      if (data.y < 0.8) {
        scale = Math.max(0, data.y / 0.8);
      }

      dummy.position.set(data.x, data.y, data.z);
      dummy.rotation.set(data.rotX, data.rotY, data.rotZ);
      dummy.scale.set(scale, scale, scale);
    }

    if (data.y < 0) {
      const zone = treeZones[Math.floor(Math.random() * treeZones.length)];
      const r = Math.random() * zone.radius;
      const theta = Math.random() * Math.PI * 2;

      if ((appState as any).currentWeather === 'petals') {
        data.y = zone.height - Math.random() * (zone.height * 0.3);
        data.x = zone.x + r * Math.cos(theta);
        data.z = zone.z + r * Math.sin(theta);
      } else {
        data.y = 5.0 + Math.random() * 2.0;
        data.x = (Math.random() - 0.5) * 12.0;
        data.z = (Math.random() - 0.5) * 12.0;
      }
    }

    dummy.updateMatrix();
    petalSystem.setMatrixAt(i, dummy.matrix);
  }
  petalSystem.instanceMatrix.needsUpdate = true;
}
