import { appState, targetExpressions, poseState, targetPoseState, boneMapping, cameraState, savePoseToHistory, poses } from '../core/state';
import { loadFBXAnimation, currentVrm, currentMixer } from '../vrm/VRMManager';
import { updateTimeOfDay } from '../scene/environment';
import { updateWeatherSystem, setPetalCount } from '../scene/weather';
import { renderer, directionalLight, transformControl, controls } from '../scene/setup';
import { translations, applyLanguage, t } from '../i18n';
import { initAuth, supabase, currentUser } from '../core/auth';
import { CustomDialog } from './CustomDialog';
import { createIcons, icons } from 'lucide';

// Hàm hỗ trợ khóa góc (tránh phi vật lý) nhận vào object {x, y, z} theo độ (degrees)
const clampBoneDegrees = (
  boneKey: string,
  rot: { x: number; y: number; z: number },
) => {
  if (boneKey === "leftLowerLeg" || boneKey === "rightLowerLeg") {
    rot.x = Math.max(0, Math.min(150, rot.x));
    rot.y = 0;
    rot.z = 0;
  } else if (boneKey === "leftLowerArm") {
    rot.y = Math.max(-150, Math.min(0, rot.y));
    rot.x = 0;
    rot.z = 0;
  } else if (boneKey === "rightLowerArm") {
    rot.y = Math.max(0, Math.min(150, rot.y));
    rot.x = 0;
    rot.z = 0;
  } else if (boneKey === "leftUpperLeg" || boneKey === "rightUpperLeg") {
    rot.x = Math.max(-100, Math.min(45, rot.x));
  } else if (boneKey === "leftUpperArm" || boneKey === "rightUpperArm") {
    rot.x = Math.max(-180, Math.min(180, rot.x));
  } else if (boneKey === "head") {
    rot.x = Math.max(-30, Math.min(30, rot.x));
    rot.y = Math.max(-45, Math.min(45, rot.y));
    rot.z = Math.max(-20, Math.min(20, rot.z));
  } else if (boneKey === "neck") {
    rot.x = Math.max(-20, Math.min(20, rot.x));
    rot.y = Math.max(-45, Math.min(45, rot.y));
    rot.z = Math.max(-20, Math.min(20, rot.z));
  } else if (boneKey === "chest" || boneKey === "spine") {
    rot.x = Math.max(-20, Math.min(20, rot.x));
    rot.y = Math.max(-30, Math.min(30, rot.y));
    rot.z = Math.max(-20, Math.min(20, rot.z));
  } else if (boneKey === "leftFoot" || boneKey === "rightFoot") {
    rot.x = Math.max(-30, Math.min(45, rot.x));
    rot.y = Math.max(-15, Math.min(15, rot.y));
    rot.z = Math.max(-15, Math.min(15, rot.z));
  }
};

export function initUI() {
  createIcons({
    icons,
    nameAttr: 'data-lucide',
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      const target = e.target as HTMLElement;
      target.classList.add("active");
      const tabId = target.getAttribute("data-tab");
      if (tabId) document.getElementById(tabId)?.classList.add("active");
    });
  });

  const updateXYZUI = (x: number, y: number, z: number) => {
    (document.getElementById("bone-x") as HTMLInputElement).value = x.toFixed(1);
    (document.getElementById("bone-y") as HTMLInputElement).value = y.toFixed(1);
    (document.getElementById("bone-z") as HTMLInputElement).value = z.toFixed(1);
  };

  document.getElementById("pose-select")?.addEventListener("change", (e) => {
    const val = (e.target as HTMLSelectElement).value as keyof typeof poses;
    appState.pose = val;
    const target = poses[val];
    if (!target) return;
    
    Object.assign(targetPoseState, target); 
    // Simplified, normally we do deep copy or assign each object manually.
    
    document.querySelectorAll(".finger-slider").forEach((slider) => {
      const s = slider as HTMLInputElement;
      const fingerName = s.getAttribute("data-finger") as keyof typeof target.fingers;
      if (fingerName && target.fingers[fingerName] !== undefined) {
        s.value = target.fingers[fingerName].toString();
      }
    });
    savePoseToHistory();
  });

  document.querySelectorAll(".anim-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const animName = target.getAttribute("data-anim") || "";
      loadFBXAnimation(animName);
    });
  });

  document.querySelectorAll(".expr-slider").forEach((slider) => {
    slider.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      const exprName = target.getAttribute("data-expr");
      if (exprName) {
        targetExpressions[exprName as keyof typeof targetExpressions] = parseFloat(target.value);
      }
      const exprSelect = document.getElementById("expression-select") as HTMLSelectElement;
      if (exprSelect) exprSelect.value = "custom";
    });
  });

  document.getElementById("expression-select")?.addEventListener("change", (e) => {
    const val = (e.target as HTMLSelectElement).value;
    Object.keys(targetExpressions).forEach(key => (targetExpressions[key as keyof typeof targetExpressions] = 0));

    if (val !== "neutral" && val !== "custom") {
      targetExpressions[val as keyof typeof targetExpressions] = 1.0;
      if (val === "angry") {
        targetExpressions["angry"] = 0.75;
        targetExpressions["sad"] = 0.5;
        targetExpressions["blink"] = 0.1;
      }
      if (val === "surprised") {
        targetExpressions["surprised"] = 1.0;
        targetExpressions["oh"] = 0.8;
      }
    }

    Object.keys(targetExpressions).forEach((key) => {
      const slider = document.getElementById(`slider-${key}`) as HTMLInputElement;
      if (slider) slider.value = targetExpressions[key as keyof typeof targetExpressions].toString();
    });
  });

  document.getElementById("finger-curl-slider")?.addEventListener("input", (e) => {
    const val = parseInt((e.target as HTMLInputElement).value);
    Object.keys(targetPoseState.fingers).forEach((key) => {
      targetPoseState.fingers[key as keyof typeof targetPoseState.fingers] = val;
    });
    document.querySelectorAll(".finger-slider").forEach((slider) => {
      (slider as HTMLInputElement).value = val.toString();
    });
  });
  document.getElementById("finger-curl-slider")?.addEventListener("change", savePoseToHistory);

  document.querySelectorAll(".finger-slider").forEach((slider) => {
    slider.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      const fingerName = target.getAttribute("data-finger");
      if (fingerName) {
        targetPoseState.fingers[fingerName as keyof typeof targetPoseState.fingers] = parseInt(target.value);
      }
    });
    slider.addEventListener("change", savePoseToHistory);
  });

  const syncXYZFromInput = () => {
    if (appState.activeBone === "none") return;
    const boneKey = boneMapping[appState.activeBone as keyof typeof boneMapping];
    if (boneKey && poseState[boneKey]) {
      const rot = {
        x: parseFloat((document.getElementById("bone-x") as HTMLInputElement).value) || 0,
        y: parseFloat((document.getElementById("bone-y") as HTMLInputElement).value) || 0,
        z: parseFloat((document.getElementById("bone-z") as HTMLInputElement).value) || 0,
      };

      clampBoneDegrees(boneKey, rot);
      
      poseState[boneKey].x = rot.x;
      poseState[boneKey].y = rot.y;
      poseState[boneKey].z = rot.z;
      targetPoseState[boneKey].x = rot.x;
      targetPoseState[boneKey].y = rot.y;
      targetPoseState[boneKey].z = rot.z;
      updateXYZUI(rot.x, rot.y, rot.z);
    }
  };

  ["bone-x", "bone-y", "bone-z"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", syncXYZFromInput);
    document.getElementById(id)?.addEventListener("change", savePoseToHistory);
  });

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key.toLowerCase() === 't') {
      transformControl.setMode('translate');
      transformControl.showX = true; transformControl.showY = true; transformControl.showZ = true;
    }
    if (e.key.toLowerCase() === 'r') {
      transformControl.setMode('rotate');
      transformControl.showX = true; transformControl.showY = true; transformControl.showZ = true;
    }
    if (e.key.toLowerCase() === 's') {
      transformControl.setMode('scale');
      transformControl.showX = true; transformControl.showY = true; transformControl.showZ = true;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      if (currentMixer) {
        currentMixer.timeScale = currentMixer.timeScale === 0 ? 1 : 0;
      }
    }

    const obj = transformControl.object;
    if (obj) {
      const stepT = 0.001; // 1mm or 0.1% scale
      const stepR = Math.PI / 180; // 1 độ
      const mode = transformControl.mode;
      let changed = false;

      if (mode === 'translate') {
        if (e.key === 'ArrowRight') { obj.translateX(stepT); changed = true; }
        if (e.key === 'ArrowLeft') { obj.translateX(-stepT); changed = true; }
        if (e.key === 'ArrowUp') { obj.translateY(stepT); changed = true; }
        if (e.key === 'ArrowDown') { obj.translateY(-stepT); changed = true; }
        if (e.key === 'PageUp') { obj.translateZ(stepT); changed = true; }
        if (e.key === 'PageDown') { obj.translateZ(-stepT); changed = true; }
      } else if (mode === 'rotate') {
        if (e.key === 'ArrowRight') { obj.rotateX(stepR); changed = true; }
        if (e.key === 'ArrowLeft') { obj.rotateX(-stepR); changed = true; }
        if (e.key === 'ArrowUp') { obj.rotateY(stepR); changed = true; }
        if (e.key === 'ArrowDown') { obj.rotateY(-stepR); changed = true; }
        if (e.key === 'PageUp') { obj.rotateZ(stepR); changed = true; }
        if (e.key === 'PageDown') { obj.rotateZ(-stepR); changed = true; }
      } else if (mode === 'scale') {
        let s = 0;
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') s = stepT;
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') s = -stepT;
        if (s !== 0) {
          obj.scale.x += s;
          obj.scale.y += s;
          obj.scale.z += s;
          changed = true;
        }
      }

      if (changed) {
        e.preventDefault();
        if (obj === (window as any).violinModel) {
          console.log(`%c[VIOLIN] %cPosition: set(${obj.position.x.toFixed(3)}, ${obj.position.y.toFixed(3)}, ${obj.position.z.toFixed(3)}) | Rotation: set(${obj.rotation.x.toFixed(3)}, ${obj.rotation.y.toFixed(3)}, ${obj.rotation.z.toFixed(3)}) | Scale: set(${obj.scale.x.toFixed(3)}, ${obj.scale.y.toFixed(3)}, ${obj.scale.z.toFixed(3)})`, "color: #e94560; font-weight: bold", "color: inherit;");
        } else if (obj === (window as any).bowModel) {
          console.log(`%c[BOW] %cPosition: set(${obj.position.x.toFixed(3)}, ${obj.position.y.toFixed(3)}, ${obj.position.z.toFixed(3)}) | Rotation: set(${obj.rotation.x.toFixed(3)}, ${obj.rotation.y.toFixed(3)}, ${obj.rotation.z.toFixed(3)}) | Scale: set(${obj.scale.x.toFixed(3)}, ${obj.scale.y.toFixed(3)}, ${obj.scale.z.toFixed(3)})`, "color: #4560e9; font-weight: bold", "color: inherit;");
        }
      }
    }
  });

  transformControl.addEventListener('dragging-changed', (event) => {
    controls.enabled = !event.value;
    if (!event.value) { // stopped dragging
      const obj = transformControl.object;
      if (obj === (window as any).violinModel) {
        console.log(`%c[VIOLIN] %cPosition: set(${obj.position.x.toFixed(3)}, ${obj.position.y.toFixed(3)}, ${obj.position.z.toFixed(3)}) | Rotation: set(${obj.rotation.x.toFixed(3)}, ${obj.rotation.y.toFixed(3)}, ${obj.rotation.z.toFixed(3)}) | Scale: set(${obj.scale.x.toFixed(3)}, ${obj.scale.y.toFixed(3)}, ${obj.scale.z.toFixed(3)})`, "color: #e94560; font-weight: bold", "color: inherit;");
      } else if (obj === (window as any).bowModel) {
        console.log(`%c[BOW] %cPosition: set(${obj.position.x.toFixed(3)}, ${obj.position.y.toFixed(3)}, ${obj.position.z.toFixed(3)}) | Rotation: set(${obj.rotation.x.toFixed(3)}, ${obj.rotation.y.toFixed(3)}, ${obj.rotation.z.toFixed(3)}) | Scale: set(${obj.scale.x.toFixed(3)}, ${obj.scale.y.toFixed(3)}, ${obj.scale.z.toFixed(3)})`, "color: #4560e9; font-weight: bold", "color: inherit;");
      }
    }
  });

  (window as any).onBoneSelect = (val: keyof typeof boneMapping) => {
    appState.activeBone = val;
    if (val === "none") {
      transformControl.detach();
    } else if (currentVrm && currentVrm.humanoid) {
      const boneKey = boneMapping[val];
      
      if (boneKey === "violin" || boneKey === "bow") {
          const m = boneKey === "violin" ? (window as any).violinModel : (window as any).bowModel;
          if (m) {
              transformControl.showX = true; transformControl.showY = true; transformControl.showZ = true;
              transformControl.attach(m);
              console.log(`Đã chọn ${boneKey}. Ấn phím 'T' để Di chuyển, 'R' để Xoay, 'S' để Phóng to thu nhỏ.`);
          }
          return;
      }

      const boneNode = currentVrm.humanoid.getNormalizedBoneNode(boneKey as any);
      if (boneKey && poseState[boneKey]) {
        updateXYZUI(poseState[boneKey].x, poseState[boneKey].y, poseState[boneKey].z);
      }
      if (boneNode) {
        transformControl.showX = true;
        transformControl.showY = true;
        transformControl.showZ = true;
        if (boneKey === "leftLowerLeg" || boneKey === "rightLowerLeg") {
          transformControl.showY = false; transformControl.showZ = false;
        } else if (boneKey === "leftLowerArm" || boneKey === "rightLowerArm") {
          transformControl.showX = false; transformControl.showZ = false;
        }
        transformControl.attach(boneNode);
      }
    }
  };

  document.querySelectorAll(".bone-btn").forEach((btn) => {    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".bone-btn").forEach((b) => b.classList.remove("active"));
      const target = e.target as HTMLElement;
      target.classList.add("active");
      const boneName = target.getAttribute("data-bone") as keyof typeof boneMapping;
      if (boneName && (window as any).onBoneSelect) {
        (window as any).onBoneSelect(boneName);
      }
    });
  });



  document.getElementById("cam-full")?.addEventListener("click", () => {
    cameraState.targetPos.set(0.0, 1.0, 3.5);
    cameraState.targetTarget.set(0.0, 0.8, 0.0);
    cameraState.isAnimating = true;
  });
  document.getElementById("cam-half")?.addEventListener("click", () => {
    cameraState.targetPos.set(0.0, 1.3, 1.5);
    cameraState.targetTarget.set(0.0, 1.2, 0.0);
    cameraState.isAnimating = true;
  });
  document.getElementById("cam-chest")?.addEventListener("click", () => {
    cameraState.targetPos.set(0.0, 1.45, 1.0);
    cameraState.targetTarget.set(0.0, 1.42, 0.0);
    cameraState.isAnimating = true;
  });
  document.getElementById("cam-face")?.addEventListener("click", () => {
    cameraState.targetPos.set(0.0, 1.45, 0.7);
    cameraState.targetTarget.set(0.0, 1.42, 0.0);
    cameraState.isAnimating = true;
  });

  document.getElementById("setting-shadow")?.addEventListener("change", (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (val === "off") {
      directionalLight.castShadow = false;
    } else {
      directionalLight.castShadow = true;
      if (val === "4k") {
        directionalLight.shadow.mapSize.width = 4096; directionalLight.shadow.mapSize.height = 4096;
      } else if (val === "2k") {
        directionalLight.shadow.mapSize.width = 2048; directionalLight.shadow.mapSize.height = 2048;
      } else if (val === "1k") {
        directionalLight.shadow.mapSize.width = 1024; directionalLight.shadow.mapSize.height = 1024;
      } else {
        directionalLight.shadow.mapSize.width = 512; directionalLight.shadow.mapSize.height = 512;
      }
      if (directionalLight.shadow.map) {
        directionalLight.shadow.map.dispose();
        directionalLight.shadow.map = null as any;
      }
    }
  });

  document.getElementById("setting-pixel-ratio")?.addEventListener("change", (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (val === "4k") renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    else if (val === "2k") renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    else if (val === "1k") renderer.setPixelRatio(1.0);
    else renderer.setPixelRatio(0.75);
  });

  document.getElementById("setting-time")?.addEventListener("change", (e) => {
    updateTimeOfDay((e.target as HTMLSelectElement).value);
  });

  document.getElementById("setting-weather")?.addEventListener("change", (e) => {
    updateWeatherSystem((e.target as HTMLSelectElement).value);
  });

  document.getElementById("setting-petals-count")?.addEventListener("input", (e) => {
    const val = parseInt((e.target as HTMLInputElement).value);
    setPetalCount(val);
    const display = document.getElementById("petal-count-display");
    if (display) display.textContent = val.toString();
  });

  function setupPanelToggle(panelId: string, closeBtnId: string, openBtnId: string) {
    const panel = document.getElementById(panelId);
    const closeBtn = document.getElementById(closeBtnId);
    const openBtn = document.getElementById(openBtnId);
    if (panel && closeBtn && openBtn) {
      closeBtn.addEventListener('click', () => { 
        panel.classList.add('panel-hidden'); 
        openBtn.style.display = 'flex'; 
        if (panelId === 'ui') {
          document.getElementById('control-panel')?.classList.add('shifted-up');
        }
      });
      openBtn.addEventListener('click', () => { 
        panel.classList.remove('panel-hidden'); 
        openBtn.style.display = 'none'; 
        if (panelId === 'ui') {
          document.getElementById('control-panel')?.classList.remove('shifted-up');
        }
      });
    }
  }
  setupPanelToggle('ui', 'close-ui', 'open-ui');
  setupPanelToggle('chat-ui-container', 'close-chat', 'open-chat');
  setupPanelToggle('control-panel', 'close-control', 'open-control');

  let currentLang = 'vi';
  try {
      const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
      if (settings.language) currentLang = settings.language;
  } catch(e) {}
  
  document.getElementById('setting-language')?.addEventListener('change', (e) => {
    currentLang = (e.target as HTMLSelectElement).value;
    applyLanguage(currentLang);
  });

  // TransformControls: Tắt OrbitControls khi kéo Gizmo, lưu lịch sử khi nhả
  transformControl.addEventListener("dragging-changed", (event: any) => {
    controls.enabled = !event.value;
    if (!event.value) {
      savePoseToHistory();
    }
  });

  const rad2deg = 180 / Math.PI;

  // TransformControls: Đọc góc xoay từ Gizmo -> cập nhật poseState + UI
  transformControl.addEventListener("objectChange", () => {
    if (!transformControl.object || appState.activeBone === "none") return;
    const bone = transformControl.object;
    const boneKey = boneMapping[appState.activeBone as keyof typeof boneMapping];
    if (!boneKey || !poseState[boneKey]) return;

    const degRot = {
      x: bone.rotation.x * rad2deg,
      y: bone.rotation.y * rad2deg,
      z: bone.rotation.z * rad2deg,
    };

    clampBoneDegrees(boneKey, degRot);

    poseState[boneKey].x = degRot.x;
    poseState[boneKey].y = degRot.y;
    poseState[boneKey].z = degRot.z;
    targetPoseState[boneKey].x = degRot.x;
    targetPoseState[boneKey].y = degRot.y;
    targetPoseState[boneKey].z = degRot.z;

    updateXYZUI(degRot.x, degRot.y, degRot.z);
  });

  // --- SETTINGS LOAD / SAVE ---
  const btnSaveSettings = document.getElementById('btn-save-settings') as HTMLButtonElement;
  const btnResetSettings = document.getElementById('btn-reset-settings') as HTMLButtonElement;

  async function loadSettings() {
    let settings: any = null;
    
    // Thử lấy từ Supabase nếu đã đăng nhập
    if (currentUser && supabase) {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('settings')
          .eq('id', currentUser.id)
          .single();
        if (data && data.settings) {
          settings = data.settings;
        }
      } catch (e) {
        console.warn("Lỗi khi tải cấu hình từ Supabase:", e);
      }
    }

    // Nếu không có trên Supabase, lấy từ localStorage
    if (!settings) {
      const local = localStorage.getItem('app_settings');
      if (local) settings = JSON.parse(local);
    }

    // Áp dụng cấu hình
    if (settings) {
      if (settings.language) {
         const el = document.getElementById("setting-language") as HTMLSelectElement;
         if (el) { el.value = settings.language; currentLang = settings.language; el.dispatchEvent(new Event('change')); }
      }
      if (settings.voice) {
         const el = document.getElementById("setting-voice") as HTMLSelectElement;
         if (el) { el.value = settings.voice; }
      }
      if (settings.shadow) {
         const el = document.getElementById("setting-shadow") as HTMLSelectElement;
         if (el) { el.value = settings.shadow; el.dispatchEvent(new Event('change')); }
      }
      if (settings.pixelRatio) {
         const el = document.getElementById("setting-pixel-ratio") as HTMLSelectElement;
         if (el) { el.value = settings.pixelRatio; el.dispatchEvent(new Event('change')); }
      }
      if (settings.time) {
         const el = document.getElementById("setting-time") as HTMLSelectElement;
         if (el) { el.value = settings.time; el.dispatchEvent(new Event('change')); }
      }
      if (settings.weather) {
         const el = document.getElementById("setting-weather") as HTMLSelectElement;
         if (el) { el.value = settings.weather; el.dispatchEvent(new Event('change')); }
      }
      if (settings.petalCount !== undefined) {
         const el = document.getElementById("setting-petals-count") as HTMLInputElement;
         if (el) { el.value = settings.petalCount; el.dispatchEvent(new Event('input')); }
      }
    }
  }

  // Chạy ngay khi khởi tạo UI (do initAuth đã gọi trước ở main.ts)
  loadSettings();

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', async () => {
      const settings = {
        language: (document.getElementById('setting-language') as HTMLSelectElement)?.value || 'vi',
        voice: (document.getElementById('setting-voice') as HTMLSelectElement)?.value || 'zh',
        shadow: (document.getElementById('setting-shadow') as HTMLSelectElement)?.value || 'off',
        pixelRatio: (document.getElementById('setting-pixel-ratio') as HTMLSelectElement)?.value || '1k',
        time: (document.getElementById('setting-time') as HTMLSelectElement)?.value || 'auto',
        weather: (document.getElementById('setting-weather') as HTMLSelectElement)?.value || 'clear',
        petalCount: (document.getElementById('setting-petals-count') as HTMLInputElement)?.value || '80',
      };

      const originalText = btnSaveSettings.innerText;
      btnSaveSettings.innerText = t('btn.saving');
      btnSaveSettings.disabled = true;

      // Lưu lên Supabase nếu có
      if (currentUser && supabase) {
        try {
          const { error } = await supabase
            .from('user_profiles')
            .update({ settings })
            .eq('id', currentUser.id);
          
          if (error) {
            console.error("Không thể lưu lên Supabase, có thể thiếu cột settings trong bảng user_profiles:", error);
            // Fallback
            localStorage.setItem('app_settings', JSON.stringify(settings));
          } else {
            // Lưu local như backup
            localStorage.setItem('app_settings', JSON.stringify(settings));
          }
        } catch(e) {
           console.error(e);
           localStorage.setItem('app_settings', JSON.stringify(settings));
        }
      } else {
        localStorage.setItem('app_settings', JSON.stringify(settings));
      }

      setTimeout(() => {
        btnSaveSettings.innerText = originalText;
        btnSaveSettings.disabled = false;
        
        // Tạo popup thông báo nhỏ
        const toast = document.createElement('div');
        toast.innerText = t("toast.saved_settings");
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = '#4CAF50';
        toast.style.color = 'white';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '5px';
        toast.style.zIndex = '9999';
        toast.style.transition = 'opacity 0.3s';
        document.body.appendChild(toast);

        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2000);
      }, 500);
    });
  }

  if (btnResetSettings) {
    btnResetSettings.addEventListener('click', async () => {
      if (await CustomDialog.confirm(t('confirm.reset_settings'))) {
        let savedLang = 'vi';
        try {
          const currentSettings = JSON.parse(localStorage.getItem('app_settings') || '{}');
          if (currentSettings.language) savedLang = currentSettings.language;
        } catch(e) {}
        
        const resetSettings = { language: savedLang };
        localStorage.setItem('app_settings', JSON.stringify(resetSettings));

        if (currentUser && supabase) {
          try {
            await supabase.from('user_profiles').update({ settings: resetSettings }).eq('id', currentUser.id);
          } catch(e) { console.error(e); }
        }
        window.location.reload();
      }
    });
  }
}
