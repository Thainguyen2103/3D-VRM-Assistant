// src/core/state.ts

export const poses = {
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
      leftThumb: -50, leftIndex: -50, leftMiddle: -50, leftRing: -50, leftLittle: -50,
      rightThumb: -50, rightIndex: -50, rightMiddle: -50, rightRing: -50, rightLittle: -50,
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
      leftThumb: -20, leftIndex: -20, leftMiddle: -20, leftRing: -20, leftLittle: -20,
      rightThumb: -20, rightIndex: -20, rightMiddle: -20, rightRing: -20, rightLittle: -20,
    },
  },
};

export const poseState = JSON.parse(JSON.stringify(poses.crossed));
export const targetPoseState = JSON.parse(JSON.stringify(poses.crossed)); 
export const appState = {
  pose: "crossed" as keyof typeof poses,
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
export const targetExpressions = { ...appState.expressions };

export const poseHistory: any[] = [];
export const savePoseToHistory = () => {
  if (poseHistory.length > 30) poseHistory.shift();
  poseHistory.push(JSON.parse(JSON.stringify(poseState)));
};
savePoseToHistory();

export const boneMapping = {
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
  "Violin": "violin",
  "Bow": "bow",
};

export function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

export function lerpPose(current: any, target: any, speed: number) {
  for (const key in current) {
    if (typeof current[key] === "object") {
      lerpPose(current[key], target[key], speed);
    } else if (typeof current[key] === "number") {
      current[key] = lerp(current[key], target[key], speed);
    }
  }
}

import * as THREE from 'three';

export const cameraState = {
  isAnimating: false,
  targetPos: new THREE.Vector3(0, 1.4, 2.0),
  targetTarget: new THREE.Vector3(0, 1.2, 0.0)
};
