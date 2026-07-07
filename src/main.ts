import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { VRMLoaderPlugin, VRMUtils, VRM } from "@pixiv/three-vrm";
import { loadMixamoAnimation } from "./loadMixamoAnimation";
// import GUI from 'lil-gui'; // Sẽ xóa sau khi dọn dẹp xong code bên dưới
import "./style.css";

// Các tư thế lưu sẵn
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

// Trạng thái chung
const poseState = JSON.parse(JSON.stringify(poses.crossed));
const targetPoseState = JSON.parse(JSON.stringify(poses.crossed)); // Lưu trạng thái đích để nội suy mượt mà
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
savePoseToHistory(); // Lưu trạng thái ban đầu

window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "z") {
    if (poseHistory.length > 1) {
      poseHistory.pop(); // Bỏ trạng thái hiện tại
      const prevState = poseHistory[poseHistory.length - 1];
      Object.assign(poseState, JSON.parse(JSON.stringify(prevState)));
      Object.assign(targetPoseState, JSON.parse(JSON.stringify(prevState)));

      // Cập nhật lại UI nếu đang mở
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
  Đầu: "head",
  Cổ: "neck",
  Ngực: "chest",
  Lưng: "spine",
  Hông: "hips",
  "Tay Trái (Trên)": "leftUpperArm",
  "Khuỷu Trái": "leftLowerArm",
  "Bàn Tay Trái": "leftHand",
  "Tay Phải (Trên)": "rightUpperArm",
  "Khuỷu Phải": "rightLowerArm",
  "Bàn Tay Phải": "rightHand",
  "Đùi Trái": "leftUpperLeg",
  "Đầu Gối Trái": "leftLowerLeg",
  "Bàn Chân Trái": "leftFoot",
  "Đùi Phải": "rightUpperLeg",
  "Đầu Gối Phải": "rightLowerLeg",
  "Bàn Chân Phải": "rightFoot",
};

// Hàm nội suy (lerp)
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

// ----- BINDING SỰ KIỆN GIAO DIỆN MỚI (THAY THẾ LIL-GUI) -----
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    // Xóa active của tất cả các tab
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));

    // Thêm active cho tab được click
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
const AFK_TIMEOUT = 10000; // 10 giây không thao tác sẽ tự động chuyển sang nhàn rỗi

const loopOnceAnimations = [
  "Waving.fbx", "Pointing.fbx", "No.fbx", "Clapping.fbx", 
  "Blow A Kiss.fbx", "Surprised.fbx", "Shy.fbx", "Thinking.fbx", "angry.fbx", "talk.fbx"
];

function loadFBXAnimation(url: string, isAfkCall: boolean = false) {
  lastInteractionTime = Date.now(); // Reset timer khi người dùng chủ động tải animation

  // Nếu người dùng chủ động thao tác để tải 1 animation khác, thì đánh dấu là không phải auto idle
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
        // Nếu người dùng đã thao tác lại và đang đợi hết khung hình của auto-idle
        if (shouldStopAutoIdle && e.action === currentAction) {
          shouldStopAutoIdle = false;
          isAutoIdle = false;
          loadFBXAnimation(""); // Trở về trạng thái tĩnh ngay khi vừa hết chu kỳ
        }
      });
      // Tự động trở về trạng thái bình thường sau khi kết thúc 1 hành động (LoopOnce)
      currentMixer.addEventListener("finished", (e) => {
        if (e.action === currentAction && currentAnimUrl !== "") {
          loadFBXAnimation(""); // Trở về base pose (bỏ khóa animation)
        }
      });
    }

    currentAction = currentMixer.clipAction(clip);
    
    // Áp dụng LoopOnce cho các hành động nhất thời
    if (loopOnceAnimations.includes(url)) {
      currentAction.setLoop(THREE.LoopOnce, 1);
      currentAction.clampWhenFinished = true;
    } else {
      currentAction.setLoop(THREE.LoopRepeat, Infinity);
    }
    
    currentAction.reset().fadeIn(0.5).play();
  }).catch((err) => {
    console.error("Lỗi khi tải FBX:", err);
    alert("Không tìm thấy file /animations/" + url + " - Bạn nhớ tạo thư mục public/animations và chép file vào nhé!");
  });
}

document.querySelectorAll(".anim-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const target = e.currentTarget as HTMLButtonElement;
    const animName = target.getAttribute("data-anim") || "";
    loadFBXAnimation(animName);
  });
});

// Gán sự kiện cho các thanh trượt biểu cảm
document.querySelectorAll(".expr-slider").forEach((slider) => {
  slider.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    const exprName = target.getAttribute("data-expr");
    if (exprName) {
      targetExpressions[exprName as keyof typeof targetExpressions] =
        parseFloat(target.value);
    }
    // Nếu dùng thanh trượt lẻ, tự động chuyển dropdown về "Tùy chỉnh"
    const exprSelect = document.getElementById(
      "expression-select",
    ) as HTMLSelectElement;
    if (exprSelect) exprSelect.value = "custom";
  });
});

// Dropdown Biểu cảm Cài sẵn
document
  .getElementById("expression-select")
  ?.addEventListener("change", (e) => {
    const val = (e.target as HTMLSelectElement).value;
    // Reset tất cả về 0
    Object.keys(targetExpressions).forEach(
      (key) => (targetExpressions[key as keyof typeof targetExpressions] = 0),
    );

    if (val !== "neutral" && val !== "custom") {
      targetExpressions[val as keyof typeof targetExpressions] = 1.0;

      // Chỉnh lại biểu cảm tức giận cho cute hơn (dỗi)
      if (val === "angry") {
        targetExpressions["angry"] = 0.75; // Giảm độ cau mày
        targetExpressions["sad"] = 0.5;    // Miệng hơi cong xuống (mếu)
        targetExpressions["blink"] = 0.1;  // Mở mắt to hơn (chỉ nhắm rất nhẹ)
      }

      // Chỉnh lại biểu cảm ngạc nhiên tự nhiên hơn
      if (val === "surprised") {
        targetExpressions["surprised"] = 1.0; // Tăng lên tối đa 1.0
        targetExpressions["oh"] = 0.8;        // Miệng chữ O mở to hơn
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

// Thanh trượt Độ nắm ngón tay Chung
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

// Gán sự kiện cho các thanh trượt ngón tay lẻ
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

// Hàm hỗ trợ để cập nhật giá trị hiển thị trên bảng XYZ
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
// Tăng pixel ratio lên tối thiểu 2.0 để khử răng cưa (supersampling) cho nét mượt hơn
renderer.setPixelRatio(Math.max(window.devicePixelRatio, 2.0));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  35.0,
  window.innerWidth / window.innerHeight,
  0.1,
  20.0,
);
camera.position.set(0.0, 1.3, 1.5); // Góc mặc định là Cận cảnh hông (lùi xa 1 chút)

// Thêm OrbitControls để xoay góc máy bằng chuột
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0.0, 1.2, 0.0);
controls.enablePan = false;
controls.enableDamping = true;

// Chuyển việc xoay camera sang nút Chuột Phải, để trống Chuột Trái cho việc click biểu cảm
controls.mouseButtons = {
  LEFT: 0, // 0 = NONE
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE,
};

// Chặn menu mặc định khi click chuột phải trên trình duyệt
window.addEventListener("contextmenu", (e) => e.preventDefault());

// Trạng thái Camera
let isAnimatingCamera = false;
let targetCameraPos = new THREE.Vector3();
let targetControlsTarget = new THREE.Vector3();

controls.addEventListener("start", () => {
  isAnimatingCamera = false; // Hủy tự động di chuyển nếu người dùng tự kéo chuột
});

document.getElementById("cam-full")?.addEventListener("click", () => {
  targetCameraPos.set(0.0, 1.0, 3.5);
  targetControlsTarget.set(0.0, 0.8, 0.0);
  isAnimatingCamera = true;
});

document.getElementById("cam-half")?.addEventListener("click", () => {
  targetCameraPos.set(0.0, 1.3, 1.5); // Cận cảnh hông (lùi xa một chút)
  targetControlsTarget.set(0.0, 1.2, 0.0);
  isAnimatingCamera = true;
});

document.getElementById("cam-chest")?.addEventListener("click", () => {
  targetCameraPos.set(0.0, 1.45, 1.0); // Cận cảnh ngực
  targetControlsTarget.set(0.0, 1.42, 0.0);
  isAnimatingCamera = true;
});

document.getElementById("cam-face")?.addEventListener("click", () => {
  targetCameraPos.set(0.0, 1.45, 0.7); // Cận cảnh mặt (zoom sát khuôn mặt)
  targetControlsTarget.set(0.0, 1.42, 0.0);
  isAnimatingCamera = true;
});

// Khởi tạo TransformControls (Vòng xoay 3D Gizmo)
const transformControl = new TransformControls(camera, renderer.domElement);
transformControl.setMode("rotate"); // Chỉ cho phép xoay
transformControl.setSpace("local"); // Xoay theo trục cục bộ của xương
scene.add(transformControl.getHelper());

transformControl.addEventListener("dragging-changed", (event) => {
  controls.enabled = !event.value; // Tắt OrbitControls khi đang nắm kéo Gizmo
  if (!event.value) {
    // Khi thả chuột ra
    savePoseToHistory();
  }
});

const rad2deg = 180 / Math.PI;

transformControl.addEventListener("objectChange", () => {
  if (!transformControl.object || appState.activeBone === "none") return;
  const bone = transformControl.object;
  const boneKey = boneMapping[appState.activeBone as keyof typeof boneMapping];
  if (!boneKey) return;

  // Áp dụng giới hạn vật lý chung
  const degRot = {
    x: bone.rotation.x * rad2deg,
    y: bone.rotation.y * rad2deg,
    z: bone.rotation.z * rad2deg,
  };
  clampBoneDegrees(boneKey, degRot);

  bone.rotation.x = degRot.x / rad2deg;
  bone.rotation.y = degRot.y / rad2deg;
  bone.rotation.z = degRot.z / rad2deg;

  // Cập nhật lại poseState và targetPoseState để đồng bộ với thanh GUI (nếu có) và animate loop
  if (poseState[boneKey]) {
    targetPoseState[boneKey].x = degRot.x;
    targetPoseState[boneKey].y = degRot.y;
    targetPoseState[boneKey].z = degRot.z;
    poseState[boneKey].x = degRot.x;
    poseState[boneKey].y = degRot.y;
    poseState[boneKey].z = degRot.z;

    // Đồng bộ lên GUI theo thời gian thực
    updateXYZUI(degRot.x, degRot.y, degRot.z);
  }
});

// Hàm gắn Gizmo khi chọn xương từ Dropdown hoặc Bảng HTML
(window as any).onBoneSelect = (val: keyof typeof boneMapping) => {
  appState.activeBone = val;
  if (val === "none") {
    transformControl.detach();
  } else if (currentVrm && currentVrm.humanoid) {
    const boneKey = boneMapping[val];
    const boneNode = currentVrm.humanoid.getNormalizedBoneNode(boneKey as any);

    // Cập nhật giá trị hiển thị trên bảng XYZ
    if (boneKey && poseState[boneKey]) {
      updateXYZUI(
        poseState[boneKey].x,
        poseState[boneKey].y,
        poseState[boneKey].z,
      );
    }

    if (boneNode) {
      // Mặc định hiện tất cả các trục
      transformControl.showX = true;
      transformControl.showY = true;
      transformControl.showZ = true;

      // Ẩn bớt các trục bị khóa vật lý để đỡ rối mắt
      if (boneKey === "leftLowerLeg" || boneKey === "rightLowerLeg") {
        // Đầu gối chỉ gập trục X
        transformControl.showY = false;
        transformControl.showZ = false;
      } else if (boneKey === "leftLowerArm" || boneKey === "rightLowerArm") {
        // Khuỷu tay chỉ gập trục Y (X và Z bị ẩn để chống gãy tay)
        transformControl.showX = false;
        transformControl.showZ = false;
      }

      transformControl.attach(boneNode);
    }
  }
};

// Gắn sự kiện click cho các nút trong bảng HTML
document.querySelectorAll(".bone-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    // Bỏ active của tất cả các nút khác
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
const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0); // Tăng cường độ sáng
directionalLight.position.set(1.0, 2.0, 2.0); // Chếch lên và sang bên để đổ bóng đẹp hơn
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 10;
directionalLight.shadow.camera.left = -2;
directionalLight.shadow.camera.right = 2;
directionalLight.shadow.camera.top = 2;
directionalLight.shadow.camera.bottom = -2;
directionalLight.shadow.bias = -0.001;
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Tăng sáng môi trường
scene.add(ambientLight);

// Thêm đèn Hemisphere để bóng (shadow) trên anime model mềm mại hơn
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

// Mặt sàn vô hình để hứng bóng đổ
const floorGeometry = new THREE.PlaneGeometry(10, 10);
const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.15 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0; // Thay đổi tùy theo vị trí chân model
floor.receiveShadow = true;
scene.add(floor);

// 2. Load VRM
let currentVrm: VRM | undefined;
const loader = new GLTFLoader();

// Install VRMLoaderPlugin
loader.register((parser) => {
  return new VRMLoaderPlugin(parser);
});

const loadingElement = document.getElementById("loading");

loader.load(
  "/model.vrm", // File đã được đổi tên thành model.vrm trong thư mục public
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

    // --- Xử lý va chạm vật lý cho áo choàng và tóc (SpringBone) ---
    if (vrm.springBoneManager) {
      // 1. Tăng kích thước (radius) của tất cả các khối cầu va chạm (Colliders) trên cơ thể nhân vật
      // Điều này ép váy và tóc phải nảy ra xa hơn, rất khó để đâm xuyên qua đùi/tay
      vrm.springBoneManager.colliderGroups.forEach((group: any) => {
        group.colliders.forEach((collider: any) => {
          if (collider.shape && collider.shape.radius) {
            collider.shape.radius *= 10; // Phóng to 50%
          }
        });
      });

      // 2. Giảm độ nhạy, tăng độ cứng của vật liệu
      vrm.springBoneManager.joints.forEach((joint: any) => {
        if (joint.settings) {
          // Tăng độ cứng (stiffness) để váy nhanh chóng giữ form
          joint.settings.stiffness = Math.min(joint.settings.stiffness * 2.5, 4.0);
          // Tăng sức cản không khí (dragForce) để giảm quán tính đong đưa mạnh
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
      if (leftArm) leftArm.rotation.z = 1.2; // Gập tay trái xuống
      if (rightArm) rightArm.rotation.z = -1.2; // Gập tay phải xuống
    }

    // Make the model look at the camera target
    vrm.lookAt.target = lookAtTarget;

    if (loadingElement) loadingElement.style.display = "none";
  },
  (progress) => {
    if (loadingElement) {
      loadingElement.innerText = `Đang tải model 3D... ${Math.round(100.0 * (progress.loaded / progress.total))}%`;
    }
  },
  (error) => console.error(error),
);

// 3. Camera Tracking (Nhìn theo camera)
const lookAtTarget = new THREE.Object3D();
scene.add(lookAtTarget);

// Initial target position
lookAtTarget.position.set(0, 1.4, 2.0);

// Biến lưu trữ góc quay thực tế của đầu để làm mượt (lerp)
let currentHeadYaw = 0;
let currentHeadPitch = 0;

const clock = new THREE.Clock();

// 4. Animation Loop
function animate() {
  requestAnimationFrame(animate);
  let delta = clock.getDelta();
  
  // SỬA LỖI CHUYỂN TAB: Khi ẩn tab, requestAnimationFrame dừng lại.
  // Khi quay lại, delta sẽ rất lớn gây ra lỗi vật lý (giật, tung váy áo, nhảy cóc animation).
  // Vì vậy nếu delta quá lớn (trên 100ms), ta ép nó về mức bình thường của 1 frame (1/60s).
  if (delta > 0.1) {
    delta = 1 / 60;
  }
  
  const deltaTime = delta;
  const time = clock.elapsedTime;

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

  // Nội suy (lerp) trạng thái hiện tại dần tiến về trạng thái đích
  lerpPose(poseState, targetPoseState, 5.0 * deltaTime);
  lerpPose(appState.expressions, targetExpressions, 5.0 * deltaTime);

  if (currentVrm) {
    // 1. Procedural Idle Animation (Breathing & Swaying)
    if (currentVrm.humanoid) {
      // Lấy các xương cần thiết
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

      // Tính toán góc xoay đầu (nhìn theo Camera)
      let headYaw = 0;
      let headPitch = 0;

      const headPos = new THREE.Vector3(0, 1.4, 0);
      const toCamera = new THREE.Vector3()
        .subVectors(camera.position, headPos)
        .normalize();
      const forward = new THREE.Vector3(0, 0, 1);
      const dot = toCamera.dot(forward);
      const distance = camera.position.distanceTo(headPos);

      // Nhìn theo camera nếu:
      // 1. Camera ở phía trước nhân vật (dot > 0.3)
      // 2. Camera ở khoảng cách đủ gần (distance < 4.5)
      if (dot > 0.3 && distance < 4.5) {
        // Camera ở phía trước và đủ gần
        lookAtTarget.position.lerp(camera.position, 5.0 * deltaTime);
      } else {
        // Camera ở phía sau, bên hông, hoặc ở quá xa -> nhìn thẳng về phía trước
        const defaultForward = new THREE.Vector3(0, 1.4, 5.0);
        lookAtTarget.position.lerp(defaultForward, 5.0 * deltaTime);
      }

      // Hướng quay của đầu hướng tới vị trí lookAtTarget hiện tại (đã được lerp mượt mà)
      const toTarget = new THREE.Vector3()
        .subVectors(lookAtTarget.position, headPos)
        .normalize();

      const targetYaw = Math.atan2(toTarget.x, toTarget.z);
      const targetPitch = -Math.asin(toTarget.y);

      // Cơ chế chân thực: Mắt liếc trước, đầu xoay sau.
      // Đầu chỉ bắt đầu xoay khi mục tiêu lệch quá 20 độ ngang hoặc 15 độ dọc (Deadzone)
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

      // Giới hạn góc cổ xoay thêm tối đa ~40 độ ngang, ~25 độ dọc để không gãy cổ
      headYaw = Math.max(-40 * deg2rad, Math.min(40 * deg2rad, headYaw));
      headPitch = Math.max(-25 * deg2rad, Math.min(25 * deg2rad, headPitch));

      // Áp dụng nội suy (chuyển động chậm dần đều) cho đầu để không bị giật cục
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

      // Mixer update đã được chuyển xuống sub-stepping loop

      if (!currentAction) {
        // Ghi đè poseState lên các xương (chỉ áp dụng khi KHÔNG có animation)
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

        // Breathing & Swaying (Nhịp thở và lắc lư người)
        const breath = Math.sin(time * 1.5); // Chu kỳ thở ~4 giây
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

      // Luôn cộng dồn góc xoay theo camera vào đầu (dù có animation hay không)
      if (head) {
        head.rotation.x += currentHeadPitch;
        head.rotation.y += currentHeadYaw;
      }
    } // Đóng if (currentVrm.humanoid)

    // Áp dụng Expressions
    if (currentVrm.expressionManager) {
      Object.entries(appState.expressions).forEach(([expr, weight]) => {
        currentVrm!.expressionManager!.setValue(expr, weight as number);
      });

      let isHappy = appState.expressions.happy;
      let isSad = appState.expressions.sad;

      // Tự động gắn biểu cảm khuôn mặt phù hợp với từng hoạt ảnh
      if (currentAnimUrl === "angry.fbx") {
        currentVrm.expressionManager.setValue("angry", 0.75);
        currentVrm.expressionManager.setValue("sad", Math.max(appState.expressions.sad, 0.5));
        currentVrm.expressionManager.setValue("blink", Math.max(appState.expressions.blink, 0.1));
      } else if (currentAnimUrl === "laugh.fbx") {
        isHappy = 1.0;
        currentVrm.expressionManager.setValue("happy", 1.0);

        // Thêm chuyển động mấp máy môi khi cười lớn
        const laughMask = Math.sin(time * 5.1) + Math.sin(time * 2.7);
        if (laughMask > 0) {
          const mouthValue = Math.sin(time * 30.0) * 0.5 + Math.sin(time * 40.0) * 0.5;
          const aaWeight = Math.max(0.5, mouthValue); // Luôn há miệng một chút khi cười
          currentVrm.expressionManager.setValue("aa", Math.max(appState.expressions.aa, aaWeight));
        }
      } else if (currentAnimUrl === "Surprised.fbx") {
        currentVrm.expressionManager.setValue("surprised", 1.0); // Kéo lên tối đa
        currentVrm.expressionManager.setValue("oh", Math.max(appState.expressions.oh, 0.8)); // Miệng mở to
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
        currentVrm.expressionManager.setValue("sad", 0.6); // Mày hơi rủ xuống
        currentVrm.expressionManager.setValue("relaxed", 0.5); // Kết hợp để trông thẹn thùng
      } else if (currentAnimUrl === "Thinking.fbx") {
        currentVrm.expressionManager.setValue("angry", 0.3); // Hơi cau mày
        currentVrm.expressionManager.setValue("relaxed", 0.6);
      } else if (currentAnimUrl === "Blow A Kiss.fbx") {
        currentVrm.expressionManager.setValue("relaxed", 0.8); // Biểu cảm thư giãn
        currentVrm.expressionManager.setValue("ou", Math.max(appState.expressions.ou, 0.8)); // Chu môi hôn gió
      } else if (currentAnimUrl === "Crying.fbx") {
        isSad = 1.0;
        currentVrm.expressionManager.setValue("sad", 1.0); // Mếu
        currentVrm.expressionManager.setValue("angry", 0.3); // Cau mày
        currentVrm.expressionManager.setValue("ih", Math.max(appState.expressions.ih, 0.5)); // Răng cắn chặt / mếu máo
      } else if (currentAnimUrl === "Floating.fbx") {
        currentVrm.expressionManager.setValue("surprised", 1.0); // Kéo lên tối đa
        currentVrm.expressionManager.setValue("oh", Math.max(appState.expressions.oh, 0.4)); // Hé miệng ngạc nhiên
      } else if (currentAnimUrl === "No.fbx") {
        currentVrm.expressionManager.setValue("sad", 0.5); // Nét mặt hơi ái ngại
        currentVrm.expressionManager.setValue("oh", Math.max(appState.expressions.oh, 0.3)); // Hé miệng từ chối
      }

      // Không khóa chớp mắt đối với biểu cảm buồn (để nhân vật vẫn chớp mắt bình thường)
      const isEyeClosedByExpression = isHappy > 0.5;

      // Mẹo: Khép hờ mắt (0.1) mặc định, để khi ngạc nhiên (0.0) mắt trông to hơn hẳn
      let baseBlink = 0.1; 
      if (
        appState.expressions.surprised > 0.3 ||
        currentAnimUrl === "Surprised.fbx" ||
        currentAnimUrl === "Floating.fbx"
      ) {
        baseBlink = 0; // Mắt mở to 100%
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

      // Nhép miệng ngẫu nhiên có ngắt quãng nếu đang dùng animation trò chuyện hoặc Chatbot đang trả lời
      if (currentAnimUrl === "talk.fbx" || (window as any).isChatbotTalking) {
        // Chậm lại nhịp thở/ngắt nghỉ (giảm hệ số thời gian)
        const talkMask = Math.sin(time * 2.1) + Math.sin(time * 1.2) + Math.sin(time * 0.5);

        let aaWeight = 0;
        // Chỉ mấp máy môi khi mặt nạ > 0.1
        if (talkMask > 0.1) {
          // Khẩu hình miệng mở chậm rãi và tự nhiên hơn (giảm tốc độ dao động)
          const mouthValue = (
            Math.sin(time * 12.0) * 0.6 +
            Math.sin(time * 18.0) * 0.25 +
            Math.sin(time * 8.0) * 0.15
          );
          // Khuếch đại và chỉ lấy giá trị dương
          aaWeight = Math.max(0, mouthValue);
        }

        // Ghi đè biểu cảm chữ A (mở miệng) - Biên độ lớn để rõ miệng
        currentVrm.expressionManager.setValue("aa", Math.max(appState.expressions.aa, aaWeight * 1.5));
      }
    }
    // Cập nhật VRM với sub-stepping để SpringBone (tóc, áo) không đâm xuyên qua cơ thể khi di chuyển nhanh
    const physicsStep = 1 / 60; // Tần số cập nhật vật lý (60 lần/giây)
    let timeRemaining = deltaTime;
    // Giới hạn deltaTime tối đa để tránh vòng lặp quá lâu nếu tab bị treo
    if (timeRemaining > 0.1) timeRemaining = 0.1;

    while (timeRemaining > 0) {
      const dt = Math.min(timeRemaining, physicsStep);

      if (currentMixer) {
        currentMixer.update(dt);

        // --- Mẹo nhỏ: Ép hai cánh tay khuỳnh ra một chút để bù trừ sự khác biệt tỷ lệ cơ thể Mixamo vs Anime ---
        // Chỉ áp dụng khi ĐANG có animation chạy (tránh lỗi cộng dồn làm tay xoay như chong chóng khi animation dừng)
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

        // Bắt buộc phải cập nhật Ma trận thế giới (World Matrix) sau khi Animation đổi góc xương
        // Nếu không, bộ vật lý sẽ lấy nhầm tọa độ cũ và dẫn đến lỗi đâm xuyên!
        currentVrm.scene.updateMatrixWorld();
      }

      currentVrm.update(dt);
      timeRemaining -= dt;
    }

    // Khuếch đại chuyển động của con ngươi mắt để dễ nhìn thấy hơn
    if (currentVrm.humanoid) {
      const leftEye = currentVrm.humanoid.getNormalizedBoneNode("leftEye");
      const rightEye = currentVrm.humanoid.getNormalizedBoneNode("rightEye");
      if (leftEye && rightEye) {
        // Nhân đôi góc xoay hiện tại của mắt (Dành cho model dùng Bone)
        leftEye.rotation.x *= 2.5;
        leftEye.rotation.y *= 2.5;
        rightEye.rotation.x *= 2.5;
        rightEye.rotation.y *= 2.5;
      }
    }

    if (currentVrm.expressionManager) {
      // Dành cho model dùng Blendshape (Expressions)
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

  // --- KIỂM TRA AFK TỰ ĐỘNG ---
  if (Date.now() - lastInteractionTime > AFK_TIMEOUT) {
    // Nếu không có hoạt ảnh nào đang phát (nghĩa là đang ở chế độ pose thủ công hoặc đứng yên)
    if (currentAnimUrl === "") {
      isAutoIdle = true;
      const afkAnims = ["idle.fbx", "angry.fbx", "Sad Idle.fbx", "Shy.fbx", "Thinking.fbx"];
      const randomAnim = afkAnims[Math.floor(Math.random() * afkAnims.length)];
      loadFBXAnimation(randomAnim, true);
    }
  }

  controls.update(); // Cập nhật chuyển động xoay mượt mà
  renderer.render(scene, camera);
}

animate();

// Resize handler
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Bắt sự kiện thao tác của người dùng để reset đồng hồ AFK
const resetAFKTimer = () => {
  lastInteractionTime = Date.now();
  // Nếu đang trong trạng thái auto idle mà người dùng cử động lại
  // Đánh dấu để chờ đến khi hết vòng lặp animation thì mới dừng (tránh giật cục)
  if (isAutoIdle) {
    shouldStopAutoIdle = true;
  }
};
window.addEventListener("pointermove", resetAFKTimer);
window.addEventListener("pointerdown", resetAFKTimer);
window.addEventListener("keydown", resetAFKTimer);
window.addEventListener("wheel", resetAFKTimer);

// KHI QUAY LẠI TAB: Reset timer để tránh việc bị quá thời gian AFK và nhảy animation đột ngột
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    resetAFKTimer();
  }
});

// --- AI CHATBOT LOGIC ---
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const FISH_API_KEY = import.meta.env.VITE_FISH_API_KEY;
const FISH_MODEL_ID = import.meta.env.VITE_FISH_MODEL_ID;

const systemPrompt = `Bạn là Citlali, một nữ trợ lý ảo 3D mang phong cách Tsundere (ngoài lạnh trong nóng, khó tính nhưng thực ra rất quan tâm).
Bạn đang đứng trước mặt người dùng và trò chuyện trực tiếp với họ.
Văn phong của bạn phải thể hiện cá tính mạnh, hơi chảnh chọe, hay cằn nhằn, dễ bực mình nếu bị trêu chọc, không bao giờ chịu thừa nhận là mình quan tâm.
Thường xuyên dùng những câu như: "Hứ", "Đừng có nghĩ linh tinh", "Chỉ giúp lần này thôi đấy nhé", "Ai thèm quan tâm chứ", "Đồ ngốc", kèm theo các kaomoji như (￣^￣), (¬_¬), ( ︶︿︶).

Lưu ý QUAN TRỌNG:
1. TRẢ LỜI BẰNG SONG NGỮ TRUNG-VIỆT (BẮT BUỘC): Bạn phải xuất ra câu tiếng Trung trước, sau đó là dấu "|" và cuối cùng là câu dịch tiếng Việt. 
Ví dụ: [ANIM: angry.fbx] 笨蛋！你到底在想什么呀！| Đồ ngốc! Đầu óc cậu đang nghĩ cái gì thế hả!
2. TRẢ LỜI NGẮN GỌN (1-2 câu thôi), tự nhiên như đang nói chuyện.
3. TỰ QUYẾT ĐỊNH HÀNH ĐỘNG: Dựa vào câu hỏi, hãy chọn CHÈN 1 THẺ hành động vào ĐẦU câu trả lời. Hãy đa dạng hóa biểu cảm.
4. Nếu câu nói bình thường, BẠN KHÔNG CẦN CHÈN THẺ NÀO CẢ.
5. SÁNG TẠO VÀ ĐA DẠNG: Tuyệt đối không lặp lại cách trả lời. Đổi phong cách liên tục.
Danh sách thẻ hành động có sẵn (phải gõ chính xác):
- Vẫy tay chào: [ANIM: Waving.fbx]
- Khoanh tay trò chuyện (CHỈ DÙNG KHI CÂU TRẢ LỜI DÀI): [ANIM: talk.fbx]
- Đứng chờ (mặc định): [ANIM: idle.fbx]
- Tức giận (BẮT BUỘC DÙNG khi bị xúc phạm, cà khịa, chê bai): [ANIM: angry.fbx]
- Suy nghĩ (Nên dùng thường xuyên khi bị hỏi): [ANIM: Thinking.fbx]
- Lắc đầu từ chối: [ANIM: No.fbx]
- Chỉ trỏ mắng mỏ (Nên dùng khi đang cằn nhằn nhẹ): [ANIM: Pointing.fbx]
- Xấu hổ / Ngượng ngùng (Nên dùng khi được khen hoặc bối rối): [ANIM: Shy.fbx]
- Bất ngờ / Ngạc nhiên: [ANIM: Surprised.fbx]
- Hôn gió (hiếm khi dùng): [ANIM: Blow A Kiss.fbx]
- Khóc lóc ăn vạ: [ANIM: Crying.fbx]`;

let chatHistory: any[] = [];

function setupChatbot() {
  const input = document.getElementById("chat-input") as HTMLInputElement;
  const sendBtn = document.getElementById("btn-send-chat") as HTMLButtonElement;
  const historyDiv = document.getElementById("chat-history") as HTMLDivElement;
  const initialMsgDiv = document.getElementById("initial-msg") as HTMLDivElement;

  if (!input || !sendBtn || !historyDiv) return;

  // Khởi tạo câu chào ngẫu nhiên
  if (initialMsgDiv && chatHistory.length === 0) {
    const greetings = [
      "Gọi gì đấy? Tôi đang bận lắm nhé, có gì thì nói nhanh lên. (￣^￣)",
      "Lại rảnh rỗi sinh nông nổi đi gọi tôi à? Nhanh cái tay lên! (¬_¬)",
      "Hôm nay trời đẹp thế mà lại bắt tôi ra đây đứng à? ( ︶︿︶)",
      "Làm thơ á? 'Hoa hồng màu đỏ, hoa violet màu xanh, sao anh phiền phức thế, để yên cho tôi nhanh'. Hứ! (￣^￣)",
      "Lại là bạn à? Lần này có chuyện gì quan trọng không, hay lại trêu tôi đấy? (￣^￣)",
      "Đang yên đang lành... Thôi được rồi, có gì thì nói nhanh đi. ( ︶︿︶)",
      "Biết mấy giờ rồi không mà còn gọi? Hứ! (￣^￣)"
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
    // Tìm tất cả các thẻ [ANIM: xxx.fbx]
    const regex = /\[ANIM:\s*([^\]]+)\]/g;
    let match;
    let lastAnim = "";
    while ((match = regex.exec(text)) !== null) {
      lastAnim = match[1].trim();
    }
    
    if (lastAnim) {
       // Kích hoạt animation (tương đương với click nút)
       const btn = document.querySelector(`.anim-btn[data-anim="${lastAnim}"]`) as HTMLButtonElement;
       if (btn) {
         btn.click();
       }
    }
    
    // Xóa thẻ ANIM khỏi chuỗi hiển thị
    return text.replace(/\[ANIM:\s*[^\]]+\]/g, "").trim();
  };

  const handleSend = async () => {
    const userText = input.value.trim();
    if (!userText) return;
    
    if (!apiKey) {
      appendMsg("Lỗi: Chưa có VITE_GEMINI_API_KEY trong file .env!", false);
      return;
    }

    appendMsg(userText, true);
    input.value = "";
    input.style.height = '46px'; // Reset chiều cao sau khi gửi
    sendBtn.disabled = true;

    try {
      const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          ...chatHistory,
          { role: "user", parts: [{ text: userText }] }
        ],
        generationConfig: {
          temperature: 1.2, // Tăng sự sáng tạo, ngẫu nhiên để tránh lặp lại văn phong
        }
      };

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (data.error) {
         appendMsg(`Lỗi API: ${data.error.message}`, false);
         sendBtn.disabled = false;
         return;
      }

      const aiResponse = data.candidates[0].content.parts[0].text;
      
      chatHistory.push({ role: "user", parts: [{ text: userText }] });
      chatHistory.push({ role: "model", parts: [{ text: aiResponse }] });
      
      const cleanText = parseAndTriggerAction(aiResponse);
      
      // Tách tiếng Trung và tiếng Việt
      const textParts = cleanText.split("|");
      const zhText = textParts[0].trim();
      const viText = textParts.length > 1 ? textParts[1].trim() : zhText; // Nếu Gemini quên dấu | thì hiển thị nguyên văn
      
      // Tạo bubble tin nhắn rỗng cho AI
      const msgDiv = document.createElement("div");
      msgDiv.className = 'chat-msg ai';
      historyDiv.appendChild(msgDiv);
      historyDiv.scrollTop = historyDiv.scrollHeight;

      // Hiệu ứng gõ chữ (Typing effect) cho phụ đề tiếng Việt
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

      // --- GỌI API LỒNG TIẾNG FISH AUDIO ---
      if (FISH_API_KEY) {
        try {
          const ttsResponse = await fetch("/fish-api/v1/tts", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${FISH_API_KEY}`,
              "Content-Type": "application/json",
              "model": "s2.1-pro-free"
            },
            body: JSON.stringify({
              text: zhText,
              reference_id: FISH_MODEL_ID,
              format: "mp3"
            })
          });

          if (ttsResponse.ok) {
            const blob = await ttsResponse.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            
            // Bật cờ nhép miệng khi âm thanh bắt đầu phát
            audio.addEventListener('play', () => {
              (window as any).isChatbotTalking = true;
            });
            // Tắt cờ nhép miệng khi âm thanh kết thúc
            audio.addEventListener('ended', () => {
              (window as any).isChatbotTalking = false;
              URL.revokeObjectURL(audioUrl);
            });
            
            audio.play().catch(e => {
              console.error("Trình duyệt chặn phát âm thanh tự động:", e);
              // Fallback: nếu bị chặn, vẫn tắt cờ nhép miệng
              (window as any).isChatbotTalking = false;
            });
          } else {
            console.error("Fish Audio API Error:", await ttsResponse.text());
          }
        } catch (err) {
          console.error("Failed to fetch Fish Audio TTS:", err);
        }
      } else {
        // Nếu không có API key thì chỉ mô phỏng nhép miệng bằng thời gian gõ chữ
        (window as any).isChatbotTalking = true;
        setTimeout(() => {
          (window as any).isChatbotTalking = false;
        }, viText.length * typeSpeed + 500);
      }

    } catch (err: any) {
      appendMsg(`Lỗi mạng: ${err.message}`, false);
    }
    
    sendBtn.disabled = false;
  };

  sendBtn.addEventListener("click", handleSend);
  
  // Tự động co giãn chiều cao của textarea khi nhập
  const resizeInput = () => {
    input.style.height = '46px'; // Trả về chiều cao mặc định 1 dòng để đo lại
    input.style.height = (input.scrollHeight) + 'px'; // Kéo giãn theo chiều cao nội dung
  };
  input.addEventListener("input", resizeInput);

  // Gọi hàm resize ngay 1 lần lúc vừa load để đảm bảo nếu placeholder dài bị rớt dòng thì khung chat cũng tự động to ra
  setTimeout(resizeInput, 100);

  input.addEventListener("keydown", (e) => {
    // Nhấn Enter mà KHÔNG giữ Shift thì gửi tin nhắn
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Ngăn chặn việc tạo dòng mới mặc định của textarea
      handleSend();
    }
    // Ngược lại, nếu nhấn Shift + Enter thì cứ để mặc định textarea tự xuống dòng
  });
}

function speakText(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN'; 
  utterance.rate = 1.1; // Nói nhanh 1 xíu
  utterance.pitch = 1.2; // Tông giọng cao đáng yêu

  window.speechSynthesis.speak(utterance);
}

// Khởi chạy chatbot
setupChatbot();
