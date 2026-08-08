export class ModalsController {
    static setupModals() {
        // --- Voice Guide Modal Setup ---
        const btnVoiceGuide = document.getElementById('btn-voice-guide');
        const guideModal = document.getElementById('guide-modal');
        const btnCloseGuide = document.getElementById('btn-close-guide');

        if (btnVoiceGuide && guideModal && btnCloseGuide) {
            btnVoiceGuide.addEventListener('click', () => {
                guideModal.style.display = 'flex';
            });

            btnCloseGuide.addEventListener('click', () => {
                guideModal.style.display = 'none';
            });

            guideModal.addEventListener('click', (e) => {
                if (e.target === guideModal) {
                    guideModal.style.display = 'none';
                }
            });
        }

        // --- VRM Guide Modal Setup ---
        const btnVrmGuide = document.getElementById('btn-vrm-guide');
        const vrmGuideModal = document.getElementById('vrm-guide-modal');
        const btnCloseVrmGuide = document.getElementById('btn-close-vrm-guide');

        if (btnVrmGuide && vrmGuideModal && btnCloseVrmGuide) {
            btnVrmGuide.addEventListener('click', () => {
                vrmGuideModal.style.display = 'flex';
            });

            btnCloseVrmGuide.addEventListener('click', () => {
                vrmGuideModal.style.display = 'none';
            });

            vrmGuideModal.addEventListener('click', (e) => {
                if (e.target === vrmGuideModal) {
                    vrmGuideModal.style.display = 'none';
                }
            });
        }

        // --- Anim Guide Modal Setup ---
        const btnAnimGuide = document.getElementById('btn-anim-guide');
        const animGuideModal = document.getElementById('anim-guide-modal');
        const btnCloseAnimGuide = document.getElementById('btn-close-anim-guide');

        if (btnAnimGuide && animGuideModal && btnCloseAnimGuide) {
            btnAnimGuide.addEventListener('click', () => {
                animGuideModal.style.display = 'flex';
            });

            btnCloseAnimGuide.addEventListener('click', () => {
                animGuideModal.style.display = 'none';
            });

            animGuideModal.addEventListener('click', (e) => {
                if (e.target === animGuideModal) {
                    animGuideModal.style.display = 'none';
                }
            });
        }

        // --- Terms Guide Modal Setup ---
        const btnTermsGuides = document.querySelectorAll('.btn-terms-guide');
        const termsGuideModal = document.getElementById('terms-guide-modal');
        const btnCloseTermsGuide = document.getElementById('btn-close-terms-guide');

        if (termsGuideModal && btnCloseTermsGuide) {
            btnTermsGuides.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const type = (e.currentTarget as HTMLElement).getAttribute('data-type');
                    const detailShare = document.getElementById('term-detail-share');
                    const detailCopyright = document.getElementById('term-detail-copyright');
                    const detailGuidelines = document.getElementById('term-detail-guidelines');
                    const detailCommercial = document.getElementById('term-detail-commercial');
                    
                    if (detailShare && detailCopyright && detailGuidelines && detailCommercial) {
                        detailShare.style.display = type === 'share' ? 'block' : 'none';
                        detailCopyright.style.display = type === 'copyright' ? 'block' : 'none';
                        detailGuidelines.style.display = type === 'guidelines' ? 'block' : 'none';
                        detailCommercial.style.display = type === 'commercial' ? 'block' : 'none';
                    }
                    
                    termsGuideModal.style.display = 'flex';
                });
            });

            btnCloseTermsGuide.addEventListener('click', () => {
                termsGuideModal.style.display = 'none';
            });

            termsGuideModal.addEventListener('click', (e) => {
                if (e.target === termsGuideModal) {
                    termsGuideModal.style.display = 'none';
                }
            });
        }
    }
}
