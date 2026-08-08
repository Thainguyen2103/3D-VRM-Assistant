import { currentUser, supabase } from '@/core/auth';
import { getCurrentUserProfile, fetchCurrentUserProfileState } from '@/features/auth/profile';
import { CustomDialog } from '@/components/custom-dialog';
import { t, activeModelUrl, updateChatUIForModel } from '@/core/i18n';
import { isXianyunModel, isLaumaModel, isNahidaModel, isYaeMikoModel } from '@/core/constants';


export let chatHistory: any[] = [];
export let currentSessionId: string | null = null;
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// Fetch the user's saved community animations to pass to the AI system prompt
async function fetchSavedAnimationsForChat(): Promise<{ name: string; file_url: string; description: string; category: string }[]> {
  try {
    const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
    if (!session?.user?.id) return [];
    const res = await fetch(`${BACKEND_URL}/api/animations/my-saved?creator_id=${session.user.id}`);
    if (!res.ok) return [];
    const anims: any[] = await res.json();
    return (anims || []).map(a => ({
      name: a.name || '',
      file_url: a.file_url || '',
      description: a.description || '',
      category: a.category || ''
    }));
  } catch (_) {
    return [];
  }
}


let idleTimer: any = null;
const IDLE_TIME_MS = 60000; // 1 phút (60000ms) nhàn rỗi sẽ gọi proactive chat

export function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    triggerProactiveChat('idle');
  }, IDLE_TIME_MS);
}

let isIdleEventSetup = false;

export function setupIdleEvents() {
  if (isIdleEventSetup) return;
  window.addEventListener('mousemove', resetIdleTimer);
  window.addEventListener('keydown', resetIdleTimer);
  window.addEventListener('click', resetIdleTimer);
  isIdleEventSetup = true;
}

const appendMsg = (text: string, isUser: boolean, modelUrl?: string): HTMLElement | null => {
  const historyDiv = document.getElementById("chat-history") as HTMLDivElement;
  if (!historyDiv) return null;
  
  const rowDiv = document.createElement("div");
  rowDiv.className = `chat-msg-row ${isUser ? 'user' : 'ai'}`;
  
  if (!isUser) {
    const model = modelUrl || activeModelUrl;
    let customMeta: any = null;
    try {
      const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
      if (settings.customModelMeta && settings.customModelMeta.url === model) {
        customMeta = settings.customModelMeta;
      }
    } catch (e) {}

    const isXianyun = isXianyunModel(model);
    const isLauma = isLaumaModel(model);
    const isNahida = isNahidaModel(model);
    const isYaeMiko = isYaeMikoModel(model);
    rowDiv.classList.add(isXianyun ? 'row-xianyun' : (isLauma ? 'row-lauma' : (isNahida ? 'row-nahida' : (isYaeMiko ? 'row-yaemiko' : 'row-citlali'))));
    
    let avatarImgSrc = isXianyun ? '/Icon_Models/xianyun_icon.jpg' : (isLauma ? '/Icon_Models/lauma_icon.jpg' : (isNahida ? '/Icon_Models/nahida_icon.jpg' : (isYaeMiko ? '/Icon_Models/yaemiko_icon.jpg' : '/Icon_Models/citlali_icon.jpg')));
    let avatarName = isXianyun ? 'Xianyun' : (isLauma ? 'Lauma' : (isNahida ? 'Nahida' : (isYaeMiko ? 'Yae Miko' : 'Citlali')));
    let avatarTitle = isXianyun ? 'Xianyun (Lưu Vân)' : (isLauma ? 'Lauma (Nguyệt Ca Sư)' : (isNahida ? 'Nahida (Tiểu Thảo Thần)' : (isYaeMiko ? 'Yae Miko (Bát Trọng Thần Tử)' : 'Citlali')));
    
    if (customMeta && !isXianyun && !isLauma && !isNahida && !isYaeMiko) {
      avatarImgSrc = customMeta.icon_url || avatarImgSrc;
      avatarName = customMeta.name || avatarName;
      avatarTitle = customMeta.name || avatarTitle;
    }
    
    const avatarDiv = document.createElement("div");
    avatarDiv.className = "msg-avatar-wrapper";
    avatarDiv.innerHTML = `<img src="${avatarImgSrc}" alt="${avatarName}" title="${avatarTitle}" class="msg-avatar-img" />`;
    rowDiv.appendChild(avatarDiv);
  }

  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-msg ${isUser ? 'user' : 'ai'}`;
  if (!isUser) {
    const model = modelUrl || activeModelUrl;
    const isXianyun = isXianyunModel(model);
    const isLauma = isLaumaModel(model);
    const isNahida = isNahidaModel(model);
    const isYaeMiko = isYaeMikoModel(model);
    msgDiv.classList.add(isXianyun ? 'msg-xianyun' : (isLauma ? 'msg-lauma' : (isNahida ? 'msg-nahida' : (isYaeMiko ? 'msg-yaemiko' : 'msg-citlali'))));
  }
  msgDiv.innerText = text;
  rowDiv.appendChild(msgDiv);
  
  historyDiv.appendChild(rowDiv);
  historyDiv.scrollTop = historyDiv.scrollHeight;
  const initialMsgDiv = document.getElementById("initial-msg");
  if (initialMsgDiv) initialMsgDiv.style.display = 'none';
  return msgDiv;
};

export function removeTypingIndicator() {
  const typingRow = document.getElementById("typing-indicator-row");
  if (typingRow && typingRow.parentNode) {
    typingRow.parentNode.removeChild(typingRow);
  }
}

export function showTypingIndicator(modelUrl?: string): HTMLElement | null {
  const historyDiv = document.getElementById("chat-history") as HTMLDivElement;
  if (!historyDiv) return null;
  
  removeTypingIndicator();

  const rowDiv = document.createElement("div");
  rowDiv.id = "typing-indicator-row";
  rowDiv.className = "chat-msg-row ai";
  
  const model = modelUrl || activeModelUrl;
  let customMeta: any = null;
  try {
    const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
    if (settings.customModelMeta && settings.customModelMeta.url === model) {
      customMeta = settings.customModelMeta;
    }
  } catch (e) {}

  const isXianyun = isXianyunModel(model);
  const isLauma = isLaumaModel(model);
  const isNahida = isNahidaModel(model);
  const isYaeMiko = isYaeMikoModel(model);
  rowDiv.classList.add(isXianyun ? 'row-xianyun' : (isLauma ? 'row-lauma' : (isNahida ? 'row-nahida' : (isYaeMiko ? 'row-yaemiko' : 'row-citlali'))));
  
  let avatarImgSrc = isXianyun ? '/Icon_Models/xianyun_icon.jpg' : (isLauma ? '/Icon_Models/lauma_icon.jpg' : (isNahida ? '/Icon_Models/nahida_icon.jpg' : (isYaeMiko ? '/Icon_Models/yaemiko_icon.jpg' : '/Icon_Models/citlali_icon.jpg')));
  let avatarName = isXianyun ? 'Xianyun' : (isLauma ? 'Lauma' : (isNahida ? 'Nahida' : (isYaeMiko ? 'Yae Miko' : 'Citlali')));
  let avatarTitle = isXianyun ? 'Xianyun (Lưu Vân)' : (isLauma ? 'Lauma (Nguyệt Ca Sư)' : (isNahida ? 'Nahida (Tiểu Thảo Thần)' : (isYaeMiko ? 'Yae Miko (Bát Trọng Thần Tử)' : 'Citlali')));
  
  if (customMeta && !isXianyun && !isLauma && !isNahida && !isYaeMiko) {
    avatarImgSrc = customMeta.icon_url || avatarImgSrc;
    avatarName = customMeta.name || avatarName;
    avatarTitle = customMeta.name || avatarTitle;
  }
  
  const avatarDiv = document.createElement("div");
  avatarDiv.className = "msg-avatar-wrapper";
  avatarDiv.innerHTML = `<img src="${avatarImgSrc}" alt="${avatarName}" title="${avatarTitle}" class="msg-avatar-img" />`;
  rowDiv.appendChild(avatarDiv);

  const msgDiv = document.createElement("div");
  msgDiv.className = "chat-msg ai typing-bubble";
  msgDiv.classList.add(isXianyun ? 'msg-xianyun' : (isLauma ? 'msg-lauma' : (isNahida ? 'msg-nahida' : (isYaeMiko ? 'msg-yaemiko' : 'msg-citlali'))));
  
  msgDiv.innerHTML = `
    <div class="typing-indicator">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;
  rowDiv.appendChild(msgDiv);
  
  historyDiv.appendChild(rowDiv);
  historyDiv.scrollTop = historyDiv.scrollHeight;
  const initialMsgDiv = document.getElementById("initial-msg");
  if (initialMsgDiv) initialMsgDiv.style.display = 'none';
  return rowDiv;
}

export async function loadChatHistory(sessionId: string | null) {
  if (!sessionId) {
      chatHistory = [];
      const historyDiv = document.getElementById("chat-history") as HTMLDivElement;
      if (historyDiv) {
        historyDiv.innerHTML = `<div class="chat-msg ai" id="initial-msg"></div>`;
        updateChatUIForModel();
      }
      return;
  }
  try {
      const response = await fetch(`${BACKEND_URL}/api/history?sessionId=${sessionId}`);
      const data = await response.json();
      chatHistory = Array.isArray(data) ? data : [];
      
      const historyDiv = document.getElementById("chat-history") as HTMLDivElement;
      if (historyDiv) {
          historyDiv.innerHTML = ''; // clear
          
          if (chatHistory.length === 0) {
              let customMeta: any = null;
              try {
                const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
                if (settings.customModelMeta && settings.customModelMeta.url === activeModelUrl) {
                  customMeta = settings.customModelMeta;
                }
              } catch (e) {}

              if (customMeta) {
                  // Gọi API tự động tạo câu chào
                  triggerProactiveChat('initial_greeting').then(success => {
                      if (!success) {
                          const historyDiv = document.getElementById("chat-history") as HTMLDivElement;
                          if (historyDiv && historyDiv.innerHTML === '') {
                              historyDiv.innerHTML = `<div class="chat-msg ai" id="initial-msg"></div>`;
                              updateChatUIForModel();
                          }
                      }
                  });
              } else {
                  historyDiv.innerHTML = `<div class="chat-msg ai" id="initial-msg"></div>`;
              }
          }

          updateChatUIForModel();
          chatHistory.forEach(msg => {
              let text = msg.parts && msg.parts[0] ? msg.parts[0].text : "";
              const regex = /\[ANIM:\s*([^\]]+)\]/g;
              text = text.replace(regex, "").trim();
              const textParts = text.split("|");
              const viText = textParts.length > 1 ? textParts[1].trim() : textParts[0].trim();

              appendMsg(viText, msg.role === 'user', msg.modelUrl);
          });
          historyDiv.scrollTop = historyDiv.scrollHeight;
      }
  } catch (e) {
      console.error("Failed to load history", e);
  }
}


export async function loadSessions() {
    if (!currentUser) return;
    try {
        const response = await fetch(`${BACKEND_URL}/api/sessions?userId=${currentUser.id}`);
        const sessions = await response.json();
        if (!Array.isArray(sessions)) return;
        
        const sessionList = document.getElementById('session-list');
        if (!sessionList) return;
        sessionList.innerHTML = '';
        
        if (sessions.length > 0) {
            if (!currentSessionId || !sessions.find((s: any) => s.id === currentSessionId)) {
                currentSessionId = sessions[0].id;
            }
            
            sessions.forEach((s: any) => {
                const item = document.createElement('div');
                item.className = `session-item ${s.id === currentSessionId ? 'active' : ''}`;
                
                const date = new Date(s.created_at).toLocaleString('vi-VN', {
                    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
                });
                
                item.innerHTML = `
                    <div style="flex: 1; min-width: 0;">
                        <div class="session-title">${s.title}</div>
                        <div class="session-date" style="font-size: 0.8rem; color: #888;">${date}</div>
                    </div>
                    <button class="btn-delete-session" style="background:none; border:none; color:#ff4d4f; cursor:pointer; padding:5px; align-self: center;" title="Xóa">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                `;
                item.style.flexDirection = 'row';
                item.style.justifyContent = 'space-between';

                const btnDelete = item.querySelector('.btn-delete-session') as HTMLButtonElement;
                if (btnDelete) {
                    btnDelete.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        try {
                            const res = await fetch(`${BACKEND_URL}/api/sessions/${s.id}`, { method: 'DELETE' });
                            if (res.ok) {
                                if (currentSessionId === s.id) {
                                    currentSessionId = null;
                                }
                                await loadSessions();
                                await loadChatHistory(currentSessionId);
                            }
                        } catch(err) {
                            console.error(err);
                        }
                    });
                }

                item.addEventListener('click', async () => {
                    if (currentSessionId === s.id) return;
                    currentSessionId = s.id;
                    await loadSessions(); 
                    await loadChatHistory(currentSessionId);
                });
                sessionList.appendChild(item);
            });
        } else {
            const response = await fetch(`${BACKEND_URL}/api/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, title: t('chat.first') })
            });
            const data = await response.json();
            if (data) {
                currentSessionId = data.id;
                await loadSessions();
            }
        }
    } catch (e) {
        console.error("Failed to load sessions", e);
    }
}

async function handleAIResponseData(data: any) {
    removeTypingIndicator();
    const historyDiv = document.getElementById("chat-history") as HTMLDivElement;
    const initialMsgDiv = document.getElementById("initial-msg");
    if (initialMsgDiv) initialMsgDiv.style.display = 'none';

    if (data.error) {
      appendMsg(`Lỗi Server: ${data.error}`, false);
      return;
    }

    if (data.anim) {
      const btn = document.querySelector(`.anim-btn[data-anim="${data.anim}"]`) as HTMLButtonElement;
      if (btn) btn.click();
    }

    const viText = data.viText;
    const msgDiv = appendMsg("", false, data.modelUrl || activeModelUrl);
    if (!msgDiv) return;
    let i = 0;
    const typeSpeed = 50;
    const typingInterval = setInterval(() => {
      msgDiv.innerHTML += viText.charAt(i);
      historyDiv.scrollTop = historyDiv.scrollHeight;
      i++;
      if (i >= viText.length) {
        clearInterval(typingInterval);
      }
    }, typeSpeed);

    if (data.audioBase64) {
      const audioUrl = `data:audio/mp3;base64,${data.audioBase64}`;

      if (!(window as any).chatbotAudio) {
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        (window as any).chatbotAudio = audio;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        const source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);

        (window as any).chatbotAudioCtx = audioCtx;
        (window as any).chatbotAnalyser = analyser;

        audio.addEventListener('play', () => { (window as any).isChatbotTalking = true; });
        audio.addEventListener('ended', () => { (window as any).isChatbotTalking = false; });
      }

      const audio = (window as any).chatbotAudio as HTMLAudioElement;
      const audioCtx = (window as any).chatbotAudioCtx as AudioContext;
      audio.src = audioUrl;

      if (audioCtx.state === 'suspended') { audioCtx.resume(); }

      audio.play().catch(e => {
        console.warn("Trình duyệt chặn phát âm thanh tự động, sẽ phát lại khi click:", e);
        (window as any).isChatbotTalking = false;
        
        const playOnInteraction = () => {
             audio.play().catch(err => console.error("Vẫn không thể phát:", err));
             window.removeEventListener('pointerdown', playOnInteraction);
        };
        window.addEventListener('pointerdown', playOnInteraction);
      });
    } else {
      (window as any).isChatbotTalking = true;
      setTimeout(() => { (window as any).isChatbotTalking = false; }, viText.length * typeSpeed + 500);
    }
}

export async function triggerProactiveChat(contextType: 'welcome' | 'idle' | 'initial_greeting'): Promise<boolean> {
    if (contextType === 'welcome') {
        const now = Date.now();
        if (currentUser && supabase) {
            try {
                const { data: userRecord } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', currentUser.id)
                    .single();

                if (userRecord && userRecord.last_welcome_time) {
                    const lastWelcomeTime = new Date(userRecord.last_welcome_time).getTime();
                    if (now - lastWelcomeTime < 10 * 60 * 1000) {
                        return false; // Cooldown
                    }
                }
                
                const { error: updateErr } = await supabase
                    .from('user_profiles')
                    .update({ last_welcome_time: new Date().toISOString() })
                    .eq('id', currentUser.id);
                if (updateErr) {
                    localStorage.setItem('lastWelcomeTime', now.toString());
                }
            } catch (e) {
                console.error('Supabase cooldown error', e);
                localStorage.setItem('lastWelcomeTime', now.toString());
            }
        } else {
            const lastWelcomeStr = localStorage.getItem('lastWelcomeTime');
            if (lastWelcomeStr) {
                const lastWelcomeTime = parseInt(lastWelcomeStr, 10);
                if (now - lastWelcomeTime < 10 * 60 * 1000) {
                    return false; 
                }
            }
            localStorage.setItem('lastWelcomeTime', now.toString());
        }
    } else if (contextType === 'initial_greeting') {
        const now = Date.now();
        const lastGreetingStr = localStorage.getItem('lastInitialGreetingTime');
        if (lastGreetingStr) {
            const lastTime = parseInt(lastGreetingStr, 10);
            if (now - lastTime < 1 * 60 * 1000) { // 1 phút cooldown cho mỗi lần spam New Chat
                return false; 
            }
        }
        localStorage.setItem('lastInitialGreetingTime', now.toString());
    }

    // Không proactive nếu ai đang nói hoặc đang nhập văn bản
    if ((window as any).isChatbotTalking) return false;
    
    try {
        showTypingIndicator();
        let customMeta: any = null;
        try {
          const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
          if (settings.customModelMeta && settings.customModelMeta.url === activeModelUrl) {
            customMeta = settings.customModelMeta;
          }
        } catch (e) {}

        const payload = {
            chatHistory: chatHistory,
            sessionId: currentSessionId,
            contextType: contextType,
            userProfile: getCurrentUserProfile(),
            modelUrl: activeModelUrl,
            customMeta: customMeta,
            uiLanguage: (document.getElementById('setting-language') as HTMLSelectElement)?.value || 'vi',
            voiceLanguage: (document.getElementById('setting-voice') as HTMLSelectElement)?.value || 'zh'
        };

        const response = await fetch(`${BACKEND_URL}/api/proactive-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        removeTypingIndicator();
        chatHistory.push({ role: "model", modelUrl: activeModelUrl, parts: [{ text: data.aiResponse }] });
        handleAIResponseData(data);
        return true;
    } catch (err) {
        removeTypingIndicator();
        console.error("Proactive chat error:", err);
        return false;
    }
}

export async function setupChatbot() {
  if (currentUser) {
      await fetchCurrentUserProfileState();
      await loadSessions();
      if (currentSessionId) {
          await loadChatHistory(currentSessionId);
      }
  } else {
      currentSessionId = null;
      await loadChatHistory(null);
  }

  const input = document.getElementById("chat-input") as HTMLInputElement;
  const sendBtn = document.getElementById("btn-send-chat") as HTMLButtonElement;
  const historyDiv = document.getElementById("chat-history") as HTMLDivElement;
  const initialMsgDiv = document.getElementById("initial-msg") as HTMLDivElement;

  // Sidebar toggle logic
  const btnToggleSidebar = document.getElementById('toggle-chat-sidebar');
  const chatSidebar = document.getElementById('chat-sidebar');
  if (btnToggleSidebar && chatSidebar) {
      // Remove old listeners to avoid duplicates
      const newBtnToggle = btnToggleSidebar.cloneNode(true) as HTMLButtonElement;
      btnToggleSidebar.parentNode?.replaceChild(newBtnToggle, btnToggleSidebar);
      newBtnToggle.addEventListener('click', () => {
          if (chatSidebar.style.display === 'none') {
              chatSidebar.style.display = 'flex';
              void chatSidebar.offsetWidth;
              chatSidebar.classList.remove('panel-hidden');
              if (currentUser) { loadSessions(); }
          } else {
              chatSidebar.classList.add('panel-hidden');
              setTimeout(() => {
                  chatSidebar.style.display = 'none';
              }, 300);
          }
      });
  }

  // New chat logic
  const btnNewChat = document.getElementById('btn-new-chat');
  if (btnNewChat) {
      const newBtnChat = btnNewChat.cloneNode(true) as HTMLButtonElement;
      btnNewChat.parentNode?.replaceChild(newBtnChat, btnNewChat);
      newBtnChat.addEventListener('click', async () => {
          if (!currentUser) {
              await CustomDialog.alert(t('alert.login_required'));
              return;
          }
          const title = t('chat.new');
          
          try {
              const response = await fetch(`${BACKEND_URL}/api/sessions`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: currentUser.id, title })
              });
              const data = await response.json();
              if (data) {
                  currentSessionId = data.id;
                  await loadSessions();
                  await loadChatHistory(currentSessionId);
              }
          } catch (e) {
              console.error(e);
          }
      });
  }

  if (!input || !sendBtn || !historyDiv) return;

  if (initialMsgDiv && chatHistory.length === 0) {
    updateChatUIForModel();
  }

  const handleSend = async () => {
    const userText = input.value.trim();
    if (!userText) return;

    if (!currentSessionId && currentUser) {
        try {
            const res = await fetch(`${BACKEND_URL}/api/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, title: t('chat.first') || "Cuộc trò chuyện mới" })
            });
            const sData = await res.json();
            if (sData && sData.id) {
                currentSessionId = sData.id;
                await loadSessions();
            }
        } catch(e) { console.error(e); }
    }

    const isFirstMessage = chatHistory.length === 0;

    appendMsg(userText, true);
    input.value = "";
    input.style.height = '70px'; 
    sendBtn.disabled = true;
    showTypingIndicator();

    try {
      if (!(window as any).chatbotAudio) {
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        (window as any).chatbotAudio = audio;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        const source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);

        (window as any).chatbotAudioCtx = audioCtx;
        (window as any).chatbotAnalyser = analyser;

        audio.addEventListener('play', () => { (window as any).isChatbotTalking = true; });
        audio.addEventListener('ended', () => { (window as any).isChatbotTalking = false; });
      }
      const audioCtx = (window as any).chatbotAudioCtx as AudioContext;
      if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume(); }
      const audio = (window as any).chatbotAudio as HTMLAudioElement;
      if (audio && !audio.src) {
        audio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
        audio.play().catch(() => {});
      }
    } catch (e) {}

    try {
      let customMeta: any = null;
      try {
        const settings = JSON.parse(localStorage.getItem('app_settings') || '{}');
        if (settings.customModelMeta && settings.customModelMeta.url === activeModelUrl) {
          customMeta = settings.customModelMeta;
        }
      } catch (e) {}

      const payload = {
        chatHistory: chatHistory,
        userText: userText,
        sessionId: currentSessionId,
        userProfile: getCurrentUserProfile(),
        modelUrl: activeModelUrl,
        customMeta: customMeta,
        uiLanguage: (document.getElementById('setting-language') as HTMLSelectElement)?.value || 'vi',
        voiceLanguage: (document.getElementById('setting-voice') as HTMLSelectElement)?.value || 'zh',
        savedAnimations: await fetchSavedAnimationsForChat()
      };

      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      removeTypingIndicator();
      chatHistory.push({ role: "user", parts: [{ text: userText }] });
      chatHistory.push({ role: "model", modelUrl: activeModelUrl, parts: [{ text: data.aiResponse }] });
      handleAIResponseData(data);

      if (isFirstMessage) {
          // Title might be updated by the backend concurrently, load after a small delay
          setTimeout(() => { loadSessions(); }, 2000);
      }

    } catch (err: any) {
      removeTypingIndicator();
      appendMsg(`Lỗi mạng: ${err.message}`, false);
    }

    sendBtn.disabled = false;
  };

  sendBtn.addEventListener("click", handleSend);

  const resizeInput = () => {
    input.style.height = '70px'; 
    input.style.height = Math.max(70, input.scrollHeight) + 'px'; 
  };
  input.addEventListener("input", resizeInput);

  setTimeout(resizeInput, 100);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); 
      handleSend();
    }
  });

  setupIdleEvents();
  resetIdleTimer();
}

export function speakText(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN';
  utterance.rate = 1.1; 
  utterance.pitch = 1.2; 

  window.speechSynthesis.speak(utterance);
}
