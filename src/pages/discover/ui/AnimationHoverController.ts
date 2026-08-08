import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
import { loadMixamoAnimation } from '../../../utils/mixamo-loader';

export class AnimationHoverController {
    static setup() {
        const sharedCanvas = document.createElement('canvas');
        sharedCanvas.width = 300;
        sharedCanvas.height = 350;
        const sharedRenderer = new THREE.WebGLRenderer({ canvas: sharedCanvas, alpha: true, antialias: true, preserveDrawingBuffer: false });
        sharedRenderer.outputColorSpace = THREE.SRGBColorSpace;
        const sharedScene = new THREE.Scene();
        const sharedCamera = new THREE.PerspectiveCamera(30.0, 300/350, 0.1, 20.0);
        sharedCamera.position.set(0.0, 1.0, 4.0);
        
        const sharedLight = new THREE.DirectionalLight(0xffffff, Math.PI);
        sharedLight.position.set(1.0, 1.0, 1.0).normalize();
        sharedScene.add(sharedLight);
        sharedScene.add(new THREE.AmbientLight(0xffffff, 0.5));

        let sharedVrm: VRM | undefined;
        let sharedMixer: THREE.AnimationMixer | null = null;
        const sharedClock = new THREE.Clock();

        let hoverModelUrl = "/Citlali.vrm";
        try {
            const local = localStorage.getItem('app_settings');
            if (local) {
                const parsed = JSON.parse(local);
                if (parsed.model) hoverModelUrl = parsed.model;
            }
        } catch(e) {}
        
        new GLTFLoader().register((p) => new VRMLoaderPlugin(p)).load(hoverModelUrl, (gltf) => {
            sharedVrm = gltf.userData.vrm as VRM;
            sharedScene.add(sharedVrm.scene);
            sharedMixer = new THREE.AnimationMixer(sharedVrm.scene);
        });

        interface AnimCardState {
            id: string;
            fbxUrl: string;
            canvas2d: HTMLCanvasElement;
            isVisible: boolean;
            isLoaded: boolean;
            isLoading: boolean;
            clip: THREE.AnimationClip | null;
            currentTime: number;
        }

        const animCardsState = new Map<HTMLElement, AnimCardState>();

        const animObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const card = entry.target as HTMLElement;
                const state = animCardsState.get(card);
                if (state) {
                    state.isVisible = entry.isIntersecting;
                }
            });
        }, { rootMargin: '100px' });

        function attachAnimationHoverEvents(containerId = '') {
            const selector = containerId ? '#' + containerId + ' .animation-card' : '#animation-grid .animation-card';
            const cards = document.querySelectorAll(selector);
            
            cards.forEach(card => {
                const fbxUrl = (card as HTMLElement).dataset.fbx;
                const cardId = (card as HTMLElement).dataset.id || '';
                const canvas2d = card.querySelector('.card-2d-canvas') as HTMLCanvasElement;
                
                if (fbxUrl && canvas2d && !animCardsState.has(card as HTMLElement)) {
                    animCardsState.set(card as HTMLElement, {
                        id: cardId,
                        fbxUrl: fbxUrl,
                        canvas2d: canvas2d,
                        isVisible: false,
                        isLoaded: false,
                        isLoading: false,
                        clip: null,
                        currentTime: 0
                    });
                    animObserver.observe(card);
                }
            });
        }

        function renderSharedAnimations() {
            requestAnimationFrame(renderSharedAnimations);
            
            const delta = sharedClock.getDelta();
            if (!sharedVrm || !sharedMixer) return;

            for (const [card, state] of animCardsState.entries()) {
                if (!state.isVisible) continue;

                if (!state.isLoaded && !state.isLoading) {
                    state.isLoading = true;
                    const icon = card.querySelector('.anim-placeholder-icon') as HTMLElement;
                    loadMixamoAnimation(state.fbxUrl, sharedVrm).then(clip => {
                        state.clip = clip;
                        state.isLoaded = true;
                        state.isLoading = false;
                        if (icon) icon.style.display = 'none';
                        state.canvas2d.style.display = 'block';
                    }).catch(err => {
                        console.error('Failed to load animation', state.fbxUrl, err);
                        state.isLoading = false;
                    });
                    continue;
                }

                if (state.isLoaded && state.clip) {
                    state.currentTime += delta;
                    if (state.currentTime >= state.clip.duration) {
                        state.currentTime = state.currentTime % state.clip.duration;
                    }

                    sharedVrm.scene.position.set(0, 0, 0);
                    sharedVrm.scene.rotation.y = 0;
                    
                    sharedMixer.stopAllAction();
                    const action = sharedMixer.clipAction(state.clip);
                    action.play();
                    
                    sharedMixer.setTime(state.currentTime);
                    sharedVrm.update(0);
                    
                    sharedRenderer.render(sharedScene, sharedCamera);
                    
                    const ctx = state.canvas2d.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, state.canvas2d.width, state.canvas2d.height);
                        ctx.drawImage(sharedCanvas, 0, 0, state.canvas2d.width, state.canvas2d.height);
                    }
                }
            }
        }
        
        renderSharedAnimations();
        return attachAnimationHoverEvents;
    }
}
