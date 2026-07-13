import { appState, targetExpressions, poseState, targetPoseState, boneMapping, cameraState, savePoseToHistory, poses } from '../core/state';
import { loadFBXAnimation, currentVrm } from '../vrm/VRMManager';
import { updateTimeOfDay } from '../scene/environment';
import { updateWeatherSystem, setPetalCount } from '../scene/weather';
import { renderer, directionalLight, transformControl } from '../scene/setup';
import { translations } from '../i18n';
import { setupChatbot } from './chatbot';

export function initUI() {
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

  (window as any).onBoneSelect = (val: keyof typeof boneMapping) => {
    appState.activeBone = val;
    if (val === "none") {
      transformControl.detach();
    } else if (currentVrm && currentVrm.humanoid) {
      const boneKey = boneMapping[val];
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

  document.querySelectorAll(".bone-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
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
      closeBtn.addEventListener('click', () => { panel.classList.add('panel-hidden'); openBtn.style.display = 'flex'; });
      openBtn.addEventListener('click', () => { panel.classList.remove('panel-hidden'); openBtn.style.display = 'none'; });
    }
  }
  setupPanelToggle('ui', 'close-ui', 'open-ui');
  setupPanelToggle('chat-ui', 'close-chat', 'open-chat');
  setupPanelToggle('control-panel', 'close-control', 'open-control');

  let currentLang = 'vi';
  function applyLanguage(lang: string) {
    const t = translations[lang];
    if (!t) return;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key && t[key]) {
        if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
          (el as HTMLInputElement).placeholder = t[key];
        } else {
          el.textContent = t[key];
        }
      }
    });
  }
  document.getElementById('setting-language')?.addEventListener('change', (e) => {
    currentLang = (e.target as HTMLSelectElement).value;
    applyLanguage(currentLang);
  });
  applyLanguage(currentLang);

  setupChatbot();
}
