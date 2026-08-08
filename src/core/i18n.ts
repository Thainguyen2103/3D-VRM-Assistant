import { MODEL_CITLALI, normalizeModelUrl, isXianyunModel, isLaumaModel, isNahidaModel, isYaeMikoModel } from '@/core/constants';

import vi from '@/locales/vi.json';
import en from '@/locales/en.json';
import ja from '@/locales/ja.json';
import zh from '@/locales/zh.json';
import ko from '@/locales/ko.json';

export const translations: Record<string, Record<string, string>> = {
  vi,
  en,
  ja,
  zh,
  ko,
};
;

// Khởi tạo trạng thái ngôn ngữ ban đầu từ localStorage
let currentLanguageState = 'vi';
try {
    const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
    if (settings.language) currentLanguageState = settings.language;
} catch(e) {}

export function t(key: string): string {
  const dict = translations[currentLanguageState] || translations['vi'];
  return dict[key] || key;
}

export function applyLanguage(lang: string) {
  currentLanguageState = lang;
  const tDict = translations[lang] || translations['vi'];
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key && tDict[key]) {
      if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
        (el as HTMLInputElement).placeholder = tDict[key];
      } else {
        el.innerHTML = tDict[key];
      }
    }
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key && tDict[key]) {
      el.setAttribute('title', tDict[key]);
    }
  });

  // Update document title if needed
  if (tDict['ui.title']) {
      document.title = tDict['ui.title'];
  }

  // Cập nhật thuộc tính lang của HTML để trình duyệt render font CJK chuẩn xác
  let htmlLang = lang;
  if (lang === 'zh') htmlLang = 'zh-CN';
  else if (lang === 'ja') htmlLang = 'ja-JP';
  else if (lang === 'ko') htmlLang = 'ko-KR';
  else if (lang === 'vi') htmlLang = 'vi-VN';
  document.documentElement.lang = htmlLang;

  // Cập nhật class trên body để CSS áp dụng đúng font
  document.body.classList.remove('lang-vi', 'lang-en', 'lang-zh', 'lang-ja', 'lang-ko');
  document.body.classList.add(`lang-${lang}`);
  updateChatUIForModel();
}

let initialModel = MODEL_CITLALI;
try {
  const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
  if (settings.model) {
    initialModel = normalizeModelUrl(settings.model);
  }
} catch (e) {}
export let activeModelUrl = initialModel;

export function updateChatUIForModel(url?: string) {
  if (url) {
    activeModelUrl = normalizeModelUrl(url);
  }
  let customMeta: any = null;
  try {
    const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
    if (settings.customModelMeta && settings.customModelMeta.url === activeModelUrl) {
      customMeta = settings.customModelMeta;
    }
  } catch (e) {}

  const isXianyun = isXianyunModel(activeModelUrl);
  const isLauma = isLaumaModel(activeModelUrl);
  const isNahida = isNahidaModel(activeModelUrl);
  const isYaeMiko = isYaeMikoModel(activeModelUrl);
  const isCitlali = !isXianyun && !isLauma && !isNahida && !isYaeMiko && !customMeta;
  
  document.body.classList.remove('theme-citlali', 'theme-xianyun', 'theme-lauma', 'theme-nahida', 'theme-yaemiko', 'theme-pyro', 'theme-hydro', 'theme-anemo', 'theme-electro', 'theme-dendro', 'theme-cryo', 'theme-geo');
  if (isXianyun) document.body.classList.add('theme-xianyun');
  else if (isLauma) document.body.classList.add('theme-lauma');
  else if (isNahida) document.body.classList.add('theme-nahida');
  else if (isYaeMiko) document.body.classList.add('theme-yaemiko');
  else {
      if (customMeta && customMeta.theme) {
          document.body.classList.add(`theme-${customMeta.theme}`);
      } else {
          document.body.classList.add('theme-citlali'); // Fallback theme for custom models
      }
  }

  const tDict = translations[currentLanguageState] || translations['vi'];
  const chatTitleEl = document.querySelector('.chat-title');
  const chatInputEl = document.getElementById('chat-input') as HTMLTextAreaElement;
  const initialMsgDiv = document.getElementById('initial-msg');

  if (chatTitleEl) {
    if (isXianyun) chatTitleEl.textContent = tDict['chat.title.xianyun'] || '☁️ Xianyun Chat ☁️';
    else if (isLauma) chatTitleEl.textContent = tDict['chat.title.lauma'] || '🌙 Lauma Chat 🌙';
    else if (isNahida) chatTitleEl.textContent = tDict['chat.title.nahida'] || '🌿 Nahida Chat 🌿';
    else if (isYaeMiko) chatTitleEl.textContent = tDict['chat.title.yaemiko'] || '🦊 Yae Miko Chat 🦊';
    else if (customMeta) chatTitleEl.textContent = `🌸 ${customMeta.name} Chat 🌸`;
    else chatTitleEl.textContent = tDict['chat.title'];
  }
  if (chatInputEl) {
    if (isXianyun) chatInputEl.placeholder = tDict['chat.placeholder.xianyun'] || 'Hãy nói cho bản tiên nghe...';
    else if (isLauma) chatInputEl.placeholder = tDict['chat.placeholder.lauma'] || 'Hãy nói cho tôi nghe...';
    else if (isNahida) chatInputEl.placeholder = tDict['chat.placeholder.nahida'] || 'Nói cho Tiểu Tiểu nghe đi...';
    else if (isYaeMiko) chatInputEl.placeholder = tDict['chat.placeholder.yaemiko'] || 'Nói gì thú vị đi...';
    else if (customMeta) chatInputEl.placeholder = `Nói gì đó với ${customMeta.name}...`;
    else chatInputEl.placeholder = tDict['chat.placeholder'];
  }
  if (initialMsgDiv) {
    if (isXianyun) initialMsgDiv.textContent = tDict['chat.initial.xianyun'] || 'Bản tiên là Lưu Vân Tá Phong Chân Quân...';
    else if (isLauma) initialMsgDiv.textContent = tDict['chat.initial.lauma'] || 'Tôi là Nguyệt Ca Sư Lauma...';
    else if (isNahida) initialMsgDiv.textContent = tDict['chat.initial.nahida'] || 'Ư! Lữ khách đến rồi! 🌿';
    else if (isYaeMiko) initialMsgDiv.textContent = tDict['chat.initial.yaemiko'] || 'Bản cung là Bát Trọng Thần Tử...';
    else if (customMeta) initialMsgDiv.textContent = `Xin chào, tôi là ${customMeta.name}.`;
    else initialMsgDiv.textContent = tDict['chat.initial'];
  }
  const switchModelAvatarEl = document.getElementById('btn-switch-model-avatar') as HTMLImageElement;
  const switchModelCircleEl = document.getElementById('btn-switch-model-circle') as HTMLElement;
  if (switchModelAvatarEl) {
    if (isXianyun) switchModelAvatarEl.src = '/Icon_Models/xianyun_icon.jpg';
    else if (isLauma) switchModelAvatarEl.src = '/Icon_Models/lauma_icon.jpg';
    else if (isNahida) switchModelAvatarEl.src = '/Icon_Models/nahida_icon.jpg';
    else if (isYaeMiko) switchModelAvatarEl.src = '/Icon_Models/yaemiko_icon.jpg';
    else if (customMeta && customMeta.icon_url) switchModelAvatarEl.src = customMeta.icon_url;
    else switchModelAvatarEl.src = '/Icon_Models/citlali_icon.jpg';
  }
  if (switchModelCircleEl) {
    if (isXianyun) switchModelCircleEl.style.borderColor = '#4dd0e1';
    else if (isLauma) switchModelCircleEl.style.borderColor = '#81c784';
    else if (isNahida) switchModelCircleEl.style.borderColor = '#66bb6a';
    else if (isYaeMiko) switchModelCircleEl.style.borderColor = '#ffb6c1';
    else if (customMeta && customMeta.theme) {
      const colors: any = { pyro: '#e53935', hydro: '#1e88e5', anemo: '#26a69a', electro: '#8e24aa', dendro: '#7cb342', cryo: '#4dd0e1', geo: '#fbc02d', citlali: '#7986cb' };
      switchModelCircleEl.style.borderColor = colors[customMeta.theme] || '#9e9e9e';
    }
    else if (customMeta) switchModelCircleEl.style.borderColor = '#9e9e9e';
    else switchModelCircleEl.style.borderColor = '#7986cb';
  }

  const themeBtn = document.getElementById('btn-theme-selector');
  if (themeBtn) {
      themeBtn.style.display = customMeta ? 'flex' : 'none';
  }
}

