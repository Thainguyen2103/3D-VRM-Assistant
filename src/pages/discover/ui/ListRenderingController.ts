import { supabase } from '../../../core/auth';
import { DiscoverService } from '../services/DiscoverService';
import { AnimationService } from '../services/AnimationService';
import { ListController } from './ListController';

// Escape special HTML characters in attribute values to prevent broken data-* attributes
function escapeAttr(str: string): string {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export class ListRenderingController {
    static getAnimCatI18nKey(val: string): string {
        const map: any = {
            'Giao tiếp & Tương tác': 'discover.upload.opt.anim.cat.interact',
            'Biểu cảm & Cảm xúc': 'discover.upload.opt.anim.cat.emotion',
            'Cơ bản & Di chuyển': 'discover.upload.opt.anim.cat.basic',
            'Vũ đạo & Nghệ thuật': 'discover.upload.opt.anim.cat.dance',
            'Hành động & Chiến đấu': 'discover.upload.opt.anim.cat.action'
        };
        return map[val] || '';
    }

    static currentUser: any = null;
    static attachAnimationHoverEventsCallback: ((containerId?: string) => void) | null = null;

    static init(user: any, attachAnimationHoverEvents: (containerId?: string) => void) {
        this.currentUser = user;
        this.attachAnimationHoverEventsCallback = attachAnimationHoverEvents;
    }

    static async loadDiscoverList() {
        const listContainer = document.getElementById('discover-list-container');
        if (!listContainer) return;
        try {
            const data = await DiscoverService.getDiscoverCharacters();

            if (data.length === 0) {
                listContainer.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; color: #666; padding: 20px; font-size: 1.1rem;">Chưa có nhân vật nào.</div>';
                return;
            }

            let savedCharIds = new Set();
            if (this.currentUser) {
                try {
                    try {
                        const savedData = await DiscoverService.getSavedCharacters(this.currentUser.id);
                        savedData.forEach((c: any) => savedCharIds.add(c.id));
                    } catch (err) {
                        console.error("Lỗi khi tải danh sách đã lưu", err);
                    }
                } catch (e) {
                    console.error("Lỗi khi tải danh sách đã lưu", e);
                }
            }

            listContainer.innerHTML = data.map((char: any) => {
                const uploaderName = char.user_profiles?.display_name || 'Admin (Bạn)';
                let uploaderAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin';
                if (char.user_profiles?.avatar_url) {
                    if (char.user_profiles.avatar_url.startsWith('http')) {
                        uploaderAvatar = char.user_profiles.avatar_url;
                    } else {
                        const { data: avatarData } = supabase!.storage.from('avatars').getPublicUrl(char.user_profiles.avatar_url);
                        uploaderAvatar = avatarData.publicUrl;
                    }
                }

                const isSaved = savedCharIds.has(char.id);
                return ListController.buildCardHTML(char, uploaderName, uploaderAvatar, true, isSaved);
            }).join('');

            // Add event listeners to save buttons
            document.querySelectorAll('.btn-save-character').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const target = e.currentTarget as HTMLButtonElement;
                    const charId = target.dataset.id;
                    const isSaved = target.dataset.saved === 'true';
                    
                    target.disabled = true;
                    target.style.background = '#e0e0e0';
                    const loadingKey = isSaved ? 'discover.list.btn_unsaving' : 'discover.list.btn_saving';
                    target.textContent = isSaved ? 'Đang bỏ lưu...' : 'Đang lưu...';
                    try {
                        const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                        if (settings.language) {
                            import('../../../core/i18n').then(({ t }) => {
                                target.textContent = t(loadingKey);
                            });
                        }
                    } catch(e) {}

                    try {
                        const { data: { session } } = await supabase!.auth.getSession();

                        if (isSaved) {
                            try {
                                await DiscoverService.unsaveCharacter(charId as string, session?.user?.id);
                                this.loadDiscoverList();
                            } catch (err) {
                                target.style.background = '#e53935';
                                target.style.color = 'white';
                                target.disabled = false;
                                target.textContent = 'Lỗi!';
                                try {
                                    const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                                    if (settings.language) {
                                        import('../../../core/i18n').then(({ t }) => { target.textContent = t('discover.list.btn_error'); });
                                    }
                                } catch(e) {}
                            }
                        } else {
                            try {
                                await DiscoverService.saveCharacter(charId as string, session?.user?.id);
                                this.loadDiscoverList();
                            } catch (err) {
                                target.style.background = '#e53935';
                                target.style.color = 'white';
                                target.disabled = false;
                                target.textContent = 'Lỗi!';
                                try {
                                    const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                                    if (settings.language) {
                                        import('../../../core/i18n').then(({ t }) => { target.textContent = t('discover.list.btn_error'); });
                                    }
                                } catch(e) {}
                            }
                        }
                    } catch (e) {
                        target.style.background = '#e53935';
                        target.style.color = 'white';
                        target.disabled = false;
                        target.textContent = 'Lỗi kết nối!';
                        try {
                            const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                            if (settings.language) {
                                import('../../../core/i18n').then(({ t }) => { target.textContent = t('discover.list.btn_conn_error'); });
                            }
                        } catch(e) {}
                    }
                });
            });

            try {
                const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                if (settings.language) {
                    import('../../../core/i18n').then(({ applyLanguage }) => {
                        applyLanguage(settings.language);
                    });
                }
            } catch(e) {}


        } catch (err) {
            listContainer.innerHTML = '<div data-i18n="discover.list.error_chars" style="text-align: center; grid-column: 1 / -1; color: #e94560; padding: 20px; font-weight: bold;">Không thể tải danh sách.</div>'; try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ applyLanguage }) => { applyLanguage(settings.language); }); } } catch(e) {}
        }
    }

    static async loadMyUploadsList() {
        const myUploadsContainer = document.getElementById('my-uploads-list-container');
        if (!myUploadsContainer || !this.currentUser) return;
        
        myUploadsContainer.innerHTML = '<div data-i18n="discover.list.loading_chars" style="text-align: center; grid-column: 1 / -1; color: #888; padding: 40px; font-size: 1.1rem;">Đang tải danh sách...</div>'; try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ applyLanguage }) => { applyLanguage(settings.language); }); } } catch(e) {}
        try {
            const data = await DiscoverService.getMyUploads(this.currentUser.id);

            if (data.length === 0) {
                myUploadsContainer.innerHTML = '<div data-i18n="discover.list.empty_chars" style="text-align: center; grid-column: 1 / -1; color: #666; padding: 40px; font-size: 1.1rem;">Bạn chưa tải lên nhân vật nào.</div>'; try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ applyLanguage }) => { applyLanguage(settings.language); }); } } catch(e) {}
                return;
            }

            myUploadsContainer.innerHTML = data.map((char: any) => {
                const uploaderName = char.user_profiles?.display_name || 'Bạn';
                let uploaderAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin';
                if (char.user_profiles?.avatar_url) {
                    if (char.user_profiles.avatar_url.startsWith('http')) {
                        uploaderAvatar = char.user_profiles.avatar_url;
                    } else {
                        const { data: avatarData } = supabase!.storage.from('avatars').getPublicUrl(char.user_profiles.avatar_url);
                        uploaderAvatar = avatarData.publicUrl;
                    }
                }

                return ListController.buildCardHTML(char, uploaderName, uploaderAvatar, false);
            }).join('');

            try {
                const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                if (settings.language) {
                    import('../../../core/i18n').then(({ applyLanguage }) => {
                        applyLanguage(settings.language);
                    });
                }
            } catch(e) {}

        } catch (err) {
            myUploadsContainer.innerHTML = '<div data-i18n="discover.list.error_chars" style="text-align: center; grid-column: 1 / -1; color: #e94560; padding: 20px; font-weight: bold;">Không thể tải danh sách nhân vật của bạn.</div>'; try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ applyLanguage }) => { applyLanguage(settings.language); }); } } catch(e) {}
        }
    }

    static async loadMyUploadsAnimList() {
        const myUploadsAnimContainer = document.getElementById('my-uploads-anim-list-container');
        if (!myUploadsAnimContainer || !this.currentUser) return;
        
        myUploadsAnimContainer.innerHTML = '<div data-i18n="discover.list.loading_anims" style="text-align: center; grid-column: 1 / -1; color: #888; padding: 40px; font-size: 1.1rem;">Đang tải danh sách animation...</div>'; try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ applyLanguage }) => { applyLanguage(settings.language); }); } } catch(e) {}
        try {
            const data = await AnimationService.getMyUploads(this.currentUser.id);

            if (!data || data.length === 0) {
                myUploadsAnimContainer.innerHTML = '<div data-i18n="discover.list.empty_anims" style="text-align: center; grid-column: 1 / -1; color: #666; padding: 40px; font-size: 1.1rem;">Bạn chưa tải lên animation nào.</div>'; try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ applyLanguage }) => { applyLanguage(settings.language); }); } } catch(e) {}
                return;
            }

            myUploadsAnimContainer.innerHTML = data.map((anim: any) => {
                return `
                <div class="model-card discover-card animation-card"
                    data-id="${escapeAttr(anim.id)}"
                    data-name="${escapeAttr(anim.name || '')}"
                    data-fbx="${escapeAttr(anim.file_url || '')}"
                    data-gender="${escapeAttr(anim.gender || '')}"
                    data-category="${escapeAttr(anim.category || '')}"
                    data-origin="${escapeAttr(anim.origin || '')}"
                    data-desc="${escapeAttr(anim.description || anim.desc || '')}"
                    style="background: #fff; border: 3px solid #222; border-radius: 24px; overflow: hidden; box-shadow: 4px 6px 0px #222; transition: all 0.2s; cursor: pointer; display: flex; flex-direction: column; padding: 16px; align-items: center; text-align: center;"
                    onmouseover="this.style.transform='translate(-2px, -2px)'; this.style.boxShadow='6px 8px 0px #222';"
                    onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='4px 6px 0px #222';">
                    
                    <div class="anim-preview-container" style="width: 100%; height: 260px; background: #f0f2f5; border: 3px solid #222; border-radius: 16px; margin-bottom: 16px; position: relative; overflow: hidden; box-shadow: 2px 4px 0px #222; display: flex; align-items: center; justify-content: center;">
                        <canvas class="card-2d-canvas" width="300" height="350" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none; display: none;"></canvas>
                        <svg class="anim-placeholder-icon" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #3f51b5; transition: 0.2s;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </div>
                    
                    <h4 style="margin: 0 0 8px 0; color: #222; font-size: 1.1rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${escapeAttr(anim.name || 'Unknown')}</h4>
                    <span data-i18n="${ListRenderingController.getAnimCatI18nKey(anim.category)}" style="background: #e8f5e9; color: #2e7d32; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; border: 2px solid #222; margin-top: auto; box-shadow: 1px 2px 0px #222;">${escapeAttr(anim.category || 'Animation')}</span>
                </div>`;
            }).join('');
            
            
            try {
                const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                if (settings.language) {
                    import('../../../core/i18n').then(({ applyLanguage }) => {
                        applyLanguage(settings.language);
                    });
                }
            } catch(e) {}

            if (this.attachAnimationHoverEventsCallback) {
                this.attachAnimationHoverEventsCallback('my-uploads-anim-list-container');
            }

            try {
                const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                if (settings.language) {
                    import('../../../core/i18n').then(({ applyLanguage }) => {
                        applyLanguage(settings.language);
                    });
                }
            } catch(e) {}

        } catch (err) {
            myUploadsAnimContainer.innerHTML = '<div data-i18n="discover.list.error_anims" style="text-align: center; grid-column: 1 / -1; color: #e94560; padding: 20px; font-weight: bold;">Không thể tải danh sách animation của bạn.</div>'; try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ applyLanguage }) => { applyLanguage(settings.language); }); } } catch(e) {}
        }
    }

    static async loadAnimationList() {
        const animGrid = document.getElementById('animation-grid');
        if (!animGrid) return;
        try {
            const response = await fetch(`http://localhost:3000/api/animations`);
            if (!response.ok) throw new Error('API failed');
            const data = await response.json();

            if (!data || data.length === 0) {
                animGrid.innerHTML = '<div data-i18n="discover.list.empty_anims" style="text-align: center; grid-column: 1 / -1; color: #666; padding: 20px; font-size: 1.1rem;">Chưa có hành động nào.</div>'; try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ applyLanguage }) => { applyLanguage(settings.language); }); } } catch(e) {}
                return;
            }

            animGrid.innerHTML = data.map((anim: any) => {
                return `
                <div class="model-card discover-card animation-card"
                    data-id="${escapeAttr(anim.id)}"
                    data-name="${escapeAttr(anim.name || '')}"
                    data-fbx="${escapeAttr(anim.file_url || '')}"
                    data-gender="${escapeAttr(anim.gender || '')}"
                    data-category="${escapeAttr(anim.category || '')}"
                    data-origin="${escapeAttr(anim.origin || '')}"
                    data-desc="${escapeAttr(anim.description || anim.desc || '')}"
                    style="background: #fff; border: 3px solid #222; border-radius: 24px; overflow: hidden; box-shadow: 4px 6px 0px #222; transition: all 0.2s; cursor: pointer; display: flex; flex-direction: column; padding: 16px; align-items: center; text-align: center;"
                    onmouseover="this.style.transform='translate(-2px, -2px)'; this.style.boxShadow='6px 8px 0px #222';"
                    onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='4px 6px 0px #222';">
                    
                    <div class="anim-preview-container" style="width: 100%; height: 260px; background: #f0f2f5; border: 3px solid #222; border-radius: 16px; margin-bottom: 16px; position: relative; overflow: hidden; box-shadow: 2px 4px 0px #222; display: flex; align-items: center; justify-content: center;">
                        <canvas class="card-2d-canvas" width="300" height="350" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none; display: none;"></canvas>
                        <svg class="anim-placeholder-icon" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #3f51b5; transition: 0.2s;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </div>
                    
                    <h4 style="margin: 0 0 8px 0; color: #222; font-size: 1.1rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${escapeAttr(anim.name || 'Unknown')}</h4>
                    <span data-i18n="${ListRenderingController.getAnimCatI18nKey(anim.category)}" style="background: #e8f5e9; color: #2e7d32; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; border: 2px solid #222; margin-top: auto; box-shadow: 1px 2px 0px #222;">${escapeAttr(anim.category || 'Animation')}</span>
                </div>`;
            }).join('');
            
            
            try {
                const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                if (settings.language) {
                    import('../../../core/i18n').then(({ applyLanguage }) => {
                        applyLanguage(settings.language);
                    });
                }
            } catch(e) {}

            if (this.attachAnimationHoverEventsCallback) {
                this.attachAnimationHoverEventsCallback();
            }

            try {
                const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                if (settings.language) {
                    import('../../../core/i18n').then(({ applyLanguage }) => {
                        applyLanguage(settings.language);
                    });
                }
            } catch(e) {}

        } catch (err) {
            console.error("Lỗi khi tải animation:", err);
            animGrid.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; color: #e94560; padding: 20px;">Lỗi khi tải danh sách.</div>';
        }
    }
}
