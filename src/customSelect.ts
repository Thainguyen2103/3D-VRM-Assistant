import { createIcons, icons } from 'lucide';

export function initCustomSelects() {
    const selects = document.querySelectorAll('select');
    
    // Đóng tất cả menu khác khi click ra ngoài
    document.addEventListener('click', (e) => {
        const customSelects = document.querySelectorAll('.custom-select-wrapper');
        customSelects.forEach(wrapper => {
            if (!wrapper.contains(e.target as Node)) {
                wrapper.classList.remove('open');
            }
        });
    });

    selects.forEach(select => {
        // Nếu đã bọc rồi thì bỏ qua
        if (select.parentElement?.classList.contains('custom-select-wrapper')) return;

        // 1. Tạo wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        // Copy width từ select cũ nếu có style inline, hoặc dùng class để flex
        if (select.style.width) {
            wrapper.style.width = select.style.width;
        }

        // Bọc select lại và ẩn nó đi
        select.parentNode?.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        select.style.display = 'none';

        // 2. Tạo phần hiển thị (Display)
        const display = document.createElement('div');
        display.className = 'custom-select-display';
        
        // Tạo span chứa text để update khi đổi ngôn ngữ
        const textSpan = document.createElement('span');
        
        // Sync text hiển thị ban đầu
        const updateDisplay = () => {
            const selectedOption = select.options[select.selectedIndex];
            
            display.innerHTML = '';
            const iconName = selectedOption.getAttribute('data-icon');
            const flagName = selectedOption.getAttribute('data-flag');
            if (iconName) {
                const iconEl = document.createElement('i');
                iconEl.setAttribute('data-lucide', iconName);
                display.style.display = 'flex';
                display.style.alignItems = 'center';
                display.style.gap = '8px';
                display.appendChild(iconEl);
            } else if (flagName) {
                const imgEl = document.createElement('img');
                imgEl.src = `https://flagcdn.com/w20/${flagName}.png`;
                imgEl.style.width = '20px';
                imgEl.style.height = 'auto';
                imgEl.style.borderRadius = '2px';
                display.style.display = 'flex';
                display.style.alignItems = 'center';
                display.style.gap = '8px';
                display.appendChild(imgEl);
            } else {
                display.style.display = '';
                display.style.alignItems = '';
                display.style.gap = '';
            }
            
            const textSpan = document.createElement('span');
            textSpan.textContent = selectedOption.textContent;
            if (selectedOption.hasAttribute('data-i18n')) {
                textSpan.setAttribute('data-i18n', selectedOption.getAttribute('data-i18n')!);
            }
            display.appendChild(textSpan);
            
            const arrow = document.createElement('div');
            arrow.className = 'custom-select-arrow';
            // Flex 1 to push arrow to the right if using flex
            if (iconName) {
                textSpan.style.flex = '1';
                textSpan.style.whiteSpace = 'nowrap';
                textSpan.style.overflow = 'hidden';
                textSpan.style.textOverflow = 'ellipsis';
            }
            arrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
            display.appendChild(arrow);
            
            if (iconName) {
                createIcons({ icons, root: display, nameAttr: 'data-lucide' });
            }
        };
        updateDisplay();
        
        select.addEventListener('change', () => {
            updateDisplay();
            if (optionsList) {
                Array.from(optionsList.children).forEach((c, idx) => {
                    if (idx === select.selectedIndex) c.classList.add('selected');
                    else c.classList.remove('selected');
                });
            }
        });

        wrapper.appendChild(display);

        // 3. Tạo danh sách các tùy chọn (Options list)
        const optionsList = document.createElement('div');
        optionsList.className = 'custom-select-options';
        
        const buildOptionsList = () => {
            optionsList.innerHTML = '';
            Array.from(select.options).forEach((option, index) => {
                const optDiv = document.createElement('div');
                optDiv.className = 'custom-select-option' + (index === select.selectedIndex ? ' selected' : '');
                
                const iconName = option.getAttribute('data-icon');
                const flagName = option.getAttribute('data-flag');
                if (iconName) {
                    const iconEl = document.createElement('i');
                    iconEl.setAttribute('data-lucide', iconName);
                    optDiv.style.display = 'flex';
                    optDiv.style.alignItems = 'center';
                    optDiv.style.gap = '8px';
                    optDiv.appendChild(iconEl);
                } else if (flagName) {
                    const imgEl = document.createElement('img');
                    imgEl.src = `https://flagcdn.com/w20/${flagName}.png`;
                    imgEl.style.width = '20px';
                    imgEl.style.height = 'auto';
                    imgEl.style.borderRadius = '2px';
                    optDiv.style.display = 'flex';
                    optDiv.style.alignItems = 'center';
                    optDiv.style.gap = '8px';
                    optDiv.appendChild(imgEl);
                }
                
                const textSpan = document.createElement('span');
                textSpan.textContent = option.textContent;
                if (option.hasAttribute('data-i18n')) {
                    textSpan.setAttribute('data-i18n', option.getAttribute('data-i18n')!);
                }
                optDiv.appendChild(textSpan);
                
                optDiv.addEventListener('click', () => {
                    select.selectedIndex = index;
                    // Trigger change event cho native select để các logic khác (như đổi ngôn ngữ) chạy
                    select.dispatchEvent(new Event('change'));
                    
                    // Cập nhật giao diện của custom select
                    updateDisplay();
                    Array.from(optionsList.children).forEach(c => c.classList.remove('selected'));
                    optDiv.classList.add('selected');
                    wrapper.classList.remove('open');
                });
                optionsList.appendChild(optDiv);
            });
            createIcons({ icons, root: optionsList, nameAttr: 'data-lucide' });
        };
        
        buildOptionsList();
        wrapper.appendChild(optionsList);

        // 4. Xử lý mở/đóng menu
        display.addEventListener('click', () => {
            const isOpen = wrapper.classList.contains('open');
            // Đóng tất cả menu khác
            document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
            
            if (!isOpen) {
                // Trước khi mở, build lại list để cập nhật ngôn ngữ nếu có đổi
                buildOptionsList();
                wrapper.classList.add('open');
            }
        });

        // 5. Nếu native select bị thay đổi bởi JS, cần sync lại
        select.addEventListener('change', () => {
            updateDisplay();
            buildOptionsList(); // re-render list with selected state
        });
    });
}
