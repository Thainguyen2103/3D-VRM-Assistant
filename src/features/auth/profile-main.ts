import { initAuth } from '@/core/auth';
import { setupProfileUI } from '@/features/auth/profile';
import '@/style.css'; // or create a specific profile.css if needed

async function initProfilePage() {
    await initAuth();
    setupProfileUI();

    const btnBack = document.getElementById('btn-back-home');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            window.location.href = '/';
        });
    }
}

initProfilePage();
