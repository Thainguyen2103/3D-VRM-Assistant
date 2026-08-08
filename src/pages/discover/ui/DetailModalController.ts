// @ts-nocheck
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, VRM } from '@pixiv/three-vrm';
import { supabase } from '../../../core/auth';
import { ListRenderingController } from './ListRenderingController';
import { TabSwitcherController } from './TabSwitcherController';
import { UploadController } from './UploadController';
import { t } from '../../../core/i18n';


declare var CustomDialog: any;

const API_BASE = 'http://localhost:3000/api/characters';

export class DetailModalController {
    static getI18nKey(val: string): string {
        const map: any = {
            'Tuổi teen': 'discover.upload.opt.type.teen',
            'Nhỏ nhắn': 'discover.upload.opt.type.loli',
            'Trưởng thành': 'discover.upload.opt.type.adult',
            'Mập mạp': 'discover.upload.opt.type.chubby',
            'Cơ bắp': 'discover.upload.opt.type.muscle',
            'Quái vật': 'discover.upload.opt.type.monster',
            'Động vật': 'discover.upload.opt.type.animal',
            'Robot / Mecha': 'discover.upload.opt.type.robot',
            
            'Vui vẻ': 'discover.upload.opt.trait.happy',
            'Tsundere': 'discover.upload.opt.trait.tsundere',
            'Dịu dàng': 'discover.upload.opt.trait.gentle',
            'Lạnh lùng': 'discover.upload.opt.trait.cold',
            'Kuudere': 'discover.upload.opt.trait.kuudere',
            'Yandere': 'discover.upload.opt.trait.yandere',
            'Năng động': 'discover.upload.opt.trait.energetic',
            'Lười biếng': 'discover.upload.opt.trait.lazy',
            
            'Nam': 'discover.upload.opt.gender.male',
            'Nữ': 'discover.upload.opt.gender.female',
            'Khác': 'discover.upload.opt.gender.other',

            'Giao tiếp & Tương tác': 'discover.upload.opt.anim.cat.interact',
            'Biểu cảm & Cảm xúc': 'discover.upload.opt.anim.cat.emotion',
            'Cơ bản & Di chuyển': 'discover.upload.opt.anim.cat.basic',
            'Vũ đạo & Nghệ thuật': 'discover.upload.opt.anim.cat.dance',
            'Hành động & Chiến đấu': 'discover.upload.opt.anim.cat.action'
        };
        return map[val] || '';
    }

    static updateFieldWithI18n(el: HTMLElement, val: string) {
        if (!el) return;
        const key = this.getI18nKey(val);
        if (key) {
            el.setAttribute('data-i18n', key);
            try {
                const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                if (settings.language) {
                    import('../../../core/i18n').then(({ t }) => {
                        el.innerHTML = t(key);
                    });
                } else el.textContent = val;
            } catch(e) { el.textContent = val; }
        } else {
            el.removeAttribute('data-i18n');
            el.textContent = val;
        }
    }


    static async loadDetailAnimationPreview(fbxUrl: string) {
        const animDetailViewer = (window as any).animDetailViewer;
        if (!animDetailViewer) return;
        if (!animDetailViewer.isInitialized) animDetailViewer.init();
        await animDetailViewer.playAnimationFbx(fbxUrl);
    }


    static applyBlink(vrm: VRM, clock: THREE.Clock) {
        if (!vrm.expressionManager) return;
        const time = clock.elapsedTime;
        const blinkFreq = 3.0; // blink every 3 seconds on average
        const blinkDuration = 0.15;
        const t = time % blinkFreq;
        
        let blinkValue = 0.0;
        if (t < blinkDuration) {
            // simple triangle wave
            blinkValue = t < (blinkDuration/2) ? (t / (blinkDuration/2)) : (1.0 - (t - blinkDuration/2)/(blinkDuration/2));
        }
        
        vrm.expressionManager.setValue('blink', blinkValue);
    }

    static init(animViewer: any, vrmViewer: any = null, animDetailViewer: any = null) {
  (window as any).animViewer = animViewer;
  (window as any).animDetailViewer = animDetailViewer;
  (window as any).vrmViewer = vrmViewer;
  
  // Attach card click listeners
  const listContainer = document.getElementById('discover-list-container');
  if (listContainer) listContainer.addEventListener('click', (e) => handleCardClick(e, false));
  const myUploadsContainerEl = document.getElementById('my-uploads-list-container');
  if (myUploadsContainerEl) myUploadsContainerEl.addEventListener('click', (e) => handleCardClick(e, true));

  const animGridEl = document.getElementById('animation-grid');
  if (animGridEl) animGridEl.addEventListener('click', (e) => handleAnimCardClick(e, false));
  const myUploadsAnimGridEl = document.getElementById('my-uploads-anim-list-container');
  if (myUploadsAnimGridEl) myUploadsAnimGridEl.addEventListener('click', (e) => handleAnimCardClick(e, true));

    // --- Character Detail Modal & Secondary 3D Scene ---
    const detailModal = document.getElementById('character-detail-modal');
    const btnCloseDetail = document.getElementById('btn-close-detail');
    const detailCanvas = document.getElementById('detail-vrm-canvas') as HTMLCanvasElement;
    const detailPlaceholder = document.getElementById('detail-preview-placeholder');
    const detailCharName = document.getElementById('detail-char-name');
    const detailCharTrait = document.getElementById('detail-char-trait');
    const detailCharIcon = document.getElementById('detail-char-icon') as HTMLImageElement;
    const btnDetailPreviewVoice = document.getElementById('btn-detail-preview-voice') as HTMLButtonElement;
    const btnDetailSave = document.getElementById('btn-detail-save') as HTMLButtonElement;

    let detailRenderer: THREE.WebGLRenderer | null = null;
    let detailScene: THREE.Scene | null = null;
    let detailCamera: THREE.PerspectiveCamera | null = null;
    let detailControls: OrbitControls | null = null;
    let detailVrm: VRM | null = null;
    let detailAnimationId = 0;
    let detailClock = new THREE.Clock();
    let currentVoiceModelId = '';

    function initDetailScene() {
        if (detailRenderer) return;
        detailRenderer = new THREE.WebGLRenderer({ canvas: detailCanvas, alpha: true, antialias: true });
        detailRenderer.setSize(detailCanvas.clientWidth, detailCanvas.clientHeight, false);
        // Giới hạn pixel ratio để tránh bị lag trên màn hình độ phân giải cao
        detailRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        detailRenderer.outputColorSpace = THREE.SRGBColorSpace;

        detailScene = new THREE.Scene();
        const aspect = detailCanvas.clientWidth / detailCanvas.clientHeight;
        detailCamera = new THREE.PerspectiveCamera(30.0, aspect, 0.1, 20.0);
        detailCamera.position.set(0.0, 1.0, 6.0);

        detailControls = new OrbitControls(detailCamera, detailRenderer.domElement);
        detailControls.screenSpacePanning = true;
        detailControls.target.set(0.0, 1.0, 0.0);
        detailControls.update();

        const light = new THREE.DirectionalLight(0xffffff, Math.PI);
        light.position.set(1.0, 1.0, 1.0).normalize();
        detailScene.add(light);
        detailScene.add(new THREE.AmbientLight(0xffffff, 0.5));

        // Lưới to hơn (30) và dày đặc hơn (60 ô). Trục trung tâm đậm (0x444444), lưới nhạt (0xe0e0e0)
        const gridHelper = new THREE.GridHelper(30, 60, 0x444444, 0xe0e0e0);
        detailScene.add(gridHelper);

        let isAutoRotate = false;
        const toggleRotation = document.getElementById('detail-toggle-rotation') as HTMLInputElement;
        if (toggleRotation) {
            toggleRotation.checked = false; // ensure checkbox state matches
            toggleRotation.addEventListener('change', (e) => {
                isAutoRotate = (e.target as HTMLInputElement).checked;
            });
        }

        const camBtns = document.querySelectorAll('.detail-cam-btn');
        camBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const pos = target.dataset.pos;
                
                // Active style
                camBtns.forEach(b => {
                    (b as HTMLElement).style.background = '#008B8B';
                    (b as HTMLElement).style.boxShadow = 'none';
                });
                target.style.background = '#006666';
                target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';

                if (pos === 'full') {
                    detailCamera!.position.set(0.0, 0.9, 4.0);
                    detailControls!.target.set(0.0, 0.9, 0.0);
                } else if (pos === 'hip') {
                    detailCamera!.position.set(0.0, 1.4, 1.9);
                    detailControls!.target.set(0.0, 1.4, 0.0);
                } else if (pos === 'chest') {
                    detailCamera!.position.set(0.0, 1.5, 1.3);
                    detailControls!.target.set(0.0, 1.5, 0.0);
                } else if (pos === 'face') {
                    detailCamera!.position.set(0.0, 1.55, 0.7);
                    detailControls!.target.set(0.0, 1.55, 0.0);
                }
                detailControls!.update();
            });
        });

        function animateDetail() {
            detailAnimationId = requestAnimationFrame(animateDetail);
            let delta = detailClock.getDelta();
            if (delta > 0.1) delta = 0.1; // Cap delta to prevent VRM physics lag on tab switch
            if (detailVrm) {
                DetailModalController.applyBlink(detailVrm, detailClock);
                detailVrm.update(delta);
                if (isAutoRotate) {
                    detailVrm.scene.rotation.y += delta * 0.5; // Slowly auto-rotate
                } else {
                    // Xoay mượt mà về lại góc chính diện gần nhất (góc 0, 2PI, 4PI...)
                    const targetRotation = Math.round(detailVrm.scene.rotation.y / (Math.PI * 2)) * (Math.PI * 2);
                    detailVrm.scene.rotation.y = THREE.MathUtils.lerp(detailVrm.scene.rotation.y, targetRotation, delta * 8.0);
                }
            }
            if (detailRenderer && detailScene && detailCamera) {
                detailRenderer.render(detailScene, detailCamera);
            }
        }
        animateDetail();

        window.addEventListener('resize', () => {
            if (detailModal && detailModal!.style.display !== 'none' && detailRenderer && detailCamera) {
                const width = detailCanvas.clientWidth;
                const height = detailCanvas.clientHeight;
                if (width > 0 && height > 0) {
                    detailCamera.aspect = width / height;
                    detailCamera.updateProjectionMatrix();
                    detailRenderer.setSize(width, height, false);
                }
            }
        });
    }

    if (btnCloseDetail && detailModal) {
        btnCloseDetail.addEventListener('click', () => {
            detailModal!.style.display = 'none';
            if (detailVrm && detailScene) {
                detailScene.remove(detailVrm.scene);
                VRMUtils.deepDispose(detailVrm.scene);
                detailVrm = null;
            }
            if (detailPlaceholder) detailPlaceholder.style.display = 'block';
            
            // Stop and reset any playing audio
            if (currentPlayingAudio) {
                currentPlayingAudio.pause();
                currentPlayingAudio = null;
            }
            const audioEl = document.getElementById('temp-audio-preview') as HTMLAudioElement;
            if (audioEl) {
                audioEl.pause();
                audioEl.remove();
            }

            // Reset voice button to initial state
            const PLAY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>';
            btnDetailPreviewVoice.innerHTML = PLAY_ICON;
            btnDetailPreviewVoice.disabled = false;
            btnDetailPreviewVoice.style.opacity = '1';

            // Reset voice UI elements
            const statusTextEl = document.getElementById('detail-voice-status-text');
            const voiceBarsEl = document.getElementById('detail-voice-bars');
            const sampleContainer = document.getElementById('detail-voice-sample-container');
            if (statusTextEl) {
                statusTextEl.textContent = t('discover.detail.voice_status_play') || 'Chọn ngôn ngữ & Play';
                statusTextEl.style.display = 'block';
            }
            if (voiceBarsEl) voiceBarsEl.style.display = 'none';
            if (sampleContainer) sampleContainer.style.display = 'none';
        });
    }





            
    let currentPlayingAudio: HTMLAudioElement | null = null;
    if (btnDetailPreviewVoice) {
        btnDetailPreviewVoice.addEventListener('click', async () => {
            if (!currentVoiceModelId) return;

            const PLAY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play-icon lucide-play"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>';
            const PAUSE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause-icon lucide-pause"><rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/></svg>';

            const statusTextEl = document.getElementById('detail-voice-status-text');
            const voiceBarsEl = document.getElementById('detail-voice-bars');

            if (currentPlayingAudio) {
                // If it's playing, stop it
                currentPlayingAudio.pause();
                currentPlayingAudio = null;
                btnDetailPreviewVoice.innerHTML = PLAY_ICON;
                if (statusTextEl) {
                    statusTextEl.textContent = t('discover.detail.voice_status_play') || 'Chọn ngôn ngữ & Play';
                    statusTextEl.style.display = 'block';
                }
                if (voiceBarsEl) voiceBarsEl.style.display = 'none';
                return;
            }

            btnDetailPreviewVoice.disabled = true;
            btnDetailPreviewVoice.style.opacity = '0.5';
            
            const langSelect = document.getElementById('detail-voice-lang') as HTMLSelectElement;
            const sampleContainer = document.getElementById('detail-voice-sample-container');
            const sampleTextEl = document.getElementById('detail-voice-sample-text');
            const selectedLang = langSelect ? langSelect.value : 'vi';

            if (statusTextEl) statusTextEl.textContent = t('discover.detail.generating_voice') || 'Đang tạo Voice...';
            if (voiceBarsEl) voiceBarsEl.style.display = 'none';

            const SAMPLE_TEXTS: Record<string, string[]> = {
                vi: [
                    "Xin chào, tôi là trợ lý ảo 3D của bạn. Rất vui được gặp bạn ngày hôm nay! Tôi ở đây để lắng nghe, trò chuyện và giúp đỡ bạn giải đáp mọi thắc mắc. Đừng ngại chia sẻ những câu chuyện thú vị hoặc yêu cầu tôi hát một bài nhé, chúng ta chắc chắn sẽ có những khoảnh khắc thật tuyệt vời bên nhau!",
                    "Chào bạn! Bạn đang cảm thấy thế nào trong ngày hôm nay? Dù thời tiết bên ngoài có ra sao, tôi hy vọng bạn vẫn luôn mang một nụ cười rạng rỡ. Nếu bạn cần người trò chuyện để xua tan đi sự mệt mỏi, hãy cứ gọi tôi nhé, tôi luôn ở đây sẵn sàng lắng nghe mọi điều bạn nói.",
                    "Chào mừng bạn đến với thế giới ảo đầy màu sắc của chúng ta! Tại đây, không có giới hạn nào cho trí tưởng tượng cả. Tôi có thể hóa thân thành một người bạn đồng hành, một chuyên gia cung cấp kiến thức, hoặc đơn giản là một người kể những mẩu chuyện vui nhộn để bạn có những giây phút thư giãn tuyệt đối."
                ],
                en: [
                    "Hello there, I am your personal 3D virtual assistant. I am absolutely thrilled to meet you today! I am here to listen, chat, and help you out with whatever you might need. Don't hesitate to share your interesting stories with me, because I am sure we will have a wonderful time together!",
                    "Greetings! How are you feeling today? No matter what is going on in the world outside, I truly hope you are having a fantastic day. If you ever feel tired or just want someone to talk to, remember that I am always here for you, ready to listen and chat about anything on your mind.",
                    "Welcome to our vibrant virtual universe! In this space, there are no limits to what we can explore and imagine together. I can be your helpful guide, a knowledgeable expert, or simply a fun companion who loves to share amusing stories and ensure you have a relaxing and joyful experience."
                ],
                ja: [
                    "こんにちは、私はあなたの3Dバーチャルアシスタントです。今日あなたにお会いできて、本当に嬉しいです！私はあなたのお話を聞いたり、質問に答えたりするためにここにいます。面白い話があれば、ぜひシェアしてくださいね。きっと一緒に素晴らしい時間を過ごせるはずです！",
                    "やあ！今日の気分はいかがですか？外の天気がどうであれ、あなたが素晴らしい一日を過ごせることを心から願っています。もし疲れたり、誰かと話したくなったりしたら、いつでも私に声をかけてください。私はいつもここで、あなたのお話を聞く準備ができていますよ。",
                    "私たちのカラフルなバーチャルワールドへようこそ！ここには想像力の限界なんてありません。私はあなたの頼れるパートナーになったり、色々な知識を共有する専門家になったり、あるいはただ楽しい話をしてあなたを笑顔にするお友達になることもできますよ。"
                ],
                zh: [
                    "你好，我是你的专属3D虚拟助手。今天能见到你，我感到非常激动！我在这里倾听你的心声，与你聊天，并尽我所能为你提供帮助。不要犹豫，随时和我分享你身边的趣事吧，我相信我们一定会度过一段非常美好的时光！",
                    "你好啊！你今天感觉怎么样？无论外面的世界发生什么，我都真心希望你能拥有灿烂的笑容和美好的一天。如果你感到疲倦，或者只是想找个人说说话，请记住我一直都在这里，随时准备好倾听你的每一个想法。",
                    "欢迎来到我们丰富多彩的虚拟世界！在这个奇妙的空间里，想象力是没有边界的。我可以成为你忠实的冒险伙伴，也可以为你解答各种难题，或者只是做个开心果，给你讲些有趣的笑话，让你彻底放松下来。"
                ]
            };

            const texts = SAMPLE_TEXTS[selectedLang] || SAMPLE_TEXTS['vi'];
            const sampleText = texts[Math.floor(Math.random() * texts.length)];

            if (sampleContainer && sampleTextEl) {
                sampleTextEl.textContent = `"${sampleText}"`;
                sampleContainer.style.display = 'block';
            }

            try {
                const res = await fetch(`${API_BASE}/preview-voice`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ voice_model_id: currentVoiceModelId, text: sampleText })
                });

                if (!res.ok) throw new Error('Failed to fetch voice');
                const data = await res.json();
                
                if (data.audioBase64) {
                    const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
                    currentPlayingAudio = audio;
                    audio.onended = () => {
                        currentPlayingAudio = null;
                        if (statusTextEl) {
                            statusTextEl.textContent = t('discover.detail.voice_status_play') || 'Chọn ngôn ngữ & Play';
                            statusTextEl.style.display = 'block';
                        }
                        if (voiceBarsEl) voiceBarsEl.style.display = 'none';
                        btnDetailPreviewVoice.innerHTML = PLAY_ICON;
                    };
                    
                    audio.play();
                    btnDetailPreviewVoice.innerHTML = PAUSE_ICON;
                    btnDetailPreviewVoice.disabled = false;
                    btnDetailPreviewVoice.style.opacity = '1';
                    if (statusTextEl) statusTextEl.style.display = 'none';
                    if (voiceBarsEl) voiceBarsEl.style.display = 'flex';
                }
            } catch (err) {
                console.error(err);
                if (statusTextEl) {
                    statusTextEl.textContent = t('discover.detail.voice_status_err') || 'Lỗi! Vui lòng thử lại.';
                    statusTextEl.style.display = 'block';
                }
                if (voiceBarsEl) voiceBarsEl.style.display = 'none';
                setTimeout(() => {
                    if (statusTextEl) statusTextEl.textContent = t('discover.detail.voice_status_play') || 'Chọn ngôn ngữ & Play';
                    btnDetailPreviewVoice.disabled = false;
                    btnDetailPreviewVoice.style.opacity = '1';
                }, 2000);
            }
        });
    }

    if (btnDetailSave) {
        btnDetailSave.addEventListener('click', async () => {
            const charId = btnDetailSave.dataset.id;
            if (!charId) return;
            
            btnDetailSave.disabled = true;
            btnDetailSave.setAttribute('data-i18n', 'discover.list.btn_saving'); import('../../../core/i18n').then(({ t }) => { btnDetailSave.innerHTML = t('discover.list.btn_saving'); }); btnDetailSave.textContent = 'Đang lưu...';

            try {
                const { data: { session } } = await supabase.auth.getSession();
                let bodyData = {};
                if (session && session.user) {
                    bodyData = { creator_id: session.user.id };
                }

                const res = await fetch(`${API_BASE}/save/${charId}`, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyData)
                });
                if (res.ok) {
                    btnDetailSave.setAttribute('data-i18n', 'discover.list.btn_saved'); import('../../../core/i18n').then(({ t }) => { btnDetailSave.innerHTML = t('discover.list.btn_saved'); }); btnDetailSave.textContent = 'Đã lưu ✓';
                    btnDetailSave.style.background = '#81c784';
                    btnDetailSave.style.cursor = 'default';
                } else {
                    const err = await res.json();
                    if (err.error === 'Character already saved') {
                        btnDetailSave.setAttribute('data-i18n', 'discover.list.btn_saved'); import('../../../core/i18n').then(({ t }) => { btnDetailSave.innerHTML = t('discover.list.btn_saved'); }); btnDetailSave.textContent = 'Đã lưu ✓';
                        btnDetailSave.style.background = '#81c784';
                        btnDetailSave.style.cursor = 'default';
                    } else {
                        btnDetailSave.setAttribute('data-i18n', 'discover.list.btn_error'); import('../../../core/i18n').then(({ t }) => { btnDetailSave.innerHTML = t('discover.list.btn_error'); }); btnDetailSave.textContent = 'Lỗi!';
                        btnDetailSave.style.background = '#e53935';
                        btnDetailSave.disabled = false;
                    }
                }
            } catch (e) {
                btnDetailSave.setAttribute('data-i18n', 'discover.list.btn_conn_error'); import('../../../core/i18n').then(({ t }) => { btnDetailSave.innerHTML = t('discover.list.btn_conn_error'); }); btnDetailSave.textContent = 'Lỗi kết nối!';
                btnDetailSave.style.background = '#e53935';
                btnDetailSave.disabled = false;
            }
        });
    }

    const btnDetailUpdate = document.getElementById('btn-detail-update');
    if (btnDetailUpdate) {
        btnDetailUpdate.addEventListener('click', () => {
            const charId = btnDetailUpdate.dataset.id;
            if (!charId) return;

            // Close modal
            detailModal!.style.display = 'none';
            if (detailAnimationId) cancelAnimationFrame(detailAnimationId);

            // Populate form
            const name = btnDetailUpdate.dataset.name || '';
            const traitStr = btnDetailUpdate.dataset.trait || '';
            const voice = btnDetailUpdate.dataset.voice || '';

            (document.getElementById('upload-name') as HTMLInputElement).value = name;
            
            // Extract trait and desc for simplicity
            const parts = traitStr.split('\n\n');
            if (parts.length > 1) {
                (document.getElementById('upload-desc') as HTMLTextAreaElement).value = parts.slice(1).join('\n\n');
            } else {
                (document.getElementById('upload-desc') as HTMLTextAreaElement).value = '';
            }
            
            // Wait to properly select voice
            const voiceSelect = document.getElementById('upload-voice') as HTMLInputElement;
            if (voiceSelect) voiceSelect.value = voice;

            // Mark form as edit mode
            document.getElementById('upload-character-form').dataset.editId = charId;
            const submitBtn = document.getElementById('btn-submit-upload');
            if (submitBtn) submitBtn.textContent = 'Cập nhật nhân vật';
            
            const deleteBtn = document.getElementById('btn-delete-upload');
            if (deleteBtn) {
                deleteBtn.style.display = 'block';
                deleteBtn.onclick = async () => {
                    if (!await CustomDialog.confirm(t('discover.upload.confirm_delete') || 'Bạn có chắc chắn muốn xóa không?')) return;
                    deleteBtn.textContent = t('discover.upload.btn_deleting') || 'Đang xóa...';
                    deleteBtn.disabled = true;
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const res = await fetch(`${API_BASE}/${charId}?creator_id=${session?.user?.id}`, { method: 'DELETE' });
                        if (res.ok) {
                            CustomDialog.alert(t('discover.upload.success_delete') || 'Xóa thành công!');
                            // Reset mode
                            document.getElementById('upload-character-form').removeAttribute('data-edit-id');
                            if (submitBtn) submitBtn.textContent = t('discover.upload.btn_submit_char') || 'Tải lên nhân vật';
                            deleteBtn.style.display = 'none';
                            document.getElementById('upload-character-form').reset();
                            (document.getElementById('upload-name') as HTMLInputElement).value = '';
                            (document.getElementById('upload-desc') as HTMLTextAreaElement).value = '';
                            if (voiceSelect) voiceSelect.value = 'default';
                            await ListRenderingController.loadDiscoverList();
                            await ListRenderingController.loadMyUploadsList();
                            await ListRenderingController.loadMyUploadsAnimList();
                            document.querySelector<HTMLElement>('[data-tab="tab-discover"]')?.click();
                        } else {
                            CustomDialog.alert(t('discover.upload.err_delete') || 'Lỗi khi xóa!');
                        }
                    } catch (e) {
                        CustomDialog.alert('Lỗi kết nối!');
                    }
                    deleteBtn.textContent = t('discover.upload.btn_delete_char') || 'Xóa nhân vật';
                    deleteBtn.disabled = false;
                };
            }

            // Switch to upload tab
            const uploadTabBtn = document.querySelector('.tab-btn[data-tab="tab-upload"]') as HTMLElement;
            if (uploadTabBtn) uploadTabBtn.click();
            else {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                const contentToShow = document.getElementById('tab-upload');
                if (contentToShow) contentToShow.classList.add('active');
            }
        });
    }

    // --- Animation Form Logic ---
    const animGenderBtns = document.querySelectorAll('.gender-btn input[name="upload-anim-gender"]');
    animGenderBtns.forEach(radio => {
        const btn = radio.closest('.gender-btn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.gender-btn input[name="upload-anim-gender"]').forEach(r => {
                    const b = r.closest('.gender-btn');
                    if (b) b.classList.remove('active');
                });
                btn.classList.add('active');
            });
        }
    });

    const animPrivacyBtns = document.querySelectorAll('.privacy-btn input[name="upload-anim-privacy"]');
    animPrivacyBtns.forEach(radio => {
        const btn = radio.closest('.privacy-btn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.privacy-btn input[name="upload-anim-privacy"]').forEach(r => {
                    const b = r.closest('.privacy-btn');
                    if (b) b.classList.remove('active');
                });
                btn.classList.add('active');
            });
        }
    });

    const uploadAnimSourceSelect = document.getElementById('upload-anim-source-select') as HTMLSelectElement;
    const uploadAnimSourceCustomContainer = document.getElementById('upload-anim-source-custom-container');
    const uploadAnimSourceCustom = document.getElementById('upload-anim-source-custom') as HTMLInputElement;
    const btnCancelAnimSourceCustom = document.getElementById('btn-cancel-anim-source-custom');

    setTimeout(() => {
        if (uploadAnimSourceSelect) UploadController.setupCustomSelect('upload-anim-source-select');
    }, 150);

    if (uploadAnimSourceSelect && uploadAnimSourceCustomContainer && uploadAnimSourceCustom && btnCancelAnimSourceCustom) {
        uploadAnimSourceSelect.addEventListener('change', () => {
            if (uploadAnimSourceSelect.value === 'Khác') {
                uploadAnimSourceSelect.style.display = 'none';
                uploadAnimSourceCustomContainer.style.display = 'block';
                uploadAnimSourceCustom.focus();
            }
        });
        btnCancelAnimSourceCustom.addEventListener('click', () => {
            uploadAnimSourceCustom.value = '';
            uploadAnimSourceCustomContainer.style.display = 'none';
            uploadAnimSourceSelect.selectedIndex = 0;
            const wrapper = uploadAnimSourceSelect.nextElementSibling as HTMLElement;
            if (wrapper && wrapper.classList.contains('custom-select-wrapper')) {
                wrapper.style.display = 'block';
                UploadController.setupCustomSelect('upload-anim-source-select');
            }
        });
    }

    const camBtnsAnim = document.querySelectorAll('.cam-btn-anim');
    camBtnsAnim.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const pos = target.dataset.pos;
            if (!(window as any).animViewer.isInitialized) return;

            if (pos === 'full') {
                (window as any).animViewer.camera.position.set(0.0, 1.0, 5.0);
                (window as any).animViewer.controls.target.set(0.0, 1.0, 0.0);
            } else if (pos === 'hip') {
                (window as any).animViewer.camera.position.set(0.0, 1.4, 1.9);
                (window as any).animViewer.controls.target.set(0.0, 1.4, 0.0);
            } else if (pos === 'chest') {
                (window as any).animViewer.camera.position.set(0.0, 1.5, 1.3);
                (window as any).animViewer.controls.target.set(0.0, 1.5, 0.0);
            } else if (pos === 'face') {
                (window as any).animViewer.camera.position.set(0.0, 1.55, 0.7);
                (window as any).animViewer.controls.target.set(0.0, 1.55, 0.0);
            }
            (window as any).animViewer.controls.update();
        });
    });

    // --- Lưu / Bỏ lưu Animation toggle ---
    const btnSaveAnim = document.getElementById('btn-save-anim') as HTMLButtonElement;

    function setSaveAnimBtn(saved: boolean) {
        if (!btnSaveAnim) return;
        if (saved) {
            btnSaveAnim.setAttribute('data-i18n', 'discover.list.btn_unsave'); try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ t }) => { btnSaveAnim.innerHTML = t('discover.list.btn_unsave'); }); } else btnSaveAnim.textContent = 'Bỏ lưu'; } catch(e) { btnSaveAnim.textContent = 'Bỏ lưu'; }
            btnSaveAnim.style.background = '#e57373';
            btnSaveAnim.style.color = '#fff';
            btnSaveAnim.style.cursor = 'pointer';
            btnSaveAnim.dataset.saved = 'true';
        } else {
            btnSaveAnim.setAttribute('data-i18n', 'discover.list.btn_save_anim'); import('../../../core/i18n').then(({ t }) => { btnSaveAnim.innerHTML = t('discover.list.btn_save_anim'); }); btnSaveAnim.textContent = 'Lưu Animation';
            btnSaveAnim.style.background = '';
            btnSaveAnim.style.color = '';
            btnSaveAnim.style.cursor = 'pointer';
            btnSaveAnim.dataset.saved = 'false';
        }
        btnSaveAnim.disabled = false;
    }

    if (btnSaveAnim) {
        btnSaveAnim.addEventListener('click', async () => {
            const animId = btnSaveAnim.dataset.id;
            if (!animId) return;

            const isSaved = btnSaveAnim.dataset.saved === 'true';
            btnSaveAnim.disabled = true;
            const loadingKey = isSaved ? 'discover.list.btn_unsaving' : 'discover.list.btn_saving';
            btnSaveAnim.textContent = isSaved ? 'Đang bỏ lưu...' : 'Đang lưu...';
            try {
                const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                if (settings.language) {
                    import('../../../core/i18n').then(({ t }) => { btnSaveAnim.textContent = t(loadingKey); });
                }
            } catch(e) {}

            const saveAnimStatus = document.getElementById('save-anim-status');

            try {
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id || '';

                if (isSaved) {
                    // --- UNSAVE ---
                    const res = await fetch(`http://localhost:3000/api/animations/save/${animId}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ creator_id: userId })
                    });
                    if (res.ok) {
                        setSaveAnimBtn(false);
                        if (saveAnimStatus) {
                            saveAnimStatus.style.display = 'block';
                            saveAnimStatus.style.color = '#e94560';
                            saveAnimStatus.textContent = 'Đã bỏ lưu animation.';
                        }
                    } else {
                        throw new Error('Bỏ lưu thất bại');
                    }
                } else {
                    // --- SAVE ---
                    const res = await fetch(`http://localhost:3000/api/animations/save/${animId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ creator_id: userId })
                    });
                    if (res.ok) {
                        setSaveAnimBtn(true);
                        if (saveAnimStatus) {
                            saveAnimStatus.style.display = 'block';
                            saveAnimStatus.style.color = '#4caf50';
                            saveAnimStatus.textContent = 'Đã lưu animation vào danh sách!';
                        }
                    } else {
                        const err = await res.json();
                        if (err.error === 'Animation already saved') {
                            setSaveAnimBtn(true);
                            if (saveAnimStatus) {
                                saveAnimStatus.style.display = 'block';
                                saveAnimStatus.style.color = '#888';
                                saveAnimStatus.textContent = 'Animation này đã có trong danh sách của bạn.';
                            }
                        } else {
                            throw new Error(err.error || 'Lưu thất bại');
                        }
                    }
                }
            } catch (e: any) {
                btnSaveAnim.textContent = 'Lỗi! Thử lại';
                try {
                    const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                    if (settings.language) {
                        import('../../../core/i18n').then(({ t }) => { btnSaveAnim.textContent = t('discover.list.btn_error'); });
                    }
                } catch(e) {}
                btnSaveAnim.style.background = '#e53935';
                btnSaveAnim.disabled = false;
                const saveAnimStatus = document.getElementById('save-anim-status');
                if (saveAnimStatus) {
                    saveAnimStatus.style.display = 'block';
                    saveAnimStatus.style.color = '#e94560';
                    saveAnimStatus.textContent = `Lỗi: ${e.message}`;
                }
            }
        });
    }

    // Load initial list
    ListRenderingController.loadDiscoverList();

    
        const btnDetailDeleteModal = document.getElementById('btn-detail-delete-modal');
    if (btnDetailDeleteModal) {
        btnDetailDeleteModal.addEventListener('click', async () => {
            const charId = btnDetailDeleteModal.dataset.id;
            if (!charId) return;
            if (!await CustomDialog.confirm(t('discover.upload.confirm_delete') || 'Bạn có chắc chắn muốn xóa nhân vật này không?')) return;
            
            btnDetailDeleteModal.textContent = t('discover.upload.btn_deleting') || 'Đang xóa...';
            ((btnDetailDeleteModal as unknown) as HTMLButtonElement).disabled = true;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch(`${API_BASE}/${charId}?creator_id=${session?.user?.id}`, { method: 'DELETE' });
                if (res.ok) {
                    CustomDialog.alert('Xóa thành công!');
                    detailModal!.style.display = 'none';
                    if (detailAnimationId) cancelAnimationFrame(detailAnimationId);
                    await ListRenderingController.loadDiscoverList();
                    await ListRenderingController.loadMyUploadsList();
                    await ListRenderingController.loadMyUploadsAnimList();
                } else {
                    CustomDialog.alert('Xóa thất bại. Vui lòng thử lại.');
                    btnDetailDeleteModal.innerHTML = originalText;
                    ((btnDetailDeleteModal as unknown) as HTMLButtonElement).disabled = false;
                }
            } catch (e) {
                console.error(e);
                CustomDialog.alert('Có lỗi xảy ra.');
                btnDetailDeleteModal.innerHTML = originalText;
                ((btnDetailDeleteModal as unknown) as HTMLButtonElement).disabled = false;
            }
        });
    }

                
    function handleAnimCardClick(e: Event, isMyUploads = false) {
        const target = (e.target as HTMLElement).closest('.animation-card') as HTMLElement;
        if (!target) return;

        const name = target.dataset.name || '';
        const fbx = target.dataset.fbx || '';
        const gender = target.dataset.gender || '';
        const category = target.dataset.category || '';
        const origin = target.dataset.origin || '';
        const desc = target.dataset.desc || '';
        const cardId = target.dataset.id || '';

        if (isMyUploads) {
            const form = document.getElementById('upload-animation-form') as HTMLFormElement;
            if (form) form.dataset.editId = cardId;
            
            const nameInput = document.getElementById('upload-anim-name') as HTMLInputElement;
            if (nameInput) nameInput.value = name;
            
            document.querySelectorAll('input[name="upload-anim-gender"]').forEach(r => {
                const btn = r.closest('.gender-btn');
                if ((r as HTMLInputElement).value === gender) {
                    (r as HTMLInputElement).checked = true;
                    if (btn) btn.classList.add('active');
                } else {
                    (r as HTMLInputElement).checked = false;
                    if (btn) btn.classList.remove('active');
                }
            });

            const categorySelect = document.getElementById('upload-anim-category') as HTMLSelectElement;
            if (categorySelect) categorySelect.value = category;
            
            const originSelect = document.getElementById('upload-anim-source-select') as HTMLSelectElement;
            if (originSelect) {
                const opt = Array.from(originSelect.options).find(o => (o as HTMLOptionElement).value === origin);
                if (opt) {
                    originSelect.value = origin;
                } else {
                    originSelect.value = 'Khác';
                    const customContainer = document.getElementById('upload-anim-source-custom-container');
                    const customInput = document.getElementById('upload-anim-source-custom') as HTMLInputElement;
                    if (customContainer && customInput) {
                        originSelect.style.display = 'none';
                        customContainer.style.display = 'block';
                        customInput.value = origin;
                    }
                }
            }

            const descInput = document.getElementById('upload-anim-desc') as HTMLTextAreaElement;
            if (descInput) descInput.value = desc;
            
            const animFileInput = document.getElementById('upload-anim-file') as HTMLInputElement;
            if (animFileInput) animFileInput.removeAttribute('required');

            const submitBtn = document.getElementById('btn-upload-anim');
            if (submitBtn) {
                submitBtn.setAttribute('data-i18n', 'discover.upload.anim.btn_update');
                try {
                    const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                    if (settings.language) {
                        import('../../../core/i18n').then(({ t }) => {
                            submitBtn.textContent = t('discover.upload.anim.btn_update');
                        });
                    } else submitBtn.textContent = 'Cập nhật Animation';
                } catch(e) {
                    submitBtn.textContent = 'Cập nhật Animation';
                }
            }

            const deleteBtn = document.getElementById('btn-delete-anim');
            if (deleteBtn) {
                deleteBtn.style.display = 'block';
                deleteBtn.onclick = async () => {
                    if (!await (window as any).CustomDialog.confirm(t('discover.upload.confirm_delete') || 'Bạn có chắc chắn muốn xóa không?')) return;
                    deleteBtn.setAttribute('data-i18n', 'discover.upload.btn_deleting');
                    deleteBtn.textContent = t('discover.upload.btn_deleting') || 'Đang xóa...';
                    ((deleteBtn as unknown) as HTMLButtonElement).disabled = true;
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const res = await fetch(`http://localhost:3000/api/animations/${cardId}?creator_id=${session?.user?.id}`, { method: 'DELETE' });
                        if (res.ok) {
                            (window as any).CustomDialog.alert(t('discover.upload.success_delete') || 'Xóa thành công!');
                            form.removeAttribute('data-edit-id');
                            if (submitBtn) {
                                submitBtn.setAttribute('data-i18n', 'discover.upload.anim.btn_submit');
                                try {
                                    const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                                    if (settings.language) {
                                        const { t } = await import('../../../core/i18n');
                                        submitBtn.textContent = t('discover.upload.anim.btn_submit');
                                    } else submitBtn.textContent = 'Tải lên Animation';
                                } catch(e) {
                                    submitBtn.textContent = 'Tải lên Animation';
                                }
                            }
                            deleteBtn.style.display = 'none';
                            form.reset();
                            await ListRenderingController.loadDiscoverList();
                            await ListRenderingController.loadMyUploadsAnimList();
                            const uploadTabBtn = document.querySelector('[data-tab="tab-upload-animation"]') as HTMLElement;
            if (uploadTabBtn) uploadTabBtn.click();
                        } else {
                            (window as any).CustomDialog.alert('Xóa thất bại. Vui lòng thử lại.');
                        }
                    } catch (e) {
                        console.error(e);
                        (window as any).CustomDialog.alert('Có lỗi xảy ra.');
                    } finally {
                        deleteBtn.setAttribute('data-i18n', 'discover.upload.anim.btn_delete');
                        try {
                            const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                            if (settings.language) {
                                const { t } = await import('../../../core/i18n');
                                deleteBtn.textContent = t('discover.upload.anim.btn_delete');
                            } else deleteBtn.textContent = 'Xóa Animation';
                        } catch(e) {
                            deleteBtn.textContent = 'Xóa Animation';
                        }
                        ((deleteBtn as unknown) as HTMLButtonElement).disabled = false;
                    }
                };
            }
            
            const uploadTabBtn = document.querySelector('[data-tab="tab-upload-animation"]') as HTMLElement;
            if (uploadTabBtn) uploadTabBtn.click();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            if (fbx) {
                const animFileName = document.getElementById('anim-file-name');
                const uploadAnimLabel = document.getElementById('upload-anim-label');
                if (animFileName) animFileName.textContent = 'Đã tải animation gốc';
                if (uploadAnimLabel) uploadAnimLabel.classList.add('has-file');

                // Wait for animVrm to be initialized by initAnimPreview, then play
                const checkAndPlay = () => {
                    if ((window as any).animViewer.currentVrm) {
                        (window as any).animViewer.playAnimationFbx(fbx).catch(console.error);
                    } else {
                        setTimeout(checkAndPlay, 100);
                    }
                };
                checkAndPlay();
            }
            return;
        }

        // --- Discover Animation List ---
        const detailAnimName = document.getElementById('detail-anim-name') as HTMLInputElement;
        if (detailAnimName) detailAnimName.value = name;
        const detailAnimGender = document.getElementById('detail-anim-gender') as HTMLInputElement;
        if (detailAnimGender) detailAnimGender.value = t(DetailModalController.getI18nKey(gender)) || gender;
        const detailAnimCat = document.getElementById('detail-anim-category') as HTMLInputElement;
        if (detailAnimCat) detailAnimCat.value = t(DetailModalController.getI18nKey(category)) || category;
        const detailAnimSource = document.getElementById('detail-anim-source') as HTMLInputElement;
        if (detailAnimSource) detailAnimSource.value = t(DetailModalController.getI18nKey(origin)) || origin;
        const detailAnimDesc = document.getElementById('detail-anim-desc') as HTMLTextAreaElement;
        if (detailAnimDesc) detailAnimDesc.value = desc;

        // Set the animation ID on the save button, then check saved state async
        const btnSaveAnimDetail = document.getElementById('btn-save-anim') as HTMLButtonElement;
        if (btnSaveAnimDetail) {
            btnSaveAnimDetail.dataset.id = cardId;
            btnSaveAnimDetail.dataset.saved = 'false';
            btnSaveAnimDetail.disabled = false;
            btnSaveAnimDetail.setAttribute('data-i18n', 'discover.list.btn_save_anim'); import('../../../core/i18n').then(({ t }) => { btnSaveAnimDetail.innerHTML = t('discover.list.btn_save_anim'); }); btnSaveAnimDetail.textContent = 'Lưu Animation';
            btnSaveAnimDetail.style.background = '';
            btnSaveAnimDetail.style.color = '';

            // Async check if already saved
            (async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session?.user?.id) return;
                    const res = await fetch(`http://localhost:3000/api/animations/my-saved?creator_id=${session.user.id}`);
                    if (!res.ok) return;
                    const saved: any[] = await res.json();
                    const isSaved = saved.some((a: any) => a.id === cardId);
                    if (isSaved) {
                        btnSaveAnimDetail.setAttribute('data-i18n', 'discover.list.btn_unsave'); try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ t }) => { btnSaveAnimDetail.innerHTML = t('discover.list.btn_unsave'); }); } else btnSaveAnimDetail.textContent = 'Bỏ lưu'; } catch(e) { btnSaveAnimDetail.textContent = 'Bỏ lưu'; }
                        btnSaveAnimDetail.style.background = '#e57373';
                        btnSaveAnimDetail.style.color = '#fff';
                        btnSaveAnimDetail.dataset.saved = 'true';
                    }
                } catch (_) {}
            })();
        }

        const saveAnimStatus = document.getElementById('save-anim-status');
        if (saveAnimStatus) saveAnimStatus.style.display = 'none';

        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        const detailTab = document.getElementById('tab-anim-detail');
        if (detailTab) {
            detailTab.classList.add('active');
            document.body.classList.add('upload-mode');
            window.dispatchEvent(new Event('resize-anim-detail-vrm'));
        }

        if (fbx) {
            DetailModalController.loadDetailAnimationPreview(fbx);
        }
    }

    function handleCardClick(e: Event, isMyUploads = false) {
        const target = e.target as HTMLElement;
        if (target.closest('.btn-save-character')) return; // Ignore if clicked on save button
        
        const iconPreviewImg = document.getElementById('icon-preview-img') as HTMLImageElement;
        const iconPreviewText = document.getElementById('icon-preview-text');

        const card = target.closest('.model-card') as HTMLElement;
        if (!card) return;

        const id = card.dataset.id;
        const name = card.dataset.name || '';
        const icon = card.dataset.icon || '';
        const trait = card.dataset.trait || '';
        const vrmUrl = card.dataset.vrm || '';
        const voice = card.dataset.voice || '';

        // === MY UPLOADS: go straight to the upload form for editing ===
        if (isMyUploads) {
            // Populate name
            (document.getElementById('upload-name') as HTMLInputElement).value = name;

            // Reset upload status message (clear any leftover "Cập nhật thành công!" etc.)
            const uploadStatusEl = document.getElementById('upload-status');
            if (uploadStatusEl) {
                uploadStatusEl.style.display = 'none';
                uploadStatusEl.textContent = '';
            }

            // Populate description (extract from trait, after double newline, strip metadata lines)
            const traitParts = trait.split('\n\n');
            const cleanedDescParts: string[] = [];
            for (const part of traitParts.slice(1)) {
                const cleanedLines = part.split('\n').filter(
                    l => !l.startsWith('Nguồn mô hình: ') && !l.startsWith('Nguồn gốc nhân vật: ')
                );
                const cleaned = cleanedLines.join('\n').trim();
                if (cleaned) cleanedDescParts.push(cleaned);
            }
            (document.getElementById('upload-desc') as HTMLTextAreaElement).value = cleanedDescParts.join('\n\n');

            // Parse trait string to get gender, type, personality, source, origin
            const traitRaw = trait;
            let parsedGender = 'Nữ', parsedPersonality = 'Vui vẻ', parsedSource = 'VRoid Hub', parsedOrigin = 'Khác';
            const parts = traitRaw.split('\n\n');
            const firstLine = (parts[0] || '').split('\n')[0] || '';
            const match = firstLine.match(/^\[(.*?)\]\s*(.*)$/);
            if (match) {
                const prefix = match[1];
                parsedPersonality = match[2];
                const prefixParts = prefix.split(' - ');
                if (prefixParts.length >= 1) parsedGender = prefixParts[0];
            } else {
                parsedPersonality = firstLine;
            }
            
            for (let i = 1; i < parts.length; i++) {
                const partLines = parts[i].split('\n');
                for (const l of partLines) {
                    if (l.startsWith('Nguồn mô hình: ')) parsedSource = l.replace('Nguồn mô hình: ', '');
                    if (l.startsWith('Nguồn gốc nhân vật: ')) parsedOrigin = l.replace('Nguồn gốc nhân vật: ', '');
                }
            }

            // Set gender radio
            document.querySelectorAll('input[name="upload-gender"]').forEach(r => {
                const btn = r.closest('.gender-btn');
                if ((r as HTMLInputElement).value === parsedGender) {
                    (r as HTMLInputElement).checked = true;
                    if (btn) btn.classList.add('active');
                } else {
                    (r as HTMLInputElement).checked = false;
                    if (btn) btn.classList.remove('active');
                }
            });

            // Set selects and their custom inputs if needed
            const traitSelect = document.getElementById('upload-trait-select') as HTMLSelectElement;
            if (traitSelect) {
                const opt = Array.from(traitSelect.options).find(o => (o as HTMLOptionElement).value === parsedPersonality);
                if (opt) traitSelect.value = parsedPersonality;
                else {
                    traitSelect.value = 'Khác';
                    const customContainer = document.getElementById('upload-trait-custom-container');
                    const customInput = document.getElementById('upload-trait-custom') as HTMLInputElement;
                    if (customContainer && customInput) {
                        traitSelect.style.display = 'none';
                        customContainer.style.display = 'block';
                        customInput.value = parsedPersonality;
                    }
                }
            }

            const sourceSelect = document.getElementById('upload-source-select') as HTMLSelectElement;
            if (sourceSelect) {
                const opt = Array.from(sourceSelect.options).find(o => (o as HTMLOptionElement).value === parsedSource);
                if (opt) sourceSelect.value = parsedSource;
                else {
                    sourceSelect.value = 'Khác';
                    const customContainer = document.getElementById('upload-source-custom-container');
                    const customInput = document.getElementById('upload-source-custom') as HTMLInputElement;
                    if (customContainer && customInput) {
                        sourceSelect.style.display = 'none';
                        customContainer.style.display = 'block';
                        customInput.value = parsedSource;
                    }
                }
            }

            const originSelect = document.getElementById('upload-origin-select') as HTMLSelectElement;
            if (originSelect) {
                const opt = Array.from(originSelect.options).find(o => (o as HTMLOptionElement).value === parsedOrigin);
                if (opt) originSelect.value = parsedOrigin;
                else {
                    originSelect.value = 'Khác';
                    const customContainer = document.getElementById('upload-origin-custom-container');
                    const customInput = document.getElementById('upload-origin-custom') as HTMLInputElement;
                    if (customContainer && customInput) {
                        originSelect.style.display = 'none';
                        customContainer.style.display = 'block';
                        customInput.value = parsedOrigin;
                    }
                }
            }

            // Populate voice
            const voiceEl = document.getElementById('upload-voice') as HTMLInputElement;
            if (voiceEl) {
                voiceEl.value = voice;
                voiceEl.disabled = false;
                voiceEl.placeholder = 'Mã Model ID trên Fish Audio';
                voiceEl.style.backgroundColor = '';
                voiceEl.style.color = '';
                voiceEl.style.borderColor = '';
                // isVoiceSkipped is managed in main.ts, we can't directly mutate it here.
                // Just reset the UI state.
                const btnSkipV = document.getElementById('btn-skip-voice');
                if (btnSkipV) {
                    btnSkipV.textContent = 'Bỏ qua';
                    (btnSkipV as any).style.color = '#e94560';
                }
            }

            // Pre-fill icon preview
            if (icon) {
                if (iconPreviewImg) {
                    iconPreviewImg.src = icon;
                    iconPreviewImg.style.display = 'block';
                    iconPreviewImg.onerror = () => { iconPreviewImg.src = '/favicon.png'; };
                }
                if (iconPreviewText) iconPreviewText.style.display = 'none';
                const iconContainer = document.getElementById('icon-preview-container');
                if (iconContainer) iconContainer.classList.add('has-image');
            }

            // Pre-load VRM into the upload 3D preview
            if (vrmUrl) {
                (window as any).vrmViewer.clearVrm();
                const loader = new GLTFLoader();
                loader.register((parser) => new VRMLoaderPlugin(parser));
                loader.load(vrmUrl, (gltf) => {
                    const vrm = gltf.userData.vrm as VRM;
                    if (vrm) {
                        (window as any).vrmViewer.loadVrm(vrm);
                        if ((document.getElementById('vrm-placeholder') as HTMLElement)) (document.getElementById('vrm-placeholder') as HTMLElement).style.display = 'none';
                        const vrmFileNameEl = document.getElementById('upload-vrm-filename');
                        if (vrmFileNameEl) vrmFileNameEl.textContent = 'Đã tải mô hình gốc';
                        const vrmLabelEl = document.getElementById('upload-vrm-label');
                        if (vrmLabelEl) vrmLabelEl.classList.add('has-file');
                    }
                }, undefined, (e) => console.error(e));
            }

            // Mark form as edit mode
            document.getElementById('upload-character-form').dataset.editId = id || '';
            const submitBtn = document.getElementById('btn-submit-upload') as HTMLButtonElement;
            if (submitBtn) {
                submitBtn.setAttribute('data-i18n', 'discover.upload.update_char');
                try {
                    const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                    if (settings.language) {
                        import('../../../core/i18n').then(({ t }) => {
                            submitBtn.textContent = t('discover.upload.update_char');
                        });
                    } else submitBtn.textContent = 'Cập nhật nhân vật';
                } catch(e) {
                    submitBtn.textContent = 'Cập nhật nhân vật';
                }
            }

            // Show delete button and bind delete action
            const deleteBtn = document.getElementById('btn-delete-upload') as HTMLButtonElement;
            if (deleteBtn) {
                deleteBtn.style.display = 'block';
                deleteBtn.onclick = async () => {
                    if (!await (window as any).CustomDialog.confirm(t('discover.upload.confirm_delete') || 'Bạn có chắc chắn muốn xóa không?')) return;
                    deleteBtn.setAttribute('data-i18n', 'discover.upload.btn_deleting');
                    deleteBtn.textContent = t('discover.upload.btn_deleting') || 'Đang xóa...';
                    deleteBtn.disabled = true;
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const res = await fetch(`${API_BASE}/${id}?creator_id=${session?.user?.id}`, { method: 'DELETE' });
                        if (res.ok) {
                            (window as any).CustomDialog.alert(t('discover.upload.success_delete') || 'Xóa thành công!');
                            document.getElementById('upload-character-form').removeAttribute('data-edit-id');
                            if (submitBtn) {
                                submitBtn.setAttribute('data-i18n', 'discover.upload.submit_char');
                                try {
                                    const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                                    if (settings.language) {
                                        const { t } = await import('../../../core/i18n');
                                        submitBtn.textContent = t('discover.upload.submit_char');
                                    } else submitBtn.textContent = 'Tải lên nhân vật';
                                } catch(e) {
                                    submitBtn.textContent = 'Tải lên nhân vật';
                                }
                            }
                            deleteBtn.style.display = 'none';
                            document.getElementById('upload-character-form').reset();
                            (window as any).croppedBlob = null;
                            if (iconPreviewImg) iconPreviewImg.style.display = 'none';
                            if (iconPreviewText) iconPreviewText.style.display = 'flex';
                            const iconCont = document.getElementById('icon-preview-container');
                            if (iconCont) iconCont.classList.remove('has-image');
                            await ListRenderingController.loadDiscoverList();
                            await ListRenderingController.loadMyUploadsList();
                            await ListRenderingController.loadMyUploadsAnimList();
                            document.querySelector<HTMLElement>('[data-tab="tab-discover"]')?.click();
                        } else {
                            (window as any).CustomDialog.alert('Xóa thất bại. Vui lòng thử lại.');
                        }
                    } catch (e) {
                        console.error(e);
                        (window as any).CustomDialog.alert('Có lỗi xảy ra.');
                    } finally {
                        deleteBtn.setAttribute('data-i18n', 'discover.upload.delete_char');
                        try {
                            const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                            if (settings.language) {
                                const { t } = await import('../../../core/i18n');
                                deleteBtn.textContent = t('discover.upload.delete_char');
                            } else deleteBtn.textContent = 'Xóa nhân vật';
                        } catch(e) {
                            deleteBtn.textContent = 'Xóa nhân vật';
                        }
                        deleteBtn.disabled = false;
                    }
                };
            }

            // Switch to upload tab
            document.querySelector<HTMLElement>('[data-tab="tab-upload"]')?.click();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // === DISCOVER LIST: open detail modal ===
        if (!detailModal) return;
        currentVoiceModelId = voice;

        if (detailCharName) detailCharName.textContent = name;
        if (detailCharIcon) detailCharIcon.src = icon || '/favicon.png';
        if (btnDetailSave) btnDetailSave.dataset.id = id;

        // Parse trait string
        const traitRaw = trait;
        let genderStr = '-', typeStr = '-', personalityStr = '-', sourceStr = '-', originStr = '-', descStr = '-';
        const parts = traitRaw.split('\n\n');
        let topPart = parts[0] || '';
        const lines = topPart.split('\n');
        let firstLine = lines[0] || '';
        const match = firstLine.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
            const prefix = match[1];
            personalityStr = match[2];
            const prefixParts = prefix.split(' - ');
            if (prefixParts.length === 2) { genderStr = prefixParts[0]; typeStr = prefixParts[1]; }
            else if (prefixParts.length === 1) {
                if (['Nữ', 'Nam', 'Khác'].includes(prefixParts[0])) genderStr = prefixParts[0];
                else typeStr = prefixParts[0];
            }
        } else { personalityStr = firstLine; }
        // Search source/origin in topPart lines
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].startsWith('Nguồn mô hình: ')) sourceStr = lines[i].replace('Nguồn mô hình: ', '');
            else if (lines[i].startsWith('Nguồn gốc nhân vật: ')) originStr = lines[i].replace('Nguồn gốc nhân vật: ', '');
        }
        // Also search source/origin in remaining parts (for old data format)
        const remainingParts = parts.slice(1);
        const cleanedDescParts: string[] = [];
        for (const part of remainingParts) {
            const partLines = part.split('\n');
            const nonMetaLines: string[] = [];
            for (const line of partLines) {
                if (line.startsWith('Nguồn mô hình: ')) {
                    sourceStr = line.replace('Nguồn mô hình: ', '');
                } else if (line.startsWith('Nguồn gốc nhân vật: ')) {
                    originStr = line.replace('Nguồn gốc nhân vật: ', '');
                } else {
                    nonMetaLines.push(line);
                }
            }
            const cleaned = nonMetaLines.join('\n').trim();
            if (cleaned) cleanedDescParts.push(cleaned);
        }
        descStr = cleanedDescParts.join('\n\n') || '-';

        const detailGender = document.getElementById('detail-field-gender');
        const detailType = document.getElementById('detail-field-type');
        const detailTraitField = document.getElementById('detail-field-trait');
        const detailSource = document.getElementById('detail-field-source');
        const detailOrigin = document.getElementById('detail-field-origin');
        const detailDesc = document.getElementById('detail-field-desc');
        DetailModalController.updateFieldWithI18n(detailGender as HTMLElement, genderStr);
        DetailModalController.updateFieldWithI18n(detailType as HTMLElement, typeStr);
        DetailModalController.updateFieldWithI18n(detailTraitField as HTMLElement, personalityStr);
        DetailModalController.updateFieldWithI18n(detailSource as HTMLElement, sourceStr);
        DetailModalController.updateFieldWithI18n(detailOrigin as HTMLElement, originStr);
        if (detailDesc) detailDesc.textContent = descStr;

        const creatorName = card.dataset.creatorName || 'Người dùng ẩn danh';
        const creatorAvatar = card.dataset.creatorAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin';
        const detailUploaderName = document.getElementById('detail-uploader-name');
        const detailUploaderAvatar = document.getElementById('detail-uploader-avatar') as HTMLImageElement;
        if (detailUploaderName) detailUploaderName.textContent = creatorName;
        if (detailUploaderAvatar) {
            detailUploaderAvatar.src = creatorAvatar;
            detailUploaderAvatar.onerror = () => { detailUploaderAvatar.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'; };
        }

        if (btnDetailSave) {
            const saveBtnOnCard = card.querySelector('.btn-save-character') as HTMLElement;
            const isSaved = saveBtnOnCard && (saveBtnOnCard.textContent?.includes('Đã lưu') || saveBtnOnCard.style.background === 'rgb(129, 199, 132)' || saveBtnOnCard.style.background === '#81c784' || saveBtnOnCard.style.pointerEvents === 'none');

            if (isSaved) {
                btnDetailSave.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> <span data-i18n="discover.list.btn_saved">Đã lưu ✓</span>'; try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ applyLanguage }) => { applyLanguage(settings.language); }); } } catch(e) {}
                btnDetailSave.disabled = true;
                btnDetailSave.style.background = '#81c784';
                btnDetailSave.style.cursor = 'default';
            } else {
                btnDetailSave.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> <span data-i18n="discover.list.btn_save">Lưu nhân vật</span>'; try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ applyLanguage }) => { applyLanguage(settings.language); }); } } catch(e) {}
                btnDetailSave.disabled = false;
                btnDetailSave.style.background = '#4caf50';
                btnDetailSave.style.cursor = 'pointer';
            }
            btnDetailSave.style.display = 'flex';
        }

        // In discover list: always show Save, never show owner actions
        const ownerActions = document.getElementById('detail-owner-actions');
        if (ownerActions) ownerActions.style.display = 'none';

        btnDetailPreviewVoice.style.display = voice ? 'flex' : 'none';

        detailModal!.style.display = 'block';
        initDetailScene();
        detailClock.getDelta(); // clear accumulated time

        setTimeout(() => {
            if (detailRenderer && detailCamera) {
                const width = detailCanvas.clientWidth;
                const height = detailCanvas.clientHeight;
                detailCamera.aspect = width / height;
                detailCamera.updateProjectionMatrix();
                detailRenderer.setSize(width, height, false);
            }
        }, 10);

        if (vrmUrl && detailScene) {
            const loader = new GLTFLoader();
            loader.register((parser) => new VRMLoaderPlugin(parser));
            
            if (detailPlaceholder) {
                detailPlaceholder.style.display = 'flex';
                detailPlaceholder.textContent = t('discover.detail.loading_model_0') || 'Đang tải mô hình... 0%';
            }
            
            loader.load(vrmUrl, (gltf) => {
                if (detailVrm) {
                    detailScene!.remove(detailVrm.scene);
                    VRMUtils.deepDispose(detailVrm.scene);
                }
                const vrm = gltf.userData.vrm as VRM;
                if (vrm) {
                    detailScene!.add(vrm.scene);
                    detailVrm = vrm;
                    vrm.scene.position.set(0, 0, 0);
                    vrm.scene.rotation.y = 0;
                    if (detailPlaceholder) detailPlaceholder.style.display = 'none';
                }
            }, (progress) => {
                if (progress.lengthComputable && detailPlaceholder) {
                    const percent = Math.round((progress.loaded / progress.total) * 100);
                    const template = t('discover.detail.loading_model') || 'Đang tải mô hình... {0}%';
                    detailPlaceholder.textContent = template.replace('{0}', percent.toString());
                }
            }, (err) => {
                console.error(err);
                if (detailPlaceholder) detailPlaceholder.textContent = t('discover.detail.err_load_model') || 'Lỗi tải mô hình!';
            });
        }
    }
    }
}
