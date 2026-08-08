import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRM, VRMUtils, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadMixamoAnimation } from '../../../utils/mixamo-loader';

export class AnimationViewer {
    public canvas: HTMLCanvasElement;
    public renderer: THREE.WebGLRenderer;
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public controls: OrbitControls;
    public currentVrm: VRM | null = null;
    public mixer: THREE.AnimationMixer | null = null;
    public clock: THREE.Clock;
    private animationFrameId: number = 0;
    public isInitialized = false;

    constructor(canvasId: string, cameraZ: number = 5.0) {
        const canvasEl = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvasEl) throw new Error(`Canvas with id ${canvasId} not found`);
        this.canvas = canvasEl;
        
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
        this.renderer.setSize(this.canvas.clientWidth || 300, this.canvas.clientHeight || 350, false);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.scene = new THREE.Scene();

        const aspect = (this.canvas.clientWidth || 300) / (this.canvas.clientHeight || 350);
        this.camera = new THREE.PerspectiveCamera(30.0, aspect, 0.1, 20.0);
        this.camera.position.set(0.0, 1.0, cameraZ);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.screenSpacePanning = true;
        this.controls.target.set(0.0, 1.0, 0.0);
        this.controls.update();

        this.setupLights();
        
        const gridHelper = new THREE.GridHelper(30, 60, 0x444444, 0xe0e0e0);
        this.scene.add(gridHelper);

        this.clock = new THREE.Clock();
        
        this.resizeCanvas = this.resizeCanvas.bind(this);
        this.animate = this.animate.bind(this);
        
        window.addEventListener('resize', this.resizeCanvas);
        window.addEventListener('resize-anim-vrm', this.resizeCanvas);
        window.addEventListener('resize-anim-detail-vrm', this.resizeCanvas);
    }

    public init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.resizeCanvas();
        this.clock.getDelta(); // Clear accumulated time
        this.animate();
        this.loadSettingsModel();
    }

    private setupLights() {
        const light = new THREE.DirectionalLight(0xffffff, Math.PI);
        light.position.set(1.0, 1.0, 1.0).normalize();
        this.scene.add(light);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
    }

    public resizeCanvas() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        if (width > 0 && height > 0) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height, false);
        }
    }

    private applyBlink(vrm: VRM, clock: THREE.Clock) {
        if (!vrm || !clock || !vrm.expressionManager) return;
        const time = clock.elapsedTime;
        const blinkCycle = time % 4.0;
        if (blinkCycle < 0.1) {
            vrm.expressionManager.setValue("blink", 1.0);
        } else {
            vrm.expressionManager.setValue("blink", 0.0);
        }
    }

    private animate() {
        this.animationFrameId = requestAnimationFrame(this.animate);
        let delta = this.clock.getDelta();
        if (delta > 0.1) delta = 0.1; // Cap delta to prevent VRM physics lag/explosions
        if (this.currentVrm) {
            this.applyBlink(this.currentVrm, this.clock);
            this.currentVrm.update(delta);
        }
        if (this.mixer) {
            this.mixer.update(delta);
        }
        this.renderer.render(this.scene, this.camera);
    }
    
    public pendingFbxUrl: string | null = null;
    
    public loadSettingsModel(onLoaded?: () => void) {
        try {
            let modelUrl = "/Citlali.vrm";
            const local = localStorage.getItem('app_settings');
            if (local) {
                const parsed = JSON.parse(local);
                if (parsed.model) modelUrl = parsed.model;
            }
            
            const loader = new GLTFLoader();
            loader.register((parser) => new VRMLoaderPlugin(parser));
            loader.load(modelUrl, (gltf) => {
                const vrm = gltf.userData.vrm as VRM;
                if (vrm) {
                    if (this.currentVrm) {
                        this.scene.remove(this.currentVrm.scene);
                        VRMUtils.deepDispose(this.currentVrm.scene);
                    }
                    this.scene.add(vrm.scene);
                    this.currentVrm = vrm;
                    vrm.scene.position.set(0, 0, 0);
                    vrm.scene.rotation.y = 0;
                    if (onLoaded) onLoaded();
                    
                    if (this.pendingFbxUrl) {
                        this.playAnimationFbx(this.pendingFbxUrl);
                        this.pendingFbxUrl = null;
                    }
                }
            });
        } catch(e) { console.error('Error loading current VRM', e); }
    }

    public stopAnimation() {
        if (this.mixer) {
            this.mixer.stopAllAction();
        }
        if (this.currentVrm) {
            this.currentVrm.scene.position.set(0, 0, 0);
            this.currentVrm.scene.rotation.y = 0;
        }
    }
    
    public async playAnimationFbx(fbxUrl: string) {
        if (!this.currentVrm) {
            this.pendingFbxUrl = fbxUrl;
            return;
        }
        this.stopAnimation();
        try {
            const clip = await loadMixamoAnimation(fbxUrl, this.currentVrm);
            this.mixer = new THREE.AnimationMixer(this.currentVrm.scene);
            // @ts-ignore: ThreeJS types mismatch with mixamo loader
            this.mixer.clipAction(clip).play();
        } catch (err) {
            console.error('Error loading preview animation:', err);
        }
    }
    
    public dispose() {
        cancelAnimationFrame(this.animationFrameId);
        window.removeEventListener('resize', this.resizeCanvas);
        if (this.currentVrm) {
            this.scene.remove(this.currentVrm.scene);
            VRMUtils.deepDispose(this.currentVrm.scene);
            this.currentVrm = null;
        }
        this.renderer.dispose();
    }
}
