import { currentUser, supabase } from '../core/auth';
import { getCurrentUserProfile, fetchCurrentUserProfileState } from './profile';
import { CustomDialog } from './CustomDialog';
import { t } from '../i18n';


export let chatHistory: any[] = [];
export let currentSessionId: string | null = null;
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

let idleTimer: any = null;
const IDLE_TIME_MS = 60000; // 1 phút (60000ms) nhàn rỗi sẽ gọi proactive chat

export function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    triggerProactiveChat('idle');
  }, IDLE_TIME_MS);
}

// Bắt sự kiện để reset timer
window.addEventListener('mousemove', resetIdleTimer);
window.addEventListener('keydown', resetIdleTimer);
window.addEventListener('click', resetIdleTimer);

const appendMsg = (text: string, isUser: boolean) => {
  const historyDiv = document.getElementById("chat-history") as HTMLDivElement;
  if (!historyDiv) return;
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-msg ${isUser ? 'user' : 'ai'}`;
  msgDiv.innerText = text;
  historyDiv.appendChild(msgDiv);
  historyDiv.scrollTop = historyDiv.scrollHeight;
  const initialMsgDiv = document.getElementById("initial-msg");
  if (initialMsgDiv) initialMsgDiv.style.display = 'none';
};

export async function loadChatHistory(sessionId: string | null) {
  if (!sessionId) {
      chatHistory = [];
      const historyDiv = document.getElementById("chat-history") as HTMLDivElement;
      if (historyDiv) historyDiv.innerHTML = `<div class="chat-msg ai" id="initial-msg" data-i18n="chat.initial">${t('chat.initial')}</div>`;
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
              historyDiv.innerHTML = `<div class="chat-msg ai" id="initial-msg" data-i18n="chat.initial">${t('chat.initial')}</div>`;
          }
          chatHistory.forEach(msg => {
              const msgDiv = document.createElement("div");
              msgDiv.className = `chat-msg ${msg.role === 'user' ? 'user' : 'ai'}`;
              
              let text = msg.parts[0].text;
              const regex = /\[ANIM:\s*([^\]]+)\]/g;
              text = text.replace(regex, "").trim();
              const textParts = text.split("|");
              const viText = textParts.length > 1 ? textParts[1].trim() : textParts[0].trim();

              msgDiv.innerText = viText; 
              historyDiv.appendChild(msgDiv);
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
    const msgDiv = document.createElement("div");
    msgDiv.className = 'chat-msg ai';
    historyDiv.appendChild(msgDiv);
    historyDiv.scrollTop = historyDiv.scrollHeight;

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

export async function triggerProactiveChat(contextType: 'welcome' | 'idle') {
    if (contextType === 'welcome') {
        const now = Date.now();
        if (currentUser && supabase) {
            try {
                const { data: userRecord } = await supabase
                    .from('user_profiles')
                    .select('last_welcome_time')
                    .eq('id', currentUser.id)
                    .single();

                if (userRecord && userRecord.last_welcome_time) {
                    const lastWelcomeTime = new Date(userRecord.last_welcome_time).getTime();
                    if (now - lastWelcomeTime < 10 * 60 * 1000) {
                        return; // Cooldown
                    }
                }
                
                await supabase
                    .from('user_profiles')
                    .update({ last_welcome_time: new Date().toISOString() })
                    .eq('id', currentUser.id);
            } catch (e) {
                console.error('Supabase cooldown error', e);
            }
        } else {
            const lastWelcomeStr = localStorage.getItem('lastWelcomeTime');
            if (lastWelcomeStr) {
                const lastWelcomeTime = parseInt(lastWelcomeStr, 10);
                if (now - lastWelcomeTime < 10 * 60 * 1000) {
                    return; 
                }
            }
            localStorage.setItem('lastWelcomeTime', now.toString());
        }
    }

    // Không proactive nếu ai đang nói hoặc đang nhập văn bản
    if ((window as any).isChatbotTalking) return;
    
    try {
        const payload = {
            chatHistory: chatHistory,
            sessionId: currentSessionId,
            contextType: contextType,
            userProfile: getCurrentUserProfile(),
            uiLanguage: (document.getElementById('setting-language') as HTMLSelectElement)?.value || 'vi',
            voiceLanguage: (document.getElementById('setting-voice') as HTMLSelectElement)?.value || 'zh'
        };

        const response = await fetch(`${BACKEND_URL}/api/proactive-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        chatHistory.push({ role: "model", parts: [{ text: data.aiResponse }] });
        handleAIResponseData(data);
    } catch (err) {
        console.error("Proactive chat error:", err);
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
    const greetings = [
      "Gọi gì đấy? Tôi đang bận lắm nhé, có gì thì nói nhanh lên. (￣^￣)"
    ];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    initialMsgDiv.innerText = randomGreeting;
  }

  const handleSend = async () => {
    const userText = input.value.trim();
    if (!userText) return;

    const isFirstMessage = chatHistory.length === 0;

    appendMsg(userText, true);
    input.value = "";
    input.style.height = '70px'; 
    sendBtn.disabled = true;

    try {
      const payload = {
        chatHistory: chatHistory,
        userText: userText,
        sessionId: currentSessionId,
        userProfile: getCurrentUserProfile(),
        uiLanguage: (document.getElementById('setting-language') as HTMLSelectElement)?.value || 'vi',
        voiceLanguage: (document.getElementById('setting-voice') as HTMLSelectElement)?.value || 'zh'
      };

      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      chatHistory.push({ role: "user", parts: [{ text: userText }] });
      chatHistory.push({ role: "model", parts: [{ text: data.aiResponse }] });
      handleAIResponseData(data);

      if (isFirstMessage) {
          // Title might be updated by the backend concurrently, load after a small delay
          setTimeout(() => { loadSessions(); }, 2000);
      }

    } catch (err: any) {
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
