import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { scene, groundClipPlane, ambientLight, directionalLight, hemiLight } from "./setup";

export const sakuraTrees: THREE.Object3D[] = [];
export const lanternLights: THREE.PointLight[] = [];
const envLoader = new GLTFLoader();

export function updateTimeOfDay(timeMode: string) {
  const body = document.body;
  let actualTimeMode = timeMode;
  if (timeMode === 'auto') {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 10) actualTimeMode = 'morning';
    else if (hour >= 10 && hour < 16) actualTimeMode = 'noon';
    else if (hour >= 16 && hour < 19) actualTimeMode = 'sunset';
    else actualTimeMode = 'night';
  }

  if (actualTimeMode === 'morning') {
    (scene.fog as THREE.FogExp2).color.set('#fff1eb');
    ambientLight.color.set('#ffffff');
    ambientLight.intensity = 1.0;
    directionalLight.color.set('#ffffff');
    directionalLight.intensity = 2.0;
    hemiLight.intensity = 1.0;
    body.style.background = 'linear-gradient(to bottom, #fff1eb 0%, #ace0f9 100%)';
  } else if (actualTimeMode === 'noon') {
    (scene.fog as THREE.FogExp2).color.set('#e0f7fa');
    ambientLight.color.set('#ffffff');
    ambientLight.intensity = 1.2;
    directionalLight.color.set('#ffffff');
    directionalLight.intensity = 2.5;
    hemiLight.intensity = 1.2;
    body.style.background = 'linear-gradient(to bottom, #e0f7fa 0%, #80d0c7 100%)';
  } else if (actualTimeMode === 'sunset') {
    (scene.fog as THREE.FogExp2).color.set('#ffb28b');
    ambientLight.color.set('#ffb28b');
    ambientLight.intensity = 0.4; 
    directionalLight.color.set('#ff8a66');
    directionalLight.intensity = 2.0;
    hemiLight.intensity = 0.4; 
    body.style.background = 'linear-gradient(to bottom, #ffb28b 0%, #d47e8c 100%)';
  } else if (actualTimeMode === 'night') {
    (scene.fog as THREE.FogExp2).color.set('#101230');
    ambientLight.color.set('#5a5a8a');
    ambientLight.intensity = 0.3; 
    directionalLight.color.set('#b0b0ff');
    directionalLight.intensity = 0.2; 
    hemiLight.intensity = 0.1;
    body.style.background = 'linear-gradient(to bottom, #101230 0%, #202040 100%)';
  }

  const isNight = (actualTimeMode === 'night');
  lanternLights.forEach(light => {
    light.intensity = isNight ? 15.0 : 0.0;
    light.castShadow = isNight; 
    if (light.children.length > 0) {
      light.children[0].visible = isNight;
    }
  });
}

export function applyWeatherToTrees(weather: string) {
  sakuraTrees.forEach((tree) => {
    tree.traverse((child: any) => {
      if (child.isMesh && child.material) {
        if (weather === 'snow') {
          child.material.color.setHex(0xffffff); 
        } else {
          child.material.color.setHex(0xffffff); 
        }
      }
    });
  });
}

export function initEnvironment(initialWeather: string) {
  envLoader.load(
    "/Map/sakura.glb",
    (gltf) => {
      const originalTree = gltf.scene;
      originalTree.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = false; 
          if (child.material) {
            child.material = child.material.clone();
            child.material.alphaTest = 0.5;
            child.material.needsUpdate = true;
            child.material.clippingPlanes = [groundClipPlane];
          }
        }
      });

      const treePositions = [
        { x: -1, z: -1.5, scale: 12 },     
        { x: -2, z: 0.5, scale: 9 },      
        { x: 1.5, z: -0.5, scale: 7 },    
      ];

      treePositions.forEach((pos) => {
        const treeClone = originalTree.clone();
        treeClone.position.set(pos.x, -0.07, pos.z); 
        treeClone.scale.set(pos.scale, pos.scale, pos.scale);
        treeClone.rotation.y = Math.random() * Math.PI * 2; 
        scene.add(treeClone);
        sakuraTrees.push(treeClone);
      });

      applyWeatherToTrees(initialWeather);
    }
  );

  envLoader.load(
    "/Map/yatai.glb",
    (gltf) => {
      const yatai = gltf.scene;
      yatai.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.clippingPlanes = [groundClipPlane];
          }
        }
      });
      yatai.position.set(0.4, -0.07, -2.1); 
      yatai.scale.set(0.2, 0.2, 0.2); 
      yatai.rotation.y = 18.8; 
      scene.add(yatai);
    }
  );

  envLoader.load(
    "/Map/old_japanese_lantern.glb",
    (gltf) => {
      const originalLantern = gltf.scene;
      originalLantern.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.clippingPlanes = [groundClipPlane];
            if (child.material.transparent || child.material.opacity < 1) {
              child.castShadow = false;
            }
          }
        }
      });

      const lanternPositions = [
        { x: -2, y: -0.22, z: -1.35, scale: 1.2 }, 
        { x: -1.5, y: -0.22, z: 1.2, scale: 1.2 },  
      ];

      lanternPositions.forEach((pos) => {
        const lantern = originalLantern.clone();
        lantern.position.set(pos.x, pos.y, pos.z);
        lantern.scale.set(pos.scale, pos.scale, pos.scale);
        lantern.rotation.y = Math.random() * Math.PI;
        scene.add(lantern);

        const pLight = new THREE.PointLight(0xffa500, 0, 5.0); 
        pLight.castShadow = true;
        pLight.shadow.mapSize.width = 512; 
        pLight.shadow.mapSize.height = 512;
        pLight.shadow.bias = -0.001; 

        const bulbGeometry = new THREE.SphereGeometry(0.12, 16, 16); 
        const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
        const bulbMesh = new THREE.Mesh(bulbGeometry, bulbMaterial);
        pLight.add(bulbMesh); 

        pLight.position.set(pos.x, pos.y + 1.45, pos.z);
        scene.add(pLight);
        lanternLights.push(pLight);
      });
    }
  );

  envLoader.load(
    "/Map/rocky_ground_with_moss.glb",
    (gltf) => {
      const originalGround = gltf.scene;
      originalGround.traverse((child: any) => {
        if (child.isMesh) {
          child.receiveShadow = true;
          child.castShadow = false; 
        }
      });

      originalGround.scale.set(0.3, 0.3, 0.3); 
      const bbox = new THREE.Box3().setFromObject(originalGround);
      const size = new THREE.Vector3();
      bbox.getSize(size);

      const tileWidth = size.x * 0.9; 
      const tileDepth = size.z * 0.9;
      const offsets = [-0.5, 0.5];
      for (const i of offsets) {
        for (const j of offsets) {
          const tile = originalGround.clone();
          tile.position.set(i * tileWidth, -0.07, j * tileDepth);
          scene.add(tile);
        }
      }
    }
  );
}
