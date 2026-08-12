import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { supabase, currentUser } from '@/core/auth';
import { applyLanguage, t } from '@/core/i18n';

let cropper: Cropper | null = null;
let currentAvatarBlob: Blob | null = null;

let currentUserProfileState: any = null;
export function getCurrentUserProfile() { return currentUserProfileState; }

export async function fetchCurrentUserProfileState() {
    if (!currentUser || !supabase) return;
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    if (data) {
        currentUserProfileState = data;
    }
}

export async function setupProfileUI() {
    const profileModal = document.getElementById('profile-modal');
    const profileModalContent = document.getElementById('profile-modal-content');
    const btnCloseProfile = document.getElementById('close-profile-modal');
    const btnProfile = document.getElementById('btn-profile');
    const profileEmail = document.getElementById('profile-email');
    const profileCreated = document.getElementById('profile-created');
    const inputDisplayName = document.getElementById('profile-display-name') as HTMLInputElement;
    const inputNickname = document.getElementById('profile-nickname') as HTMLInputElement;
    const inputBio = document.getElementById('profile-bio') as HTMLTextAreaElement;
    const inputBirthday = document.getElementById('profile-birthday') as HTMLInputElement;
    const inputHobbies = document.getElementById('profile-hobbies') as HTMLInputElement;
    const inputFacebook = document.getElementById('profile-social-facebook') as HTMLInputElement;
    const inputYoutube = document.getElementById('profile-social-youtube') as HTMLInputElement;
    const inputTiktok = document.getElementById('profile-social-tiktok') as HTMLInputElement;
    const inputWebsite = document.getElementById('profile-website') as HTMLInputElement;
    const inputX = document.getElementById('profile-social-x') as HTMLInputElement;
    const inputDiscord = document.getElementById('profile-social-discord') as HTMLInputElement;
    const inputTitle = document.getElementById('profile-title') as HTMLInputElement;
    const inputProfession = document.getElementById('profile-profession') as HTMLInputElement;
    const inputLocation = document.getElementById('profile-location') as HTMLInputElement;
    const inputDislikes = document.getElementById('profile-dislikes') as HTMLInputElement;
    const avatarPreview = document.getElementById('profile-avatar-preview') as HTMLImageElement;
    const avatarFallback = document.getElementById('profile-avatar-fallback');
    const btnSaveProfile = document.getElementById('btn-save-profile') as HTMLButtonElement;
    const avatarUpload = document.getElementById('avatar-upload') as HTMLInputElement;
    
    const cropperModal = document.getElementById('cropper-modal');
    const cropperImage = document.getElementById('cropper-image') as HTMLImageElement;
    const btnCancelCrop = document.getElementById('btn-cancel-crop');
    const btnApplyCrop = document.getElementById('btn-apply-crop');

    function showToast(message: string, type: 'success' | 'error' = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
    
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerText = message;
        container.appendChild(toast);
    
        // Animate in
        setTimeout(() => { toast.classList.add('show'); }, 10);
    
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 320);
        }, 3000);
    }

    // --- Smart Select Logic ---
    function setupSmartSelects() {
        const targets = ['profile-title', 'profile-profession', 'profile-location', 'profile-dislikes', 'profile-hobbies'];

        targets.forEach(targetId => {
            const customSelect = document.getElementById(targetId + '-custom');
            const customSelectValue = document.getElementById(targetId + '-value') as HTMLInputElement;
            if (customSelect && customSelectValue) {
                const trigger = customSelect.querySelector('.custom-select-trigger') as HTMLElement;
                const triggerSpan = trigger.querySelector('.custom-select-value') as HTMLElement;
                const options = customSelect.querySelectorAll('.custom-option');
                const defaultText = triggerSpan.innerHTML;
                
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    customSelect.classList.toggle('open');
                });

                document.addEventListener('click', (e) => {
                    if (!customSelect.contains(e.target as Node)) {
                        customSelect.classList.remove('open');
                    }
                });

                options.forEach(opt => {
                    opt.addEventListener('click', () => {
                        const val = opt.getAttribute('data-value');
                        customSelectValue.value = val || '';
                        triggerSpan.innerHTML = opt.innerHTML;
                        customSelect.classList.remove('open');

                        if (val === 'other') {
                            customSelect.style.display = 'none';
                            const wrapper = customSelect.parentElement?.querySelector('.smart-input-wrapper') as HTMLElement;
                            const inputEl = document.getElementById(targetId) as HTMLInputElement;
                            if (wrapper) wrapper.style.display = 'block';
                            if (inputEl) inputEl.focus();
                        }
                    });
                });

                const revertBtn = customSelect.parentElement?.querySelector('.btn-revert-select');
                if (revertBtn) {
                    revertBtn.addEventListener('click', () => {
                        const wrapper = customSelect.parentElement?.querySelector('.smart-input-wrapper') as HTMLElement;
                        const inputEl = document.getElementById(targetId) as HTMLInputElement;
                        if (wrapper) wrapper.style.display = 'none';
                        customSelect.style.display = 'block';
                        customSelectValue.value = '';
                        triggerSpan.innerHTML = defaultText;
                        if (inputEl) inputEl.value = '';
                    });
                }
            }
        });
    }

    function setSmartSelectValue(targetId: string, value: string) {
        if (!value) return;

        const customSelect = document.getElementById(targetId + '-custom');
        const customSelectValue = document.getElementById(targetId + '-value') as HTMLInputElement;
        const inputEl = document.getElementById(targetId) as HTMLInputElement;
        if (!customSelect || !customSelectValue || !inputEl) return;
        
        const wrapper = inputEl.parentElement;
        const options = customSelect.querySelectorAll('.custom-option');
        let optionExists = false;
        let matchingOpt = null;
        options.forEach(opt => {
            if (opt.getAttribute('data-value') === value) {
                optionExists = true;
                matchingOpt = opt;
            }
        });

        if (optionExists && value !== 'other') {
            customSelectValue.value = value;
            const triggerSpan = customSelect.querySelector('.custom-select-value') as HTMLElement;
            if (triggerSpan && matchingOpt) triggerSpan.innerHTML = (matchingOpt as HTMLElement).innerHTML;
            customSelect.style.display = 'block';
            if (wrapper) wrapper.style.display = 'none';
        } else {
            customSelectValue.value = 'other';
            customSelect.style.display = 'none';
            if (wrapper) wrapper.style.display = 'block';
            inputEl.value = value;
        }
    }

    function getSmartSelectValue(targetId: string): string {
        const customSelectValue = document.getElementById(targetId + '-value') as HTMLInputElement;
        const inputEl = document.getElementById(targetId) as HTMLInputElement;
        if (!customSelectValue || !inputEl) return '';
        
        const customSelect = document.getElementById(targetId + '-custom');
        if (customSelectValue.value === 'other' || (customSelect && customSelect.style.display === 'none')) {
            return inputEl.value;
        }
        return customSelectValue.value;
    }
    
    setupSmartSelects();

    async function loadProfileStats() {
        if (!currentUser || !supabase) return;
        const userId = currentUser.id;

        const statCharPosted = document.getElementById('stat-char-posted');
        const statCharSaved = document.getElementById('stat-char-saved');
        const statAnimPosted = document.getElementById('stat-anim-posted');
        const statAnimSaved = document.getElementById('stat-anim-saved');
        const joinDate = document.getElementById('profile-join-date');

        if (joinDate && currentUser.created_at) {
            const d = new Date(currentUser.created_at);
            joinDate.textContent = d.toLocaleDateString('vi-VN');
        }

        try {
            const [savedCharsRes, savedAnimsRes, uploadsRes] = await Promise.all([
                supabase.from('user_saved_characters').select('id', { count: 'exact', head: true }).eq('user_id', userId),
                supabase.from('user_saved_animations').select('id', { count: 'exact', head: true }).eq('user_id', userId),
                supabase.from('public_characters').select('id', { count: 'exact', head: true }).eq('creator_id', userId)
            ]);

            let postedAnimsCount = 0;
            try {
                const animsResponse = await fetch(`http://localhost:3000/api/animations/my-uploads?creator_id=${userId}`);
                if (animsResponse.ok) {
                    const animsData = await animsResponse.json();
                    postedAnimsCount = Array.isArray(animsData) ? animsData.length : 0;
                }
            } catch(e) {}

            if (statCharSaved) statCharSaved.textContent = String(savedCharsRes.count ?? 0);
            if (statAnimSaved) statAnimSaved.textContent = String(savedAnimsRes.count ?? 0);
            if (statCharPosted) statCharPosted.textContent = String(uploadsRes.count ?? 0);
            if (statAnimPosted) statAnimPosted.textContent = String(postedAnimsCount);
        } catch (err) {
            if (statCharSaved) statCharSaved.textContent = '–';
            if (statAnimSaved) statAnimSaved.textContent = '–';
            if (statCharPosted) statCharPosted.textContent = '–';
            if (statAnimPosted) statAnimPosted.textContent = '–';
        }
    }

    async function loadUserProfile() {
        if (!currentUser || !supabase) return;

        // Sidebar: email + tên hiển thị nhanh
        const sideEmail = document.getElementById('avatar-email-display');
        const sideName = document.getElementById('avatar-display-name');
        if (sideEmail) sideEmail.textContent = currentUser.email || '—';
        if (profileEmail) profileEmail.innerText = currentUser.email || '—';
        if (profileCreated && currentUser.created_at) {
            profileCreated.innerText = new Date(currentUser.created_at).toLocaleDateString('vi-VN');
        }

        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error("Lỗi khi tải hồ sơ:", error);
            return;
        }

        if (data) {
            currentUserProfileState = data;
            if (inputDisplayName) inputDisplayName.value = data.display_name || '';
            if (inputNickname) inputNickname.value = data.nickname || '';
            if (inputBio) inputBio.value = data.bio || '';
            if (data.gender) {
                const radio = document.querySelector(`input[name="profile_gender"][value="${data.gender}"]`) as HTMLInputElement;
                if (radio) radio.checked = true;
            }
            if (inputBirthday) {
                inputBirthday.value = data.birthday || '';
                inputBirthday.dispatchEvent(new Event('input'));
            }
            setSmartSelectValue('profile-hobbies', data.hobbies);
            setSmartSelectValue('profile-title', data.title);
            setSmartSelectValue('profile-profession', data.profession);
            setSmartSelectValue('profile-location', data.location);
            setSmartSelectValue('profile-dislikes', data.dislikes);
            // Social links (stored in data.social_links object)
            const social = data.social_links || {};
            if (inputFacebook) inputFacebook.value = social.facebook || '';
            if (inputYoutube) inputYoutube.value = social.youtube || '';
            if (inputTiktok) inputTiktok.value = social.tiktok || '';
            if (inputWebsite) inputWebsite.value = social.website || '';
            if (inputX) inputX.value = social.x || '';
            if (inputDiscord) inputDiscord.value = social.discord || '';
            // Sidebar name
            if (sideName) sideName.textContent = data.display_name || currentUser.email?.split('@')[0] || '—';

            if (data.avatar_url) {
                const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(data.avatar_url);
                const url = publicUrlData.publicUrl + '?t=' + new Date().getTime();
                
                if (avatarPreview && avatarFallback) {
                    avatarPreview.src = url;
                    avatarPreview.style.display = 'block';
                    avatarFallback.style.display = 'none';
                }

                // Update small floating icon (if on other pages)
                const smallAvatar = document.getElementById('btn-profile-avatar') as HTMLImageElement;
                const smallIcon = document.getElementById('btn-profile-icon');
                if (smallAvatar && smallIcon) {
                    smallAvatar.src = url;
                    smallAvatar.style.display = 'block';
                    smallIcon.style.display = 'none';
                }

            } else {
                if (avatarPreview && avatarFallback) {
                    avatarPreview.style.display = 'none';
                    avatarFallback.style.display = 'flex';
                }
            }
        } else {
            // No profile yet — show email as fallback name
            if (sideName) sideName.textContent = currentUser.email?.split('@')[0] || '—';
        }
    }

    // No need to close modal anymore, it's a full page
    function loadProfilePage() {
        if (profileModal) {
            profileModal.style.display = 'flex';
            profileModal.style.opacity = '1';
        }
    }

    // Call load on setup
    await loadUserProfile();
    
    // --- Load Language ---
    let currentLang = 'vi';
    if (currentUserProfileState && currentUserProfileState.settings && currentUserProfileState.settings.language) {
        currentLang = currentUserProfileState.settings.language;
    } else {
        const local = localStorage.getItem('app_settings');
        if (local) {
            try {
                const parsed = JSON.parse(local);
                if (parsed.language) currentLang = parsed.language;
            } catch(e) {}
        }
    }
    applyLanguage(currentLang);

    // Load stats in background
    loadProfileStats();

    loadProfilePage();

    // --- Avatar Upload & Cropper Logic ---
    if (avatarUpload && cropperImage && cropperModal) {
        avatarUpload.addEventListener('change', (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files.length > 0) {
                const file = files[0];
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target && event.target.result) {
                        cropperImage.src = event.target.result as string;
                        cropperModal.style.display = 'flex';
                        
                        // Initialize Cropper
                        if (cropper) cropper.destroy();
                        cropper = new Cropper(cropperImage, {
                            aspectRatio: 1, // Hình vuông (sẽ cắt thành tròn bằng CSS)
                            viewMode: 1,
                            dragMode: 'move',
                            autoCropArea: 1,
                            restore: false,
                            guides: false,
                            center: false,
                            highlight: false,
                            cropBoxMovable: false,
                            cropBoxResizable: false,
                            toggleDragModeOnDblclick: false,
                        });
                    }
                };
                reader.readAsDataURL(file);
                // Reset input to allow selecting the same file again
                avatarUpload.value = '';
            }
        });
    }

    if (btnCancelCrop && cropperModal) {
        btnCancelCrop.addEventListener('click', () => {
            cropperModal.style.display = 'none';
            if (cropper) {
                cropper.destroy();
                cropper = null;
            }
        });
    }

    if (btnApplyCrop && cropperModal) {
        btnApplyCrop.addEventListener('click', () => {
            if (!cropper) return;
            
            // Lấy ảnh cắt ra dưới dạng canvas
            const canvas = cropper.getCroppedCanvas({
                width: 500,
                height: 500
            });
            
            canvas.toBlob((blob) => {
                if (!blob) return;
                currentAvatarBlob = blob;
                
                // Hiển thị preview ngay lập tức
                const objectUrl = URL.createObjectURL(blob);
                if (avatarPreview && avatarFallback) {
                    avatarPreview.src = objectUrl;
                    avatarPreview.style.display = 'block';
                    avatarFallback.style.display = 'none';
                }
                
                cropperModal.style.display = 'none';
                cropper?.destroy();
                cropper = null;
            }, 'image/jpeg', 0.9);
        });
    }

    // --- Save Profile Logic ---
    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', async () => {
            if (!currentUser || !supabase) {
                showToast(t("toast.login_again"), "error");
                return;
            }

            btnSaveProfile.disabled = true;
            const originalHTML = btnSaveProfile.innerHTML;
            btnSaveProfile.innerHTML = `<svg class="spin-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> ` + t('btn.saving');

            try {
                let avatarUrlPath = null;

                // 1. Upload Avatar (nếu có ảnh mới)
                if (currentAvatarBlob) {
                    const fileName = `${currentUser.id}/${Date.now()}.jpg`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('avatars')
                        .upload(fileName, currentAvatarBlob, {
                            cacheControl: '3600',
                            upsert: true
                        });

                    if (uploadError) {
                        throw new Error("Upload error: " + uploadError.message);
                    }
                    avatarUrlPath = uploadData.path;
                    currentAvatarBlob = null; // Clear sau khi upload thành công
                }

                    const selectedGender = document.querySelector('input[name="profile_gender"]:checked') as HTMLInputElement;
                    const genderVal = selectedGender ? selectedGender.value : '';

                // 2. Cập nhật user_profiles (Upsert)
                const updateData: any = {
                    id: currentUser.id,
                    display_name: inputDisplayName.value.trim(),
                    nickname: inputNickname.value.trim(),
                    bio: inputBio ? inputBio.value.trim().slice(0, 200) : '',
                    gender: genderVal,
                    birthday: inputBirthday ? inputBirthday.value : '',
                    hobbies: getSmartSelectValue('profile-hobbies').trim(),
                    title: getSmartSelectValue('profile-title').trim(),
                    profession: getSmartSelectValue('profile-profession').trim(),
                    location: getSmartSelectValue('profile-location').trim(),
                    dislikes: getSmartSelectValue('profile-dislikes').trim(),
                    social_links: {
                        facebook: inputFacebook ? inputFacebook.value.trim() : '',
                        youtube: inputYoutube ? inputYoutube.value.trim() : '',
                        tiktok: inputTiktok ? inputTiktok.value.trim() : '',
                        website: inputWebsite ? inputWebsite.value.trim() : '',
                        x: inputX ? inputX.value.trim() : '',
                        discord: inputDiscord ? inputDiscord.value.trim() : ''
                    },
                    updated_at: new Date().toISOString()
                };

                // Update sidebar name live
                const sideName = document.getElementById('avatar-display-name');
                if (sideName && updateData.display_name) sideName.textContent = updateData.display_name;

                if (avatarUrlPath) {
                    updateData.avatar_url = avatarUrlPath;
                }

                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .upsert(updateData);

                if (profileError) {
                    throw new Error("Update error: " + profileError.message);
                }
                
                currentUserProfileState = updateData;

                showToast(t("toast.profile_saved"), "success");
                
            } catch (err: any) {
                showToast(err.message || t("toast.error"), "error");
            } finally {
                btnSaveProfile.disabled = false;
                btnSaveProfile.innerHTML = originalHTML;
            }
        });
    }
}
