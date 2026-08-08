export class SearchFilterController {
    static setup() {
        const searchCharacterInput = document.getElementById('search-character') as HTMLInputElement;
        if (searchCharacterInput) {
            searchCharacterInput.addEventListener('input', () => {
                const query = searchCharacterInput.value.toLowerCase();
                const grid = document.getElementById('discover-list-container');
                if (!grid) return;
                const cards = grid.querySelectorAll('.model-card');
                cards.forEach(card => {
                    const el = card as HTMLElement;
                    const name = (el.dataset.name || '').toLowerCase();
                    const trait = (el.dataset.trait || '').toLowerCase();
                    if (name.includes(query) || trait.includes(query)) {
                        el.style.display = 'flex';
                    } else {
                        el.style.display = 'none';
                    }
                });
            });
        }

        const searchAnimationInput = document.getElementById('search-animation') as HTMLInputElement;
        const filterAnimationSelect = document.getElementById('filter-animation-select') as HTMLSelectElement;

        function filterAnimations() {
            const query = (searchAnimationInput?.value || '').toLowerCase();
            const category = filterAnimationSelect?.value || 'all';
            const grid = document.getElementById('animation-grid');
            if (!grid) return;

            const cards = grid.querySelectorAll('.animation-card');
            cards.forEach(card => {
                const el = card as HTMLElement;
                const name = (el.dataset.name || '').toLowerCase();
                const cat = el.dataset.category || '';
                const desc = (el.dataset.desc || '').toLowerCase();
                
                const matchQuery = name.includes(query) || desc.includes(query);
                const matchCategory = category === 'all' || cat === category;

                if (matchQuery && matchCategory) {
                    el.style.display = 'flex';
                } else {
                    el.style.display = 'none';
                }
            });
        }

        if (searchAnimationInput) {
            searchAnimationInput.addEventListener('input', filterAnimations);
        }
        if (filterAnimationSelect) {
            filterAnimationSelect.addEventListener('change', filterAnimations);
        }
    }
}
