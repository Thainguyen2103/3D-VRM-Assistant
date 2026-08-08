
import { supabase } from '../../../core/auth';
import { ImageCropperController } from './ImageCropperController';
import { t } from '../../../core/i18n';

const API_BASE = 'http://localhost:3000/api/characters';

export class UploadFormsController {
    static setup(context: {
        vrmViewer: any;
        animViewer: any;
        getIsVoiceSkipped: () => boolean;
        resetVoiceSkip: () => void;
        loadDiscoverList: () => void;
        loadAnimationList: () => void;
    }) {
        const uploadForm = document.getElementById('upload-character-form') as HTMLFormElement;
        const uploadStatus = document.getElementById('upload-status');
        const vrmInput = document.getElementById('upload-vrm') as HTMLInputElement;
        const voiceInput = document.getElementById('upload-voice') as HTMLInputElement;
        const vrmFileName = document.getElementById('vrm-file-name');
        const placeholder = document.getElementById('preview-placeholder');
        const btnSkipVoice = document.getElementById('btn-skip-voice');
        const animFileName = document.getElementById('anim-file-name');
        const iconPreviewImg = document.getElementById('icon-preview-img') as HTMLImageElement;
        const iconPreviewText = document.getElementById('icon-preview-text');

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Custom Validation
            const iconContainer = document.getElementById('icon-preview-container');
            const vrmLabel = document.getElementById('upload-vrm-label');
            const nameInput = document.getElementById('upload-name') as HTMLInputElement;
            const descInput = document.getElementById('upload-desc') as HTMLTextAreaElement;
            const termShare = document.getElementById('term-share') as HTMLInputElement;
            const termCopyright = document.getElementById('term-copyright') as HTMLInputElement;
            const termGuidelines = document.getElementById('term-guidelines') as HTMLInputElement;
            const termCommercial = document.getElementById('term-commercial') as HTMLInputElement;
            const labelTermShare = document.getElementById('label-term-share');
            const labelTermCopyright = document.getElementById('label-term-copyright');
            const labelTermGuidelines = document.getElementById('label-term-guidelines');
            const labelTermCommercial = document.getElementById('label-term-commercial');
            
            // Reset borders
            if (iconContainer) {
                iconContainer.style.borderColor = '';
                iconContainer.style.borderStyle = '';
            }
            if (vrmLabel) {
                vrmLabel.style.borderColor = '';
                vrmLabel.style.borderStyle = '';
            }
            if (voiceInput) {
                voiceInput.style.borderColor = '';
                voiceInput.style.outline = '';
                voiceInput.style.boxShadow = '';
            }
            if (nameInput) {
                nameInput.style.borderColor = '#ccc';
                nameInput.style.outline = '';
                nameInput.style.boxShadow = '';
            }
            if (descInput) {
                descInput.style.borderColor = '#e0e0e0';
                descInput.style.outline = '';
                descInput.style.boxShadow = '';
            }
            if (labelTermShare) {
                labelTermShare.style.border = '';
                labelTermShare.style.background = '';
            }
            if (labelTermCopyright) {
                labelTermCopyright.style.border = '';
                labelTermCopyright.style.background = '';
            }
            if (labelTermGuidelines) {
                labelTermGuidelines.style.border = '';
                labelTermGuidelines.style.background = '';
            }
            if (labelTermCommercial) {
                labelTermCommercial.style.border = '';
                labelTermCommercial.style.background = '';
            }
            
            const showError = (msg: string) => {
                if (uploadStatus) {
                    uploadStatus.style.display = 'block';
                    uploadStatus.style.color = '#e94560';
                    uploadStatus.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; gap: 6px;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> ${msg}</div>`;
                }
            };

            if (!ImageCropperController.getCroppedBlob() && !uploadForm.dataset.editId) {
                showError('Vui lòng tải lên và cắt Ảnh đại diện cho nhân vật!');
                if (iconContainer) {
                    iconContainer.style.borderColor = '#e94560';
                    iconContainer.style.borderStyle = 'solid';
                    iconContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            if (nameInput && !nameInput.value.trim()) {
                showError('Vui lòng nhập Tên nhân vật!');
                nameInput.style.borderColor = '#e94560';
                nameInput.style.outline = 'none';
                nameInput.style.boxShadow = '0 0 0 3px rgba(233,69,96,0.3)';
                nameInput.focus();
                nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            if (descInput && !descInput.value.trim()) {
                showError('Vui lòng nhập Mô tả nhân vật!');
                descInput.style.borderColor = '#e94560';
                descInput.style.outline = 'none';
                descInput.style.boxShadow = '0 0 0 3px rgba(233,69,96,0.3)';
                descInput.focus();
                descInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            if (!context.getIsVoiceSkipped() && voiceInput && !voiceInput.value.trim()) {
                showError('Vui lòng nhập Mã Model ID Voice hoặc bấm Bỏ qua!');
                voiceInput.style.borderColor = '#e94560';
                voiceInput.style.outline = 'none';
                voiceInput.style.boxShadow = '0 0 0 3px rgba(233,69,96,0.3)';
                voiceInput.focus();
                voiceInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            if (!uploadForm.dataset.editId && (!vrmInput.files || vrmInput.files.length === 0)) {
                showError('Vui lòng tải lên File 3D Model (.vrm)!');
                if (vrmLabel) {
                    vrmLabel.style.borderColor = '#e94560';
                    vrmLabel.style.borderStyle = 'solid';
                    vrmLabel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            if (termShare && !termShare.checked) {
                showError('Vui lòng đồng ý chia sẻ dữ liệu để tiếp tục!');
                if (labelTermShare) {
                    labelTermShare.style.border = '2px solid #e94560';
                    labelTermShare.style.background = 'rgba(233, 69, 96, 0.1)';
                    labelTermShare.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            if (termCopyright && !termCopyright.checked) {
                showError('Vui lòng xác nhận chịu trách nhiệm bản quyền!');
                if (labelTermCopyright) {
                    labelTermCopyright.style.border = '2px solid #e94560';
                    labelTermCopyright.style.background = 'rgba(233, 69, 96, 0.1)';
                    labelTermCopyright.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            if (termGuidelines && !termGuidelines.checked) {
                showError('Vui lòng xác nhận tuân thủ Tiêu chuẩn cộng đồng!');
                if (labelTermGuidelines) {
                    labelTermGuidelines.style.border = '2px solid #e94560';
                    labelTermGuidelines.style.background = 'rgba(233, 69, 96, 0.1)';
                    labelTermGuidelines.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            if (termCommercial && !termCommercial.checked) {
                showError('Vui lòng xác nhận không sử dụng mục đích thương mại!');
                if (labelTermCommercial) {
                    labelTermCommercial.style.border = '2px solid #e94560';
                    labelTermCommercial.style.background = 'rgba(233, 69, 96, 0.1)';
                    labelTermCommercial.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            const submitBtn = document.getElementById('btn-submit-upload') as HTMLButtonElement;
            submitBtn.disabled = true;
            submitBtn.textContent = t('discover.upload.btn_uploading') || 'Đang tải lên...';
            if (uploadStatus) {
                uploadStatus.style.display = 'block';
                uploadStatus.style.color = '#333';
                uploadStatus.textContent = t('discover.upload.status_uploading_model') || 'Đang tải lên mô hình 3D, vui lòng chờ...';
            }

            const formData = new FormData();
            formData.append('name', (document.getElementById('upload-name') as HTMLInputElement).value);
            
            const genderRadio = document.querySelector('input[name="upload-gender"]:checked') as HTMLInputElement;
            const charGender = genderRadio ? genderRadio.value : '';
            
            const charTypeVal = (document.getElementById('upload-type') as HTMLSelectElement)?.value || '';
            const charType = charTypeVal === 'Khác' 
                ? (document.getElementById('upload-type-custom') as HTMLInputElement)?.value?.trim() || ''
                : charTypeVal;
                
            const charTraitVal = (document.getElementById('upload-trait-select') as HTMLSelectElement)?.value || '';
            const charTrait = charTraitVal === 'Khác'
                ? (document.getElementById('upload-trait-custom') as HTMLInputElement)?.value?.trim() || ''
                : charTraitVal;
                
            const charSourceVal = (document.getElementById('upload-source-select') as HTMLSelectElement)?.value || '';
            const charSource = charSourceVal === 'Khác'
                ? (document.getElementById('upload-source-custom') as HTMLInputElement)?.value?.trim() || ''
                : charSourceVal;
                
            const charOriginVal = (document.getElementById('upload-origin-select') as HTMLSelectElement)?.value || '';
            const charOrigin = charOriginVal === 'Khác'
                ? (document.getElementById('upload-origin-custom') as HTMLInputElement)?.value?.trim() || ''
                : charOriginVal;
            
            let combinedTrait = charTrait;
            if (charGender || (charType && charType !== 'Khác')) {
                const prefixParts = [];
                if (charGender && charGender !== 'Khác') prefixParts.push(charGender);
                if (charType && charType !== 'Khác') prefixParts.push(charType);
                
                if (prefixParts.length > 0) {
                    combinedTrait = `[${prefixParts.join(' - ')}] ${charTrait}`.trim();
                }
            }
            
            if (charSource && charSource !== 'Khác') {
                combinedTrait += `\nNguồn mô hình: ${charSource}`;
            }
            if (charOrigin && charOrigin !== 'Khác') {
                combinedTrait += `\nNguồn gốc nhân vật: ${charOrigin}`;
            }
            
            const charDesc = (document.getElementById('upload-desc') as HTMLTextAreaElement)?.value?.trim();
            if (charDesc) {
                combinedTrait = `${combinedTrait}\n\n${charDesc}`.trim();
            }
            
            formData.append('trait', combinedTrait);
            formData.append('voice_model_id', (document.getElementById('upload-voice') as HTMLInputElement).value);

            let editCharId = uploadForm.dataset.editId || null;
            
            // Use cropped blob if available
            const currentCroppedBlob = ImageCropperController.getCroppedBlob();
            if (currentCroppedBlob) {
                formData.append('icon', currentCroppedBlob, 'icon.jpg');
            } else {
                const iconFile = (document.getElementById('upload-icon') as HTMLInputElement).files?.[0];
                if (iconFile) formData.append('icon', iconFile);
            }

            const vrmFile = (document.getElementById('upload-vrm') as HTMLInputElement).files?.[0];
            if (vrmFile) formData.append('vrm', vrmFile);

            const { data: { session } } = await supabase.auth.getSession();
            if (session && session.user) {
                formData.append('creator_id', session.user.id);
            }

            try {
                let url = `${API_BASE}/upload`;
                let method = 'POST';
                if (editCharId) {
                    url = `${API_BASE}/upload/${editCharId}`;
                    method = 'PUT';
                }

                const response = await fetch(url, {
                    method: method,
                    body: formData
                });
                const result = await response.json();

                if (response.ok) {
                    if (uploadStatus) {
                        uploadStatus.style.color = '#4caf50';
                        uploadStatus.textContent = editCharId ? 'Cập nhật thành công!' : 'Tải lên thành công!';
                    }
                    
                    // Reset edit mode
                    uploadForm.removeAttribute('data-edit-id');
                    const submitBtn = document.getElementById('btn-submit-upload');
                    if (submitBtn) submitBtn.setAttribute('data-i18n', 'discover.upload.submit_char'); try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ t }) => { submitBtn.innerHTML = t('discover.upload.submit_char'); }); } else submitBtn.textContent = 'Tải lên nhân vật'; } catch(e) { submitBtn.textContent = 'Tải lên nhân vật'; };
                    const deleteBtn = document.getElementById('btn-delete-upload');
                    if (deleteBtn) deleteBtn.style.display = 'none';

                    uploadForm.reset();
                    ImageCropperController.setCroppedBlob(null);
                    iconPreviewImg.style.display = 'none';
                    if (iconPreviewText) iconPreviewText.style.display = 'flex';
                    
                    const iconContainer = document.getElementById('icon-preview-container');
                    if (iconContainer) iconContainer.classList.remove('has-image');
                    const vrmLabel = document.getElementById('upload-vrm-label');
                    if (vrmLabel) vrmLabel.classList.remove('has-file');
                    if (vrmFileName) vrmFileName.textContent = 'Chưa chọn file nào';
                    
                    if (context.getIsVoiceSkipped()) {
                        context.resetVoiceSkip(); // Reset voice skip state
                    }

                    context.vrmViewer.clearVrm();
                    if (placeholder) placeholder.style.display = 'block';

                    // switch back to list
                    const listTab = document.querySelector('.tab-btn[data-tab="tab-list"]') as HTMLElement;
                    if (listTab) listTab.click();
                    context.loadDiscoverList();
                } else {
                    throw new Error(result.error || 'Upload failed');
                }
            } catch (err: any) {
                if (uploadStatus) {
                    uploadStatus.style.color = '#e94560';
                    uploadStatus.textContent = `Lỗi: ${err.message}`;
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.setAttribute('data-i18n', 'discover.upload.submit_char'); try { const settings = JSON.parse(localStorage.getItem('app_settings') || '{}'); if (settings.language) { import('../../../core/i18n').then(({ t }) => { submitBtn.innerHTML = t('discover.upload.submit_char'); }); } else submitBtn.textContent = 'Tải lên nhân vật'; } catch(e) { submitBtn.textContent = 'Tải lên nhân vật'; };
            }
        });
    }

    const uploadAnimForm = document.getElementById('upload-animation-form') as HTMLFormElement;
    if (uploadAnimForm) {
        uploadAnimForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const animNameInput = document.getElementById('upload-anim-name') as HTMLInputElement;
            const animCategorySelect = document.getElementById('upload-anim-category') as HTMLSelectElement;
            const animDescInput = document.getElementById('upload-anim-desc') as HTMLTextAreaElement;
            const animFileInput = document.getElementById('upload-anim-file') as HTMLInputElement;
            const uploadAnimLabel = document.getElementById('upload-anim-label');
            const submitBtn = document.getElementById('btn-upload-anim') as HTMLButtonElement;
            const uploadAnimStatus = document.getElementById('upload-anim-status');
            
            const showErrorAnim = (msg: string) => {
                if (uploadAnimStatus) {
                    uploadAnimStatus.style.display = 'block';
                    uploadAnimStatus.style.color = '#e94560';
                    uploadAnimStatus.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; gap: 6px;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> ${msg}</div>`;
                }
            };
            
            // Reset previous highlights
            if (animNameInput) {
                animNameInput.style.borderColor = '#e0e0e0';
                animNameInput.style.boxShadow = 'none';
            }
            if (animDescInput) {
                animDescInput.style.borderColor = '#e0e0e0';
                animDescInput.style.boxShadow = 'none';
            }
            if (uploadAnimLabel) {
                uploadAnimLabel.style.borderColor = '#3f51b5';
                uploadAnimLabel.style.borderStyle = 'dashed';
            }

            if (animNameInput && !animNameInput.value.trim()) {
                showErrorAnim(t('discover.upload.anim.err_no_name') || 'Vui lòng nhập Tên hành động!');
                animNameInput.style.borderColor = '#e94560';
                animNameInput.style.outline = 'none';
                animNameInput.style.boxShadow = '0 0 0 3px rgba(233,69,96,0.3)';
                animNameInput.focus();
                animNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            if (animDescInput && !animDescInput.value.trim()) {
                showErrorAnim('Vui lòng nhập Mô tả animation!');
                animDescInput.style.borderColor = '#e94560';
                animDescInput.style.outline = 'none';
                animDescInput.style.boxShadow = '0 0 0 3px rgba(233,69,96,0.3)';
                animDescInput.focus();
                animDescInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            if (!animFileInput.files || animFileInput.files.length === 0) {
                if (!uploadAnimForm.dataset.editId) {
                    showErrorAnim('Vui lòng tải lên File Animation (.fbx)!');
                    if (uploadAnimLabel) {
                        uploadAnimLabel.style.borderColor = '#e94560';
                        uploadAnimLabel.style.borderStyle = 'solid';
                        uploadAnimLabel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    return;
                }
            }

            const termAnimShare = document.getElementById('term-anim-share') as HTMLInputElement;
            const termAnimCopyright = document.getElementById('term-anim-copyright') as HTMLInputElement;
            const termAnimGuidelines = document.getElementById('term-anim-guidelines') as HTMLInputElement;
            const termAnimCommercial = document.getElementById('term-anim-commercial') as HTMLInputElement;

            const labelTermAnimShare = document.getElementById('label-term-anim-share');
            const labelTermAnimCopyright = document.getElementById('label-term-anim-copyright');
            const labelTermAnimGuidelines = document.getElementById('label-term-anim-guidelines');
            const labelTermAnimCommercial = document.getElementById('label-term-anim-commercial');

            [labelTermAnimShare, labelTermAnimCopyright, labelTermAnimGuidelines, labelTermAnimCommercial].forEach(label => {
                if (label) {
                    label.style.border = '';
                    label.style.background = '';
                }
            });

            if (termAnimShare && !termAnimShare.checked) {
                showErrorAnim('Vui lòng đồng ý chia sẻ dữ liệu để tiếp tục!');
                if (labelTermAnimShare) {
                    labelTermAnimShare.style.border = '2px solid #e94560';
                    labelTermAnimShare.style.background = 'rgba(233, 69, 96, 0.1)';
                    labelTermAnimShare.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            if (termAnimCopyright && !termAnimCopyright.checked) {
                showErrorAnim('Vui lòng xác nhận chịu trách nhiệm bản quyền!');
                if (labelTermAnimCopyright) {
                    labelTermAnimCopyright.style.border = '2px solid #e94560';
                    labelTermAnimCopyright.style.background = 'rgba(233, 69, 96, 0.1)';
                    labelTermAnimCopyright.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            if (termAnimGuidelines && !termAnimGuidelines.checked) {
                showErrorAnim('Vui lòng xác nhận tuân thủ Tiêu chuẩn cộng đồng!');
                if (labelTermAnimGuidelines) {
                    labelTermAnimGuidelines.style.border = '2px solid #e94560';
                    labelTermAnimGuidelines.style.background = 'rgba(233, 69, 96, 0.1)';
                    labelTermAnimGuidelines.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            if (termAnimCommercial && !termAnimCommercial.checked) {
                showErrorAnim('Vui lòng xác nhận không sử dụng mục đích thương mại!');
                if (labelTermAnimCommercial) {
                    labelTermAnimCommercial.style.border = '2px solid #e94560';
                    labelTermAnimCommercial.style.background = 'rgba(233, 69, 96, 0.1)';
                    labelTermAnimCommercial.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            const formData = new FormData();
            formData.append('name', animNameInput.value.trim());
            formData.append('category', animCategorySelect.value || 'Cơ bản & Di chuyển');
            formData.append('desc', animDescInput.value.trim());
            
            const genderRadio = document.querySelector('input[name="upload-anim-gender"]:checked') as HTMLInputElement;
            if (genderRadio) formData.append('gender', genderRadio.value);
            
            const originSelect = document.getElementById('upload-anim-source-select') as HTMLSelectElement;
            if (originSelect) formData.append('origin', originSelect.value);
            
            const privacyRadio = document.querySelector('input[name="upload-anim-privacy"]:checked') as HTMLInputElement;
            if (privacyRadio) formData.append('is_public', privacyRadio.value === 'public' ? 'true' : 'false');

            if (animFileInput.files && animFileInput.files.length > 0) {
                formData.append('fbx', animFileInput.files[0]);
            }

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    formData.append('creator_id', session.user.id);
                }

                let editAnimId = uploadAnimForm.dataset.editId || null;

                submitBtn.disabled = true;
                submitBtn.textContent = editAnimId 
                    ? (t('discover.upload.btn_updating') || 'Đang cập nhật...') 
                    : (t('discover.upload.btn_uploading') || 'Đang tải lên...');
                if (uploadAnimStatus) {
                    uploadAnimStatus.style.display = 'block';
                    uploadAnimStatus.style.color = '#333';
                    uploadAnimStatus.textContent = editAnimId 
                        ? (t('discover.upload.status_updating_anim') || 'Đang cập nhật Animation, vui lòng chờ...') 
                        : (t('discover.upload.status_uploading_anim') || 'Đang tải lên Animation, vui lòng chờ...');
                }

                let url = 'http://localhost:3000/api/animations/upload';
                let method = 'POST';
                if (editAnimId) {
                    url = `http://localhost:3000/api/animations/${editAnimId}`;
                    method = 'PUT';
                }

                const res = await fetch(url, {
                    method: method,
                    body: formData
                });
                const result = await res.json();
                
                if (res.ok) {
                    if (uploadAnimStatus) {
                        uploadAnimStatus.style.display = 'none';
                        uploadAnimStatus.textContent = '';
                    }
                    uploadAnimForm.removeAttribute('data-edit-id');
                    const btnDelete = document.getElementById('btn-delete-anim');
                    if (btnDelete) btnDelete.style.display = 'none';

                    uploadAnimForm.reset();
                    if (animFileName) animFileName.textContent = '';
                    if (uploadAnimLabel) uploadAnimLabel.classList.remove('has-file');
                    context.animViewer.stopAnimation();
                        context.animViewer.mixer = null;
                    // Reset character pose
                    

                    // Switch back to Animation tab
                    const animTabBtn = document.querySelector('.tab-btn[data-tab="tab-animation"]') as HTMLElement;
                    if (animTabBtn) animTabBtn.click();
                    
                    // Refresh animation list
                    context.loadAnimationList();
                } else {
                    throw new Error(result.error || 'Upload failed');
                }
            } catch (err: any) {
                if (uploadAnimStatus) {
                    uploadAnimStatus.style.display = 'block';
                    uploadAnimStatus.style.color = '#e94560';
                    uploadAnimStatus.textContent = `Lỗi: ${err.message}`;
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = uploadAnimForm.dataset.editId ? 'Cập nhật Animation' : 'Tải lên Animation';
            }
        });
    }
    }
}
