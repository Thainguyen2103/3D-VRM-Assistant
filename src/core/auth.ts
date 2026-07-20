import { createClient } from '@supabase/supabase-js';
import { setupChatbot, triggerProactiveChat, loadChatHistory } from '../ui/chatbot';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export let currentUser: any = null;

export async function initAuth() {
    if (!supabase) {
        console.warn("Supabase is not configured. Falling back to guest mode.");
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.style.display = 'none';
        setupChatbot();
        return;
    }

    // Always fetch session first
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;

        // Tải avatar để hiển thị ở nút Hồ sơ
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
    }

    // Now handle UI updates
    const authModal = document.getElementById('auth-modal');
    const btnProfile = document.getElementById('btn-profile');
    const btnLogout = document.getElementById('btn-logout');

    function updateProfileUI() {
        const btnLoginHeader = document.getElementById('btn-login-header');
        if (currentUser && supabase && btnProfile) {
            btnProfile.style.display = 'flex';
            if (btnLoginHeader) btnLoginHeader.style.display = 'none';
            // Ensure listener is only added once
            btnProfile.onclick = () => {
                window.location.href = '/profile.html';
            };
        } else {
            if (btnProfile) btnProfile.style.display = 'none';
            if (btnLoginHeader) {
                btnLoginHeader.style.display = 'flex';
                btnLoginHeader.onclick = () => {
                    const modal = document.getElementById('auth-modal');
                    if (modal) modal.style.display = 'flex';
                };
            }
        }
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if (supabase) await supabase.auth.signOut();
            window.location.href = '/';
        });
    }

    if (authModal) {
        if (session) {
            authModal.style.display = 'none';
            updateProfileUI();
            await setupChatbot();
            triggerProactiveChat('welcome');
        } else if (sessionStorage.getItem('guest_welcomed')) {
            // Đã chọn chế độ khách trong session này, không hiện lại modal bắt đăng nhập nữa
            authModal.style.display = 'none';
            updateProfileUI();
            await setupChatbot();
        } else {
            authModal.style.display = 'flex';
            updateProfileUI();
        }
    }

    // Chuyển đổi giữa Đăng nhập và Đăng ký
    document.getElementById('link-to-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-view')!.style.display = 'none';
        document.getElementById('register-view')!.style.display = 'block';
    });
    
    document.getElementById('link-to-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-view')!.style.display = 'none';
        document.getElementById('login-view')!.style.display = 'block';
    });

    // Event listener cho nút đăng nhập
    document.getElementById('btn-login-submit')?.addEventListener('click', async () => {
        const email = (document.getElementById('login-email') as HTMLInputElement).value;
        const password = (document.getElementById('login-password') as HTMLInputElement).value;
        
        if (!email || !password) {
            alert('Vui lòng nhập đủ email và mật khẩu');
            return;
        }

        const btn = document.getElementById('btn-login-submit') as HTMLButtonElement;
        const originalText = btn.innerText;
        btn.innerText = 'Đang xử lý...';
        btn.disabled = true;

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert('Đăng nhập thất bại: ' + error.message);
            btn.innerText = originalText;
            btn.disabled = false;
        } else {
            currentUser = data.user;
            if (authModal) authModal.style.display = 'none';
            updateProfileUI();
            await setupChatbot();
            triggerProactiveChat('welcome');
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });

    // Event listener cho nút đăng ký
    document.getElementById('btn-register-submit')?.addEventListener('click', async () => {
        const email = (document.getElementById('register-email') as HTMLInputElement).value;
        const password = (document.getElementById('register-password') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('register-password-confirm') as HTMLInputElement).value;
        
        if (!email || !password || !confirmPassword) {
            alert('Vui lòng điền đầy đủ thông tin');
            return;
        }

        if (password !== confirmPassword) {
            alert('Mật khẩu nhập lại không khớp!');
            return;
        }

        const btn = document.getElementById('btn-register-submit') as HTMLButtonElement;
        const originalText = btn.innerText;
        btn.innerText = 'Đang xử lý...';
        btn.disabled = true;

        const { data: regData, error: regError } = await supabase.auth.signUp({ email, password });
        if (regError) {
            alert('Đăng ký thất bại: ' + regError.message);
            btn.innerText = originalText;
            btn.disabled = false;
        } else {
            alert('Đăng ký thành công!');
            if (regData.user) {
                currentUser = regData.user;
                if (authModal) authModal.style.display = 'none';
                updateProfileUI();
                await setupChatbot();
                triggerProactiveChat('welcome');
            }
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });

    // Event listener Google Login
    document.getElementById('btn-google-login')?.addEventListener('click', async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
    });

    // Event listener Guest
    document.getElementById('btn-guest')?.addEventListener('click', async () => {
        if (authModal) authModal.style.display = 'none';
        updateProfileUI(); // Show login header button
        await setupChatbot();
        
        // Prevent proactive chat spam if they just refreshed the page in guest mode
        if (!sessionStorage.getItem('guest_welcomed')) {
            triggerProactiveChat('welcome');
            sessionStorage.setItem('guest_welcomed', 'true');
        }
    });
}
