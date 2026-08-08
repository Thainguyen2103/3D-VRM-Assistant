import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRM, VRMUtils } from '@pixiv/three-vrm';

export class VrmViewer {
    public canvas: HTMLCanvasElement;
    public renderer: THREE.WebGLRenderer;
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public controls: OrbitControls;
    public currentVrm: VRM | undefined;
    public clock: THREE.Clock;
    private animationFrameId: number = 0;

    constructor(canvasId: string) {
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
        this.camera.position.set(0.0, 1.0, 6.0);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.screenSpacePanning = true;
        this.controls.target.set(0.0, 1.0, 0.0);
        this.controls.update();

        this.setupLights();
        
        const gridHelper = new THREE.GridHelper(30, 60, 0x444444, 0xe0e0e0);
        this.scene.add(gridHelper);

        this.clock = new THREE.Clock();
        
        this.setupCameraButtons();
        
        this.resizeCanvas = this.resizeCanvas.bind(this);
        this.animate = this.animate.bind(this);
        
        window.addEventListener('resize', this.resizeCanvas);
        window.addEventListener('resize-vrm', this.resizeCanvas);

        this.resizeCanvas();
        this.animate();
    }

    private setupLights() {
        const light = new THREE.DirectionalLight(0xffffff, Math.PI);
        light.position.set(1.0, 1.0, 1.0).normalize();
        this.scene.add(light);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
    }

    private setupCameraButtons() {
        const camBtns = document.querySelectorAll('.cam-btn');
        camBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pos = (e.currentTarget as HTMLElement).dataset.pos;
                if (pos === 'full') {
                    this.camera.position.set(0.0, 0.9, 4.0);
                    this.controls.target.set(0.0, 0.9, 0.0);
                } else if (pos === 'hip') {
                    this.camera.position.set(0.0, 1.4, 1.9);
                    this.controls.target.set(0.0, 1.4, 0.0);
                } else if (pos === 'chest') {
                    this.camera.position.set(0.0, 1.5, 1.3);
                    this.controls.target.set(0.0, 1.5, 0.0);
                } else if (pos === 'face') {
                    this.camera.position.set(0.0, 1.55, 0.7);
                    this.controls.target.set(0.0, 1.55, 0.0);
                }
                this.controls.update();
            });
        });
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
        let deltaTime = this.clock.getDelta();
        if (deltaTime > 0.1) deltaTime = 0.1; // Cap delta to prevent VRM physics lag/explosions
        if (this.currentVrm) {
            this.applyBlink(this.currentVrm, this.clock);
            this.currentVrm.update(deltaTime);

            const rotationCheckbox = document.getElementById('toggle-rotation') as HTMLInputElement;
            if (rotationCheckbox && rotationCheckbox.checked) {
                this.currentVrm.scene.rotation.y += deltaTime * 0.5;
            } else {
                const targetRotation = Math.round(this.currentVrm.scene.rotation.y / (Math.PI * 2)) * (Math.PI * 2);
                this.currentVrm.scene.rotation.y = THREE.MathUtils.lerp(this.currentVrm.scene.rotation.y, targetRotation, deltaTime * 8.0);
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
    
    public loadVrm(vrm: VRM) {
        if (this.currentVrm) {
            this.scene.remove(this.currentVrm.scene);
            VRMUtils.deepDispose(this.currentVrm.scene);
        }
        this.currentVrm = vrm;
        this.scene.add(vrm.scene);
        vrm.scene.rotation.y = Math.PI;
    }
    
    public clearVrm() {
        if (this.currentVrm) {
            this.scene.remove(this.currentVrm.scene);
            VRMUtils.deepDispose(this.currentVrm.scene);
            this.currentVrm = undefined;
        }
    }
    
    public dispose() {
        cancelAnimationFrame(this.animationFrameId);
        window.removeEventListener('resize', this.resizeCanvas);
        window.removeEventListener('resize-vrm', this.resizeCanvas);
        this.clearVrm();
        this.renderer.dispose();
    }
}
