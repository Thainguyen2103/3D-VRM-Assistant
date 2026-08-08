export class UploadController {
    static setupCustomSelect(selectId: string) {
        const selectEl = document.getElementById(selectId) as HTMLSelectElement;
        if (!selectEl) return;

        let wrapper = selectEl.nextElementSibling as HTMLElement;
        if (wrapper && wrapper.classList.contains('custom-select-wrapper')) {
            const optionsContainer = wrapper.querySelector('.custom-options') as HTMLElement;
            optionsContainer.innerHTML = '';
            Array.from(selectEl.options).forEach((opt, index) => {
                const optionEl = document.createElement('div');
                optionEl.className = 'custom-option' + (index === selectEl.selectedIndex ? ' selected' : '');
                optionEl.textContent = opt.text;
                optionEl.dataset.value = opt.value;
                optionEl.addEventListener('click', () => {
                    selectEl.value = opt.value;
                    wrapper.querySelector('span')!.textContent = opt.text;
                    optionsContainer.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
                    optionEl.classList.add('selected');
                    wrapper.classList.remove('open');
                    selectEl.dispatchEvent(new Event('change'));
                });
                optionsContainer.appendChild(optionEl);
            });
            wrapper.querySelector('span')!.textContent = selectEl.options[selectEl.selectedIndex]?.text || '';
            return;
        }

        wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        trigger.innerHTML = `<span>${selectEl.options[selectEl.selectedIndex]?.text || ''}</span><div class="arrow"></div>`;
        
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-options';
        
        Array.from(selectEl.options).forEach((opt, index) => {
            const optionEl = document.createElement('div');
            optionEl.className = 'custom-option' + (index === selectEl.selectedIndex ? ' selected' : '');
            optionEl.textContent = opt.text;
            optionEl.dataset.value = opt.value;
            optionEl.addEventListener('click', () => {
                selectEl.value = opt.value;
                trigger.querySelector('span')!.textContent = opt.text;
                optionsContainer.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
                optionEl.classList.add('selected');
                wrapper.classList.remove('open');
                selectEl.dispatchEvent(new Event('change'));
            });
            optionsContainer.appendChild(optionEl);
        });
        
        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsContainer);
        
        selectEl.style.display = 'none';
        selectEl.parentNode?.insertBefore(wrapper, selectEl.nextSibling);
        
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
                if (w !== wrapper) w.classList.remove('open');
            });
            wrapper.classList.toggle('open');
        });
        
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target as Node)) {
                wrapper.classList.remove('open');
            }
        });

        // Hide wrapper if 'Khác' is selected (handled by existing logic, but we need to hide the wrapper instead of selectEl)
        selectEl.addEventListener('change', () => {
            if (selectEl.value === 'Khác') {
                wrapper.style.display = 'none';
            }
        });
    }

    static setupDragAndDrop(dropzoneId: string, inputId: string) {
        const dropzone = document.getElementById(dropzoneId);
        const input = document.getElementById(inputId) as HTMLInputElement;

        if (!dropzone || !input) return;

        const preventDefaults = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
        };

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
        });

        dropzone.addEventListener('drop', (e: DragEvent) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length > 0) {
                input.files = dt.files;
                input.dispatchEvent(new Event('change'));
            }
        }, false);
    }
}