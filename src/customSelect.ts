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
            textSpan.textContent = selectedOption.textContent;
            // Nếu option có data-i18n, gắn vào span để nó tự update ngôn ngữ
            if (selectedOption.hasAttribute('data-i18n')) {
                textSpan.setAttribute('data-i18n', selectedOption.getAttribute('data-i18n')!);
            } else {
                textSpan.removeAttribute('data-i18n');
            }
        };
        updateDisplay();
        display.appendChild(textSpan);
        
        // Nút mũi tên
        const arrow = document.createElement('div');
        arrow.className = 'custom-select-arrow';
        arrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
        display.appendChild(arrow);
        
        wrapper.appendChild(display);

        // 3. Tạo danh sách các tùy chọn (Options list)
        const optionsList = document.createElement('div');
        optionsList.className = 'custom-select-options';
        
        const buildOptionsList = () => {
            optionsList.innerHTML = '';
            Array.from(select.options).forEach((option, index) => {
                const optDiv = document.createElement('div');
                optDiv.className = 'custom-select-option' + (index === select.selectedIndex ? ' selected' : '');
                optDiv.textContent = option.textContent;
                
                if (option.hasAttribute('data-i18n')) {
                    optDiv.setAttribute('data-i18n', option.getAttribute('data-i18n')!);
                }
                
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
