// discover/main.ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, VRM } from '@pixiv/three-vrm';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { createIcons, icons } from 'lucide';
import { supabase } from '../../core/auth';
import { applyLanguage } from '../../core/i18n';
import { CustomDialog } from '../../components/custom-dialog';
(window as any).CustomDialog = CustomDialog;
import { loadMixamoAnimation } from '../../utils/mixamo-loader';
import { VrmViewer } from './3d/VrmViewer';
import { AnimationViewer } from './3d/AnimationViewer';
import { TabController } from './ui/TabController';
import { ListController } from './ui/ListController';
import { UploadController } from './ui/UploadController';
import { ModalsController } from './ui/ModalsController';
import { ImageCropperController } from './ui/ImageCropperController';
import { UploadFormsController } from './ui/UploadFormsController';
import { TabSwitcherController } from './ui/TabSwitcherController';
import { SearchFilterController } from './ui/SearchFilterController';
import { AnimationHoverController } from './ui/AnimationHoverController';
import { ListRenderingController } from './ui/ListRenderingController';
import { DetailModalController } from './ui/DetailModalController';
import { DiscoverService } from './services/DiscoverService';
import { AnimationService } from './services/AnimationService';

const API_BASE = 'http://localhost:3000/api/characters';

document.addEventListener('DOMContentLoaded', async () => {
    createIcons({ icons });
    
    // Áp dụng ngôn ngữ từ settings
    try {
        const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
        applyLanguage(settings.language || 'vi');
    } catch(e) {
        applyLanguage('vi');
    }
    
    // Đồng bộ cài đặt ngôn ngữ khi tab khác thay đổi
    window.addEventListener('storage', (e) => {
        if (e.key === 'app_settings') {
            try {
                const settings = JSON.parse(e.newValue || '{}');
                if (settings.language) applyLanguage(settings.language);
            } catch(err) {}
        }
    });
    
    // --- Detail Animation Viewer ---
    const animDetailViewer = new AnimationViewer('anim-detail-preview-canvas');
    // --- User Session & Profile ---
    let currentUser: any = null;
    try {
        const { data: { session } } = await supabase!.auth.getSession();
        if (session && session.user) {
            currentUser = session.user;
            ListRenderingController.init(currentUser, AnimationHoverController.setup());
            
            // Fetch profile from user_profiles table
            let displayName = currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User';
            let avatarUrl = currentUser.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User';
            
            const { data: profile } = await supabase!.from('user_profiles').select('display_name, avatar_url').eq('id', currentUser.id).single();
            if (profile) {
                if (profile.display_name) displayName = profile.display_name;
                if (profile.avatar_url) {
                    if (profile.avatar_url.startsWith('http')) {
                        avatarUrl = profile.avatar_url;
                    } else {
                        const { data } = supabase!.storage.from('avatars').getPublicUrl(profile.avatar_url);
                        avatarUrl = data.publicUrl;
                    }
                }
            }

            const profileNameEl = document.getElementById('header-profile-name');
            const profileAvatarEl = document.getElementById('header-profile-avatar') as HTMLImageElement;
            
            if (profileNameEl) {
                profileNameEl.textContent = displayName;
                profileNameEl.removeAttribute('data-i18n');
            }
            if (profileAvatarEl) {
                profileAvatarEl.src = avatarUrl;
                profileAvatarEl.onerror = () => {
                    profileAvatarEl.src = currentUser.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User';
                };
            }
        } else {
            const profileNameEl = document.getElementById('header-profile-name');
            if (profileNameEl) {
                profileNameEl.setAttribute('data-i18n', 'discover.header.guest');
                import('../../core/i18n').then(({ t }) => {
                    profileNameEl.textContent = t('discover.header.guest') || 'Khách';
                });
            }
        }
    } catch (e) {
        console.error("Failed to load session", e);
    }

    const headerProfileWidget = document.getElementById('header-profile-widget');
    if (headerProfileWidget) {
        headerProfileWidget.addEventListener('click', () => {
            const myUploadsTabBtn = document.querySelector('.tab-btn[data-tab="tab-my-uploads"]') as HTMLElement;
            if (myUploadsTabBtn) {
                myUploadsTabBtn.click();
            } else {
                // If there's no actual tab button, just switch content manually
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                const contentToShow = document.getElementById('tab-my-uploads');
                if (contentToShow) contentToShow.classList.add('active');
                
                const backBtn = document.getElementById('main-back-btn') as HTMLAnchorElement;
                const backText = document.getElementById('main-back-text');
                if (backBtn && backText) {
                    backBtn.href = 'javascript:void(0)';
                    backBtn.onclick = (e) => {
                        e.preventDefault();
                        document.getElementById('hidden-home-btn')?.click();
                    };
                    backText.setAttribute('data-i18n', 'discover.header.back_home'); try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../core/i18n').then(({ t }) => { backText.innerHTML = t('discover.header.back_home'); }); } else backText.textContent = 'Về Trang Chủ'; } catch(e) { backText.textContent = 'Về Trang Chủ'; }
                    backText.setAttribute('data-i18n', 'discover.header.back_home');
                    try {
                        const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                        applyLanguage(settings.language || 'vi');
                    } catch(e) {}
                }
            }
            ListRenderingController.loadMyUploadsList();
            ListRenderingController.loadMyUploadsAnimList();
        });
    }
    

    const listContainer = document.getElementById('discover-list-container');
    const uploadForm = document.getElementById('upload-character-form') as HTMLFormElement;
    const uploadStatus = document.getElementById('upload-status');


    // --- 3D VRM Preview Setup ---
    const vrmViewer = new VrmViewer('vrm-preview-canvas');
    const placeholder = document.getElementById('preview-placeholder');

    function applyBlink(vrm: VRM, clock: THREE.Clock) {
        if (!vrm || !clock || !vrm.expressionManager) return;
        const time = clock.elapsedTime;
        const blinkCycle = time % 4.0;
        if (blinkCycle < 0.1) {
            vrm.expressionManager.setValue("blink", 1.0);
        } else {
            vrm.expressionManager.setValue("blink", 0.0);
        }
    }


    // --- Animation Preview Setup ---
    const animViewer = new AnimationViewer('anim-preview-canvas');

    TabSwitcherController.setup({ animViewer });

    // --- Animation Detail Preview Setup ---

    // Camera buttons for detail preview
    document.querySelectorAll('.cam-btn-anim-detail').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pos = (e.currentTarget as HTMLElement).dataset.pos;
            switch(pos) {
                case 'full':
                    animDetailViewer.camera.position.set(0, 1.0, 5.0);
                    animDetailViewer.controls.target.set(0, 1.0, 0);
                    break;
                case 'hip':
                    animDetailViewer.camera.position.set(0, 0.9, 2.5);
                    animDetailViewer.controls.target.set(0, 0.9, 0);
                    break;
                case 'chest':
                    animDetailViewer.camera.position.set(0, 1.4, 1.8);
                    animDetailViewer.controls.target.set(0, 1.4, 0);
                    break;
                case 'face':
                    animDetailViewer.camera.position.set(0, 1.5, 0.8);
                    animDetailViewer.controls.target.set(0, 1.5, 0);
                    break;
            }
            animDetailViewer.controls.update();
        });
    });

    const btnBackDiscoverAnimDetail = document.getElementById('btn-back-discover-anim-detail');
    if (btnBackDiscoverAnimDetail) {
        btnBackDiscoverAnimDetail.addEventListener('click', () => {
            const tabs = document.querySelectorAll('.tab-content');
            tabs.forEach(tab => tab.classList.remove('active'));
            const animTab = document.getElementById('tab-animation');
            if (animTab) animTab.classList.add('active');
            
            document.body.classList.remove('upload-mode');
            
            animDetailViewer.stopAnimation();
            animDetailViewer.mixer = null;
        });
    }

    // --- Custom Select Utility ---


    const vrmInput = document.getElementById('upload-vrm') as HTMLInputElement;
    const vrmFileName = document.getElementById('vrm-file-name');

    vrmInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file && vrmFileName) vrmFileName.textContent = file.name;
    });

    // --- Animation Upload Setup ---
    setTimeout(() => {
        UploadController.setupCustomSelect('upload-anim-category');
        UploadController.setupCustomSelect('filter-animation-select');
    }, 100);

    const animInput = document.getElementById('upload-anim-file') as HTMLInputElement;
    const animFileName = document.getElementById('anim-file-name');
    const uploadAnimLabel = document.getElementById('upload-anim-label');

    animInput.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
            if (animFileName) animFileName.textContent = '';
            if (uploadAnimLabel) uploadAnimLabel.classList.remove('has-file');
            return;
        }

        if (animFileName) animFileName.textContent = file.name;
        if (uploadAnimLabel) uploadAnimLabel.classList.add('has-file');

        const url = URL.createObjectURL(file);
        try {
            await animViewer.playAnimationFbx(url);
        } catch (err) {
            console.error("Error previewing animation", err);
        }
    });

    UploadController.setupDragAndDrop('upload-anim-label', 'upload-anim-file');

    // --- Dynamic Gender & Type Selection ---
    const genderBtns = document.querySelectorAll('.gender-btn');
    const uploadTypeSelect = document.getElementById('upload-type') as HTMLSelectElement;

    const typeOptions = {
        'Nữ': [
            { value: 'Tuổi teen', label: 'Tuổi teen (Teen)' },
            { value: 'Nhỏ nhắn', label: 'Nhỏ nhắn (Loli)' },
            { value: 'Trưởng thành', label: 'Trưởng thành (Adult)' },
            { value: 'Quyến rũ', label: 'Quyến rũ (Mommy)' },
            { value: 'Chị gái', label: 'Chị gái (Onee-san)' },
            { value: 'Đầu to', label: 'Đầu to (Chibi)' },
            { value: 'Khác', label: 'Khác' }
        ],
        'Nam': [
            { value: 'Tuổi teen', label: 'Tuổi teen (Teen)' },
            { value: 'Nhỏ nhắn', label: 'Nhỏ nhắn (Shota)' },
            { value: 'Trưởng thành', label: 'Trưởng thành (Adult)' },
            { value: 'Nam tính', label: 'Nam tính (Daddy)' },
            { value: 'Anh trai', label: 'Anh trai (Onii-san)' },
            { value: 'Đầu to', label: 'Đầu to (Chibi)' },
            { value: 'Khác', label: 'Khác' }
        ],
        'Khác': [
            { value: 'Tuổi teen', label: 'Tuổi teen (Teen)' },
            { value: 'Nhỏ nhắn', label: 'Nhỏ nhắn (Child)' },
            { value: 'Trưởng thành', label: 'Trưởng thành (Adult)' },
            { value: 'Đầu to', label: 'Đầu to (Chibi)' },
            { value: 'Khác', label: 'Khác' }
        ]
    };

    genderBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active from all
            genderBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            const currentBtn = e.currentTarget as HTMLElement;
            currentBtn.classList.add('active');
            
            // Get selected value from radio input inside the label
            const radio = currentBtn.querySelector('input[type="radio"]') as HTMLInputElement;
            if (radio && uploadTypeSelect) {
                const gender = radio.value as 'Nữ' | 'Nam' | 'Khác';
                
                // Keep the current selected index if possible, else default to 0
                const selectedIndex = uploadTypeSelect.selectedIndex;
                
                uploadTypeSelect.innerHTML = (typeOptions[gender] || typeOptions['Khác']).map(opt => 
                    `<option value="${opt.value}">${opt.label}</option>`
                ).join('');
                
                if (selectedIndex >= 0 && selectedIndex < uploadTypeSelect.options.length) {
                    uploadTypeSelect.selectedIndex = selectedIndex;
                }
                
                // Refresh custom select options
                UploadController.setupCustomSelect('upload-type');
            }
        });
    });

    // Privacy Toggle Buttons
    const privacyBtns = document.querySelectorAll('.privacy-btn');
    privacyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            privacyBtns.forEach(b => b.classList.remove('active'));
            const currentBtn = e.currentTarget as HTMLElement;
            currentBtn.classList.add('active');
        });
    });

    // Initialize custom selects
    setTimeout(() => {
        UploadController.setupCustomSelect('upload-type');
        UploadController.setupCustomSelect('upload-trait-select');
        UploadController.setupCustomSelect('upload-source-select');
        UploadController.setupCustomSelect('upload-origin-select');
    }, 100);

    const uploadTypeCustomContainer = document.getElementById('upload-type-custom-container');
    const uploadTypeCustom = document.getElementById('upload-type-custom') as HTMLInputElement;
    const btnCancelTypeCustom = document.getElementById('btn-cancel-type-custom');

    if (uploadTypeSelect && uploadTypeCustomContainer && uploadTypeCustom && btnCancelTypeCustom) {
        uploadTypeSelect.addEventListener('change', () => {
            if (uploadTypeSelect.value === 'Khác') {
                uploadTypeSelect.style.display = 'none';
                uploadTypeCustomContainer.style.display = 'block';
                uploadTypeCustom.focus();
            }
        });
        btnCancelTypeCustom.addEventListener('click', () => {
            uploadTypeCustom.value = '';
            uploadTypeCustomContainer.style.display = 'none';
            uploadTypeSelect.selectedIndex = 0;
            const wrapper = uploadTypeSelect.nextElementSibling as HTMLElement;
            if (wrapper && wrapper.classList.contains('custom-select-wrapper')) {
                wrapper.style.display = 'block';
                UploadController.setupCustomSelect('upload-type');
            }
        });
    }

    const uploadTraitSelect = document.getElementById('upload-trait-select') as HTMLSelectElement;
    const uploadTraitCustomContainer = document.getElementById('upload-trait-custom-container');
    const uploadTraitCustom = document.getElementById('upload-trait-custom') as HTMLInputElement;
    const btnCancelTraitCustom = document.getElementById('btn-cancel-trait-custom');

    if (uploadTraitSelect && uploadTraitCustomContainer && uploadTraitCustom && btnCancelTraitCustom) {
        uploadTraitSelect.addEventListener('change', () => {
            if (uploadTraitSelect.value === 'Khác') {
                uploadTraitSelect.style.display = 'none';
                uploadTraitCustomContainer.style.display = 'block';
                uploadTraitCustom.focus();
            }
        });
        btnCancelTraitCustom.addEventListener('click', () => {
            uploadTraitCustom.value = '';
            uploadTraitCustomContainer.style.display = 'none';
            uploadTraitSelect.selectedIndex = 0;
            const wrapper = uploadTraitSelect.nextElementSibling as HTMLElement;
            if (wrapper && wrapper.classList.contains('custom-select-wrapper')) {
                wrapper.style.display = 'block';
                UploadController.setupCustomSelect('upload-trait-select');
            }
        });
    }

    const uploadSourceSelect = document.getElementById('upload-source-select') as HTMLSelectElement;
    const uploadSourceCustomContainer = document.getElementById('upload-source-custom-container');
    const uploadSourceCustom = document.getElementById('upload-source-custom') as HTMLInputElement;
    const btnCancelSourceCustom = document.getElementById('btn-cancel-source-custom');

    if (uploadSourceSelect && uploadSourceCustomContainer && uploadSourceCustom && btnCancelSourceCustom) {
        uploadSourceSelect.addEventListener('change', () => {
            if (uploadSourceSelect.value === 'Khác') {
                uploadSourceSelect.style.display = 'none';
                uploadSourceCustomContainer.style.display = 'block';
                uploadSourceCustom.focus();
            }
        });
        btnCancelSourceCustom.addEventListener('click', () => {
            uploadSourceCustom.value = '';
            uploadSourceCustomContainer.style.display = 'none';
            uploadSourceSelect.selectedIndex = 0;
            const wrapper = uploadSourceSelect.nextElementSibling as HTMLElement;
            if (wrapper && wrapper.classList.contains('custom-select-wrapper')) {
                wrapper.style.display = 'block';
                UploadController.setupCustomSelect('upload-source-select');
            }
        });
    }

    const uploadOriginSelect = document.getElementById('upload-origin-select') as HTMLSelectElement;
    const uploadOriginCustomContainer = document.getElementById('upload-origin-custom-container');
    const uploadOriginCustom = document.getElementById('upload-origin-custom') as HTMLInputElement;
    const btnCancelOriginCustom = document.getElementById('btn-cancel-origin-custom');

    if (uploadOriginSelect && uploadOriginCustomContainer && uploadOriginCustom && btnCancelOriginCustom) {
        uploadOriginSelect.addEventListener('change', () => {
            if (uploadOriginSelect.value === 'Khác') {
                uploadOriginSelect.style.display = 'none';
                uploadOriginCustomContainer.style.display = 'block';
                uploadOriginCustom.focus();
            }
        });
        btnCancelOriginCustom.addEventListener('click', () => {
            uploadOriginCustom.value = '';
            uploadOriginCustomContainer.style.display = 'none';
            uploadOriginSelect.selectedIndex = 0;
            const originWrapper = uploadOriginSelect.nextElementSibling as HTMLElement;
            if (originWrapper && originWrapper.classList.contains('custom-select-wrapper')) {
                originWrapper.style.display = 'block';
                UploadController.setupCustomSelect('upload-origin-select');
            }
        });
    }

    // --- Search Logic ---
    const searchInput = document.getElementById('search-character') as HTMLInputElement;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = (e.target as HTMLInputElement).value.toLowerCase();
            const cards = document.querySelectorAll('.discover-grid .model-card') as NodeListOf<HTMLElement>;
            cards.forEach(card => {
                const name = (card.dataset.name || '').toLowerCase();
                const trait = (card.dataset.trait || '').toLowerCase();
                if (name.includes(term) || trait.includes(term)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // --- Voice Input Setup ---
    const voiceInput = document.getElementById('upload-voice') as HTMLInputElement;
    const btnSkipVoice = document.getElementById('btn-skip-voice');
    const voiceWarningText = document.getElementById('voice-warning-text');
    let isVoiceSkipped = false;

    if (btnSkipVoice && voiceInput) {
        btnSkipVoice.addEventListener('click', () => {
            isVoiceSkipped = !isVoiceSkipped;
            
            if (isVoiceSkipped) {
                // Disable it
                voiceInput.value = '';
                voiceInput.placeholder = 'Đã bỏ qua Voice';
                voiceInput.disabled = true;
                voiceInput.style.backgroundColor = '#f0f0f0';
                voiceInput.style.color = '#999';
                voiceInput.style.borderColor = '#ddd';
                
                if (voiceWarningText) voiceWarningText.style.display = 'none';
                
                btnSkipVoice.setAttribute('data-i18n', 'discover.upload.btn_restore'); try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../core/i18n').then(({ t }) => { btnSkipVoice.innerHTML = t('discover.upload.btn_restore'); }); } else btnSkipVoice.textContent = 'Khôi phục'; } catch(e) { btnSkipVoice.textContent = 'Khôi phục'; }
                btnSkipVoice.style.color = '#3f51b5';
            } else {
                // Enable it
                voiceInput.placeholder = 'Mã Model ID trên Fish Audio (VD: e4a5b... 32 ký tự)';
                voiceInput.disabled = false;
                voiceInput.style.backgroundColor = '';
                voiceInput.style.color = '';
                voiceInput.style.borderColor = '';
                
                if (voiceWarningText) voiceWarningText.style.display = 'flex';
                
                btnSkipVoice.setAttribute('data-i18n', 'discover.upload.btn_skip'); try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../core/i18n').then(({ t }) => { btnSkipVoice.innerHTML = t('discover.upload.btn_skip'); }); } else btnSkipVoice.textContent = 'Bỏ qua'; } catch(e) { btnSkipVoice.textContent = 'Bỏ qua'; }
                btnSkipVoice.style.color = '#666';
            }
        });
    }

    // --- Modals Setup ---
    ModalsController.setupModals();
    // --- Form Submission ---
    vrmInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        const vrmLabel = document.getElementById('upload-vrm-label');
        if (!file) {
            if (vrmFileName) vrmFileName.textContent = 'Chưa chọn file nào';
            if (vrmLabel) vrmLabel.classList.remove('has-file');
            return;
        }

        if (vrmFileName) vrmFileName.textContent = file.name;
        if (vrmLabel) vrmLabel.classList.add('has-file');

        if (placeholder) placeholder.style.display = 'none';

        const url = URL.createObjectURL(file);
        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));

        loader.load(url, (gltf) => {
            const vrm = gltf.userData.vrm as VRM;
            if (vrm) {
                vrmViewer.loadVrm(vrm);
            }
        }, undefined, (error) => {
            console.error('Error loading VRM for preview:', error);
        });
    });

    // --- Drag and Drop Setup ---


    UploadController.setupDragAndDrop('upload-vrm-label', 'upload-vrm');
    UploadController.setupDragAndDrop('icon-preview-container', 'upload-icon');
    UploadController.setupDragAndDrop('upload-anim-label', 'upload-anim-file');

    // --- Icon Cropper Setup ---
    ImageCropperController.setup();

    // Upload form
    UploadFormsController.setup({
        vrmViewer,
        animViewer,
        getIsVoiceSkipped: () => isVoiceSkipped,
        resetVoiceSkip: () => { if (btnSkipVoice) btnSkipVoice.click(); },
        loadDiscoverList: () => ListRenderingController.loadDiscoverList(),
        loadAnimationList: () => ListRenderingController.loadAnimationList()
    });

    // --- Helper: parse trait string into structured data ---


    // --- Helper: gender SVG icon ---


    // --- Helper: build card HTML ---






    DetailModalController.init(animViewer, vrmViewer, animDetailViewer);

    // Call on load
    ListRenderingController.loadAnimationList();
    
    // --- Search & Filter Logic ---
    SearchFilterController.setup();
});
