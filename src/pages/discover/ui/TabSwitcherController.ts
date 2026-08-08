export class TabSwitcherController {
    static setup(context: {
        animViewer: any;
    }) {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const tabId = target.dataset.tab;

            tabBtns.forEach(b => {
                b.classList.remove('active');
            });
            target.classList.add('active');

            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            const contentToShow = document.getElementById(tabId!);
            if (contentToShow) {
                contentToShow.classList.add('active');
                
                const backBtn = document.getElementById('main-back-btn') as HTMLAnchorElement;
                const backText = document.getElementById('main-back-text');
                if (backBtn && backText) {
                    if (tabId === 'tab-home') {
                        backBtn.href = '/';
                        backBtn.onclick = null;
                        backText.setAttribute('data-i18n', 'discover.header.back_assistant'); try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ t }) => { backText.innerHTML = t('discover.header.back_assistant'); }); } else backText.textContent = 'Trở về Trợ Lý 3D'; } catch(e) { backText.textContent = 'Trở về Trợ Lý 3D'; }
                    } else {
                        backBtn.href = 'javascript:void(0)';
                        backBtn.onclick = (e) => {
                            e.preventDefault();
                            document.getElementById('hidden-home-btn')?.click();
                        };
                        backText.setAttribute('data-i18n', 'discover.header.back_home'); try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ t }) => { backText.innerHTML = t('discover.header.back_home'); }); } else backText.textContent = 'Về Trang Chủ'; } catch(e) { backText.textContent = 'Về Trang Chủ'; }
                    }
                }
                
                const isUploadTab = tabId?.startsWith('tab-upload') && tabId !== 'tab-upload-options';
                if (isUploadTab) {
                    document.body.classList.add('upload-mode');
                } else {
                    document.body.classList.remove('upload-mode');
                }

                if (tabId === 'tab-upload') {
                    // Trigger custom resize to fix ThreeJS canvas if it was initialized while hidden
                    setTimeout(() => window.dispatchEvent(new Event('resize-vrm')), 50);
                    
                    // Reset form on true click
                    if (e.isTrusted) {
                        const form = document.getElementById('upload-character-form') as HTMLFormElement;
                        if (form) {
                            form.reset();
                            form.removeAttribute('data-edit-id');
                            const submitBtn = document.getElementById('btn-submit-upload') as HTMLButtonElement;
                            if (submitBtn) submitBtn.setAttribute('data-i18n', 'discover.upload.submit_char'); try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ t }) => { submitBtn.innerHTML = t('discover.upload.submit_char'); }); } else submitBtn.textContent = 'Tải lên nhân vật'; } catch(e) { submitBtn.textContent = 'Tải lên nhân vật'; };
                            const deleteBtn = document.getElementById('btn-delete-upload') as HTMLButtonElement;
                            if (deleteBtn) deleteBtn.style.display = 'none';
                            const iconPreviewImg = document.getElementById('icon-preview-img') as HTMLImageElement;
                            if (iconPreviewImg) iconPreviewImg.style.display = 'none';
                            const iconPreviewText = document.getElementById('icon-preview-text');
                            if (iconPreviewText) iconPreviewText.style.display = 'flex';
                            const iconCont = document.getElementById('icon-preview-container');
                            if (iconCont) iconCont.classList.remove('has-image');
                        }
                    }
                } else if (tabId === 'tab-upload-animation') {
                    context.animViewer.init();
                    setTimeout(() => window.dispatchEvent(new Event('resize-anim-vrm')), 50);
                    
                    // Reset form on true click
                    if (e.isTrusted) {
                        const form = document.getElementById('upload-animation-form') as HTMLFormElement;
                        if (form) {
                            form.reset();
                            form.removeAttribute('data-edit-id');
                            const submitBtn = document.getElementById('btn-upload-anim');
                            if (submitBtn) submitBtn.setAttribute('data-i18n', 'discover.upload.submit_anim'); try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ t }) => { submitBtn.innerHTML = t('discover.upload.submit_anim'); }); } else submitBtn.textContent = 'Tải lên Animation'; } catch(e) { submitBtn.textContent = 'Tải lên Animation'; }
                            const deleteBtn = document.getElementById('btn-delete-anim');
                            if (deleteBtn) deleteBtn.style.display = 'none';
                            
                            // Reset file label
                            const animFileName = document.getElementById('anim-file-name');
                            if (animFileName) animFileName.textContent = '';
                            const uploadAnimLabel = document.getElementById('upload-anim-label');
                            if (uploadAnimLabel) uploadAnimLabel.classList.remove('has-file');
                            
                            // Restore required attribute
                            const animFileInput = document.getElementById('upload-anim-file') as HTMLInputElement;
                            if (animFileInput) animFileInput.setAttribute('required', 'true');
                            
                            // Stop animation
                            context.animViewer.stopAnimation();
                            context.animViewer.mixer = null;
                        }
                    }
                }
            }
        });
    });

    const btnBackCommunity = document.getElementById('btn-back-community');
    if (btnBackCommunity) {
        btnBackCommunity.addEventListener('click', () => {
            const communityTabBtn = document.querySelector('.tab-btn[data-tab="tab-list"]') as HTMLElement;
            if (communityTabBtn) communityTabBtn.click();
        });
    }

    const btnBackDiscoverAnim = document.getElementById('btn-back-discover-anim');
    if (btnBackDiscoverAnim) {
        btnBackDiscoverAnim.addEventListener('click', () => {
            const animTabBtn = document.querySelector('.tab-btn[data-tab="tab-animation"]') as HTMLElement;
            if (animTabBtn) animTabBtn.click();
        });
    }
    }
}
