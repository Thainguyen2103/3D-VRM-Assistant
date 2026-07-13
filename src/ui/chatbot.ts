export let chatHistory: any[] = [];
export const BACKEND_URL = "http://localhost:3000"; // Hoặc url backend thật

export function setupChatbot() {
  const input = document.getElementById("chat-input") as HTMLInputElement;
  const sendBtn = document.getElementById("btn-send-chat") as HTMLButtonElement;
  const historyDiv = document.getElementById("chat-history") as HTMLDivElement;
  const initialMsgDiv = document.getElementById("initial-msg") as HTMLDivElement;

  if (!input || !sendBtn || !historyDiv) return;

  if (initialMsgDiv && chatHistory.length === 0) {
    const greetings = [
      "Gọi gì đấy? Tôi đang bận lắm nhé, có gì thì nói nhanh lên. (￣^￣)",
      "Lại rảnh rỗi sinh nông nổi đi gọi tôi à? Nhanh cái tay lên! (¬_¬)",
      "Hôm nay trời đẹp thế mà lại bắt tôi ra đây đứng à? ( ︶︿︶)",
      "Làm thơ á? 'Hoa hồng màu đỏ, hoa violet màu xanh, sao anh phiền phức thế, để yên cho tôi nhanh'. Hứ! (￣^￣)",
      "Lại là bạn à? Lần này có chuyện gì quan trọng không, hay lại trêu tôi đấy? (￣^￣)",
      "Đang yên đang lành... Thôi được rồi, có gì thì nói nhanh đi. ( ︶︿︶)",
      "Biết mấy giờ rồi không mà còn gọi? Hứ! (￣^￣)"
    ];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    initialMsgDiv.innerText = randomGreeting;
    chatHistory.push({ role: "model", parts: [{ text: randomGreeting }] });
  }

  const appendMsg = (text: string, isUser: boolean) => {
    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-msg ${isUser ? 'user' : 'ai'}`;
    msgDiv.innerText = text;
    historyDiv.appendChild(msgDiv);
    historyDiv.scrollTop = historyDiv.scrollHeight;
  };

  const handleSend = async () => {
    const userText = input.value.trim();
    if (!userText) return;

    appendMsg(userText, true);
    input.value = "";
    input.style.height = '46px'; 
    sendBtn.disabled = true;

    try {
      const payload = {
        chatHistory: chatHistory,
        userText: userText
      };

      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.error) {
        appendMsg(`Lỗi Server: ${data.error}`, false);
        sendBtn.disabled = false;
        return;
      }

      chatHistory.push({ role: "user", parts: [{ text: userText }] });
      chatHistory.push({ role: "model", parts: [{ text: data.aiResponse }] });

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

          audio.addEventListener('play', () => {
            (window as any).isChatbotTalking = true;
          });

          audio.addEventListener('ended', () => {
            (window as any).isChatbotTalking = false;
          });
        }

        const audio = (window as any).chatbotAudio as HTMLAudioElement;
        const audioCtx = (window as any).chatbotAudioCtx as AudioContext;

        audio.src = audioUrl;

        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        audio.play().catch(e => {
          console.error("Trình duyệt chặn phát âm thanh tự động:", e);
          (window as any).isChatbotTalking = false;
        });
      } else {
        (window as any).isChatbotTalking = true;
        setTimeout(() => {
          (window as any).isChatbotTalking = false;
        }, viText.length * typeSpeed + 500);
      }

    } catch (err: any) {
      appendMsg(`Lỗi mạng: ${err.message}`, false);
    }

    sendBtn.disabled = false;
  };

  sendBtn.addEventListener("click", handleSend);

  const resizeInput = () => {
    input.style.height = '46px'; 
    input.style.height = (input.scrollHeight) + 'px'; 
  };
  input.addEventListener("input", resizeInput);

  setTimeout(resizeInput, 100);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); 
      handleSend();
    }
  });
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
