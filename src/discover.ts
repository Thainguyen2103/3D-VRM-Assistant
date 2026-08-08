import { updateActiveModelCardUI } from '@/components/ui-manager';
import { normalizeModelUrl, isXianyunModel, isLaumaModel, isNahidaModel, isYaeMikoModel, MODEL_CITLALI } from '@/core/constants';
import { currentModelUrl, switchVRMModel, loadFBXAnimation } from '@/features/vrm-viewer/vrm-manager';
import { showToast } from '@/components/ui-manager';
import { t } from '@/core/i18n';
import { currentUser, supabase } from '@/core/auth';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, VRM } from '@pixiv/three-vrm';
import { loadMixamoAnimation } from '@/utils/mixamo-loader';

const API_BASE = 'http://localhost:3000/api/characters';

export function initDiscover() {
    // Call it initially so characters are added to the main character modal on load
    loadSavedCharactersToModal();
    // Load animations when the page starts
    if (document.getElementById('animation-grid')) {
        loadAnimations();
    }
    // Load community animations into the main action panel
    loadCommunityAnimationsToPanel();
}

// ---- Category meta: icon SVG + label ----
const CATEGORY_META: Record<string, { icon: string; label: string }> = {
    'Cơ bản & Di chuyển': {
        label: 'Cơ bản & Di chuyển (Cộng đồng)',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="m15 19-3 3-3-3"/><path d="m19 9 3 3-3 3"/><path d="M2 12h20"/><path d="m5 9-3 3 3 3"/><path d="m9 5 3-3 3 3"/></svg>`
    },
    'Giao tiếp & Tương tác': {
        label: 'Giao tiếp & Tương tác (Cộng đồng)',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg>`
    },
    'Biểu cảm & Cảm xúc': {
        label: 'Biểu cảm & Cảm xúc (Cộng đồng)',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>`
    },
    'Chơi nhạc': {
        label: 'Chơi nhạc (Cộng đồng)',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`
    },
};

const DEFAULT_CATEGORY_META = {
    label: 'Khác (Cộng đồng)',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`
};

export async function loadCommunityAnimationsToPanel() {
    // community-actions-container is used only for categories that don't match existing sections
    const container = document.getElementById('community-actions-container');

    // "Khám Phá" earth icon – matches the Khám Phá nav button in index.html
    const DISCOVER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.75;flex-shrink:0;" title="Từ Khám Phá" data-i18n-title="discover.anim.from"><path d="M21.54 15H17a2 2 0 0 0-2 2v4.54"/><path d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2a2 2 0 0 0 2 2a2 2 0 0 0 2-2a2 2 0 0 1 2-2h3.17"/><path d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"/><circle cx="12" cy="12" r="10"/></svg>`;

    try {
        // Only show animations the user has explicitly saved
        let userId = '';
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) userId = session.user.id;
        } catch (_) {}

        if (!userId) {
            // Not logged in — nothing to show
            if (container) container.innerHTML = '';
            return;
        }

        const response = await fetch(`http://localhost:3000/api/animations/my-saved?creator_id=${userId}`);
        if (!response.ok) return;
        const animations: any[] = await response.json();

        // Clear previously rendered community buttons
        document.querySelectorAll('.community-anim-btn').forEach(btn => btn.remove());
        if (container) container.innerHTML = '';

        if (!animations || animations.length === 0) return;

        // Group by category
        const grouped: Record<string, any[]> = {};
        animations.forEach(anim => {
            const cat = (anim.category || 'Khác').trim();
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(anim);
        });

        // Build a map: h4 span text → existing .bone-grid element
        const gridMap: Record<string, HTMLElement> = {};
        document.querySelectorAll<HTMLElement>('.panel-section h4').forEach(h4 => {
            const span = h4.querySelector('span');
            const spanText = span?.getAttribute('data-category') || span?.textContent?.trim() || '';
            if (!spanText) return;
            let sibling = h4.nextElementSibling as HTMLElement | null;
            while (sibling) {
                if (sibling.classList.contains('bone-grid')) {
                    gridMap[spanText] = sibling;
                    break;
                }
                sibling = sibling.nextElementSibling as HTMLElement | null;
            }
        });

        const unmappedCategories: Record<string, any[]> = {};

        for (const [category, anims] of Object.entries(grouped)) {
            const targetGrid = gridMap[category] || null;

            if (targetGrid) {
                anims.forEach(anim => {
                    if (targetGrid.querySelector(`[data-anim-id="${anim.id}"]`)) return;

                    const btn = document.createElement('button');
                    btn.className = 'anim-btn bone-btn community-anim-btn';
                    btn.setAttribute('data-anim', anim.file_url);
                    btn.setAttribute('data-anim-id', anim.id);
                    btn.style.cssText = 'font-size: 0.82rem; display: flex; align-items: center; justify-content: center; gap: 4px;';
                    btn.innerHTML = `${DISCOVER_ICON}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${anim.name}</span>`;
                    targetGrid.appendChild(btn);
                });
            } else {
                unmappedCategories[category] = anims;
            }
        }

        // Unmapped categories → fallback container
        if (container && Object.keys(unmappedCategories).length > 0) {
            let html = '';
            for (const [category, anims] of Object.entries(unmappedCategories)) {
                const meta = CATEGORY_META[category] || { ...DEFAULT_CATEGORY_META, label: category };
                html += `
                    <h4 style="margin: 12px 0 5px; font-size: 0.85rem; color: #ff6b81; border-bottom: 1px solid #ff6b8133; padding-bottom: 4px; display: flex; align-items: center; gap: 5px;">
                        ${meta.icon}<span>${category}</span>
                    </h4>
                    <div class="bone-grid" style="grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                        ${anims.map(anim => `
                            <button class="anim-btn bone-btn community-anim-btn"
                                data-anim="${anim.file_url}"
                                data-anim-id="${anim.id}"
                                style="font-size: 0.82rem; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                ${DISCOVER_ICON}
                                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${anim.name}</span>
                            </button>
                        `).join('')}
                    </div>
                `;
            }
            container.innerHTML = html;
        }

        // Attach listeners: click = play, long-press = unsave
        document.querySelectorAll<HTMLButtonElement>('.community-anim-btn').forEach(btn => {
            if (btn.dataset.communityBound) return;
            btn.dataset.communityBound = '1';

            // Play on click
            btn.addEventListener('click', () => {
                const url = btn.getAttribute('data-anim') || '';
                if (url) {
                    loadFBXAnimation(url, false);
                }
            });

            // Unsave on right-click (contextmenu)
            btn.addEventListener('contextmenu', async (e) => {
                e.preventDefault();
                const animId = btn.getAttribute('data-anim-id') || '';
                if (!animId) return;

                const name = btn.querySelector('span')?.textContent?.trim() || 'hành động này';
                if (!confirm(`Bỏ lưu "${name}" khỏi danh sách?`)) return;

                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch(`http://localhost:3000/api/animations/save/${animId}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ creator_id: session?.user?.id || '' })
                    });
                    if (res.ok) {
                        btn.remove();
                        showToast(`✕ Đã bỏ lưu "${name}"`, '#e94560');
                    } else {
                        showToast('Bỏ lưu thất bại!', '#e94560');
                    }
                } catch (_) {
                    showToast('Lỗi kết nối!', '#e94560');
                }
            });
        });

    } catch (err) {
        console.error('Error loading community animations to panel:', err);
    }
}

export async function loadAnimations() {
    try {
        const response = await fetch('http://localhost:3000/api/animations');
        const animations = await response.json();
        
        const grid = document.getElementById('animation-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (animations.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #666; padding: 40px;">Chưa có hành động nào. Hãy là người đầu tiên đóng góp!</div>';
            return;
        }

        animations.forEach((anim: any) => {
            const cardHTML = `
                <div class="anim-card" data-url="${anim.file_url}" data-category="${anim.category || 'Idle'}" style="background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); cursor: pointer; transition: 0.3s;">
                    <div style="position: relative; width: 100%; height: 200px; background: #e0e6ed;">
                        <canvas class="anim-2d-canvas" width="200" height="200" style="width: 100%; height: 100%; object-fit: cover;"></canvas>
                        <div class="anim-loading" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #666; font-size: 0.9rem;">
                            Đang tải...
                        </div>
                        <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">
                            ${anim.category || 'Idle'}
                        </div>
                    </div>
                    <div style="padding: 16px;">
                        <h4 style="margin: 0 0 8px; font-size: 1.1rem; color: #333;">${anim.name}</h4>
                        <div style="font-size: 0.85rem; color: #666; display: flex; justify-content: space-between;">
                            <span>Cộng đồng</span>
                            <button class="btn-use-anim" data-url="${anim.file_url}" style="background: #3f51b5; color: white; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-weight: 600;">Sử dụng</button>
                        </div>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', cardHTML);
        });

        // Setup Use Animation buttons
        document.querySelectorAll('.btn-use-anim').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = (e.currentTarget as HTMLElement).getAttribute('data-url');
                if (url) {
                    loadFBXAnimation(url, false);
                    showToast('Đã áp dụng hành động!', '#4caf50');
                    
                    // Close the discover modal and go back to main screen
                    const characterModal = document.getElementById('character-modal');
                    if (characterModal) {
                        characterModal.style.opacity = '0';
                        const content = characterModal.querySelector('.character-modal-content') as HTMLElement;
                        if (content) content.style.transform = 'scale(0.9)';
                        setTimeout(() => {
                            characterModal.style.display = 'none';
                        }, 300);
                    }
                }
            });
        });

        // Setup filter logic
        setupAnimationFilters();
        
        // Start the render loop for cards
        startAnimationCardsPreview();

    } catch(err) {
        console.error("Error loading animations", err);
    }
}

function setupAnimationFilters() {
    const searchInput = document.getElementById('search-animation') as HTMLInputElement;
    const filterSelect = document.getElementById('filter-animation-select') as HTMLSelectElement;
    const cards = document.querySelectorAll('.anim-card') as NodeListOf<HTMLElement>;

    function applyFilters() {
        const term = searchInput?.value.toLowerCase() || '';
        const currentFilter = filterSelect?.value || 'all';

        cards.forEach(card => {
            const name = card.querySelector('h4')?.textContent?.toLowerCase() || '';
            const category = card.getAttribute('data-category') || '';
            const matchSearch = name.includes(term);
            const matchCategory = currentFilter === 'all' || category === currentFilter;
            
            if (matchSearch && matchCategory) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (filterSelect) filterSelect.addEventListener('change', applyFilters);
}

function startAnimationCardsPreview() {
    const cards = document.querySelectorAll('.anim-card') as NodeListOf<HTMLElement>;
    if (cards.length === 0) return;

    // Create offscreen WebGL context
    const width = 200;
    const height = 200;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap pixel ratio for performance
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30.0, width / height, 0.1, 20.0);
    camera.position.set(0.0, 1.2, 4.0); // look at full body
    
    const light = new THREE.DirectionalLight(0xffffff, Math.PI);
    light.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    let sharedVrm: VRM | null = null;
    let sharedMixer: THREE.AnimationMixer | null = null;

    // Load user's current model
    let modelUrl = "/Citlali.vrm";
    try {
        const local = localStorage.getItem('app_settings');
        if (local) {
            const parsed = JSON.parse(local);
            if (parsed.model) modelUrl = parsed.model;
        }
    } catch(e) {}

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(modelUrl, (gltf) => {
        sharedVrm = gltf.userData.vrm as VRM;
        scene.add(sharedVrm.scene);
        sharedVrm.scene.position.set(0, 0, 0);
        sharedVrm.scene.rotation.y = 0; // Face camera correctly
        sharedMixer = new THREE.AnimationMixer(sharedVrm.scene);
    });

    const clock = new THREE.Clock();
    
    // State per card
    const cardStates = new Map<HTMLElement, {
        ctx: CanvasRenderingContext2D | null,
        clip: THREE.AnimationClip | null,
        time: number,
        isLoading: boolean,
        isVisible: boolean
    }>();

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const card = entry.target as HTMLElement;
            let state = cardStates.get(card);
            if (!state) {
                const canvas = card.querySelector('.anim-2d-canvas') as HTMLCanvasElement;
                state = {
                    ctx: canvas?.getContext('2d'),
                    clip: null,
                    time: Math.random() * 2, // offset animation start
                    isLoading: false,
                    isVisible: false
                };
                cardStates.set(card, state);
            }
            state.isVisible = entry.isIntersecting;
            
            // Load clip if visible and not loaded
            if (state.isVisible && !state.clip && !state.isLoading && sharedVrm) {
                state.isLoading = true;
                const url = card.getAttribute('data-url');
                if (url) {
                    loadMixamoAnimation(url, sharedVrm).then(clip => {
                        if (state) {
                            state.clip = clip;
                            state.isLoading = false;
                            const loadingEl = card.querySelector('.anim-loading') as HTMLElement;
                            if (loadingEl) loadingEl.style.display = 'none';
                        }
                    }).catch(() => {
                        if (state) state.isLoading = false;
                    });
                }
            }
        });
    }, { rootMargin: '100px' }); // load slightly before scroll

    cards.forEach(card => observer.observe(card));

    function renderLoop() {
        requestAnimationFrame(renderLoop);
        const delta = clock.getDelta();
        
        if (!sharedVrm || !sharedMixer) return;

        let renderedCount = 0;
        cardStates.forEach((state, card) => {
            // Only render up to 8 visible cards per frame to maintain 60fps
            if (state.isVisible && state.clip && state.ctx && renderedCount < 8) {
                sharedMixer!.stopAllAction();
                const action = sharedMixer!.clipAction(state.clip);
                action.play();
                
                state.time += delta;
                sharedMixer!.setTime(state.time);
                sharedVrm!.update(0);
                
                renderer.render(scene, camera);
                state.ctx.clearRect(0, 0, width, height);
                state.ctx.drawImage(renderer.domElement, 0, 0, width, height);
                
                renderedCount++;
            }
            // If it becomes visible later and hasn't loaded (because VRM wasn't ready)
            if (state.isVisible && !state.clip && !state.isLoading) {
                 state.isLoading = true;
                 const url = card.getAttribute('data-url');
                 if (url) {
                     loadMixamoAnimation(url, sharedVrm).then(clip => {
                         state.clip = clip;
                         state.isLoading = false;
                         const loadingEl = card.querySelector('.anim-loading') as HTMLElement;
                         if (loadingEl) loadingEl.style.display = 'none';
                     });
                 }
            }
        });
    }
    
    renderLoop();
}

export async function loadSavedCharactersToModal() {
    try {
        // Get current user session to pass creator_id
        let userId = '';
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) userId = session.user.id;
        } catch (e) {}

        if (!userId) {
            // Not logged in - no saved characters to load
            return;
        }

        const response = await fetch(`${API_BASE}/my-saved?creator_id=${userId}`);
        const savedCharacters = await response.json();
        
        // Remove existing custom saved characters first
        document.querySelectorAll('.model-card.custom-saved').forEach(el => el.remove());
        
        const characterGrid = document.querySelector('#character-modal .character-modal-content > div:nth-child(2)');
        if (!characterGrid) return;

        savedCharacters.forEach((char: any) => {
            // Parse trait to extract only personality (e.g. "Vui vẻ" from "[Nữ - Tuổi teen] Vui vẻ\n...")
            const traitRaw: string = char.trait || '';
            const firstLine = traitRaw.split('\n')[0] || '';
            const bracketMatch = firstLine.match(/^\[.*?\]\s*(.*)/);
            const personality = bracketMatch ? bracketMatch[1].trim() : firstLine.trim();
            const displayTrait = personality || 'Custom';

            const cardHTML = `
                <div class="model-card custom-saved" data-model="${char.vrm_url}" data-voice="${char.voice_model_id}" data-trait="${encodeURIComponent(traitRaw)}" style="background: #fff; border: 2px solid #9e9e9e; border-radius: 16px; padding: 18px 12px; text-align: center; cursor: pointer; transition: all 0.25s ease; position: relative; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
                    <div style="width: 76px; height: 76px; border-radius: 50%; background: #f5f5f5; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; border: 2px solid #ccc; box-shadow: 0 4px 10px rgba(0,0,0,0.1); overflow: hidden;">
                        <img src="${char.icon_url}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/favicon.png'" />
                    </div>
                    <h4 style="margin: 0 0 6px; color: #333; font-size: 1.1rem; font-weight: 700;">${char.name}</h4>
                    <span style="font-size: 0.82rem; color: #555; background: rgba(0,0,0,0.05); padding: 3px 10px; border-radius: 12px; font-weight: 600;">${displayTrait}</span>
                    <div class="model-check-icon" style="display: none; position: absolute; top: 12px; right: 12px; background: #9e9e9e; color: white; width: 26px; height: 26px; border-radius: 50%; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: bold;">✓</div>
                </div>
            `;
            characterGrid.insertAdjacentHTML('beforeend', cardHTML);
        });

        // Re-attach click listeners to ALL cards
        attachModelCardListeners();
        updateActiveModelCardUI(normalizeModelUrl(currentModelUrl || MODEL_CITLALI));
    } catch (err) {
        console.error('Error loading saved characters:', err);
    }
}

function attachModelCardListeners() {
    const characterModal = document.getElementById('character-modal');
    const modelCards = document.querySelectorAll('.model-card');
    
    const closeModal = () => {
        if (!characterModal) return;
        characterModal.style.opacity = '0';
        const content = characterModal.querySelector('.character-modal-content') as HTMLElement;
        if (content) content.style.transform = 'scale(0.9)';
        setTimeout(() => {
          characterModal.style.display = 'none';
        }, 300);
    };

    modelCards.forEach((card) => {
        // Remove old listeners to avoid duplicates
        const newCard = card.cloneNode(true);
        card.parentNode?.replaceChild(newCard, card);
        
        newCard.addEventListener('click', async () => {
          const selectedModelUrl = normalizeModelUrl((newCard as HTMLElement).getAttribute('data-model') || MODEL_CITLALI);
          if (selectedModelUrl === currentModelUrl) {
            closeModal();
            return;
          }
    
          const isXianyunTarget = isXianyunModel(selectedModelUrl);
          const isLaumaTarget = isLaumaModel(selectedModelUrl);
          const isNahidaTarget = isNahidaModel(selectedModelUrl);
          const isYaeMikoTarget = isYaeMikoModel(selectedModelUrl);

          let customModelMeta: any = null;
          if (!isXianyunTarget && !isLaumaTarget && !isNahidaTarget && !isYaeMikoTarget) {
            let traitVal = (newCard as HTMLElement).getAttribute('data-trait') || '';
            if (traitVal) traitVal = decodeURIComponent(traitVal);
            if (!traitVal) traitVal = (newCard as HTMLElement).querySelector('span')?.textContent || '';

            let savedTheme = 'citlali';
            try {
              const currentSettings = JSON.parse(localStorage.getItem('app_settings') || '{}');
              if (currentSettings.theme_mapping && currentSettings.theme_mapping[selectedModelUrl]) {
                  savedTheme = currentSettings.theme_mapping[selectedModelUrl];
              }
            } catch(e) {}

            customModelMeta = {
                url: selectedModelUrl,
                name: (newCard as HTMLElement).querySelector('h4')?.textContent || 'Custom Character',
                icon_url: (newCard as HTMLElement).querySelector('img')?.src || '',
                trait: traitVal,
                voice_model_id: (newCard as HTMLElement).getAttribute('data-voice') || '',
                theme: savedTheme
            };
          }
    
          // 1. LƯU VÀO LOCALSTORAGE TRƯỚC!
          try {
            const currentSettings = JSON.parse(localStorage.getItem('app_settings') || '{}');
            currentSettings.model = selectedModelUrl;
            currentSettings.customModelMeta = customModelMeta;
            localStorage.setItem('app_settings', JSON.stringify(currentSettings));
          } catch (e) {}
    
          if (currentUser && supabase) {
            try {
              const { data } = await supabase
                .from('user_profiles')
                .select('settings')
                .eq('id', currentUser.id)
                .single();
    
              const updatedSettings = { ...(data?.settings || {}), model: selectedModelUrl, customModelMeta: customModelMeta };
              await supabase
                .from('user_profiles')
                .update({ settings: updatedSettings })
                .eq('id', currentUser.id);
            } catch (e) {
              console.error("Lỗi khi lưu model vào Supabase:", e);
            }
          }

          // 2. CẬP NHẬT GIAO DIỆN SAU KHI ĐÃ LƯU
          updateActiveModelCardUI(selectedModelUrl);
          const toastColor = isXianyunTarget ? "#00838f" : (isLaumaTarget ? "#2e7d32" : (isNahidaTarget ? "#558b2f" : (isYaeMikoTarget ? "#e94560" : "#3f51b5")));
          showToast(t("toast.switching_model"), toastColor);
    
          switchVRMModel(selectedModelUrl, false, () => {
            showToast(t("toast.switched_model"), toastColor);
          });
    
          closeModal();
        });
    });
}
