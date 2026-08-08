export class ListController {
    static getI18nKeyForTag(val: string): string {
        const map: any = {
            'Tuổi teen': 'discover.upload.opt.type.teen',
            'Nhỏ nhắn': 'discover.upload.opt.type.loli',
            'Trưởng thành': 'discover.upload.opt.type.adult',
            'Quyến rũ': 'discover.upload.opt.type.mommy',
            'Chị gái': 'discover.upload.opt.type.oneesan',
            'Đầu to': 'discover.upload.opt.type.chibi',
            'Vui vẻ': 'discover.upload.opt.trait.happy',
            'Dịu dàng': 'discover.upload.opt.trait.gentle',
            'Kuudere': 'discover.upload.opt.trait.cold',
            'Tsundere': 'discover.upload.opt.trait.tsundere',
            'Yandere': 'discover.upload.opt.trait.yandere',
            'Dandere': 'discover.upload.opt.trait.shy',
            'Tự tạo': 'discover.upload.opt.source.self',
            'Original': 'discover.upload.opt.origin.original',
            'Original (Tự sáng tác)': 'discover.upload.opt.origin.original'
        };
        return map[val] || '';
    }

    static parseTrait(traitRaw: string) {
        const normalized = traitRaw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const parts = normalized.split('\n\n');
        const topPart = (parts[0] || '').trim();
        const lines = topPart.split('\n').map(l => l.trim()).filter(l => l);
        const firstLine = lines[0] || '';
        let gender = '', type = '', personality = '', origin = '';

        const match = firstLine.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
            const prefix = match[1].trim();
            personality = match[2].trim();
            const prefixParts = prefix.split(' - ').map(p => p.trim());
            if (prefixParts.length === 2) { gender = prefixParts[0]; type = prefixParts[1]; }
            else if (prefixParts.length === 1) {
                if (['Nữ', 'Nam', 'Khác'].includes(prefixParts[0])) gender = prefixParts[0];
                else type = prefixParts[0];
            }
        } else { personality = firstLine; }

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('Nguồn gốc nhân vật: ')) origin = line.replace('Nguồn gốc nhân vật: ', '');
        }
        return { gender, type, personality, origin };
    }

    static genderIcon(gender: string, size = 18) {
        if (gender === 'Nữ') return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="#ffb4c8" stroke="#222" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15v7"/><path d="M9 19h6"/><circle cx="12" cy="9" r="6"/></svg>`;
        if (gender === 'Nam') return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="#b4d2ff" stroke="#222" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="m21 3-6.5 6.5"/><circle cx="10" cy="14" r="6"/></svg>`;
        return '';
    }

    static buildCardHTML(char: any, uploaderName: string, uploaderAvatar: string, showSaveBtn: boolean, isSaved: boolean = false) {
        const trait = char.trait || '';
        const vrmUrl = char.model_url || char.vrm_url || '';
        const { gender, type, personality, origin } = ListController.parseTrait(trait);
        const gIcon = ListController.genderIcon(gender, 20);

        const lucideSparkles = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
        const lucideGamepad = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>`;
        const lucideCheck = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px;"><path d="M20 6 9 17l-5-5"/></svg>`;

        return `
        <div class="model-card discover-card"
            data-id="${char.id}"
            data-name="${char.name || ''}"
            data-icon="${char.icon_url || ''}"
            data-vrm="${vrmUrl}"
            data-trait="${trait.replace(/"/g, '&quot;').replace(/\n/g, '&#10;')}"
            data-voice="${char.voice_model_id || ''}"
            data-creator-name="${uploaderName}"
            data-creator-avatar="${uploaderAvatar}"
            data-creator-id="${char.creator_id || ''}"
            style="background: #fff; border: 3px solid #222; border-radius: 24px; overflow: hidden; box-shadow: 4px 6px 0px #222; transition: all 0.2s; cursor: pointer; display: flex; flex-direction: column; position: relative; padding: 24px 16px; align-items: center; text-align: center;"
            onmouseover="this.style.transform='translate(-2px, -2px)'; this.style.boxShadow='6px 8px 0px #222';"
            onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='4px 6px 0px #222';">
            
            <!-- Cấu trúc CSS Blur để lấy màu chủ đạo từ Avatar -->
            <img src="${char.icon_url || '/favicon.png'}" alt="" style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; object-fit: cover; filter: blur(40px) saturate(1.5); opacity: 0.45; z-index: 0; pointer-events: none;" crossorigin="anonymous" />
            
            <div style="position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; width: 100%; flex-grow: 1;">
                
                <!-- Avatar Tròn, Lớn -->
                <div style="width: 110px; height: 110px; border-radius: 50%; background: #fff; border: 3px solid #222; overflow: hidden; margin-bottom: 16px; box-shadow: 2px 4px 0px #222; flex-shrink: 0;">
                    <img src="${char.icon_url || '/favicon.png'}" alt="${char.name || ''}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/favicon.png'" />
                </div>
                
                <!-- Tên & Giới Tính -->
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 14px; width: 100%;">
                    <h4 style="margin: 0; color: #222; font-size: 1.25rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%;">${char.name || 'Unknown'}</h4>
                    ${gIcon ? `<div style="display: flex; align-items: center; justify-content: center; transform: translateY(1px);">${gIcon}</div>` : ''}
                </div>
                
                <!-- Tags -->
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-bottom: 20px;">
                    ${type ? `<span data-i18n="${this.getI18nKeyForTag(type)}" style="background: white; border: 2px solid #222; color: #222; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; box-shadow: 1px 2px 0px #222; display: flex; align-items: center;">${type}</span>` : ''}
                    ${personality ? `<span data-i18n="${this.getI18nKeyForTag(personality)}" style="background: white; border: 2px solid #222; color: #222; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; box-shadow: 1px 2px 0px #222; display: flex; align-items: center;">${lucideSparkles}${personality}</span>` : ''}
                    ${origin ? `<span data-i18n="${this.getI18nKeyForTag(origin)}" style="background: white; border: 2px solid #222; color: #222; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; box-shadow: 1px 2px 0px #222; display: flex; align-items: center;">${lucideGamepad}${origin}</span>` : ''}
                </div>
                
                <!-- Save Button -->
                <div style="margin-top: auto; width: 100%;">
                    ${showSaveBtn ? (isSaved ? 
                        `<button class="btn-save-character" data-id="${char.id}" data-saved="true" style="width: 100%; padding: 10px; border-radius: 14px; border: 3px solid #222; background: #e8f5e9; color: #2e7d32; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: 0.2s; box-shadow: 2px 3px 0px #222; display: flex; align-items: center; justify-content: center;"><span class="save-text-normal" data-i18n="discover.list.btn_saved">Đã lưu ${lucideCheck}</span><span class="save-text-hover" data-i18n="discover.list.btn_unsave">Bỏ lưu</span></button>` :
                        `<button class="btn-save-character" data-id="${char.id}" data-saved="false" style="width: 100%; padding: 10px; border-radius: 14px; border: 3px solid #222; background: #c5cae9; color: #222; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: 0.2s; box-shadow: 2px 3px 0px #222;"><span class="save-text-normal" data-i18n="discover.list.btn_save">Lưu nhân vật</span></button>`) : ''}
                </div>
            </div>
        </div>`;
    }
}