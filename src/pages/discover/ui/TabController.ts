export class TabController {
    static switchTab(tabId: string) {
        const targetBtn = document.querySelector(`.tab-btn[data-tab="tab-${tabId}"]`) as HTMLElement;
        if (targetBtn) {
            targetBtn.click();
        } else {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const contentToShow = document.getElementById(`tab-${tabId}`);
            if (contentToShow) contentToShow.classList.add('active');
        }
    }
}
