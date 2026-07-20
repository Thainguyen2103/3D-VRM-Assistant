import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { supabase, currentUser } from '../core/auth';

let cropper: Cropper | null = null;
let currentAvatarBlob: Blob | null = null;

let currentUserProfileState: any = null;
export function getCurrentUserProfile() { return currentUserProfileState; }

export async function fetchCurrentUserProfileState() {
    if (!currentUser || !supabase) return;
    const { data, error } = await supabase
        .from('user_profiles')
        .select('display_name, nickname, avatar_url')
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
        toast.style.background = type === 'success' ? '#4CAF50' : '#f44336';
        toast.style.color = 'white';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        toast.style.fontSize = '1rem';
        toast.style.fontWeight = '500';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'opacity 0.3s, transform 0.3s';
        toast.innerText = message;
    
        container.appendChild(toast);
    
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);
    
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async function loadUserProfile() {
        if (!currentUser || !supabase) return;

        if (profileEmail) profileEmail.innerText = currentUser.email;
        if (profileCreated && currentUser.created_at) {
            profileCreated.innerText = new Date(currentUser.created_at).toLocaleDateString('vi-VN');
        }

        const { data, error } = await supabase
            .from('user_profiles')
            .select('display_name, nickname, avatar_url')
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
            if (data.avatar_url) {
                const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(data.avatar_url);
                const url = publicUrlData.publicUrl + '?t=' + new Date().getTime();
                
                if (avatarPreview && avatarFallback) {
                    avatarPreview.src = url;
                    avatarPreview.style.display = 'block';
                    avatarFallback.style.display = 'none';
                }

                // Update small floating icon
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
                showToast("Vui lòng đăng nhập lại!", "error");
                return;
            }

            btnSaveProfile.disabled = true;
            const originalText = btnSaveProfile.innerText;
            btnSaveProfile.innerText = "Đang lưu...";

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
                        throw new Error("Lỗi khi upload ảnh: " + uploadError.message);
                    }
                    avatarUrlPath = uploadData.path;
                    currentAvatarBlob = null; // Clear sau khi upload thành công
                }

                // 2. Cập nhật user_profiles (Upsert)
                const updateData: any = {
                    id: currentUser.id,
                    display_name: inputDisplayName.value.trim(),
                    nickname: inputNickname.value.trim(),
                    updated_at: new Date().toISOString()
                };

                if (avatarUrlPath) {
                    updateData.avatar_url = avatarUrlPath;
                }

                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .upsert(updateData);

                if (profileError) {
                    throw new Error("Lỗi khi cập nhật hồ sơ: " + profileError.message);
                }
                
                currentUserProfileState = updateData;

                showToast("Đã lưu hồ sơ thành công!", "success");
                
            } catch (err: any) {
                showToast(err.message || "Đã xảy ra lỗi!", "error");
            } finally {
                btnSaveProfile.disabled = false;
                btnSaveProfile.innerText = originalText;
            }
        });
    }
}
