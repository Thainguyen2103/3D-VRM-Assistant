import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, VRM } from "@pixiv/three-vrm";
import { scene, camera } from '../scene/setup';
import { appState, targetExpressions, targetPoseState, poseState, lerpPose } from '../core/state';
import { loadMixamoAnimation } from '../loadMixamoAnimation';

export let currentVrm: VRM | undefined;
export const lookAtTarget = new THREE.Object3D();
scene.add(lookAtTarget);
lookAtTarget.position.set(0, 1.4, 2.0);

export let currentMixer: THREE.AnimationMixer | null = null;
export let currentAction: THREE.AnimationAction | null = null;
export let currentAnimUrl: string = "";

export let violinModel: THREE.Object3D | null = null;
export let bowModel: THREE.Object3D | null = null;
(window as any).violinModel = null;
(window as any).bowModel = null;

const loopOnceAnimations = [
  "Waving.fbx", "Pointing.fbx", "No.fbx", "Clapping.fbx",
  "Blow A Kiss.fbx", "Surprised.fbx", "Shy.fbx", "Thinking.fbx", "angry.fbx", "talk.fbx", "Looking.fbx", "Look Around.fbx"
];

let currentHeadYaw = 0;
let currentHeadPitch = 0;

// --- AFK Auto-Idle System ---
let lastInteractionTime = Date.now();
export let isAutoIdle = false;
let shouldStopAutoIdle = false;
let propScaleAnim = 0;
const AFK_TIMEOUT = 10000; // 10 giây không có tương tác camera -> bắt đầu idle

// Pool animation nhàn rỗi - bao gồm các animation lặp vòng và một lần
const afkLoopAnims = ["idle.fbx", "Floating.fbx", "dance.fbx", "laugh.fbx"];
const afkOnceAnims = ["angry.fbx", "Sad Idle.fbx", "Shy.fbx", "Thinking.fbx", "Look Around.fbx", "Looking.fbx", "No.fbx", "Blow A Kiss.fbx"];

// Reset timer tương tác (Dùng khi camera thay đổi góc/zoom)
export function resetAFKTimer() {
  lastInteractionTime = Date.now();
  if (isAutoIdle) {
    // Đánh dấu để chờ đến khi hết vòng lặp animation thì mới dừng (tránh giật cục)
    shouldStopAutoIdle = true;
  }
}

// Dừng idle người dùng thay đổi góc camera (reset cả timer lẫn dừng idle ngay)
export function stopIdleOnCameraMove() {
  lastInteractionTime = Date.now();
  if (isAutoIdle) {
    shouldStopAutoIdle = true; // Chờ hết chu kỳ hiện tại
  }
}

export function checkAFK() {
  if (Date.now() - lastInteractionTime > AFK_TIMEOUT) {
    if (currentAnimUrl === "") {
      isAutoIdle = true;
      // 50% xác suất chọn animation lặp vòng, 50% chọn animation 1 lần
      const useLoop = Math.random() < 0.5;
      const pool = useLoop ? afkLoopAnims : afkOnceAnims;
      const randomAnim = pool[Math.floor(Math.random() * pool.length)];
      loadFBXAnimation(randomAnim, true);
    }
  }
}

export function initVRM() {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  loader.load('/Map/stradivari_violin.glb', (gltf) => {
    violinModel = gltf.scene;
    (window as any).violinModel = violinModel;
    violinModel.visible = false;

    // Đảm bảo cast bóng
    violinModel.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m: any) => { m.transparent = true; m.needsUpdate = true; });
          } else {
            child.material.transparent = true;
            child.material.needsUpdate = true;
          }
        }
      }
    });
  });

  loader.load('/Map/violin_bow.glb', (gltf) => {
    bowModel = gltf.scene;
    (window as any).bowModel = bowModel;
    bowModel.visible = false;

    // Đảm bảo cast bóng
    bowModel.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m: any) => { m.transparent = true; m.needsUpdate = true; });
          } else {
            child.material.transparent = true;
            child.material.needsUpdate = true;
          }
        }
      }
    });
  });

  const loadingElement = document.getElementById("loading");

  loader.load(
    "/model.vrm",
    (gltf) => {
      const vrm = gltf.userData.vrm;
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.combineSkeletons(gltf.scene);

      vrm.scene.traverse((obj: any) => {
        obj.frustumCulled = false;
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      scene.add(vrm.scene);
      currentVrm = vrm;

      if (vrm.springBoneManager) {
        vrm.springBoneManager.colliderGroups.forEach((group: any) => {
          group.colliders.forEach((collider: any) => {
            if (collider.shape && collider.shape.radius) {
              collider.shape.radius *= 10;
            }
          });
        });
        vrm.springBoneManager.joints.forEach((joint: any) => {
          if (joint.settings) {
            joint.settings.stiffness = Math.min(joint.settings.stiffness * 2.5, 4.0);
            joint.settings.dragForce = Math.min(joint.settings.dragForce * 2.5, 1.5);
          }
        });
      }

      vrm.scene.rotation.y = 0;

      if (vrm.humanoid) {
        const leftArm = vrm.humanoid.getNormalizedBoneNode("leftUpperArm");
        const rightArm = vrm.humanoid.getNormalizedBoneNode("rightUpperArm");
        if (leftArm) leftArm.rotation.z = 1.2;
        if (rightArm) rightArm.rotation.z = -1.2;
      }

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
}

export function loadFBXAnimation(url: string, isAfkCall: boolean = false) {
  lastInteractionTime = Date.now(); // Reset timer khi người dùng chủ động tải animation

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

  if (url === "Playing The Violin.fbx" && currentAnimUrl !== url) {
    propScaleAnim = 0;
    if (violinModel) violinModel.scale.set(0, 0, 0);
    if (bowModel) bowModel.scale.set(0, 0, 0);
  }

  currentAnimUrl = url;

  if (url === "Playing The Violin.fbx") {
    if (violinModel && bowModel && currentVrm && currentVrm.humanoid) {
      const leftHand = currentVrm.humanoid.getNormalizedBoneNode("leftHand");
      const rightHand = currentVrm.humanoid.getNormalizedBoneNode("rightHand");

      if (leftHand) {
        leftHand.add(violinModel);
        violinModel.visible = true;
        // Căn chỉnh dựa trên thông số đã căn chỉnh trong quá trình chạy
        violinModel.position.set(-0.048, -0.153, -0.059);
        violinModel.rotation.set(2.055, 0.814, -1.411);
      }
      if (rightHand) {
        rightHand.add(bowModel);
        bowModel.visible = true;
        // Căn chỉnh dựa trên thông số đã căn chỉnh trong quá trình chạy
        bowModel.position.set(-0.234, 0.067, 0.168);
        bowModel.rotation.set(2.404, 0.791, -2.915);
      }
    }
  } else {
    // Không ẩn ngay lập tức, để updateVRM lo việc mờ dần
  }

  loadMixamoAnimation("/animations/" + url, currentVrm).then((clip) => {
    if (!clip) return;
    if (!currentMixer) {
      currentMixer = new THREE.AnimationMixer(currentVrm!.scene);
      currentMixer.addEventListener("loop", (e: any) => {
        if (e.action === currentAction) {
          if (shouldStopAutoIdle) {
            shouldStopAutoIdle = false;
            isAutoIdle = false;
            loadFBXAnimation(""); // Trở về trạng thái tĩnh ngay khi vừa hết chu kỳ
          } else if (currentAnimUrl === "Playing The Violin.fbx") {
            // Khi animation lặp lại, nó sẽ quay về pose thả tay ban đầu -> cần reset scale
            propScaleAnim = 0;
            if (violinModel) violinModel.scale.set(0, 0, 0);
            if (bowModel) bowModel.scale.set(0, 0, 0);
          }
        }
      });
      currentMixer.addEventListener("finished", (e: any) => {
        if (e.action === currentAction && currentAnimUrl !== "") {
          loadFBXAnimation("");
        }
      });
    }

    currentAction = currentMixer.clipAction(clip);

    if (loopOnceAnimations.includes(url)) {
      currentAction.setLoop(THREE.LoopOnce, 1);
      currentAction.clampWhenFinished = true;
    } else {
      currentAction.setLoop(THREE.LoopRepeat, Infinity);
    }

    currentAction.reset().fadeIn(0.5).play();
  }).catch((err) => {
    console.error("Lỗi khi tải FBX:", err);
  });
}

export function updateVRM(deltaTime: number, time: number) {
  lerpPose(poseState, targetPoseState, 5.0 * deltaTime);
  lerpPose(appState.expressions, targetExpressions, 5.0 * deltaTime);

  // Animate the scale and opacity of violin and bow to hide awkward transitions
  const updateOpacity = (obj: THREE.Object3D, opacity: number) => {
    obj.traverse((c: any) => {
      if (c.isMesh && c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m: any) => m.opacity = opacity);
        else c.material.opacity = opacity;
      }
    });
  };

  // Xác định xem có nên fade out vũ khí hay không
  let isFadingOut = false;
  if (currentAnimUrl === "Playing The Violin.fbx") {
    if (currentAction) {
      const clip = currentAction.getClip();
      const timeLeft = clip.duration - (currentAction.time % clip.duration);
      // Bắt đầu fade out 5 giây trước khi animation lặp lại
      if (timeLeft <= 5.0) {
        isFadingOut = true;
      }
    }
  } else {
    isFadingOut = true;
  }

  if (!isFadingOut && currentAnimUrl === "Playing The Violin.fbx") {
    if (propScaleAnim < 1.0) {
      propScaleAnim += deltaTime * 0.2; // Takes ~5s to fully scale
      if (propScaleAnim > 1.0) propScaleAnim = 1.0;

      const ease = propScaleAnim * propScaleAnim * (3 - 2 * propScaleAnim);

      if (violinModel) {
        violinModel.visible = true;
        const vS = ease * 0.009;
        violinModel.scale.set(vS, vS, vS);
        updateOpacity(violinModel, ease);
      }
      if (bowModel) {
        bowModel.visible = true;
        const bS = ease * 0.008;
        bowModel.scale.set(bS, bS, bS);
        updateOpacity(bowModel, ease);
      }
    }
  } else {
    if (propScaleAnim > 0.0) {
      propScaleAnim -= deltaTime * 0.2; // Fade out over 5s
      if (propScaleAnim <= 0.0) {
        propScaleAnim = 0.0;
        if (violinModel) violinModel.visible = false;
        if (bowModel) bowModel.visible = false;
      } else {
        const ease = propScaleAnim * propScaleAnim * (3 - 2 * propScaleAnim);
        if (violinModel) {
          const vS = ease * 0.009;
          violinModel.scale.set(vS, vS, vS);
          updateOpacity(violinModel, ease);
        }
        if (bowModel) {
          const bS = ease * 0.008;
          bowModel.scale.set(bS, bS, bS);
          updateOpacity(bowModel, ease);
        }
      }
    }
  }

  if (currentVrm) {
    if (currentVrm.humanoid) {
      const leftArm = currentVrm.humanoid.getNormalizedBoneNode("leftUpperArm");
      const rightArm = currentVrm.humanoid.getNormalizedBoneNode("rightUpperArm");
      const leftLowerArm = currentVrm.humanoid.getNormalizedBoneNode("leftLowerArm");
      const rightLowerArm = currentVrm.humanoid.getNormalizedBoneNode("rightLowerArm");
      const leftLeg = currentVrm.humanoid.getNormalizedBoneNode("leftUpperLeg");
      const rightLeg = currentVrm.humanoid.getNormalizedBoneNode("rightUpperLeg");
      const leftLowerLeg = currentVrm.humanoid.getNormalizedBoneNode("leftLowerLeg");
      const rightLowerLeg = currentVrm.humanoid.getNormalizedBoneNode("rightLowerLeg");
      const head = currentVrm.humanoid.getNormalizedBoneNode("head");
      const neck = currentVrm.humanoid.getNormalizedBoneNode("neck");
      const chest = currentVrm.humanoid.getNormalizedBoneNode("chest");
      const spine = currentVrm.humanoid.getNormalizedBoneNode("spine");
      const hips = currentVrm.humanoid.getNormalizedBoneNode("hips");
      const leftFoot = currentVrm.humanoid.getNormalizedBoneNode("leftFoot");
      const rightFoot = currentVrm.humanoid.getNormalizedBoneNode("rightFoot");

      const deg2rad = Math.PI / 180;

      let headYaw = 0;
      let headPitch = 0;

      const headPos = new THREE.Vector3(0, 1.4, 0);
      const toCamera = new THREE.Vector3().subVectors(camera.position, headPos).normalize();
      const forward = new THREE.Vector3(0, 0, 1);
      const dot = toCamera.dot(forward);
      const distance = camera.position.distanceTo(headPos);

      if (dot > 0.3 && distance < 4.5) {
        lookAtTarget.position.lerp(camera.position, 5.0 * deltaTime);
      } else {
        const defaultForward = new THREE.Vector3(0, 1.4, 5.0);
        lookAtTarget.position.lerp(defaultForward, 5.0 * deltaTime);
      }

      const toTarget = new THREE.Vector3().subVectors(lookAtTarget.position, headPos).normalize();
      const targetYaw = Math.atan2(toTarget.x, toTarget.z);
      const targetPitch = -Math.asin(toTarget.y);

      const deadzoneYaw = 20 * deg2rad;
      const deadzonePitch = 15 * deg2rad;

      if (Math.abs(targetYaw) > deadzoneYaw) {
        headYaw = Math.sign(targetYaw) * (Math.abs(targetYaw) - deadzoneYaw);
      } else {
        headYaw = 0;
      }

      if (Math.abs(targetPitch) > deadzonePitch) {
        headPitch = Math.sign(targetPitch) * (Math.abs(targetPitch) - deadzonePitch);
      } else {
        headPitch = 0;
      }

      headYaw = Math.max(-40 * deg2rad, Math.min(40 * deg2rad, headYaw));
      headPitch = Math.max(-25 * deg2rad, Math.min(25 * deg2rad, headPitch));

      currentHeadYaw = THREE.MathUtils.lerp(currentHeadYaw, headYaw, 4.0 * deltaTime);
      currentHeadPitch = THREE.MathUtils.lerp(currentHeadPitch, headPitch, 4.0 * deltaTime);

      if (!currentAction) {
        if (head) { head.rotation.set(poseState.head.x * deg2rad, poseState.head.y * deg2rad, poseState.head.z * deg2rad); }
        if (neck) { neck.rotation.set(poseState.neck.x * deg2rad, poseState.neck.y * deg2rad, poseState.neck.z * deg2rad); }
        if (chest) { chest.rotation.set(poseState.chest.x * deg2rad, poseState.chest.y * deg2rad, poseState.chest.z * deg2rad); }
        if (spine) { spine.rotation.set(poseState.spine.x * deg2rad, poseState.spine.y * deg2rad, poseState.spine.z * deg2rad); }
        if (hips) { hips.rotation.set(poseState.hips.x * deg2rad, poseState.hips.y * deg2rad, poseState.hips.z * deg2rad); }
        if (leftFoot) { leftFoot.rotation.set(poseState.leftFoot.x * deg2rad, poseState.leftFoot.y * deg2rad, poseState.leftFoot.z * deg2rad); }
        if (rightFoot) { rightFoot.rotation.set(poseState.rightFoot.x * deg2rad, poseState.rightFoot.y * deg2rad, poseState.rightFoot.z * deg2rad); }

        if (leftLeg) { leftLeg.rotation.set(poseState.leftUpperLeg.x * deg2rad, poseState.leftUpperLeg.y * deg2rad, poseState.leftUpperLeg.z * deg2rad); }
        if (rightLeg) { rightLeg.rotation.set(poseState.rightUpperLeg.x * deg2rad, poseState.rightUpperLeg.y * deg2rad, poseState.rightUpperLeg.z * deg2rad); }
        if (leftLowerLeg) { leftLowerLeg.rotation.set(poseState.leftLowerLeg.x * deg2rad, poseState.leftLowerLeg.y * deg2rad, poseState.leftLowerLeg.z * deg2rad); }
        if (rightLowerLeg) { rightLowerLeg.rotation.set(poseState.rightLowerLeg.x * deg2rad, poseState.rightLowerLeg.y * deg2rad, poseState.rightLowerLeg.z * deg2rad); }

        if (leftLowerArm) { leftLowerArm.rotation.set(poseState.leftLowerArm.x * deg2rad, poseState.leftLowerArm.y * deg2rad, poseState.leftLowerArm.z * deg2rad); }
        if (rightLowerArm) { rightLowerArm.rotation.set(poseState.rightLowerArm.x * deg2rad, poseState.rightLowerArm.y * deg2rad, poseState.rightLowerArm.z * deg2rad); }

        if (leftArm) {
          leftArm.rotation.z = poseState.leftUpperArm.z * deg2rad + Math.sin(time) * 0.02;
          leftArm.rotation.x = poseState.leftUpperArm.x * deg2rad;
          leftArm.rotation.y = poseState.leftUpperArm.y * deg2rad;
        }
        if (rightArm) {
          rightArm.rotation.z = poseState.rightUpperArm.z * deg2rad - Math.sin(time) * 0.02;
          rightArm.rotation.x = poseState.rightUpperArm.x * deg2rad;
          rightArm.rotation.y = poseState.rightUpperArm.y * deg2rad;
        }

        const leftHand = currentVrm.humanoid.getNormalizedBoneNode("leftHand");
        const rightHand = currentVrm.humanoid.getNormalizedBoneNode("rightHand");
        if (leftHand) { leftHand.rotation.set(poseState.leftHand.x * deg2rad, poseState.leftHand.y * deg2rad, poseState.leftHand.z * deg2rad); }
        if (rightHand) { rightHand.rotation.set(poseState.rightHand.x * deg2rad, poseState.rightHand.y * deg2rad, poseState.rightHand.z * deg2rad); }

        const fingers = ["Thumb", "Index", "Middle", "Ring", "Little"];
        const joints = ["Proximal", "Intermediate", "Distal"];
        fingers.forEach((finger) => {
          const leftCurl = poseState.fingers[`left${finger}` as keyof typeof poseState.fingers] * deg2rad;
          const rightCurl = poseState.fingers[`right${finger}` as keyof typeof poseState.fingers] * deg2rad;
          joints.forEach((joint) => {
            const lBone = currentVrm?.humanoid?.getNormalizedBoneNode(`left${finger}${joint}` as any);
            const rBone = currentVrm?.humanoid?.getNormalizedBoneNode(`right${finger}${joint}` as any);
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

        const breath = Math.sin(time * 1.5);
        if (chest) {
          const scale = 1.0 + breath * 0.015;
          chest.scale.set(scale, scale, scale);
          chest.rotation.x += breath * 0.02;
        }
        if (spine) {
          spine.rotation.x += 0.05 + breath * 0.015;
          spine.rotation.y += Math.sin(time * 0.8) * 0.01 + Math.sin(time * 2.1) * 0.02;
          spine.rotation.z += Math.cos(time * 1.8) * 0.015;
        }
      }

      const shouldApplyAdditive = !currentAction || (currentMixer && currentMixer.timeScale > 0);
      if (head && shouldApplyAdditive) {
        head.rotation.x += currentHeadPitch;
        head.rotation.y += currentHeadYaw;
      }
    }

    if (currentVrm.expressionManager) {
      Object.entries(appState.expressions).forEach(([expr, weight]) => {
        currentVrm!.expressionManager!.setValue(expr, weight as number);
      });

      let isHappy = appState.expressions.happy;
      let isSad = appState.expressions.sad;

      if (currentAnimUrl === "angry.fbx") {
        currentVrm.expressionManager.setValue("angry", 0.75);
        currentVrm.expressionManager.setValue("sad", Math.max(appState.expressions.sad, 0.5));
        currentVrm.expressionManager.setValue("blink", Math.max(appState.expressions.blink, 0.1));
      } else if (currentAnimUrl === "laugh.fbx") {
        isHappy = 1.0;
        currentVrm.expressionManager.setValue("happy", 1.0);
        const laughMask = Math.sin(time * 5.1) + Math.sin(time * 2.7);
        if (laughMask > 0) {
          const mouthValue = Math.sin(time * 30.0) * 0.5 + Math.sin(time * 40.0) * 0.5;
          const aaWeight = Math.max(0.5, mouthValue);
          currentVrm.expressionManager.setValue("aa", Math.max(appState.expressions.aa, aaWeight));
        }
      } else if (currentAnimUrl === "Surprised.fbx") {
        currentVrm.expressionManager.setValue("surprised", 1.0);
        currentVrm.expressionManager.setValue("oh", Math.max(appState.expressions.oh, 0.8));
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
        currentVrm.expressionManager.setValue("sad", 0.6);
        currentVrm.expressionManager.setValue("relaxed", 0.5);
      } else if (currentAnimUrl === "Thinking.fbx") {
        currentVrm.expressionManager.setValue("angry", 0.3);
        currentVrm.expressionManager.setValue("relaxed", 0.6);
      } else if (currentAnimUrl === "Blow A Kiss.fbx") {
        currentVrm.expressionManager.setValue("relaxed", 0.8);
        currentVrm.expressionManager.setValue("ou", Math.max(appState.expressions.ou, 0.8));
      } else if (currentAnimUrl === "Crying.fbx") {
        isSad = 1.0;
        currentVrm.expressionManager.setValue("sad", 1.0);
        currentVrm.expressionManager.setValue("angry", 0.3);
        currentVrm.expressionManager.setValue("ih", Math.max(appState.expressions.ih, 0.5));
      } else if (currentAnimUrl === "Floating.fbx") {
        currentVrm.expressionManager.setValue("surprised", 1.0);
        currentVrm.expressionManager.setValue("oh", Math.max(appState.expressions.oh, 0.4));
      } else if (currentAnimUrl === "No.fbx") {
        currentVrm.expressionManager.setValue("sad", 0.5);
        currentVrm.expressionManager.setValue("oh", Math.max(appState.expressions.oh, 0.3));
      } else if (currentAnimUrl === "Looking.fbx" || currentAnimUrl === "Look Around.fbx") {
        currentVrm.expressionManager.setValue("relaxed", 0.6);
      }

      if (isHappy > 0.5) {
        const eyeSquint = Math.sin(time * 2.0) * 0.3 + 0.3;
        if (eyeSquint > 0) {
          currentVrm.expressionManager.setValue("happy", Math.max(isHappy, eyeSquint));
        }
      }

      const blinkCycle = time % 4.0;
      if (blinkCycle < 0.1 && isHappy < 0.8 && isSad < 0.8 && currentAnimUrl !== "angry.fbx") {
        currentVrm.expressionManager.setValue("blink", 1.0);
      }

      if ((window as any).isChatbotTalking) {
        if ((window as any).chatbotAnalyser) {
          const dataArray = new Uint8Array((window as any).chatbotAnalyser.fftSize);
          (window as any).chatbotAnalyser.getByteTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const mouthOpen = Math.min(rms * 5.0, 1.0);
          currentVrm.expressionManager.setValue("aa", Math.max(appState.expressions.aa, mouthOpen));
          if (mouthOpen > 0.3) {
            currentVrm.expressionManager.setValue("ih", mouthOpen * 0.5);
          }
        } else {
          const talkMask = Math.sin(time * 15.0) + Math.sin(time * 20.0);
          if (talkMask > 0) {
            const mouthValue = Math.sin(time * 25.0) * 0.5 + Math.sin(time * 35.0) * 0.5;
            const aaWeight = Math.max(0, mouthValue);
            currentVrm.expressionManager.setValue("aa", Math.max(appState.expressions.aa, aaWeight));
          }
        }
      }

      currentVrm.expressionManager.update();
    }

    // 1. Cập nhật animation một lần với đủ deltaTime (set pose xương từ clip)
    if (currentMixer) currentMixer.update(deltaTime);

    // 2. Hiệu chỉnh chân và tay KHI animation đang phát (áp dụng 1 lần duy nhất)
    // CỰC KỲ QUAN TRỌNG: Chỉ áp dụng khi isRunning() == true VÀ timeScale > 0. Nếu không rotation sẽ bị cộng dồn vô hạn khi animation dừng!
    if (currentAction && currentAction.isRunning() && currentMixer && currentMixer.timeScale > 0 && currentVrm.humanoid) {
      // Ép cánh tay khuỳnh ra để bù trừ khác biệt tỷ lệ Mixamo vs Anime
      const leftArm = currentVrm.humanoid.getNormalizedBoneNode("leftUpperArm");
      const rightArm = currentVrm.humanoid.getNormalizedBoneNode("rightUpperArm");
      if (leftArm) leftArm.rotation.z += 0.25;
      if (rightArm) rightArm.rotation.z -= 0.25;

      const leftLeg = currentVrm.humanoid.getNormalizedBoneNode("leftUpperLeg");
      const rightLeg = currentVrm.humanoid.getNormalizedBoneNode("rightUpperLeg");
      if (leftLeg) leftLeg.rotation.z += 0.05;
      if (rightLeg) rightLeg.rotation.z -= 0.05;

      // Bắt buộc cập nhật World Matrix để spring bones dùng đúng vị trí xương
      currentVrm.scene.updateMatrixWorld();
    }

    // 3. Sub-stepping CHỈ cho spring physics (váy áo, tóc) - không chạy mixer lại
    const SUB_STEPS = 3;
    let timeRemaining = deltaTime;
    while (timeRemaining > 0) {
      const dt = Math.min(timeRemaining, deltaTime / SUB_STEPS);
      currentVrm.update(dt);
      timeRemaining -= dt;
    }


    // Khuếch đại chuyển động của con ngươi mắt để dễ nhìn thấy hơn
    if (currentVrm.humanoid) {
      const leftEye = currentVrm.humanoid.getNormalizedBoneNode("leftEye");
      const rightEye = currentVrm.humanoid.getNormalizedBoneNode("rightEye");
      if (leftEye && rightEye) {
        leftEye.rotation.x *= 2.5;
        leftEye.rotation.y *= 2.5;
        rightEye.rotation.x *= 2.5;
        rightEye.rotation.y *= 2.5;
      }
    }

    if (currentVrm.expressionManager) {
      // Khuếch đại lookAt expressions (Dành cho model dùng Blendshape)
      ["lookUp", "lookDown", "lookLeft", "lookRight"].forEach((expr) => {
        const val = currentVrm!.expressionManager!.getValue(expr);
        if (val && val > 0) {
          currentVrm!.expressionManager!.setValue(expr, Math.min(1.0, val * 2.5));
        }
      });
    }
  }
}
