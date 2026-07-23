import * as THREE from 'three';
import { scene, camera, renderer, controls } from './scene/setup';
import { initEnvironment, updateTimeOfDay } from './scene/environment';
import { initSky, animateSky } from './scene/sky';
import { updateWeatherAnimation, updateWeatherSystem } from './scene/weather';
import { initVRM, updateVRM, checkAFK, resetAFKTimer, stopIdleOnCameraMove } from './vrm/VRMManager';
import { initUI } from './ui/UIManager';
import { initCustomSelects } from "./customSelect";
import { cameraState } from './core/state';
import { initAuth } from './core/auth';
import { applyLanguage } from './i18n';
import "./style.css";

// Khởi tạo ngôn ngữ cực sớm cho màn hình tải
let savedLang = 'vi';
try {
    const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
    if (settings.language) savedLang = settings.language;
} catch(e) {}
applyLanguage(savedLang);

// Khởi tạo môi trường mặc định
initSky(scene);
initEnvironment('petals');
updateTimeOfDay('auto');

// Khởi tạo tính năng Đăng nhập & Hồ sơ
await initAuth();

// Gọi tạo UI, Gán các sự kiện
initUI();

// Khởi tạo VRM (Mô hình 3D nhân vật)
initVRM();

// Cập nhật cấu hình form drop-down
initCustomSelects();

let lastTime = performance.now();
let elapsedTime = 0;

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  let delta = (now - lastTime) / 1000;
  lastTime = now;
  
  if (delta > 0.1) {
    delta = 1 / 60;
  }

  elapsedTime += delta;
  const time = elapsedTime;

  updateWeatherAnimation(delta, time);
  animateSky(delta);
  updateVRM(delta, time);

  // Kiểm tra AFK tự động
  checkAFK();

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

// Resize handler
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- AFK LOGIC ---
// Di chuột thông thường KHÔNG reset AFK (người dùng vẫn "đang rảnh")
// Chỉ khi camera THAY ĐỔI GÓC/ZOOM mới dừng animation nhàn rỗi
controls.addEventListener("change", stopIdleOnCameraMove);

// Click UI hoặc gõ bàn phím -> reset timer (nhưng chỉ dừng idle khi animation xong chu kỳ)
window.addEventListener("pointerdown", resetAFKTimer);
window.addEventListener("keydown", resetAFKTimer);

// KHI QUAY LẠI TAB: Reset timer để tránh việc bị quá thời gian AFK và nhảy animation đột ngột
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    resetAFKTimer();
  }
});
