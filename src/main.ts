import * as THREE from 'three';
import { scene, camera, renderer, controls } from './scene/setup';
import { initEnvironment } from './scene/environment';
import { updateWeatherAnimation, updateWeatherSystem } from './scene/weather';
import { initVRM, updateVRM } from './vrm/VRMManager';
import { initUI } from './ui/UIManager';
import { initCustomSelects } from "./customSelect";
import { cameraState } from './core/state';
import "./style.css";

// Khởi tạo môi trường mặc định
initEnvironment('petals');

// Gọi tạo UI, Gán các sự kiện
initUI();

// Khởi tạo VRM (Mô hình 3D nhân vật)
initVRM();

// Cập nhật cấu hình form drop-down
initCustomSelects();

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  let delta = clock.getDelta();
  
  if (delta > 0.1) {
    delta = 1 / 60;
  }

  const time = clock.elapsedTime;

  updateWeatherAnimation(delta, time);
  updateVRM(delta, time);

  if (cameraState.isAnimating) {
    camera.position.lerp(cameraState.targetPos, 5.0 * delta);
    controls.target.lerp(cameraState.targetTarget, 5.0 * delta);

    if (
      camera.position.distanceTo(cameraState.targetPos) < 0.01 &&
      controls.target.distanceTo(cameraState.targetTarget) < 0.01
    ) {
      camera.position.copy(cameraState.targetPos);
      controls.target.copy(cameraState.targetTarget);
      cameraState.isAnimating = false;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();
