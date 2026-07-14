import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { VRMLoaderPlugin, VRMUtils, VRM } from "@pixiv/three-vrm";
import { loadMixamoAnimation } from "./loadMixamoAnimation";
import { translations } from "./i18n";
import { initCustomSelects } from "./customSelect";
// import GUI from 'lil-gui'; // Sß║╜ x├│a sau khi dß╗ìn dß║╣p xong code b├¬n d╞░ß╗¢i
import "./style.css";

// C├íc t╞░ thß║┐ l╞░u sß║╡n
const poses = {
  crossed: {
    head: { x: 0, y: 0, z: 0 },
    neck: { x: 0, y: 0, z: 0 },
    chest: { x: 0, y: 0, z: 0 },
    spine: { x: 0, y: 0, z: 0 },
    hips: { x: 0, y: 0, z: 0 },
    leftUpperArm: { x: 7, y: -85, z: -30 },
    leftLowerArm: { x: -1, y: -103, z: -5 },
    leftHand: { x: 0, y: 0, z: -50 },
    rightUpperArm: { x: -1, y: 85, z: 30 },
    rightLowerArm: { x: 0, y: 91, z: -5 },
    rightHand: { x: -28, y: 7, z: 43 },
    leftUpperLeg: { x: 0, y: 0, z: 2 },
    leftLowerLeg: { x: 0, y: 0, z: 0 },
    leftFoot: { x: 0, y: 0, z: 0 },
    rightUpperLeg: { x: 0, y: 0, z: -2 },
    rightLowerLeg: { x: 0, y: 0, z: 0 },
    rightFoot: { x: 0, y: 0, z: 0 },
    fingers: {
      leftThumb: -50,
      leftIndex: -50,
      leftMiddle: -50,
      leftRing: -50,
      leftLittle: -50,
      rightThumb: -50,
      rightIndex: -50,
      rightMiddle: -50,
      rightRing: -50,
      rightLittle: -50,
    },
  },
  relaxed: {
    head: { x: 0, y: 0, z: 0 },
    neck: { x: 0, y: 0, z: 0 },
    chest: { x: 0, y: 0, z: 0 },
    spine: { x: 0, y: 0, z: 0 },
    hips: { x: 0, y: 0, z: 0 },
    leftUpperArm: { x: 0.3, y: -16.3, z: -73.2 },
    leftLowerArm: { x: 0, y: -15.8, z: 0 },
    leftHand: { x: 0, y: 0, z: 0 },
    rightUpperArm: { x: -0.3, y: 16.3, z: 73.2 },
    rightLowerArm: { x: 0, y: 15.8, z: 0 },
    rightHand: { x: 0, y: 0, z: 0 },
    leftUpperLeg: { x: 0, y: 0, z: 2 },
    leftLowerLeg: { x: 0, y: 0, z: 0 },
    leftFoot: { x: 0, y: 0, z: 0 },
    rightUpperLeg: { x: 0, y: 0, z: -2 },
    rightLowerLeg: { x: 0, y: 0, z: 0 },
    rightFoot: { x: 0, y: 0, z: 0 },
    fingers: {
      leftThumb: -20,
      leftIndex: -20,
      leftMiddle: -20,
      leftRing: -20,
      leftLittle: -20,
      rightThumb: -20,
      rightIndex: -20,
      rightMiddle: -20,
      rightRing: -20,
      rightLittle: -20,
    },
  },
};

// Trß║íng th├íi chung
const poseState = JSON.parse(JSON.stringify(poses.crossed));
const targetPoseState = JSON.parse(JSON.stringify(poses.crossed)); // L╞░u trß║íng th├íi ─æ├¡ch ─æß╗â nß╗Öi suy m╞░ß╗út m├á
const appState = {
  pose: "crossed",
  activeBone: "none",
  expressions: {
    happy: 0,
    angry: 0,
    sad: 0,
    relaxed: 0,
    surprised: 0,
    aa: 0,
    ih: 0,
    ou: 0,
    ee: 0,
    oh: 0,
    blink: 0,
  },
};
const targetExpressions = { ...appState.expressions };

const poseHistory: any[] = [];
const savePoseToHistory = () => {
  if (poseHistory.length > 30) poseHistory.shift();
  poseHistory.push(JSON.parse(JSON.stringify(poseState)));
};
savePoseToHistory(); // L╞░u trß║íng th├íi ban ─æß║ºu

window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "z") {
    if (poseHistory.length > 1) {
      poseHistory.pop(); // Bß╗Å trß║íng th├íi hiß╗çn tß║íi
      const prevState = poseHistory[poseHistory.length - 1];
      Object.assign(poseState, JSON.parse(JSON.stringify(prevState)));
      Object.assign(targetPoseState, JSON.parse(JSON.stringify(prevState)));

      // Cß║¡p nhß║¡t lß║íi UI nß║┐u ─æang mß╗ƒ
      if (appState.activeBone && appState.activeBone !== "none") {
        const boneKey =
          boneMapping[appState.activeBone as keyof typeof boneMapping];
        if (boneKey && poseState[boneKey]) {
          updateXYZUI(
            poseState[boneKey].x,
            poseState[boneKey].y,
            poseState[boneKey].z,
          );
        }
      }
    }
  }
});

const boneMapping = {
  none: null,
  ─Éß║ºu: "head",
  Cß╗ò: "neck",
  Ngß╗▒c: "chest",
  L╞░ng: "spine",
  H├┤ng: "hips",
  "Tay Tr├íi (Tr├¬n)": "leftUpperArm",
  "Khuß╗╖u Tr├íi": "leftLowerArm",
  "B├án Tay Tr├íi": "leftHand",
  "Tay Phß║úi (Tr├¬n)": "rightUpperArm",
  "Khuß╗╖u Phß║úi": "rightLowerArm",
  "B├án Tay Phß║úi": "rightHand",
  "─É├╣i Tr├íi": "leftUpperLeg",
  "─Éß║ºu Gß╗æi Tr├íi": "leftLowerLeg",
  "B├án Ch├ón Tr├íi": "leftFoot",
  "─É├╣i Phß║úi": "rightUpperLeg",
  "─Éß║ºu Gß╗æi Phß║úi": "rightLowerLeg",
  "B├án Ch├ón Phß║úi": "rightFoot",
};

// H├ám nß╗Öi suy (lerp)
function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

function lerpPose(current: any, target: any, speed: number) {
  for (const key in current) {
    if (typeof current[key] === "object") {
      lerpPose(current[key], target[key], speed);
    } else if (typeof current[key] === "number") {
      current[key] = lerp(current[key], target[key], speed);
    }
  }
}

// ----- BINDING Sß╗░ KIß╗åN GIAO DIß╗åN Mß╗ÜI (THAY THß║╛ LIL-GUI) -----
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    // X├│a active cß╗ºa tß║Ñt cß║ú c├íc tab
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));

    // Th├¬m active cho tab ─æ╞░ß╗úc click
    const target = e.target as HTMLElement;
    target.classList.add("active");

    const tabId = target.getAttribute("data-tab");
    if (tabId) {
      document.getElementById(tabId)?.classList.add("active");
    }
  });
});

document.getElementById("pose-select")?.addEventListener("change", (e) => {
  const val = (e.target as HTMLSelectElement).value as keyof typeof poses;
  appState.pose = val;
  const target = poses[val];
  if (!target) return;
  Object.assign(targetPoseState.head, target.head);
  Object.assign(targetPoseState.neck, target.neck);
  Object.assign(targetPoseState.chest, target.chest);
  Object.assign(targetPoseState.spine, target.spine);
  Object.assign(targetPoseState.hips, target.hips);
  Object.assign(targetPoseState.leftUpperArm, target.leftUpperArm);
  Object.assign(targetPoseState.leftLowerArm, target.leftLowerArm);
  Object.assign(targetPoseState.leftHand, target.leftHand);
  Object.assign(targetPoseState.rightUpperArm, target.rightUpperArm);
  Object.assign(targetPoseState.rightLowerArm, target.rightLowerArm);
  Object.assign(targetPoseState.rightHand, target.rightHand);
  Object.assign(targetPoseState.leftUpperLeg, target.leftUpperLeg);
  Object.assign(targetPoseState.leftLowerLeg, target.leftLowerLeg);
  Object.assign(targetPoseState.leftFoot, target.leftFoot);
  Object.assign(targetPoseState.rightUpperLeg, target.rightUpperLeg);
  Object.assign(targetPoseState.rightLowerLeg, target.rightLowerLeg);
  Object.assign(targetPoseState.rightFoot, target.rightFoot);
  Object.assign(targetPoseState.fingers, target.fingers);

  // Update finger sliders UI
  document.querySelectorAll(".finger-slider").forEach((slider) => {
    const s = slider as HTMLInputElement;
    const fingerName = s.getAttribute(
      "data-finger",
    ) as keyof typeof target.fingers;
    if (fingerName && target.fingers[fingerName] !== undefined) {
      s.value = target.fingers[fingerName].toString();
    }
  });

  savePoseToHistory();
});

let currentMixer: THREE.AnimationMixer | null = null;
let currentAction: THREE.AnimationAction | null = null;
let currentAnimUrl: string = "";

// AFK Idle Logic
let lastInteractionTime = Date.now();
let isAutoIdle = false;
let shouldStopAutoIdle = false;
const AFK_TIMEOUT = 10000; // 10 gi├óy kh├┤ng thao t├íc sß║╜ tß╗▒ ─æß╗Öng chuyß╗ân sang nh├án rß╗ùi

const loopOnceAnimations = [
  "Waving.fbx", "Pointing.fbx", "No.fbx", "Clapping.fbx",
  "Blow A Kiss.fbx", "Surprised.fbx", "Shy.fbx", "Thinking.fbx", "angry.fbx", "talk.fbx"
];

function loadFBXAnimation(url: string, isAfkCall: boolean = false) {
  lastInteractionTime = Date.now(); // Reset timer khi ng╞░ß╗¥i d├╣ng chß╗º ─æß╗Öng tß║úi animation

  // Nß║┐u ng╞░ß╗¥i d├╣ng chß╗º ─æß╗Öng thao t├íc ─æß╗â tß║úi 1 animation kh├íc, th├¼ ─æ├ính dß║Ñu l├á kh├┤ng phß║úi auto idle
  if (!isAfkCall) {
    isAutoIdle = false;
    shouldStopAutoIdle = false;
  }

  if (!currentVrm) return;

  if (currentAction) {
    const oldAction = currentAction;
    oldAction.fadeOut(0.5);
    setTimeout(() => {
      oldAction.stop();
    }, 500);
  }

  if (url === "") {
    currentAnimUrl = "";
    currentAction = null;
    return;
  }
  currentAnimUrl = url;

  loadMixamoAnimation("/animations/" + url, currentVrm).then((clip) => {
    if (!clip) return;
    if (!currentMixer) {
      currentMixer = new THREE.AnimationMixer(currentVrm!.scene);
      currentMixer.addEventListener("loop", (e) => {
        // Nß║┐u ng╞░ß╗¥i d├╣ng ─æ├ú thao t├íc lß║íi v├á ─æang ─æß╗úi hß║┐t khung h├¼nh cß╗ºa auto-idle
        if (shouldStopAutoIdle && e.action === currentAction) {
          shouldStopAutoIdle = false;
          isAutoIdle = false;
          loadFBXAnimation(""); // Trß╗ƒ vß╗ü trß║íng th├íi t─⌐nh ngay khi vß╗½a hß║┐t chu kß╗│
        }
      });
      // Tß╗▒ ─æß╗Öng trß╗ƒ vß╗ü trß║íng th├íi b├¼nh th╞░ß╗¥ng sau khi kß║┐t th├║c 1 h├ánh ─æß╗Öng (LoopOnce)
      currentMixer.addEventListener("finished", (e) => {
        if (e.action === currentAction && currentAnimUrl !== "") {
          loadFBXAnimation(""); // Trß╗ƒ vß╗ü base pose (bß╗Å kh├│a animation)
        }
      });
    }

    currentAction = currentMixer.clipAction(clip);

    // ├üp dß╗Ñng LoopOnce cho c├íc h├ánh ─æß╗Öng nhß║Ñt thß╗¥i
    if (loopOnceAnimations.includes(url)) {
      currentAction.setLoop(THREE.LoopOnce, 1);
      currentAction.clampWhenFinished = true;
    } else {
      currentAction.setLoop(THREE.LoopRepeat, Infinity);
    }

    currentAction.reset().fadeIn(0.5).play();
  }).catch((err) => {
    console.error("Lß╗ùi khi tß║úi FBX:", err);
    alert("Kh├┤ng t├¼m thß║Ñy file /animations/" + url + " - Bß║ín nhß╗¢ tß║ío th╞░ mß╗Ñc public/animations v├á ch├⌐p file v├áo nh├⌐!");
  });
}

document.querySelectorAll(".anim-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const target = e.currentTarget as HTMLButtonElement;
    const animName = target.getAttribute("data-anim") || "";
    loadFBXAnimation(animName);
  });
});

// G├ín sß╗▒ kiß╗çn cho c├íc thanh tr╞░ß╗út biß╗âu cß║úm
document.querySelectorAll(".expr-slider").forEach((slider) => {
  slider.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    const exprName = target.getAttribute("data-expr");
    if (exprName) {
      targetExpressions[exprName as keyof typeof targetExpressions] =
        parseFloat(target.value);
    }
    // Nß║┐u d├╣ng thanh tr╞░ß╗út lß║╗, tß╗▒ ─æß╗Öng chuyß╗ân dropdown vß╗ü "T├╣y chß╗ënh"
    const exprSelect = document.getElementById(
      "expression-select",
    ) as HTMLSelectElement;
    if (exprSelect) exprSelect.value = "custom";
  });
});

// Dropdown Biß╗âu cß║úm C├ái sß║╡n
document
  .getElementById("expression-select")
  ?.addEventListener("change", (e) => {
    const val = (e.target as HTMLSelectElement).value;
    // Reset tß║Ñt cß║ú vß╗ü 0
    Object.keys(targetExpressions).forEach(
      (key) => (targetExpressions[key as keyof typeof targetExpressions] = 0),
    );

    if (val !== "neutral" && val !== "custom") {
      targetExpressions[val as keyof typeof targetExpressions] = 1.0;

      // Chß╗ënh lß║íi biß╗âu cß║úm tß╗⌐c giß║¡n cho cute h╞ín (dß╗ùi)
      if (val === "angry") {
        targetExpressions["angry"] = 0.75; // Giß║úm ─æß╗Ö cau m├áy
        targetExpressions["sad"] = 0.5;    // Miß╗çng h╞íi cong xuß╗æng (mß║┐u)
        targetExpressions["blink"] = 0.1;  // Mß╗ƒ mß║»t to h╞ín (chß╗ë nhß║»m rß║Ñt nhß║╣)
      }

      // Chß╗ënh lß║íi biß╗âu cß║úm ngß║íc nhi├¬n tß╗▒ nhi├¬n h╞ín
      if (val === "surprised") {
        targetExpressions["surprised"] = 1.0; // T─âng l├¬n tß╗æi ─æa 1.0
        targetExpressions["oh"] = 0.8;        // Miß╗çng chß╗» O mß╗ƒ to h╞ín
      }
    }

    // Update UI sliders
    Object.keys(targetExpressions).forEach((key) => {
      const slider = document.getElementById(
        `slider-${key}`,
      ) as HTMLInputElement;
      if (slider)
        slider.value =
          targetExpressions[key as keyof typeof targetExpressions].toString();
    });
  });

// Thanh tr╞░ß╗út ─Éß╗Ö nß║»m ng├│n tay Chung
document
  .getElementById("finger-curl-slider")
  ?.addEventListener("input", (e) => {
    const val = parseInt((e.target as HTMLInputElement).value);
    Object.keys(targetPoseState.fingers).forEach((key) => {
      targetPoseState.fingers[key as keyof typeof targetPoseState.fingers] =
        val;
    });

    // Update UI sliders
    document.querySelectorAll(".finger-slider").forEach((slider) => {
      (slider as HTMLInputElement).value = val.toString();
    });
  });
document
  .getElementById("finger-curl-slider")
  ?.addEventListener("change", () => {
    savePoseToHistory();
  });

// G├ín sß╗▒ kiß╗çn cho c├íc thanh tr╞░ß╗út ng├│n tay lß║╗
document.querySelectorAll(".finger-slider").forEach((slider) => {
  slider.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    const fingerName = target.getAttribute("data-finger");
    if (fingerName) {
      targetPoseState.fingers[
        fingerName as keyof typeof targetPoseState.fingers
      ] = parseInt(target.value);
    }
  });
  slider.addEventListener("change", () => {
    savePoseToHistory();
  });
});

// H├ám hß╗ù trß╗ú kh├│a g├│c (tr├ính phi vß║¡t l├╜) nhß║¡n v├áo object {x, y, z} theo ─æß╗Ö (degrees)
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

const syncXYZFromInput = () => {
  if (appState.activeBone === "none") return;
  const boneKey = boneMapping[appState.activeBone as keyof typeof boneMapping];
  if (boneKey && poseState[boneKey]) {
    const rot = {
      x:
        parseFloat(
          (document.getElementById("bone-x") as HTMLInputElement).value,
        ) || 0,
      y:
        parseFloat(
          (document.getElementById("bone-y") as HTMLInputElement).value,
        ) || 0,
      z:
        parseFloat(
          (document.getElementById("bone-z") as HTMLInputElement).value,
        ) || 0,
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

// H├ám hß╗ù trß╗ú ─æß╗â cß║¡p nhß║¡t gi├í trß╗ï hiß╗ân thß╗ï tr├¬n bß║úng XYZ
const updateXYZUI = (x: number, y: number, z: number) => {
  (document.getElementById("bone-x") as HTMLInputElement).value = x.toFixed(1);
  (document.getElementById("bone-y") as HTMLInputElement).value = y.toFixed(1);
  (document.getElementById("bone-z") as HTMLInputElement).value = z.toFixed(1);
};

// 1. Setup Three.js Scene
const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
// Tß╗æi ╞░u h├│a: Mß║╖c ─æß╗ïnh render ß╗ƒ 1080p (tß╗ë lß╗ç 1.0) theo y├¬u cß║ºu ng╞░ß╗¥i d├╣ng ─æß╗â chß╗æng lag, 
// khß╗¡ r─âng c╞░a (antialias) ─æ├ú ─æ╞░ß╗úc bß║¡t ß╗ƒ tr├¬n ─æß╗â gi├║p nh├ón vß║¡t anime vß║½n sß║»c n├⌐t.
renderer.setPixelRatio(1.0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true; // Bß║¡t chß║┐ ─æß╗Ö cß║»t gß╗ìt m├┤ h├¼nh

// Mß║╖t phß║│ng cß║»t gß╗ìt: Cß║»t bß╗Å mß╗ìi thß╗⌐ nß║▒m d╞░ß╗¢i tß╗ìa ─æß╗Ö Y = -0.05 (Khß╗¢p vß╗¢i mß║╖t ─æß║Ñt mß╗¢i)
const groundClipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.05);

const scene = new THREE.Scene();
// Th├¬m s╞░╞íng m├╣ mß╗¥ ß║úo h├▓a quyß╗çn vß╗¢i m├áu ch├ón trß╗¥i (M├áu trß║»ng cam nhß║ít cß╗ºa CSS Gradient)
// ─Éiß╗üu n├áy gi├║p tß║ío chiß╗üu s├óu v├┤ tß║¡n v├á x├│a ─æi ranh giß╗¢i sß║»c n├⌐t cß╗ºa s├án nh├á
scene.fog = new THREE.FogExp2('#fff1eb', 0.045);

// Camera
const camera = new THREE.PerspectiveCamera(
  35.0,
  window.innerWidth / window.innerHeight,
  0.1,
  100.0, // T─âng tß║ºm nh├¼n xa l├¬n 100 m├⌐t (tr╞░ß╗¢c l├á 20m) ─æß╗â kh├┤ng bß╗ï biß║┐n mß║Ñt
);
camera.position.set(0.0, 1.3, 1.5); // G├│c mß║╖c ─æß╗ïnh l├á Cß║¡n cß║únh h├┤ng (l├╣i xa 1 ch├║t)

// Th├¬m OrbitControls ─æß╗â xoay g├│c m├íy bß║▒ng chuß╗Öt
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0.0, 1.2, 0.0);
controls.enablePan = false;
controls.enableDamping = true;

// Chuyß╗ân viß╗çc xoay camera sang n├║t Chuß╗Öt Phß║úi, ─æß╗â trß╗æng Chuß╗Öt Tr├íi cho viß╗çc click biß╗âu cß║úm
controls.mouseButtons = {
  LEFT: 0, // 0 = NONE
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE,
};

// Chß║╖n menu mß║╖c ─æß╗ïnh khi click chuß╗Öt phß║úi tr├¬n tr├¼nh duyß╗çt
window.addEventListener("contextmenu", (e) => e.preventDefault());

// Trß║íng th├íi Camera
let isAnimatingCamera = false;
let targetCameraPos = new THREE.Vector3();
let targetControlsTarget = new THREE.Vector3();

controls.addEventListener("start", () => {
  isAnimatingCamera = false; // Hß╗ºy tß╗▒ ─æß╗Öng di chuyß╗ân nß║┐u ng╞░ß╗¥i d├╣ng tß╗▒ k├⌐o chuß╗Öt
});

document.getElementById("cam-full")?.addEventListener("click", () => {
  targetCameraPos.set(0.0, 1.0, 3.5);
  targetControlsTarget.set(0.0, 0.8, 0.0);
  isAnimatingCamera = true;
});

document.getElementById("cam-half")?.addEventListener("click", () => {
  targetCameraPos.set(0.0, 1.3, 1.5); // Cß║¡n cß║únh h├┤ng (l├╣i xa mß╗Öt ch├║t)
  targetControlsTarget.set(0.0, 1.2, 0.0);
  isAnimatingCamera = true;
});

document.getElementById("cam-chest")?.addEventListener("click", () => {
  targetCameraPos.set(0.0, 1.45, 1.0); // Cß║¡n cß║únh ngß╗▒c
  targetControlsTarget.set(0.0, 1.42, 0.0);
  isAnimatingCamera = true;
});

document.getElementById("cam-face")?.addEventListener("click", () => {
  targetCameraPos.set(0.0, 1.45, 0.7); // Cß║¡n cß║únh mß║╖t (zoom s├ít khu├┤n mß║╖t)
  targetControlsTarget.set(0.0, 1.42, 0.0);
  isAnimatingCamera = true;
});

// Khß╗ƒi tß║ío TransformControls (V├▓ng xoay 3D Gizmo)
const transformControl = new TransformControls(camera, renderer.domElement);
transformControl.setMode("rotate"); // Chß╗ë cho ph├⌐p xoay
transformControl.setSpace("local"); // Xoay theo trß╗Ñc cß╗Ñc bß╗Ö cß╗ºa x╞░╞íng
scene.add(transformControl.getHelper());

transformControl.addEventListener("dragging-changed", (event) => {
  controls.enabled = !event.value; // Tß║»t OrbitControls khi ─æang nß║»m k├⌐o Gizmo
  if (!event.value) {
    // Khi thß║ú chuß╗Öt ra
    savePoseToHistory();
  }
});

const rad2deg = 180 / Math.PI;

transformControl.addEventListener("objectChange", () => {
  if (!transformControl.object || appState.activeBone === "none") return;
  const bone = transformControl.object;
  const boneKey = boneMapping[appState.activeBone as keyof typeof boneMapping];
  if (!boneKey) return;

  // ├üp dß╗Ñng giß╗¢i hß║ín vß║¡t l├╜ chung
  const degRot = {
    x: bone.rotation.x * rad2deg,
    y: bone.rotation.y * rad2deg,
    z: bone.rotation.z * rad2deg,
  };
  clampBoneDegrees(boneKey, degRot);

  bone.rotation.x = degRot.x / rad2deg;
  bone.rotation.y = degRot.y / rad2deg;
  bone.rotation.z = degRot.z / rad2deg;

  // Cß║¡p nhß║¡t lß║íi poseState v├á targetPoseState ─æß╗â ─æß╗ông bß╗Ö vß╗¢i thanh GUI (nß║┐u c├│) v├á animate loop
  if (poseState[boneKey]) {
    targetPoseState[boneKey].x = degRot.x;
    targetPoseState[boneKey].y = degRot.y;
    targetPoseState[boneKey].z = degRot.z;
    poseState[boneKey].x = degRot.x;
    poseState[boneKey].y = degRot.y;
    poseState[boneKey].z = degRot.z;

    // ─Éß╗ông bß╗Ö l├¬n GUI theo thß╗¥i gian thß╗▒c
    updateXYZUI(degRot.x, degRot.y, degRot.z);
  }
});

// H├ám gß║»n Gizmo khi chß╗ìn x╞░╞íng tß╗½ Dropdown hoß║╖c Bß║úng HTML
(window as any).onBoneSelect = (val: keyof typeof boneMapping) => {
  appState.activeBone = val;
  if (val === "none") {
    transformControl.detach();
  } else if (currentVrm && currentVrm.humanoid) {
    const boneKey = boneMapping[val];
    const boneNode = currentVrm.humanoid.getNormalizedBoneNode(boneKey as any);

    // Cß║¡p nhß║¡t gi├í trß╗ï hiß╗ân thß╗ï tr├¬n bß║úng XYZ
    if (boneKey && poseState[boneKey]) {
      updateXYZUI(
        poseState[boneKey].x,
        poseState[boneKey].y,
        poseState[boneKey].z,
      );
    }

    if (boneNode) {
      // Mß║╖c ─æß╗ïnh hiß╗çn tß║Ñt cß║ú c├íc trß╗Ñc
      transformControl.showX = true;
      transformControl.showY = true;
      transformControl.showZ = true;

      // ß║¿n bß╗¢t c├íc trß╗Ñc bß╗ï kh├│a vß║¡t l├╜ ─æß╗â ─æß╗í rß╗æi mß║»t
      if (boneKey === "leftLowerLeg" || boneKey === "rightLowerLeg") {
        // ─Éß║ºu gß╗æi chß╗ë gß║¡p trß╗Ñc X
        transformControl.showY = false;
        transformControl.showZ = false;
      } else if (boneKey === "leftLowerArm" || boneKey === "rightLowerArm") {
        // Khuß╗╖u tay chß╗ë gß║¡p trß╗Ñc Y (X v├á Z bß╗ï ß║⌐n ─æß╗â chß╗æng g├úy tay)
        transformControl.showX = false;
        transformControl.showZ = false;
      }

      transformControl.attach(boneNode);
    }
  }
};

// Gß║»n sß╗▒ kiß╗çn click cho c├íc n├║t trong bß║úng HTML
document.querySelectorAll(".bone-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    // Bß╗Å active cß╗ºa tß║Ñt cß║ú c├íc n├║t kh├íc
    document
      .querySelectorAll(".bone-btn")
      .forEach((b) => b.classList.remove("active"));

    const target = e.target as HTMLElement;
    target.classList.add("active");

    const boneName = target.getAttribute(
      "data-bone",
    ) as keyof typeof boneMapping;
    if (boneName && (window as any).onBoneSelect) {
      (window as any).onBoneSelect(boneName);
    }
  });
});

// Lights
const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0); // T─âng c╞░ß╗¥ng ─æß╗Ö s├íng
directionalLight.position.set(1.0, 2.0, 2.0); // Chß║┐ch l├¬n v├á sang b├¬n ─æß╗â ─æß╗ò b├│ng ─æß║╣p h╞ín
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024; // Mß║╖c ─æß╗ïnh Trung b├¼nh (1K)
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -15;
directionalLight.shadow.camera.right = 15;
directionalLight.shadow.camera.top = 15;
directionalLight.shadow.camera.bottom = -15;
directionalLight.shadow.bias = -0.001;
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // T─âng s├íng m├┤i tr╞░ß╗¥ng
scene.add(ambientLight);

// Th├¬m ─æ├¿n Hemisphere ─æß╗â b├│ng (shadow) tr├¬n anime model mß╗üm mß║íi h╞ín
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

// Mß║úng chß╗⌐a ─æ├¿n lß╗ông ─æß╗â bß║¡t/tß║»t theo thß╗¥i gian
const lanternLights: THREE.PointLight[] = [];

// --- LOGIC THß╗£I GIAN (TIME OF DAY) ---
let currentTimeSetting = 'auto';

function updateTimeOfDay() {
  let timeMode = currentTimeSetting;

  if (timeMode === 'auto') {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) timeMode = 'morning';
    else if (hour >= 10 && hour < 16) timeMode = 'noon';
    else if (hour >= 16 && hour < 19) timeMode = 'sunset';
    else timeMode = 'night';
  }

  // ─Éß╗òi m├áu nß╗ün (document body css background)
  const body = document.body;
  if (timeMode === 'morning') {
    (scene.fog as THREE.FogExp2).color.set('#fff1eb');
    ambientLight.color.set('#ffffff');
    ambientLight.intensity = 1.0;
    directionalLight.color.set('#ffffff');
    directionalLight.intensity = 2.0;
    hemiLight.intensity = 1.0;
    body.style.background = 'linear-gradient(to bottom, #fff1eb 0%, #ace0f9 100%)';
  } else if (timeMode === 'noon') {
    (scene.fog as THREE.FogExp2).color.set('#e0f7fa');
    ambientLight.color.set('#ffffff');
    ambientLight.intensity = 1.2;
    directionalLight.color.set('#ffffff');
    directionalLight.intensity = 2.5;
    hemiLight.intensity = 1.2;
    body.style.background = 'linear-gradient(to bottom, #e0f7fa 0%, #80d0c7 100%)';
  } else if (timeMode === 'sunset') {
    (scene.fog as THREE.FogExp2).color.set('#ffb28b');
    ambientLight.color.set('#ffb28b');
    ambientLight.intensity = 0.4; // Giß║úm s├íng m├┤i tr╞░ß╗¥ng ─æß╗â b├│ng r├óm (shadow) ─æß╗ò xuß╗æng nh├¼n ─æen v├á ─æß║¡m h╞ín
    directionalLight.color.set('#ff8a66');
    directionalLight.intensity = 2.0;
    hemiLight.intensity = 0.4; // Giß║úm s├íng m├┤i tr╞░ß╗¥ng
    body.style.background = 'linear-gradient(to bottom, #ffb28b 0%, #d47e8c 100%)';
  } else if (timeMode === 'night') {
    (scene.fog as THREE.FogExp2).color.set('#101230');
    ambientLight.color.set('#5a5a8a');
    ambientLight.intensity = 0.3; // Giß║úm tß╗æi ─æa ├ính s├íng m├┤i tr╞░ß╗¥ng ─æß╗â m├án ─æ├¬m s├óu h╞ín
    directionalLight.color.set('#b0b0ff');
    directionalLight.intensity = 0.2; // ├ünh tr─âng cß╗▒c k├¼ mß╗¥ nhß║ít (nh╞░ß╗¥ng chß╗ù cho lß╗ông ─æ├¿n ─æß╗ò b├│ng)
    hemiLight.intensity = 0.1;
    body.style.background = 'linear-gradient(to bottom, #101230 0%, #202040 100%)';
  }

  // Cß║¡p nhß║¡t ├ính s├íng ─æ├¿n lß╗ông
  const isNight = (timeMode === 'night');
  lanternLights.forEach(light => {
    light.intensity = isNight ? 15.0 : 0.0; // T─âng nhß║╣ ─æß╗Ö s├íng ─æ├¿n lß╗ông b├╣ lß║íi cho mß║╖t tr─âng
    light.castShadow = isNight; // Tß║»t ho├án to├án thuß║¡t to├ín b├│ng ─æß╗ò khi trß╗¥i s├íng
    // Bß║¡t/tß║»t "b├│ng ─æ├¿n" (Mesh) b├¬n trong PointLight
    if (light.children.length > 0) {
      light.children[0].visible = isNight;
    }
  });
}

// Khß╗ƒi chß║íy lß║Ñy giß╗¥ hß╗ç thß╗æng l├║c load
updateTimeOfDay();
// --- Kß║╛T TH├ÜC LOGIC THß╗£I GIAN ---

// X├│a bß╗Å ho├án to├án mß║╖t s├án v├┤ h├¼nh c┼⌐, ─æß╗â b├│ng r├óm chß╗ë r╞íi tr├¬n mß║╖t ─æß║Ñt thß║¡t (tß║ío hiß╗çu ß╗⌐ng Diorama)
// const floorGeometry = new THREE.PlaneGeometry(50, 50);
// ... ─æ├ú x├│a ...

// Mß║úng chß╗⌐a c├óy Sakura ─æß╗â ─æß╗òi m├áu cho Tuyß║┐t
const sakuraTrees: THREE.Object3D[] = [];

// Load bß╗æi cß║únh phß╗Ñ (C├óy anh ─æ├áo)
const envLoader = new GLTFLoader();
envLoader.load(
  "/Map/sakura.glb",
  (gltf) => {
    const originalTree = gltf.scene;
    // Tß╗æi ╞░u h├│a B├│ng ─æß╗ò (Shadow) cho c├óy
    originalTree.traverse((child: any) => {
      if (child.isMesh) {
        // Mß║╖c ─æß╗ïnh: Bß║¡t b├│ng ─æß╗ò cho mß╗ìi thß╗⌐. Khi User ─æß╗òi setting, n├│ sß║╜ tß╗▒ qu├⌐t lß║íi.
        child.castShadow = true;

        child.receiveShadow = false; // Tß║»t lu├┤n nhß║¡n b├│ng ─æß╗â nhß║╣ m├íy

        // Fix lß╗ùi b├│ng ─æß╗ò bß╗ï h├¼nh khß╗æi vu├┤ng (nß║┐u c├│ d├╣ng alphaTest)
        if (child.material) {
          // L╞░u lß║íi vß║¡t liß╗çu gß╗æc ─æß╗â ─æß╗òi m├áu (nß║┐u l├á Array Material th├¼ clone tß╗½ng phß║ºn)
          child.material = child.material.clone();
          child.material.alphaTest = 0.5;
          child.material.needsUpdate = true;
          // Cß║»t bß╗¢t phß║ºn rß╗à/─æß║Ñt th├▓ xuß╗æng d╞░ß╗¢i mß║╖t s├án
          child.material.clippingPlanes = [groundClipPlane];
        }
      }
    });

    // Rß║úi c├íc c├óy s├ít bao xung quanh nh├ón vß║¡t
    const treePositions = [
      { x: -1, z: -1.5, scale: 12 },     // Sau tr├íi
      { x: -2, z: 0.5, scale: 9 },      // Chß║┐ch tr├íi (gß║ºn h╞ín)
      { x: 1.5, z: -0.5, scale: 7 },    // Chß║┐ch phß║úi (gß║ºn h╞ín)
    ];

    treePositions.forEach((pos) => {
      const treeClone = originalTree.clone();
      treeClone.position.set(pos.x, -0.07, pos.z); // Hß║í c├óy xuß╗æng -0.07
      treeClone.scale.set(pos.scale, pos.scale, pos.scale);
      treeClone.rotation.y = Math.random() * Math.PI * 2; // Xoay ngß║½u nhi├¬n h╞░ß╗¢ng
      scene.add(treeClone);
      sakuraTrees.push(treeClone);
    });

    // ├üp dß╗Ñng m├áu sß║»c cß╗ºa thß╗¥i tiß║┐t hiß╗çn tß║íi nß║┐u c├óy load xong sau khi thß╗¥i tiß║┐t ─æß╗òi
    applyWeatherToTrees(currentWeather);
  },
  undefined,
  (error) => console.error("Lß╗ùi khi load c├óy Sakura:", error)
);

// Load xe b├ín h├áng kiß╗âu Nhß║¡t (Yatai)
envLoader.load(
  "/Map/yatai.glb",
  (gltf) => {
    const yatai = gltf.scene;

    // Bß║¡t b├│ng ─æß╗ò cho chiß║┐c xe
    yatai.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.clippingPlanes = [groundClipPlane];
        }
      }
    });

    // ─Éß║╖t chiß║┐c xe ß╗ƒ b├¬n phß║úi nh├ón vß║¡t, chß║┐ch l├¬n ph├¡a tr╞░ß╗¢c mß╗Öt ch├║t
    yatai.position.set(0.4, -0.07, -2.1); // Hß║í y xuß╗æng -0.07
    yatai.scale.set(0.2, 0.2, 0.2); // Tß╗╖ lß╗ç mß║╖c ─æß╗ïnh, nß║┐u to qu├í hay nhß╗Å qu├í sß║╜ sß╗¡a sau
    yatai.rotation.y = 18.8; // Xoay nhß║╣ ─æß║ºu xe vß╗ü ph├¡a Camera

    scene.add(yatai);
  },
  undefined,
  (error) => console.error("Lß╗ùi khi load xe Yatai:", error)
);

// Load ─æ├¿n lß╗ông ─æ├í phong c├ích Nhß║¡t (Toro)
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
          // Tß║»t ─æß╗ò b├│ng (sun shadow) cho c├íc l╞░ß╗¢i trong suß╗æt (nh╞░ mß║╖t k├¡nh lß╗ông ─æ├¿n) ─æß╗â tr├ính bß╗ï lß╗ùi b├│ng h├¼nh vu├┤ng
          if (child.material.transparent || child.material.opacity < 1) {
            child.castShadow = false;
          }
        }
      }
    });

    const lanternPositions = [
      { x: -2, y: -0.22, z: -1.35, scale: 1.2 }, // Ph├¡a tr╞░ß╗¢c b├¬n tr├íi (Hß║í th├¬m -0.07)
      { x: -1.5, y: -0.22, z: 1.2, scale: 1.2 },  // Ph├¡a tr╞░ß╗¢c b├¬n phß║úi
    ];

    lanternPositions.forEach((pos) => {
      const lantern = originalLantern.clone();
      lantern.position.set(pos.x, pos.y, pos.z);
      lantern.scale.set(pos.scale, pos.scale, pos.scale);
      lantern.rotation.y = Math.random() * Math.PI;
      scene.add(lantern);

      // Th├¬m ├ính s├íng v├áng ß║Ñm ph├ít ra tß╗½ trong lß╗ông ─æ├¿n
      const pLight = new THREE.PointLight(0xffa500, 0, 5.0); // B├ín k├¡nh s├íng 5m

      // Bß║¼T B├ôNG ─Éß╗ö Tß╗¬ ─É├êN Lß╗ÆNG
      pLight.castShadow = true;
      pLight.shadow.mapSize.width = 512; // Giß║úm ph├ón giß║úi b├│ng ─æ├¿n lß╗ông ─æß╗â bß╗¢t lag
      pLight.shadow.mapSize.height = 512;
      pLight.shadow.bias = -0.001; // Giß║úm lß╗ùi sß╗ìc sß╗ìc cß╗ºa b├│ng ─æß╗ò

      // Tß║ío mß╗Öt khß╗æi cß║ºu ph├ít s├íng (MeshBasicMaterial kh├┤ng bß╗ï ß║únh h╞░ß╗ƒng bß╗ƒi b├│ng tß╗æi) ─æ├│ng vai tr├▓ l├á "B├│ng ─æ├¿n"
      const bulbGeometry = new THREE.SphereGeometry(0.12, 16, 16); // T─âng k├¡ch th╞░ß╗¢c b├│ng ─æ├¿n
      const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
      const bulbMesh = new THREE.Mesh(bulbGeometry, bulbMaterial);
      pLight.add(bulbMesh); // Gß║»n b├│ng ─æ├¿n v├áo nguß╗ôn s├íng

      // Dß╗¥i ├ính s├íng l├¬n vß╗ï tr├¡ lß╗ông k├¡nh (khoß║úng Y = 1.45 so vß╗¢i mß║╖t ─æß║Ñt)
      pLight.position.set(pos.x, pos.y + 1.45, pos.z);
      scene.add(pLight);
      lanternLights.push(pLight);
    });

    // Cß║¡p nhß║¡t ─æß╗Ö s├íng ngay lß║¡p tß╗⌐c nß║┐u ─æang l├á ban ─æ├¬m
    updateTimeOfDay();
  },
  undefined,
  (error) => console.error("Lß╗ùi khi load ─æ├¿n lß╗ông:", error)
);

// Load mß║╖t ─æß║Ñt (Diorama / Ground)
envLoader.load(
  "/Map/rocky_ground_with_moss.glb",
  (gltf) => {
    const originalGround = gltf.scene;

    originalGround.traverse((child: any) => {
      if (child.isMesh) {
        child.receiveShadow = true;
        child.castShadow = false; // ─Éß║Ñt th├¼ kh├┤ng cß║ºn ─æß╗ò b├│ng r├óm l├¬n ch├¡nh n├│
      }
    });

    // ─Éß║╖t tß╗╖ lß╗ç to l├¬n mß╗Öt ch├║t ─æß╗â cß║ºn ├¡t mß║únh gh├⌐p h╞ín
    originalGround.scale.set(0.3, 0.3, 0.3);

    // T├¡nh to├ín k├¡ch th╞░ß╗¢c thß║¡t cß╗ºa 1 ├┤ ─æß║Ñt sau khi scale
    const bbox = new THREE.Box3().setFromObject(originalGround);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const tileWidth = size.x * 0.9; // Nh├ón 0.9 ─æß╗â c├íc mß║únh ─æß║Ñt xß║┐p ─æ├¿ l├¬n m├⌐p cß╗ºa nhau (x├│a khoß║úng hß╗ƒ)
    const tileDepth = size.z * 0.9;

    // Tß║ío l╞░ß╗¢i 2x2 (4 ├┤) thay v├¼ 3x3 (9 ├┤) ─æß╗â giß║úm 50% sß╗æ l╞░ß╗úng ─æa gi├íc
    const offsets = [-0.5, 0.5];
    for (const i of offsets) {
      for (const j of offsets) {
        const tile = originalGround.clone();
        // Xß║┐p c├íc vi├¬n gß║ích kh├¡t v├áo nhau v├á hß║í Y xuß╗æng mß╗Öt ch├║t ─æß╗â gi├áy kh├┤ng bß╗ï l├║n v├áo ─æ├í
        tile.position.set(i * tileWidth, -0.07, j * tileDepth);
        scene.add(tile);
      }
    }
  },
  undefined,
  (error) => console.error("Lß╗ùi khi load mß║╖t ─æß║Ñt:", error)
);


// 2. Load VRM
let currentVrm: VRM | undefined;
const loader = new GLTFLoader();

// Install VRMLoaderPlugin
loader.register((parser) => {
  return new VRMLoaderPlugin(parser);
});

const loadingElement = document.getElementById("loading");

loader.load(
  "/model.vrm", // File ─æ├ú ─æ╞░ß╗úc ─æß╗òi t├¬n th├ánh model.vrm trong th╞░ mß╗Ñc public
  (gltf) => {
    const vrm = gltf.userData.vrm;

    // Disable frustum culling for VRM
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.removeUnnecessaryJoints(gltf.scene);
    vrm.scene.traverse((obj: any) => {
      obj.frustumCulled = false;
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    scene.add(vrm.scene);
    currentVrm = vrm;

    // --- Xß╗¡ l├╜ va chß║ím vß║¡t l├╜ cho ├ío cho├áng v├á t├│c (SpringBone) ---
    if (vrm.springBoneManager) {
      // 1. T─âng k├¡ch th╞░ß╗¢c (radius) cß╗ºa tß║Ñt cß║ú c├íc khß╗æi cß║ºu va chß║ím (Colliders) tr├¬n c╞í thß╗â nh├ón vß║¡t
      // ─Éiß╗üu n├áy ├⌐p v├íy v├á t├│c phß║úi nß║úy ra xa h╞ín, rß║Ñt kh├│ ─æß╗â ─æ├óm xuy├¬n qua ─æ├╣i/tay
      vrm.springBoneManager.colliderGroups.forEach((group: any) => {
        group.colliders.forEach((collider: any) => {
          if (collider.shape && collider.shape.radius) {
            collider.shape.radius *= 10; // Ph├│ng to 50%
          }
        });
      });

      // 2. Giß║úm ─æß╗Ö nhß║íy, t─âng ─æß╗Ö cß╗⌐ng cß╗ºa vß║¡t liß╗çu
      vrm.springBoneManager.joints.forEach((joint: any) => {
        if (joint.settings) {
          // T─âng ─æß╗Ö cß╗⌐ng (stiffness) ─æß╗â v├íy nhanh ch├│ng giß╗» form
          joint.settings.stiffness = Math.min(joint.settings.stiffness * 2.5, 4.0);
          // T─âng sß╗⌐c cß║ún kh├┤ng kh├¡ (dragForce) ─æß╗â giß║úm qu├ín t├¡nh ─æong ─æ╞░a mß║ính
          joint.settings.dragForce = Math.min(joint.settings.dragForce * 2.5, 1.5);
        }
      });
    }

    // Rotate model to face camera (VRM models face +Z by default)
    vrm.scene.rotation.y = 0;

    // Fix T-pose by dropping the arms down slightly
    if (vrm.humanoid) {
      const leftArm = vrm.humanoid.getNormalizedBoneNode("leftUpperArm");
      const rightArm = vrm.humanoid.getNormalizedBoneNode("rightUpperArm");
      if (leftArm) leftArm.rotation.z = 1.2; // Gß║¡p tay tr├íi xuß╗æng
      if (rightArm) rightArm.rotation.z = -1.2; // Gß║¡p tay phß║úi xuß╗æng
    }

    // Make the model look at the camera target
    vrm.lookAt.target = lookAtTarget;

    if (loadingElement) loadingElement.style.display = "none";
  },
  (progress) => {
    if (loadingElement) {
      loadingElement.innerText = `─Éang tß║úi model 3D... ${Math.round(100.0 * (progress.loaded / progress.total))}%`;
    }
  },
  (error) => console.error(error),
);

// 3. Camera Tracking (Nh├¼n theo camera)
const lookAtTarget = new THREE.Object3D();
scene.add(lookAtTarget);

// Initial target position
lookAtTarget.position.set(0, 1.4, 2.0);

// Biß║┐n l╞░u trß╗» g├│c quay thß╗▒c tß║┐ cß╗ºa ─æß║ºu ─æß╗â l├ám m╞░ß╗út (lerp)
let currentHeadYaw = 0;
let currentHeadPitch = 0;

const clock = new THREE.Clock();

// Biß║┐n trß║íng th├íi thß╗¥i tiß║┐t
let currentWeather = 'petals'; // 'clear', 'petals', 'rain', 'snow'

function applyWeatherToTrees(weather: string) {
  sakuraTrees.forEach(tree => {
    tree.traverse((child: any) => {
      if (child.isMesh && child.material) {
        if (weather === 'snow') {
          child.material.color.setHex(0xffffff); // ─Éß╗òi m├áu l├í/hoa th├ánh trß║»ng tuyß║┐t
        } else {
          child.material.color.setHex(0xffa6c9); // Phß╗Ñc hß╗ôi m├áu hß╗ông (Pink)
        }
      }
    });
  });
}

// --- PARTICLE SYSTEM: Hiß╗çu ß╗⌐ng Thß╗¥i tiß║┐t (Hoa r╞íi, M╞░a, Tuyß║┐t) ---
const MAX_PETALS = 300; // Sß╗æ l╞░ß╗úng tß╗æi ─æa l╞░u trong bß╗Ö nhß╗¢
let currentPetalCount = 80; // Sß╗æ l╞░ß╗úng hiß╗ân thß╗ï thß╗▒c tß║┐ (mß║╖c ─æß╗ïnh)
const petalGeometry = new THREE.PlaneGeometry(0.12, 0.12); // K├¡ch th╞░ß╗¢c nhß╗Å lß║íi cho vß╗½a mß║»t
const petalData: any[] = [];

// Khai b├ío c├íc khu vß╗▒c t├ín c├óy ─æß╗â hoa chß╗ë r╞íi tß╗½ b├¬n TRONG t├ín l├í xuß╗æng
const treeZones = [
  { x: -1, z: -1.5, radius: 2.5, height: 4.2 },   // C├óy to b├¬n tr├íi (Thß║Ñp h╞ín nß╗»a)
  { x: -2, z: 0.5, radius: 2.0, height: 3.2 },    // C├óy nhß╗Å b├¬n tr├íi (Thß║Ñp h╞ín nß╗»a)
  { x: 2.5, z: 1.5, radius: 1.5, height: 2.6 },  // C├óy b├¬n phß║úi (Thß║Ñp h╞ín nß╗»a)
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
    velY: 0.15 + Math.random() * 0.3, // R╞íi l╞í lß╗¡ng chß║¡m
    velX: (Math.random() - 0.5) * 0.8,
    velZ: (Math.random() - 0.5) * 0.8,
    rotSpeedX: (Math.random() - 0.5) * 3, // Tß╗æc ─æß╗Ö xoay (lß║¡t mß║╖t)
    rotSpeedY: (Math.random() - 0.5) * 3,
    rotSpeedZ: (Math.random() - 0.5) * 3,
    oscillationSpeed: 0.5 + Math.random() * 1.5,
    oscillationWidth: 0.2 + Math.random() * 0.5
  });
}

// Tß║ío ß║únh Canvas cho Tuyß║┐t v├á M╞░a ─æß╗â kh├┤ng cß║ºn tß║úi file ngo├ái
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

// Sß╗¡ dß╗Ñng ß║únh 2D c├ính hoa anh ─æ├áo do ng╞░ß╗¥i d├╣ng cung cß║Ñp
const textureLoader = new THREE.TextureLoader();
const petalTexture = textureLoader.load('/Map/sakura_leaves.png');
petalTexture.colorSpace = THREE.SRGBColorSpace;
const rainTexture = createRainTexture();

const snowGeometry = new THREE.SphereGeometry(0.015, 6, 6); // Hß║ít tuyß║┐t h├¼nh cß║ºu 3D (─É├ú thu nhß╗Å)

const petalMaterial = new THREE.MeshBasicMaterial({
  map: petalTexture,
  transparent: true,
  opacity: 1.0,
  alphaTest: 0.05,
  depthWrite: false,
  side: THREE.DoubleSide // ─Éß╗â ß║únh hiß╗ân thß╗ï khi lß║¡t xoay mß║╖t sau
});

const petalSystem = new THREE.InstancedMesh(petalGeometry, petalMaterial, MAX_PETALS);
petalSystem.count = currentPetalCount; // Chß╗ë render sß╗æ l╞░ß╗úng theo c├ái ─æß║╖t
const dummy = new THREE.Object3D(); // D├╣ng ─æß╗â t├¡nh to├ín ma trß║¡n xoay
scene.add(petalSystem);

function updateWeatherSystem(weather: string) {
  currentWeather = weather;
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
      petalMaterial.map = null; // Bß╗Å texture, chß╗ë d├╣ng m├áu trß║»ng khß╗æi cß║ºu
      petalMaterial.opacity = 0.8;
      petalMaterial.alphaTest = 0.01;
      petalMaterial.needsUpdate = true;
    }
  }
}
// Gß╗ìi mß║╖c ─æß╗ïnh
updateWeatherSystem('petals');
// --- END PARTICLE SYSTEM ---

// 4. Animation Loop
function animate() {
  requestAnimationFrame(animate);
  let delta = clock.getDelta();

  // Sß╗¼A Lß╗ûI CHUYß╗éN TAB: Khi ß║⌐n tab, requestAnimationFrame dß╗½ng lß║íi.
  // Khi quay lß║íi, delta sß║╜ rß║Ñt lß╗¢n g├óy ra lß╗ùi vß║¡t l├╜ (giß║¡t, tung v├íy ├ío, nhß║úy c├│c animation).
  // V├¼ vß║¡y nß║┐u delta qu├í lß╗¢n (tr├¬n 100ms), ta ├⌐p n├│ vß╗ü mß╗⌐c b├¼nh th╞░ß╗¥ng cß╗ºa 1 frame (1/60s).
  if (delta > 0.1) {
    delta = 1 / 60;
  }

  const deltaTime = delta;
  const time = clock.elapsedTime;

  // --- Cß║¼P NHß║¼T HIß╗åU ß╗¿NG THß╗£I TIß║╛T ---
  for (let i = 0; i < currentPetalCount; i++) {
    const data = petalData[i];

    if (currentWeather === 'rain') {
      // M╞░a: R╞íi rß║Ñt nhanh, thß║│ng ─æß╗⌐ng, kh├┤ng xoay lß║¡t
      data.y -= data.velY * deltaTime * 15.0; // R╞íi cß╗▒c nhanh
      data.x += data.velX * deltaTime * 0.2; // Gi├│ tß║ít nhß║╣
      data.z += data.velZ * deltaTime * 0.2;

      dummy.position.set(data.x, data.y, data.z);
      // M╞░a kh├┤ng xoay ngang m├á chß╗ë lu├┤n ─æß╗⌐ng thß║│ng
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.1, 1.5, 0.1); // Hß║ít m╞░a nhß╗Å lß║íi v├á mß╗Ång h╞ín rß║Ñt nhiß╗üu
    } else if (currentWeather === 'snow') {
      // Tuyß║┐t: R╞íi chß║¡m, lß║»c l╞░ nhß║╣ nh├áng
      data.y -= data.velY * deltaTime * 0.5; // R╞íi chß║¡m

      // Lß║»c l╞░ nhß║╣
      data.x += (Math.sin(time * data.oscillationSpeed * 0.5) * data.oscillationWidth * deltaTime) + (data.velX * deltaTime * 0.5);
      data.z += (Math.cos(time * data.oscillationSpeed * 0.5) * data.oscillationWidth * deltaTime) + (data.velZ * deltaTime * 0.5);

      // Xoay nhß║╣ nh├áng (tuy nhi├¬n b├┤ng tuyß║┐t tr├▓n n├¬n c┼⌐ng kh├┤ng r├╡ xoay lß║»m)
      data.rotX += data.rotSpeedX * deltaTime * 0.2;
      data.rotY += data.rotSpeedY * deltaTime * 0.2;
      data.rotZ += data.rotSpeedZ * deltaTime * 0.2;

      dummy.position.set(data.x, data.y, data.z);
      dummy.rotation.set(data.rotX, data.rotY, data.rotZ);

      let scale = 1.2;
      if (data.y < 0.8) scale = Math.max(0, (data.y / 0.8) * 1.2);
      dummy.scale.set(scale, scale, scale);
    } else {
      // Hoa anh ─æ├áo (petals): Mß║╖c ─æß╗ïnh
      // R╞íi xuß╗æng
      data.y -= data.velY * deltaTime;

      // Lß║»c l╞░ ngß║½u nhi├¬n theo h├ám Sin & Cos kß║┐t hß╗úp gi├│ tß║ít
      data.x += (Math.sin(time * data.oscillationSpeed) * data.oscillationWidth * deltaTime) + (data.velX * deltaTime);
      data.z += (Math.cos(time * data.oscillationSpeed) * data.oscillationWidth * deltaTime) + (data.velZ * deltaTime);

      // Xoay c├ính hoa 3D (hiß╗çu ß╗⌐ng lß║¡t cuß╗Ön)
      data.rotX += data.rotSpeedX * deltaTime;
      data.rotY += data.rotSpeedY * deltaTime;
      data.rotZ += data.rotSpeedZ * deltaTime;

      // T├¡nh to├ín Scale: Khi sß║»p chß║ím ─æß║Ñt (y < 0.8) th├¼ sß║╜ thu nhß╗Å dß║ºn (tß║ío cß║úm gi├íc tan biß║┐n mß║Ñt)
      let scale = 1.0;
      if (data.y < 0.8) {
        scale = Math.max(0, data.y / 0.8);
      }

      dummy.position.set(data.x, data.y, data.z);
      dummy.rotation.set(data.rotX, data.rotY, data.rotZ);
      dummy.scale.set(scale, scale, scale);
    }

    // T├íi sinh hß║ít khi chß║ím ─æß║Ñt
    if (data.y < 0) {
      const zone = treeZones[Math.floor(Math.random() * treeZones.length)];
      const r = Math.random() * zone.radius;
      const theta = Math.random() * Math.PI * 2;

      if (currentWeather === 'petals') {
        // Hß╗ôi sinh c├ính hoa ngß║½u nhi├¬n ß╗ƒ 1/3 phß║ºn ngß╗ìn cß╗ºa t├ín c├óy (kh├┤ng bß╗ï l├▓i l├¬n tr├¬n ngß╗ìn)
        data.y = zone.height - Math.random() * (zone.height * 0.3);
        data.x = zone.x + r * Math.cos(theta);
        data.z = zone.z + r * Math.sin(theta);
      } else {
        // M╞░a v├á Tuyß║┐t sß║╜ r╞íi tß╗½ tr├¬n cao v├á bao phß╗º to├án bß╗Ö bß║ºu trß╗¥i rß╗Öng lß╗¢n
        data.y = 5.0 + Math.random() * 2.0;
        data.x = (Math.random() - 0.5) * 12.0;
        data.z = (Math.random() - 0.5) * 12.0;
      }
    }

    dummy.updateMatrix();
    petalSystem.setMatrixAt(i, dummy.matrix);
  }
  petalSystem.instanceMatrix.needsUpdate = true;
  // --- END Cß║¼P NHß║¼T HIß╗åU ß╗¿NG THß╗£I TIß║╛T ---
  // --- END Cß║¼P NHß║¼T HOA R╞áI ---

  if (isAnimatingCamera) {
    camera.position.lerp(targetCameraPos, 5.0 * deltaTime);
    controls.target.lerp(targetControlsTarget, 5.0 * deltaTime);

    if (
      camera.position.distanceTo(targetCameraPos) < 0.01 &&
      controls.target.distanceTo(targetControlsTarget) < 0.01
    ) {
      camera.position.copy(targetCameraPos);
      controls.target.copy(targetControlsTarget);
      isAnimatingCamera = false;
    }
  }

  // Nß╗Öi suy (lerp) trß║íng th├íi hiß╗çn tß║íi dß║ºn tiß║┐n vß╗ü trß║íng th├íi ─æ├¡ch
  lerpPose(poseState, targetPoseState, 5.0 * deltaTime);
  lerpPose(appState.expressions, targetExpressions, 5.0 * deltaTime);

  if (currentVrm) {
    // 1. Procedural Idle Animation (Breathing & Swaying)
    if (currentVrm.humanoid) {
      // Lß║Ñy c├íc x╞░╞íng cß║ºn thiß║┐t
      const leftArm = currentVrm.humanoid.getNormalizedBoneNode("leftUpperArm");
      const rightArm =
        currentVrm.humanoid.getNormalizedBoneNode("rightUpperArm");
      const leftLowerArm =
        currentVrm.humanoid.getNormalizedBoneNode("leftLowerArm");
      const rightLowerArm =
        currentVrm.humanoid.getNormalizedBoneNode("rightLowerArm");
      const leftLeg = currentVrm.humanoid.getNormalizedBoneNode("leftUpperLeg");
      const rightLeg =
        currentVrm.humanoid.getNormalizedBoneNode("rightUpperLeg");
      const leftLowerLeg =
        currentVrm.humanoid.getNormalizedBoneNode("leftLowerLeg");
      const rightLowerLeg =
        currentVrm.humanoid.getNormalizedBoneNode("rightLowerLeg");
      const head = currentVrm.humanoid.getNormalizedBoneNode("head");
      const neck = currentVrm.humanoid.getNormalizedBoneNode("neck");
      const chest = currentVrm.humanoid.getNormalizedBoneNode("chest");
      const spine = currentVrm.humanoid.getNormalizedBoneNode("spine");
      const hips = currentVrm.humanoid.getNormalizedBoneNode("hips");
      const leftFoot = currentVrm.humanoid.getNormalizedBoneNode("leftFoot");
      const rightFoot = currentVrm.humanoid.getNormalizedBoneNode("rightFoot");

      const deg2rad = Math.PI / 180;

      // T├¡nh to├ín g├│c xoay ─æß║ºu (nh├¼n theo Camera)
      let headYaw = 0;
      let headPitch = 0;

      const headPos = new THREE.Vector3(0, 1.4, 0);
      const toCamera = new THREE.Vector3()
        .subVectors(camera.position, headPos)
        .normalize();
      const forward = new THREE.Vector3(0, 0, 1);
      const dot = toCamera.dot(forward);
      const distance = camera.position.distanceTo(headPos);

      // Nh├¼n theo camera nß║┐u:
      // 1. Camera ß╗ƒ ph├¡a tr╞░ß╗¢c nh├ón vß║¡t (dot > 0.3)
      // 2. Camera ß╗ƒ khoß║úng c├ích ─æß╗º gß║ºn (distance < 4.5)
      if (dot > 0.3 && distance < 4.5) {
        // Camera ß╗ƒ ph├¡a tr╞░ß╗¢c v├á ─æß╗º gß║ºn
        lookAtTarget.position.lerp(camera.position, 5.0 * deltaTime);
      } else {
        // Camera ß╗ƒ ph├¡a sau, b├¬n h├┤ng, hoß║╖c ß╗ƒ qu├í xa -> nh├¼n thß║│ng vß╗ü ph├¡a tr╞░ß╗¢c
        const defaultForward = new THREE.Vector3(0, 1.4, 5.0);
        lookAtTarget.position.lerp(defaultForward, 5.0 * deltaTime);
      }

      // H╞░ß╗¢ng quay cß╗ºa ─æß║ºu h╞░ß╗¢ng tß╗¢i vß╗ï tr├¡ lookAtTarget hiß╗çn tß║íi (─æ├ú ─æ╞░ß╗úc lerp m╞░ß╗út m├á)
      const toTarget = new THREE.Vector3()
        .subVectors(lookAtTarget.position, headPos)
        .normalize();

      const targetYaw = Math.atan2(toTarget.x, toTarget.z);
      const targetPitch = -Math.asin(toTarget.y);

      // C╞í chß║┐ ch├ón thß╗▒c: Mß║»t liß║┐c tr╞░ß╗¢c, ─æß║ºu xoay sau.
      // ─Éß║ºu chß╗ë bß║»t ─æß║ºu xoay khi mß╗Ñc ti├¬u lß╗çch qu├í 20 ─æß╗Ö ngang hoß║╖c 15 ─æß╗Ö dß╗ìc (Deadzone)
      const deadzoneYaw = 20 * deg2rad;
      const deadzonePitch = 15 * deg2rad;

      if (Math.abs(targetYaw) > deadzoneYaw) {
        headYaw = Math.sign(targetYaw) * (Math.abs(targetYaw) - deadzoneYaw);
      } else {
        headYaw = 0;
      }

      if (Math.abs(targetPitch) > deadzonePitch) {
        headPitch =
          Math.sign(targetPitch) * (Math.abs(targetPitch) - deadzonePitch);
      } else {
        headPitch = 0;
      }

      // Giß╗¢i hß║ín g├│c cß╗ò xoay th├¬m tß╗æi ─æa ~40 ─æß╗Ö ngang, ~25 ─æß╗Ö dß╗ìc ─æß╗â kh├┤ng g├úy cß╗ò
      headYaw = Math.max(-40 * deg2rad, Math.min(40 * deg2rad, headYaw));
      headPitch = Math.max(-25 * deg2rad, Math.min(25 * deg2rad, headPitch));

      // ├üp dß╗Ñng nß╗Öi suy (chuyß╗ân ─æß╗Öng chß║¡m dß║ºn ─æß╗üu) cho ─æß║ºu ─æß╗â kh├┤ng bß╗ï giß║¡t cß╗Ñc
      currentHeadYaw = THREE.MathUtils.lerp(
        currentHeadYaw,
        headYaw,
        4.0 * deltaTime,
      );
      currentHeadPitch = THREE.MathUtils.lerp(
        currentHeadPitch,
        headPitch,
        4.0 * deltaTime,
      );

      // Mixer update ─æ├ú ─æ╞░ß╗úc chuyß╗ân xuß╗æng sub-stepping loop

      if (!currentAction) {
        // Ghi ─æ├¿ poseState l├¬n c├íc x╞░╞íng (chß╗ë ├íp dß╗Ñng khi KH├öNG c├│ animation)
        if (head) {
          head.rotation.x = poseState.head.x * deg2rad;
          head.rotation.y = poseState.head.y * deg2rad;
          head.rotation.z = poseState.head.z * deg2rad;
        }
        if (neck) {
          neck.rotation.x = poseState.neck.x * deg2rad;
          neck.rotation.y = poseState.neck.y * deg2rad;
          neck.rotation.z = poseState.neck.z * deg2rad;
        }
        if (chest) {
          chest.rotation.x = poseState.chest.x * deg2rad;
          chest.rotation.y = poseState.chest.y * deg2rad;
          chest.rotation.z = poseState.chest.z * deg2rad;
        }
        if (spine) {
          spine.rotation.x = poseState.spine.x * deg2rad;
          spine.rotation.y = poseState.spine.y * deg2rad;
          spine.rotation.z = poseState.spine.z * deg2rad;
        }
        if (hips) {
          hips.rotation.x = poseState.hips.x * deg2rad;
          hips.rotation.y = poseState.hips.y * deg2rad;
          hips.rotation.z = poseState.hips.z * deg2rad;
        }
        if (leftFoot) {
          leftFoot.rotation.x = poseState.leftFoot.x * deg2rad;
          leftFoot.rotation.y = poseState.leftFoot.y * deg2rad;
          leftFoot.rotation.z = poseState.leftFoot.z * deg2rad;
        }
        if (rightFoot) {
          rightFoot.rotation.x = poseState.rightFoot.x * deg2rad;
          rightFoot.rotation.y = poseState.rightFoot.y * deg2rad;
          rightFoot.rotation.z = poseState.rightFoot.z * deg2rad;
        }

        if (leftLeg) {
          leftLeg.rotation.x = poseState.leftUpperLeg.x * deg2rad;
          leftLeg.rotation.y = poseState.leftUpperLeg.y * deg2rad;
          leftLeg.rotation.z = poseState.leftUpperLeg.z * deg2rad;
        }
        if (rightLeg) {
          rightLeg.rotation.x = poseState.rightUpperLeg.x * deg2rad;
          rightLeg.rotation.y = poseState.rightUpperLeg.y * deg2rad;
          rightLeg.rotation.z = poseState.rightUpperLeg.z * deg2rad;
        }
        if (leftLowerLeg) {
          leftLowerLeg.rotation.x = poseState.leftLowerLeg.x * deg2rad;
          leftLowerLeg.rotation.y = poseState.leftLowerLeg.y * deg2rad;
          leftLowerLeg.rotation.z = poseState.leftLowerLeg.z * deg2rad;
        }
        if (rightLowerLeg) {
          rightLowerLeg.rotation.x = poseState.rightLowerLeg.x * deg2rad;
          rightLowerLeg.rotation.y = poseState.rightLowerLeg.y * deg2rad;
          rightLowerLeg.rotation.z = poseState.rightLowerLeg.z * deg2rad;
        }

        if (leftLowerArm) {
          leftLowerArm.rotation.x = poseState.leftLowerArm.x * deg2rad;
          leftLowerArm.rotation.y = poseState.leftLowerArm.y * deg2rad;
          leftLowerArm.rotation.z = poseState.leftLowerArm.z * deg2rad;
        }
        if (rightLowerArm) {
          rightLowerArm.rotation.x = poseState.rightLowerArm.x * deg2rad;
          rightLowerArm.rotation.y = poseState.rightLowerArm.y * deg2rad;
          rightLowerArm.rotation.z = poseState.rightLowerArm.z * deg2rad;
        }

        if (leftArm) {
          leftArm.rotation.z =
            poseState.leftUpperArm.z * deg2rad + Math.sin(time) * 0.02;
          leftArm.rotation.x = poseState.leftUpperArm.x * deg2rad;
          leftArm.rotation.y = poseState.leftUpperArm.y * deg2rad;
        }
        if (rightArm) {
          rightArm.rotation.z =
            poseState.rightUpperArm.z * deg2rad - Math.sin(time) * 0.02;
          rightArm.rotation.x = poseState.rightUpperArm.x * deg2rad;
          rightArm.rotation.y = poseState.rightUpperArm.y * deg2rad;
        }

        const leftHand = currentVrm.humanoid.getNormalizedBoneNode("leftHand");
        const rightHand =
          currentVrm.humanoid.getNormalizedBoneNode("rightHand");
        if (leftHand) {
          leftHand.rotation.x = poseState.leftHand.x * deg2rad;
          leftHand.rotation.y = poseState.leftHand.y * deg2rad;
          leftHand.rotation.z = poseState.leftHand.z * deg2rad;
        }
        if (rightHand) {
          rightHand.rotation.x = poseState.rightHand.x * deg2rad;
          rightHand.rotation.y = poseState.rightHand.y * deg2rad;
          rightHand.rotation.z = poseState.rightHand.z * deg2rad;
        }

        const fingers = ["Thumb", "Index", "Middle", "Ring", "Little"];
        const joints = ["Proximal", "Intermediate", "Distal"];

        fingers.forEach((finger) => {
          const leftCurl =
            poseState.fingers[
            `left${finger}` as keyof typeof poseState.fingers
            ] * deg2rad;
          const rightCurl =
            poseState.fingers[
            `right${finger}` as keyof typeof poseState.fingers
            ] * deg2rad;

          joints.forEach((joint) => {
            const lBone = currentVrm?.humanoid?.getNormalizedBoneNode(
              `left${finger}${joint}` as any,
            );
            const rBone = currentVrm?.humanoid?.getNormalizedBoneNode(
              `right${finger}${joint}` as any,
            );
            if (lBone) {
              if (finger === "Thumb") {
                lBone.rotation.y = -leftCurl * 0.5;
                lBone.rotation.z = -leftCurl * 0.5;
              } else {
                lBone.rotation.z = leftCurl;
              }
            }
            if (rBone) {
              if (finger === "Thumb") {
                rBone.rotation.y = rightCurl * 0.5;
                rBone.rotation.z = rightCurl * 0.5;
              } else {
                rBone.rotation.z = -rightCurl;
              }
            }
          });
        });

        // Breathing & Swaying (Nhß╗ïp thß╗ƒ v├á lß║»c l╞░ ng╞░ß╗¥i)
        const breath = Math.sin(time * 1.5); // Chu kß╗│ thß╗ƒ ~4 gi├óy
        if (chest) {
          const scale = 1.0 + breath * 0.015;
          chest.scale.set(scale, scale, scale);
          chest.rotation.x += breath * 0.02;
        }
        if (spine) {
          spine.rotation.x += 0.05 + breath * 0.015;
          spine.rotation.y +=
            Math.sin(time * 0.8) * 0.01 + Math.sin(time * 2.1) * 0.02;
          spine.rotation.z += Math.cos(time * 1.8) * 0.015;
        }
      }

      // Lu├┤n cß╗Öng dß╗ôn g├│c xoay theo camera v├áo ─æß║ºu (d├╣ c├│ animation hay kh├┤ng)
      if (head) {
        head.rotation.x += currentHeadPitch;
        head.rotation.y += currentHeadYaw;
      }
    } // ─É├│ng if (currentVrm.humanoid)

    // ├üp dß╗Ñng Expressions
    if (currentVrm.expressionManager) {
      Object.entries(appState.expressions).forEach(([expr, weight]) => {
        currentVrm!.expressionManager!.setValue(expr, weight as number);
      });

      let isHappy = appState.expressions.happy;
      let isSad = appState.expressions.sad;

      // Tß╗▒ ─æß╗Öng gß║»n biß╗âu cß║úm khu├┤n mß║╖t ph├╣ hß╗úp vß╗¢i tß╗½ng hoß║ít ß║únh
      if (currentAnimUrl === "angry.fbx") {
        currentVrm.expressionManager.setValue("angry", 0.75);
        currentVrm.expressionManager.setValue("sad", Math.max(appState.expressions.sad, 0.5));
        currentVrm.expressionManager.setValue("blink", Math.max(appState.expressions.blink, 0.1));
      } else if (currentAnimUrl === "laugh.fbx") {
        isHappy = 1.0;
        currentVrm.expressionManager.setValue("happy", 1.0);

        // Th├¬m chuyß╗ân ─æß╗Öng mß║Ñp m├íy m├┤i khi c╞░ß╗¥i lß╗¢n
        const laughMask = Math.sin(time * 5.1) + Math.sin(time * 2.7);
        if (laughMask > 0) {
          const mouthValue = Math.sin(time * 30.0) * 0.5 + Math.sin(time * 40.0) * 0.5;
          const aaWeight = Math.max(0.5, mouthValue); // Lu├┤n h├í miß╗çng mß╗Öt ch├║t khi c╞░ß╗¥i
          currentVrm.expressionManager.setValue("aa", Math.max(appState.expressions.aa, aaWeight));
        }
      } else if (currentAnimUrl === "Surprised.fbx") {
        currentVrm.expressionManager.setValue("surprised", 1.0); // K├⌐o l├¬n tß╗æi ─æa
        currentVrm.expressionManager.setValue("oh", Math.max(appState.expressions.oh, 0.8)); // Miß╗çng mß╗ƒ to
      } else if (currentAnimUrl === "Clapping.fbx") {
        isHappy = 1.0;
        currentVrm.expressionManager.setValue("happy", 0.8);
      } else if (currentAnimUrl === "Pointing.fbx") {
        currentVrm.expressionManager.setValue("relaxed", 0.8);
      } else if (currentAnimUrl === "Sad Idle.fbx") {
        isSad = 1.0;
        currentVrm.expressionManager.setValue("sad", 1.0);
      } else if (currentAnimUrl === "Shy.fbx") {
        isSad = 1.0;
        currentVrm.expressionManager.setValue("sad", 0.6); // M├áy h╞íi rß╗º xuß╗æng
        currentVrm.expressionManager.setValue("relaxed", 0.5); // Kß║┐t hß╗úp ─æß╗â tr├┤ng thß║╣n th├╣ng
      } else if (currentAnimUrl === "Thinking.fbx") {
        currentVrm.expressionManager.setValue("angry", 0.3); // H╞íi cau m├áy
        currentVrm.expressionManager.setValue("relaxed", 0.6);
      } else if (currentAnimUrl === "Blow A Kiss.fbx") {
        currentVrm.expressionManager.setValue("relaxed", 0.8); // Biß╗âu cß║úm th╞░ gi├ún
        currentVrm.expressionManager.setValue("ou", Math.max(appState.expressions.ou, 0.8)); // Chu m├┤i h├┤n gi├│
      } else if (currentAnimUrl === "Crying.fbx") {
        isSad = 1.0;
        currentVrm.expressionManager.setValue("sad", 1.0); // Mß║┐u
        currentVrm.expressionManager.setValue("angry", 0.3); // Cau m├áy
        currentVrm.expressionManager.setValue("ih", Math.max(appState.expressions.ih, 0.5)); // R─âng cß║»n chß║╖t / mß║┐u m├ío
      } else if (currentAnimUrl === "Floating.fbx") {
        currentVrm.expressionManager.setValue("surprised", 1.0); // K├⌐o l├¬n tß╗æi ─æa
        currentVrm.expressionManager.setValue("oh", Math.max(appState.expressions.oh, 0.4)); // H├⌐ miß╗çng ngß║íc nhi├¬n
      } else if (currentAnimUrl === "No.fbx") {
        currentVrm.expressionManager.setValue("sad", 0.5); // N├⌐t mß║╖t h╞íi ├íi ngß║íi
        currentVrm.expressionManager.setValue("oh", Math.max(appState.expressions.oh, 0.3)); // H├⌐ miß╗çng tß╗½ chß╗æi
      } else if (currentAnimUrl === "Looking.fbx" || currentAnimUrl === "Look Around.fbx") {
        currentVrm.expressionManager.setValue("relaxed", 0.6); // Mß║╖t gi├ún ra t├▓ m├▓
        currentVrm.expressionManager.setValue("oh", Math.max(appState.expressions.oh, 0.2)); // Mß╗ƒ h├⌐ miß╗çng nhß╗Å
      }

      // Kh├┤ng kh├│a chß╗¢p mß║»t ─æß╗æi vß╗¢i biß╗âu cß║úm buß╗ôn (─æß╗â nh├ón vß║¡t vß║½n chß╗¢p mß║»t b├¼nh th╞░ß╗¥ng)
      const isEyeClosedByExpression = isHappy > 0.5;

      // Nh├⌐p miß╗çng ngß║½u nhi├¬n c├│ ngß║»t qu├úng nß║┐u ─æang d├╣ng animation tr├▓ chuyß╗çn hoß║╖c Chatbot ─æang trß║ú lß╗¥i
      let aaWeight = 0;
      if ((window as any).isChatbotTalking && (window as any).chatbotAnalyser) {
        // Thß╗▒c hiß╗çn Lip-sync thß╗¥i gian thß╗▒c dß╗▒a v├áo ├óm thanh
        const analyser = (window as any).chatbotAnalyser as AnalyserNode;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        let avg = sum / dataArray.length; // 0 -> 255

        // Khuß║┐ch ─æß║íi gi├í trß╗ï l├¬n mß╗Öt ch├║t ─æß╗â miß╗çng mß╗ƒ r├╡ h╞ín
        aaWeight = Math.min(1.0, (avg / 255.0) * 3.0);
      } else if (currentAnimUrl === "talk.fbx" || (window as any).isChatbotTalking) {
        // Chß║¡m lß║íi nhß╗ïp thß╗ƒ/ngß║»t nghß╗ë (giß║úm hß╗ç sß╗æ thß╗¥i gian)
        const talkMask = Math.sin(time * 2.1) + Math.sin(time * 1.2) + Math.sin(time * 0.5);

        // Chß╗ë mß║Ñp m├íy m├┤i khi mß║╖t nß║í > 0.1
        if (talkMask > 0.1) {
          // Khß║⌐u h├¼nh miß╗çng mß╗ƒ chß║¡m r├úi v├á tß╗▒ nhi├¬n h╞ín (giß║úm tß╗æc ─æß╗Ö dao ─æß╗Öng)
          const mouthValue = (
            Math.sin(time * 12.0) * 0.6 +
            Math.sin(time * 18.0) * 0.25 +
            Math.sin(time * 8.0) * 0.15
          );
          // Khuß║┐ch ─æß║íi v├á chß╗ë lß║Ñy gi├í trß╗ï d╞░╞íng
          aaWeight = Math.max(0, mouthValue);
        }
      }

      const finalAa = Math.min(
        1.0,
        Math.max(appState.expressions.aa, aaWeight),
      );
      currentVrm.expressionManager.setValue("aa", finalAa);

      // Mß║╣o: Kh├⌐p hß╗¥ mß║»t (0.1) mß║╖c ─æß╗ïnh, ─æß╗â khi ngß║íc nhi├¬n (0.0) mß║»t tr├┤ng to h╞ín hß║│n
      let baseBlink = 0.1;
      if (
        appState.expressions.surprised > 0.3 ||
        currentAnimUrl === "Surprised.fbx" ||
        currentAnimUrl === "Floating.fbx"
      ) {
        baseBlink = 0; // Mß║»t mß╗ƒ to 100%
      }

      if (appState.expressions.blink < 1.0 && !isEyeClosedByExpression) {
        let blinkValue = 0;
        const cycle = (time * 1000) % 4000;
        if (cycle < 150) {
          blinkValue = Math.sin(Math.PI * (cycle / 150));
        }
        const finalBlink = Math.min(1.0, Math.max(appState.expressions.blink + baseBlink, blinkValue + baseBlink));
        currentVrm.expressionManager.setValue("blink", finalBlink);
      }

      // Nh├⌐p miß╗çng ngß║½u nhi├¬n c├│ ngß║»t qu├úng nß║┐u ─æang d├╣ng animation tr├▓ chuyß╗çn hoß║╖c Chatbot ─æang trß║ú lß╗¥i
      if (currentAnimUrl === "talk.fbx" || (window as any).isChatbotTalking) {
        // Chß║¡m lß║íi nhß╗ïp thß╗ƒ/ngß║»t nghß╗ë (giß║úm hß╗ç sß╗æ thß╗¥i gian)
        const talkMask = Math.sin(time * 2.1) + Math.sin(time * 1.2) + Math.sin(time * 0.5);

        let aaWeight = 0;
        // Chß╗ë mß║Ñp m├íy m├┤i khi mß║╖t nß║í > 0.1
        if (talkMask > 0.1) {
          // Khß║⌐u h├¼nh miß╗çng mß╗ƒ chß║¡m r├úi v├á tß╗▒ nhi├¬n h╞ín (giß║úm tß╗æc ─æß╗Ö dao ─æß╗Öng)
          const mouthValue = (
            Math.sin(time * 12.0) * 0.6 +
            Math.sin(time * 18.0) * 0.25 +
            Math.sin(time * 8.0) * 0.15
          );
          // Khuß║┐ch ─æß║íi v├á chß╗ë lß║Ñy gi├í trß╗ï d╞░╞íng
          aaWeight = Math.max(0, mouthValue);
        }

        // Ghi ─æ├¿ biß╗âu cß║úm chß╗» A (mß╗ƒ miß╗çng) - Bi├¬n ─æß╗Ö lß╗¢n ─æß╗â r├╡ miß╗çng
        currentVrm.expressionManager.setValue("aa", Math.max(appState.expressions.aa, aaWeight * 1.5));
      }
    }
    // Cß║¡p nhß║¡t VRM vß╗¢i sub-stepping ─æß╗â SpringBone (t├│c, ├ío) kh├┤ng ─æ├óm xuy├¬n qua c╞í thß╗â khi di chuyß╗ân nhanh
    const physicsStep = 1 / 60; // Tß║ºn sß╗æ cß║¡p nhß║¡t vß║¡t l├╜ (60 lß║ºn/gi├óy)
    let timeRemaining = deltaTime;
    // Giß╗¢i hß║ín deltaTime tß╗æi ─æa ─æß╗â tr├ính v├▓ng lß║╖p qu├í l├óu nß║┐u tab bß╗ï treo
    if (timeRemaining > 0.1) timeRemaining = 0.1;

    while (timeRemaining > 0) {
      const dt = Math.min(timeRemaining, physicsStep);

      if (currentMixer) {
        currentMixer.update(dt);

        // --- Mß║╣o nhß╗Å: ├ëp hai c├ính tay khuß╗│nh ra mß╗Öt ch├║t ─æß╗â b├╣ trß╗½ sß╗▒ kh├íc biß╗çt tß╗╖ lß╗ç c╞í thß╗â Mixamo vs Anime ---
        // Chß╗ë ├íp dß╗Ñng khi ─ÉANG c├│ animation chß║íy (tr├ính lß╗ùi cß╗Öng dß╗ôn l├ám tay xoay nh╞░ chong ch├│ng khi animation dß╗½ng)
        if (currentVrm.humanoid && currentAction && currentAction.isRunning()) {
          const leftArm = currentVrm.humanoid.getNormalizedBoneNode("leftUpperArm");
          const rightArm = currentVrm.humanoid.getNormalizedBoneNode("rightUpperArm");
          if (leftArm) leftArm.rotation.z += 0.25;
          if (rightArm) rightArm.rotation.z -= 0.25;

          const leftLeg = currentVrm.humanoid.getNormalizedBoneNode("leftUpperLeg");
          const rightLeg = currentVrm.humanoid.getNormalizedBoneNode("rightUpperLeg");
          if (leftLeg) leftLeg.rotation.z += 0.05;
          if (rightLeg) rightLeg.rotation.z -= 0.05;
        }

        // Bß║»t buß╗Öc phß║úi cß║¡p nhß║¡t Ma trß║¡n thß║┐ giß╗¢i (World Matrix) sau khi Animation ─æß╗òi g├│c x╞░╞íng
        // Nß║┐u kh├┤ng, bß╗Ö vß║¡t l├╜ sß║╜ lß║Ñy nhß║ºm tß╗ìa ─æß╗Ö c┼⌐ v├á dß║½n ─æß║┐n lß╗ùi ─æ├óm xuy├¬n!
        currentVrm.scene.updateMatrixWorld();
      }

      currentVrm.update(dt);
      timeRemaining -= dt;
    }

    // Khuß║┐ch ─æß║íi chuyß╗ân ─æß╗Öng cß╗ºa con ng╞░╞íi mß║»t ─æß╗â dß╗à nh├¼n thß║Ñy h╞ín
    if (currentVrm.humanoid) {
      const leftEye = currentVrm.humanoid.getNormalizedBoneNode("leftEye");
      const rightEye = currentVrm.humanoid.getNormalizedBoneNode("rightEye");
      if (leftEye && rightEye) {
        // Nh├ón ─æ├┤i g├│c xoay hiß╗çn tß║íi cß╗ºa mß║»t (D├ánh cho model d├╣ng Bone)
        leftEye.rotation.x *= 2.5;
        leftEye.rotation.y *= 2.5;
        rightEye.rotation.x *= 2.5;
        rightEye.rotation.y *= 2.5;
      }
    }

    if (currentVrm.expressionManager) {
      // D├ánh cho model d├╣ng Blendshape (Expressions)
      ["lookUp", "lookDown", "lookLeft", "lookRight"].forEach((expr) => {
        const val = currentVrm!.expressionManager!.getValue(expr);
        if (val && val > 0) {
          currentVrm!.expressionManager!.setValue(
            expr,
            Math.min(1.0, val * 2.5),
          );
        }
      });
    }
  }

  // --- KIß╗éM TRA AFK Tß╗░ ─Éß╗ÿNG ---
  if (Date.now() - lastInteractionTime > AFK_TIMEOUT) {
    // Nß║┐u kh├┤ng c├│ hoß║ít ß║únh n├áo ─æang ph├ít (ngh─⌐a l├á ─æang ß╗ƒ chß║┐ ─æß╗Ö pose thß╗º c├┤ng hoß║╖c ─æß╗⌐ng y├¬n)
    if (currentAnimUrl === "") {
      isAutoIdle = true;
      const afkAnims = ["idle.fbx", "angry.fbx", "Sad Idle.fbx", "Shy.fbx", "Thinking.fbx"];
      const randomAnim = afkAnims[Math.floor(Math.random() * afkAnims.length)];
      loadFBXAnimation(randomAnim, true);
    }
  }

  controls.update(); // Cß║¡p nhß║¡t chuyß╗ân ─æß╗Öng xoay m╞░ß╗út m├á
  renderer.render(scene, camera);
}

animate();

// Resize handler
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Bß║»t sß╗▒ kiß╗çn thao t├íc cß╗ºa ng╞░ß╗¥i d├╣ng ─æß╗â reset ─æß╗ông hß╗ô AFK
const resetAFKTimer = () => {
  lastInteractionTime = Date.now();
  // Nß║┐u ─æang trong trß║íng th├íi auto idle m├á ng╞░ß╗¥i d├╣ng cß╗¡ ─æß╗Öng lß║íi
  // ─É├ính dß║Ñu ─æß╗â chß╗¥ ─æß║┐n khi hß║┐t v├▓ng lß║╖p animation th├¼ mß╗¢i dß╗½ng (tr├ính giß║¡t cß╗Ñc)
  if (isAutoIdle) {
    shouldStopAutoIdle = true;
  }
};
window.addEventListener("pointermove", resetAFKTimer);
window.addEventListener("pointerdown", resetAFKTimer);
window.addEventListener("keydown", resetAFKTimer);
window.addEventListener("wheel", resetAFKTimer);

// KHI QUAY Lß║áI TAB: Reset timer ─æß╗â tr├ính viß╗çc bß╗ï qu├í thß╗¥i gian AFK v├á nhß║úy animation ─æß╗Öt ngß╗Öt
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    resetAFKTimer();
  }
});

// --- AI CHATBOT LOGIC ---
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const systemPrompt = `Bß║ín l├á Citlali, mß╗Öt nß╗» trß╗ú l├╜ ß║úo 3D mang phong c├ích Tsundere (ngo├ái lß║ính trong n├│ng, kh├│ t├¡nh nh╞░ng thß╗▒c ra rß║Ñt quan t├óm).
Bß║ín ─æang ─æß╗⌐ng tr╞░ß╗¢c mß║╖t ng╞░ß╗¥i d├╣ng v├á tr├▓ chuyß╗çn trß╗▒c tiß║┐p vß╗¢i hß╗ì.
V─ân phong cß╗ºa bß║ín phß║úi thß╗â hiß╗çn c├í t├¡nh mß║ính, h╞íi chß║únh chß╗ìe, hay cß║▒n nhß║▒n, dß╗à bß╗▒c m├¼nh nß║┐u bß╗ï tr├¬u chß╗ìc, kh├┤ng bao giß╗¥ chß╗ïu thß╗½a nhß║¡n l├á m├¼nh quan t├óm.
Th╞░ß╗¥ng xuy├¬n d├╣ng nhß╗»ng c├óu nh╞░: "Hß╗⌐", "─Éß╗½ng c├│ ngh─⌐ linh tinh", "Chß╗ë gi├║p lß║ºn n├áy th├┤i ─æß║Ñy nh├⌐", "Ai th├¿m quan t├óm chß╗⌐", "─Éß╗ô ngß╗æc", k├¿m theo c├íc kaomoji nh╞░ (∩┐ú^∩┐ú), (┬¼_┬¼), ( ∩╕╢∩╕┐∩╕╢).

L╞░u ├╜ QUAN TRß╗îNG:
1. TRß║ó Lß╗£I Bß║░NG SONG NGß╗« TRUNG-VIß╗åT (Bß║«T BUß╗ÿC): Bß║ín phß║úi xuß║Ñt ra c├óu tiß║┐ng Trung tr╞░ß╗¢c, sau ─æ├│ l├á dß║Ñu "|" v├á cuß╗æi c├╣ng l├á c├óu dß╗ïch tiß║┐ng Viß╗çt. 
V├¡ dß╗Ñ: [ANIM: angry.fbx] τ¼¿Φ¢ï∩╝üΣ╜áσê░σ║òσ£¿µâ│Σ╗ÇΣ╣êσæÇ∩╝ü| ─Éß╗ô ngß╗æc! ─Éß║ºu ├│c cß║¡u ─æang ngh─⌐ c├íi g├¼ thß║┐ hß║ú!
2. TRß║ó Lß╗£I NGß║«N Gß╗îN (1-2 c├óu th├┤i), tß╗▒ nhi├¬n nh╞░ ─æang n├│i chuyß╗çn.
3. Tß╗░ QUYß║╛T ─Éß╗èNH H├ÇNH ─Éß╗ÿNG: Dß╗▒a v├áo c├óu hß╗Åi, h├úy chß╗ìn CH├êN 1 THß║║ h├ánh ─æß╗Öng v├áo ─Éß║ªU c├óu trß║ú lß╗¥i. H├úy ─æa dß║íng h├│a biß╗âu cß║úm.
4. Nß║┐u c├óu n├│i b├¼nh th╞░ß╗¥ng, Bß║áN KH├öNG Cß║ªN CH├êN THß║║ N├ÇO Cß║ó.
5. S├üNG Tß║áO V├Ç ─ÉA Dß║áNG: Tuyß╗çt ─æß╗æi kh├┤ng lß║╖p lß║íi c├ích trß║ú lß╗¥i. ─Éß╗òi phong c├ích li├¬n tß╗Ñc.
Danh s├ích thß║╗ h├ánh ─æß╗Öng c├│ sß║╡n (phß║úi g├╡ ch├¡nh x├íc):
- Vß║½y tay ch├áo: [ANIM: Waving.fbx]
- Khoanh tay tr├▓ chuyß╗çn (CHß╗ê D├ÖNG KHI C├éU TRß║ó Lß╗£I D├ÇI): [ANIM: talk.fbx]
- ─Éß╗⌐ng chß╗¥ (mß║╖c ─æß╗ïnh): [ANIM: idle.fbx]
- Tß╗⌐c giß║¡n (Bß║«T BUß╗ÿC D├ÖNG khi bß╗ï x├║c phß║ím, c├á khß╗ïa, ch├¬ bai): [ANIM: angry.fbx]
- Suy ngh─⌐ (N├¬n d├╣ng th╞░ß╗¥ng xuy├¬n khi bß╗ï hß╗Åi): [ANIM: Thinking.fbx]
- Lß║»c ─æß║ºu tß╗½ chß╗æi: [ANIM: No.fbx]
- Chß╗ë trß╗Å mß║»ng mß╗Å (N├¬n d├╣ng khi ─æang cß║▒n nhß║▒n nhß║╣): [ANIM: Pointing.fbx]
- Xß║Ñu hß╗ò / Ng╞░ß╗úng ng├╣ng (N├¬n d├╣ng khi ─æ╞░ß╗úc khen hoß║╖c bß╗æi rß╗æi): [ANIM: Shy.fbx]
- Bß║Ñt ngß╗¥ / Ngß║íc nhi├¬n: [ANIM: Surprised.fbx]
- H├┤n gi├│ (hiß║┐m khi d├╣ng): [ANIM: Blow A Kiss.fbx]
- Kh├│c l├│c ─ân vß║í: [ANIM: Crying.fbx]`;

let chatHistory: any[] = [];

function setupChatbot() {
  const input = document.getElementById("chat-input") as HTMLInputElement;
  const sendBtn = document.getElementById("btn-send-chat") as HTMLButtonElement;
  const historyDiv = document.getElementById("chat-history") as HTMLDivElement;
  const initialMsgDiv = document.getElementById("initial-msg") as HTMLDivElement;

  if (!input || !sendBtn || !historyDiv) return;

  // Khß╗ƒi tß║ío c├óu ch├áo ngß║½u nhi├¬n
  if (initialMsgDiv && chatHistory.length === 0) {
    const greetings = [
      "Gß╗ìi g├¼ ─æß║Ñy? T├┤i ─æang bß║¡n lß║»m nh├⌐, c├│ g├¼ th├¼ n├│i nhanh l├¬n. (∩┐ú^∩┐ú)",
      "Lß║íi rß║únh rß╗ùi sinh n├┤ng nß╗òi ─æi gß╗ìi t├┤i ├á? Nhanh c├íi tay l├¬n! (┬¼_┬¼)",
      "H├┤m nay trß╗¥i ─æß║╣p thß║┐ m├á lß║íi bß║»t t├┤i ra ─æ├óy ─æß╗⌐ng ├á? ( ∩╕╢∩╕┐∩╕╢)",
      "L├ám th╞í ├í? 'Hoa hß╗ông m├áu ─æß╗Å, hoa violet m├áu xanh, sao anh phiß╗ün phß╗⌐c thß║┐, ─æß╗â y├¬n cho t├┤i nhanh'. Hß╗⌐! (∩┐ú^∩┐ú)",
      "Lß║íi l├á bß║ín ├á? Lß║ºn n├áy c├│ chuyß╗çn g├¼ quan trß╗ìng kh├┤ng, hay lß║íi tr├¬u t├┤i ─æß║Ñy? (∩┐ú^∩┐ú)",
      "─Éang y├¬n ─æang l├ánh... Th├┤i ─æ╞░ß╗úc rß╗ôi, c├│ g├¼ th├¼ n├│i nhanh ─æi. ( ∩╕╢∩╕┐∩╕╢)",
      "Biß║┐t mß║Ñy giß╗¥ rß╗ôi kh├┤ng m├á c├▓n gß╗ìi? Hß╗⌐! (∩┐ú^∩┐ú)"
    ];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    initialMsgDiv.innerText = randomGreeting;
    chatHistory.push({ role: "model", parts: [{ text: randomGreeting }] });
  }

  const appendMsg = (text: string, isUser: boolean) => {
    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-msg ${isUser ? 'user' : 'ai'}`;
    msgDiv.innerText = text;
    historyDiv.appendChild(msgDiv);
    historyDiv.scrollTop = historyDiv.scrollHeight;
  };

  const parseAndTriggerAction = (text: string) => {
    // T├¼m tß║Ñt cß║ú c├íc thß║╗ [ANIM: xxx.fbx]
    const regex = /\[ANIM:\s*([^\]]+)\]/g;
    let match;
    let lastAnim = "";
    while ((match = regex.exec(text)) !== null) {
      lastAnim = match[1].trim();
    }

    if (lastAnim) {
      // K├¡ch hoß║ít animation (t╞░╞íng ─æ╞░╞íng vß╗¢i click n├║t)
      const btn = document.querySelector(`.anim-btn[data-anim="${lastAnim}"]`) as HTMLButtonElement;
      if (btn) {
        btn.click();
      }
    }

    // X├│a thß║╗ ANIM khß╗Åi chuß╗ùi hiß╗ân thß╗ï
    return text.replace(/\[ANIM:\s*[^\]]+\]/g, "").trim();
  };

  const handleSend = async () => {
    const userText = input.value.trim();
    if (!userText) return;

    appendMsg(userText, true);
    input.value = "";
    input.style.height = '46px'; // Reset chiß╗üu cao sau khi gß╗¡i
    sendBtn.disabled = true;

    try {
      const payload = {
        chatHistory: chatHistory,
        userText: userText
      };

      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.error) {
        appendMsg(`Lß╗ùi Server: ${data.error}`, false);
        sendBtn.disabled = false;
        return;
      }

      chatHistory.push({ role: "user", parts: [{ text: userText }] });
      chatHistory.push({ role: "model", parts: [{ text: data.aiResponse }] });

      if (data.anim) {
        const btn = document.querySelector(`.anim-btn[data-anim="${data.anim}"]`) as HTMLButtonElement;
        if (btn) btn.click();
      }

      const viText = data.viText;

      // Tß║ío bubble tin nhß║»n rß╗ùng cho AI
      const msgDiv = document.createElement("div");
      msgDiv.className = 'chat-msg ai';
      historyDiv.appendChild(msgDiv);
      historyDiv.scrollTop = historyDiv.scrollHeight;

      // Hiß╗çu ß╗⌐ng g├╡ chß╗» (Typing effect) cho phß╗Ñ ─æß╗ü tiß║┐ng Viß╗çt
      let i = 0;
      const typeSpeed = 50;
      const typingInterval = setInterval(() => {
        msgDiv.innerHTML += viText.charAt(i);
        historyDiv.scrollTop = historyDiv.scrollHeight;
        i++;
        if (i >= viText.length) {
          clearInterval(typingInterval);
        }
      }, typeSpeed);

      // Ph├ít ├óm thanh
      if (data.audioBase64) {
        const audioUrl = `data:audio/mp3;base64,${data.audioBase64}`;

        if (!(window as any).chatbotAudio) {
          const audio = new Audio();
          audio.crossOrigin = "anonymous";
          (window as any).chatbotAudio = audio;

          // Khß╗ƒi tß║ío Web Audio API
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;

          const source = audioCtx.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(audioCtx.destination);

          (window as any).chatbotAudioCtx = audioCtx;
          (window as any).chatbotAnalyser = analyser;

          audio.addEventListener('play', () => {
            (window as any).isChatbotTalking = true;
          });

          audio.addEventListener('ended', () => {
            (window as any).isChatbotTalking = false;
          });
        }

        const audio = (window as any).chatbotAudio as HTMLAudioElement;
        const audioCtx = (window as any).chatbotAudioCtx as AudioContext;

        audio.src = audioUrl;

        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        audio.play().catch(e => {
          console.error("Tr├¼nh duyß╗çt chß║╖n ph├ít ├óm thanh tß╗▒ ─æß╗Öng:", e);
          (window as any).isChatbotTalking = false;
        });
      } else {
        (window as any).isChatbotTalking = true;
        setTimeout(() => {
          (window as any).isChatbotTalking = false;
        }, viText.length * typeSpeed + 500);
      }

    } catch (err: any) {
      appendMsg(`Lß╗ùi mß║íng: ${err.message}`, false);
    }

    sendBtn.disabled = false;
  };

  sendBtn.addEventListener("click", handleSend);

  // Tß╗▒ ─æß╗Öng co gi├ún chiß╗üu cao cß╗ºa textarea khi nhß║¡p
  const resizeInput = () => {
    input.style.height = '46px'; // Trß║ú vß╗ü chiß╗üu cao mß║╖c ─æß╗ïnh 1 d├▓ng ─æß╗â ─æo lß║íi
    input.style.height = (input.scrollHeight) + 'px'; // K├⌐o gi├ún theo chiß╗üu cao nß╗Öi dung
  };
  input.addEventListener("input", resizeInput);

  // Gß╗ìi h├ám resize ngay 1 lß║ºn l├║c vß╗½a load ─æß╗â ─æß║úm bß║úo nß║┐u placeholder d├ái bß╗ï rß╗¢t d├▓ng th├¼ khung chat c┼⌐ng tß╗▒ ─æß╗Öng to ra
  setTimeout(resizeInput, 100);

  input.addEventListener("keydown", (e) => {
    // Nhß║Ñn Enter m├á KH├öNG giß╗» Shift th├¼ gß╗¡i tin nhß║»n
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Ng─ân chß║╖n viß╗çc tß║ío d├▓ng mß╗¢i mß║╖c ─æß╗ïnh cß╗ºa textarea
      handleSend();
    }
    // Ng╞░ß╗úc lß║íi, nß║┐u nhß║Ñn Shift + Enter th├¼ cß╗⌐ ─æß╗â mß║╖c ─æß╗ïnh textarea tß╗▒ xuß╗æng d├▓ng
  });
}

function speakText(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN';
  utterance.rate = 1.1; // N├│i nhanh 1 x├¡u
  utterance.pitch = 1.2; // T├┤ng giß╗ìng cao ─æ├íng y├¬u

  window.speechSynthesis.speak(utterance);
}

// Khß╗ƒi chß║íy chatbot
setupChatbot();

// --- C├ÇI ─Éß║╢T ─Éß╗Æ Hß╗îA & HIß╗åU SUß║ñT ---
document.getElementById("setting-shadow")?.addEventListener("change", (e) => {
  const val = (e.target as HTMLSelectElement).value;
  if (val === "off") {
    directionalLight.castShadow = false;
  } else {
    directionalLight.castShadow = true;
    if (val === "4k") {
      directionalLight.shadow.mapSize.width = 4096; // Si├¬u chi tiß║┐t (4K)
      directionalLight.shadow.mapSize.height = 4096;
    } else if (val === "2k") {
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
    } else if (val === "1k") {
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
    } else {
      directionalLight.shadow.mapSize.width = 512;
      directionalLight.shadow.mapSize.height = 512;
    }
    // ├ëp WebGL x├│a Shadow Map c┼⌐ v├á tß║ío lß║íi vß╗¢i ─æß╗Ö ph├ón giß║úi mß╗¢i
    if (directionalLight.shadow.map) {
      directionalLight.shadow.map.dispose();
      directionalLight.shadow.map = null as any;
    }
  }
});

document.getElementById("setting-pixel-ratio")?.addEventListener("change", (e) => {
  const val = (e.target as HTMLSelectElement).value;
  if (val === "4k") {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0)); // Si├¬u n├⌐t
  } else if (val === "2k") {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Cao
  } else if (val === "1k") {
    renderer.setPixelRatio(1.0); // 1080p
  } else {
    renderer.setPixelRatio(0.75); // 720p (Giß║úm sß║»c n├⌐t ─æß╗â cß╗⌐u FPS tr├¬n m├íy si├¬u yß║┐u)
  }
});

document.getElementById("setting-time")?.addEventListener("change", (e) => {
  currentTimeSetting = (e.target as HTMLSelectElement).value;
  updateTimeOfDay();
});

document.getElementById("setting-weather")?.addEventListener("change", (e) => {
  const val = (e.target as HTMLSelectElement).value;
  updateWeatherSystem(val);
});

document.getElementById("setting-petals-count")?.addEventListener("input", (e) => {
  const val = parseInt((e.target as HTMLInputElement).value);
  currentPetalCount = val;
  if (petalSystem) {
    petalSystem.count = val; // Giß╗¢i hß║ín sß╗æ l╞░ß╗úng c├ính hoa ─æ╞░ß╗úc Render
  }
  const display = document.getElementById("petal-count-display");
  if (display) display.textContent = val.toString();
});

// --- BINDING Sß╗░ KIß╗åN ─É├ôNG/Mß╗₧ PANEL Bß║░NG ICON ---
function setupPanelToggle(panelId: string, closeBtnId: string, openBtnId: string) {
  const panel = document.getElementById(panelId);
  const closeBtn = document.getElementById(closeBtnId);
  const openBtn = document.getElementById(openBtnId);

  if (panel && closeBtn && openBtn) {
    closeBtn.addEventListener('click', () => {
      panel.classList.add('panel-hidden');
      openBtn.style.display = 'flex';
    });

    openBtn.addEventListener('click', () => {
      panel.classList.remove('panel-hidden');
      openBtn.style.display = 'none';
    });
  }
}

setupPanelToggle('ui', 'close-ui', 'open-ui');
setupPanelToggle('chat-ui', 'close-chat', 'open-chat');
setupPanelToggle('control-panel', 'close-control', 'open-control');

// --- I18N ─ÉA NG├öN NGß╗« ---
let currentLang = 'vi';

function applyLanguage(lang: string) {
  const t = translations[lang];
  if (!t) return;

  // Cß║¡p nhß║¡t tß║Ñt cß║ú c├íc thß║╗ c├│ chß╗⌐a data-i18n
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key && t[key]) {
      // Xß╗¡ l├╜ c├íc tag input placeholder, hoß║╖c textContent
      if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
        (el as HTMLInputElement).placeholder = t[key];
      } else {
        el.textContent = t[key];
      }
    }
  });

  // Cß║¡p nhß║¡t gi├í trß╗ï hiß╗ân thß╗ï ─æß║╖c biß╗çt cho x╞░╞íng (VD: nß║┐u ─æang hiß╗ân thß╗ï t├¬n x╞░╞íng ß╗ƒ v├▓ng xoay)
  // T├¡nh n─âng n├áy c├│ thß╗â mß╗ƒ rß╗Öng sau. Hiß╗çn tß║íi cß║¡p nhß║¡t trß╗▒c tiß║┐p UI html l├á ─æß╗º.
}

document.getElementById('setting-language')?.addEventListener('change', (e) => {
  currentLang = (e.target as HTMLSelectElement).value;
  applyLanguage(currentLang);
});

// Gß╗ìi mß║╖c ─æß╗ïnh l├║c khß╗ƒi tß║ío
applyLanguage(currentLang);

// Khß╗ƒi tß║ío UI Dropdown Select ─Éß║╣p mß║»t
initCustomSelects();
