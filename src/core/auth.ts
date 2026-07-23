import { createClient } from '@supabase/supabase-js';
import { setupChatbot, triggerProactiveChat, loadChatHistory } from '../ui/chatbot';
import { t } from '../i18n';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: { log_level: 'info' },
      global: { headers: {} }
    }) 
  : null;

export let currentUser: any = null;

export async function initAuth() {
    // ─── Nếu không có Supabase config → guest mode ───
    if (!supabase) {
        console.warn("Supabase is not configured. Running in guest mode.");
        sessionStorage.setItem('guest_welcomed', 'true');
        await setupChatbot();
        return;
    }

    // ─── Kiểm tra session ───
    const { data: { session } } = await supabase.auth.getSession();

    // Chưa đăng nhập và không phải guest → redirect sang login.html
    if (!session && !sessionStorage.getItem('guest_welcomed')) {
        window.location.replace('/login.html');
        return; // Dừng lại, trang sẽ redirect
    }

    // ─── Đã đăng nhập → tải thông tin người dùng ───
    if (session) {
        currentUser = session.user;

        // Tải avatar để hiển thị ở nút Hồ sơ
        try {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('avatar_url')
                .eq('id', currentUser.id)
                .single();

            if (profile && profile.avatar_url) {
                const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url);
                const url = publicUrlData.publicUrl + '?t=' + new Date().getTime();
                
                const smallAvatar = document.getElementById('btn-profile-avatar') as HTMLImageElement;
                const smallIcon = document.getElementById('btn-profile-icon');
                if (smallAvatar && smallIcon) {
                    smallAvatar.src = url;
                    smallAvatar.style.display = 'block';
                    smallIcon.style.display = 'none';
                }
            }
        } catch (e) {
            console.warn('Could not load avatar:', e);
        }
    }

    // ─── Cập nhật UI nút Profile ───
    updateProfileUI();

    // ─── Khởi động chatbot ───
    await setupChatbot();
    
    if (session) {
        triggerProactiveChat('welcome');
    } else {
        // Guest mode
        if (!sessionStorage.getItem('guest_welcomed')) {
            triggerProactiveChat('welcome');
            sessionStorage.setItem('guest_welcomed', 'true');
        }
    }

    // ─── Nút đăng xuất ───
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        if (supabase) await supabase.auth.signOut();
        sessionStorage.removeItem('guest_welcomed');
        window.location.replace('/login.html');
    });

    // ─── Nút Login (cho guest mode, dẫn sang login.html) ───
    document.getElementById('btn-login-header')?.addEventListener('click', () => {
        window.location.href = '/login.html';
    });
}

function updateProfileUI() {
    const btnProfile = document.getElementById('btn-profile');
    const btnLoginHeader = document.getElementById('btn-login-header');

    if (currentUser && supabase) {
        // Đã đăng nhập → hiện nút Profile
        if (btnProfile) {
            btnProfile.style.display = 'flex';
            btnProfile.onclick = () => { window.location.href = '/profile.html'; };
        }
        if (btnLoginHeader) btnLoginHeader.style.display = 'none';
    } else {
        // Guest mode → hiện nút Login
        if (btnProfile) btnProfile.style.display = 'none';
        if (btnLoginHeader) {
            btnLoginHeader.style.display = 'flex';
        }
    }
}
