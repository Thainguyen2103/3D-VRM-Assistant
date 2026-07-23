import { createClient } from '@supabase/supabase-js';
import { translations, applyLanguage, t } from './i18n';
import { initCustomSelects } from './customSelect';
import { CustomDialog } from './ui/CustomDialog';
import { createIcons, icons } from 'lucide';

// Khởi tạo icons cho lucide
createIcons({ icons });

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: { log_level: 'info' },
    })
  : null;

// ──────────────────────────────────────────
// 1. Khởi tạo ngôn ngữ
// ──────────────────────────────────────────
function getSavedLang(): string {
  try {
    const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
    return settings.language || 'vi';
  } catch { return 'vi'; }
}

const langSelect = document.getElementById('login-language-select') as HTMLSelectElement;
let currentLang = getSavedLang();
if (langSelect) {
  langSelect.value = currentLang;
  langSelect.addEventListener('change', (e) => {
    currentLang = (e.target as HTMLSelectElement).value;
    saveLang(currentLang);
    applyLanguage(currentLang);
  });
}
// Áp dụng custom select UI
initCustomSelects();

applyLanguage(currentLang);

function saveLang(lang: string) {
  try {
    const s = JSON.parse(localStorage.getItem('app_settings') || '{}');
    s.language = lang;
    localStorage.setItem('app_settings', JSON.stringify(s));
  } catch {}
}

// ──────────────────────────────────────────
// 2. Helper: hiển thị overlay loading
// ──────────────────────────────────────────
function showLoading(msgKey = 'auth.logging_in') {
  const overlay = document.getElementById('loading-overlay')!;
  const txt = document.getElementById('loading-overlay-text')!;
  txt.textContent = t(msgKey);
  overlay.classList.add('show');
}

// ──────────────────────────────────────────
// 3. Kiểm tra đã đăng nhập chưa → redirect
// ──────────────────────────────────────────
(async () => {
  if (!supabase) {
    // Không có Supabase config → vào guest
    sessionStorage.setItem('guest_welcomed', 'true');
    window.location.replace('/');
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    // Đã đăng nhập rồi → về trang chính
    showLoading('auth.redirecting');
    window.location.replace('/');
    return;
  }
})();

// ──────────────────────────────────────────
// 4. Chuyển đổi Login ↔ Register
// ──────────────────────────────────────────
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

// ──────────────────────────────────────────
// 5. Đăng nhập bằng Email/Password
// ──────────────────────────────────────────
document.getElementById('btn-login-submit')?.addEventListener('click', async () => {
  if (!supabase) return;
  const email = (document.getElementById('login-email') as HTMLInputElement).value.trim();
  const password = (document.getElementById('login-password') as HTMLInputElement).value;

  if (!email || !password) { await CustomDialog.alert(t('alert.fill_info')); return; }

  const btn = document.getElementById('btn-login-submit') as HTMLButtonElement;
  const orig = btn.textContent;
  btn.textContent = '...';
  btn.disabled = true;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    await CustomDialog.alert(t('alert.login_failed') + error.message);
    btn.textContent = orig;
    btn.disabled = false;
  } else {
    showLoading('auth.redirecting');
    window.location.replace('/');
  }
});

// ──────────────────────────────────────────
// 6. Đăng ký tài khoản mới
// ──────────────────────────────────────────
document.getElementById('btn-register-submit')?.addEventListener('click', async () => {
  if (!supabase) return;
  const email = (document.getElementById('register-email') as HTMLInputElement).value.trim();
  const password = (document.getElementById('register-password') as HTMLInputElement).value;
  const confirm = (document.getElementById('register-password-confirm') as HTMLInputElement).value;

  if (!email || !password || !confirm) { await CustomDialog.alert(t('alert.fill_info')); return; }
  if (password !== confirm) { await CustomDialog.alert(t('alert.pass_mismatch')); return; }

  const btn = document.getElementById('btn-register-submit') as HTMLButtonElement;
  const orig = btn.textContent;
  btn.textContent = '...';
  btn.disabled = true;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    await CustomDialog.alert(t('alert.reg_failed') + error.message);
    btn.textContent = orig;
    btn.disabled = false;
  } else {
    await CustomDialog.alert(t('alert.reg_success'));
    if (data.user) {
      showLoading('auth.redirecting');
      window.location.replace('/');
    } else {
      btn.textContent = orig;
      btn.disabled = false;
    }
  }
});

// ──────────────────────────────────────────
// 7. Google OAuth
// ──────────────────────────────────────────
document.getElementById('btn-google-login')?.addEventListener('click', async () => {
  if (!supabase) return;
  showLoading('auth.redirecting');
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/' }
  });
});

// ──────────────────────────────────────────
// 8. Chế độ Khách
// ──────────────────────────────────────────
document.getElementById('btn-guest')?.addEventListener('click', () => {
  sessionStorage.setItem('guest_welcomed', 'true');
  showLoading('auth.redirecting');
  window.location.replace('/');
});
