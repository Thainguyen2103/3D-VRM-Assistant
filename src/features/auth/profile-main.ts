import { initAuth } from '@/core/auth';
import { setupProfileUI } from '@/features/auth/profile';
import 'cropperjs/dist/cropper.css';
import '/src/styles/profile.css';


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
