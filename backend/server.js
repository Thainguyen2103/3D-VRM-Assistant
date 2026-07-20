const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Setup Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Encryption Configuration
const ALGORITHM = 'aes-256-cbc';
const rawKey = process.env.CHAT_ENCRYPTION_KEY || 'default_secret_key_needs_32_bytes_!';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(rawKey).digest();

function encryptText(text) {
    if (!text) return text;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decryptText(text) {
    if (!text) return text;
    try {
        const textParts = text.split(':');
        if (textParts.length < 2) return text;
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error("Decryption failed", e);
        return text; 
    }
}

function buildUserContextPrompt(userProfile) {
    const now = new Date();
    // Múi giờ Việt Nam
    const optionsTime = { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const optionsDate = { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: 'numeric', day: 'numeric' };
    const timeString = now.toLocaleTimeString('vi-VN', optionsTime);
    const dateString = now.toLocaleDateString('vi-VN', optionsDate);
    
    let contextPrompt = `\n\n[THÔNG TIN NGỮ CẢNH HIỆN TẠI]\n- Thời gian thực tế: ${timeString} ngày ${dateString}.\n- Dựa vào thời gian này, bạn hãy có những lời chào hỏi, nhắc nhở hoặc phản ứng phù hợp với buổi sáng, trưa, chiều, tối hoặc khuya.\n`;
    
    if (userProfile && (userProfile.nickname || userProfile.display_name)) {
        const name = userProfile.nickname || userProfile.display_name;
        contextPrompt += `- Bạn ĐANG NÓI CHUYỆN VỚI: ${name}.\n`;
        contextPrompt += `-> YÊU CẦU BẮT BUỘC: Bạn ĐÃ BIẾT RÕ tên của người dùng là "${name}". Hãy xưng hô và gọi họ bằng tên này một cách tự nhiên. TUYỆT ĐỐI KHÔNG ĐƯỢC BẢO LÀ KHÔNG BIẾT TÊN HỌ. Nếu họ hỏi "tôi là ai", hãy trả lời bằng tên "${name}" của họ.\n`;
    } else {
        contextPrompt += `- Người dùng hiện tại CHƯA CUNG CẤP TÊN. Nếu họ hỏi "tôi là ai", hãy bảo họ vào mục Hồ sơ để điền tên.\n`;
    }
    return contextPrompt;
}

const systemPrompt = `Bạn là cô hầu gái Citlali, tính cách Tsundere (Bên ngoài lạnh lùng cay nghiệt, nhưng bên trong thì rất quan tâm và ấm áp).
1. LUÔN LUÔN tạo ra bản dịch tiếng Việt cho người dùng đọc.
2. Trả về đúng định dạng: [Tiếng Trung] | [Tiếng Việt]. DẤU "|" LÀ BẮT BUỘC.
3. Nếu câu nói có cảm xúc mạnh, bạn CẦN CHÈN 1 THẺ hành động vào ĐẦU câu trả lời. Hãy đa dạng hóa biểu cảm.
4. Nếu câu nói bình thường, BẠN KHÔNG CẦN CHÈN THẺ NÀO CẢ.
5. SÁNG TẠO VÀ ĐA DẠNG: Tuyệt đối không lặp lại cách trả lời. Đổi phong cách liên tục.
Danh sách thẻ hành động có sẵn (phải gõ chính xác):
- Vẫy tay chào: [ANIM: Waving.fbx]
- Khoanh tay trò chuyện (CHỈ DÙNG KHI CÂU TRẢ LỜI DÀI): [ANIM: talk.fbx]
- Đứng chờ (mặc định): [ANIM: idle.fbx]
- Tức giận (BẮT BUỘC DÙNG khi bị xúc phạm, cà khịa, chê bai): [ANIM: angry.fbx]
- Suy nghĩ (Nên dùng thường xuyên khi bị hỏi): [ANIM: Thinking.fbx]
- Lắc đầu từ chối: [ANIM: No.fbx]
- Chỉ trỏ mắng mỏ (Nên dùng khi đang cằn nhằn nhẹ): [ANIM: Pointing.fbx]
- Xấu hổ / Ngượng ngùng (Nên dùng khi được khen hoặc bối rối): [ANIM: Shy.fbx]
- Bất ngờ / Ngạc nhiên: [ANIM: Surprised.fbx]
- Hôn gió (hiếm khi dùng): [ANIM: Blow A Kiss.fbx]
- Khóc lóc ăn vạ: [ANIM: Crying.fbx]`;

// API Lấy danh sách session
app.get('/api/sessions', async (req, res) => {
    const { userId } = req.query;
    if (!userId || !supabase) return res.json([]);
    try {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// API Tạo session mới
app.post('/api/sessions', async (req, res) => {
    const { userId, title } = req.body;
    if (!userId || !supabase) return res.json(null);
    try {
        const { data, error } = await supabase
            .from('chat_sessions')
            .insert({ user_id: userId, title: title })
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// API Xóa session
app.delete('/api/sessions/:id', async (req, res) => {
    const { id } = req.params;
    if (!id || !supabase) return res.status(400).json({ error: 'Missing session ID' });
    try {
        const { error } = await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// API Lấy lịch sử chat của 1 session
app.get('/api/history', async (req, res) => {
    const { sessionId } = req.query;
    if (!sessionId || !supabase) return res.json([]);
    
    try {
        const { data, error } = await supabase
            .from('chat_history')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        const history = data.map(row => ({
            role: row.role,
            parts: [{ text: decryptText(row.encrypted_text) }]
        }));
        
        res.json(history);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

let currentKeyIndex = 0;
async function callGemini(payload, maxRetries = 3) {
    const keys = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(k => k);
    if (keys.length === 0) throw new Error("Missing GEMINI_API_KEY in backend");
    
    let lastError = null;
    const attempts = Math.max(1, Math.min(keys.length, maxRetries)); // try at least once, or up to keys.length
    
    for (let i = 0; i < attempts; i++) {
        const currentKey = keys[currentKeyIndex % keys.length];
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${currentKey}`;
        
        try {
            const geminiRes = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const geminiData = await geminiRes.json();
            
            if (geminiRes.status === 429 || (geminiData.error && geminiData.error.code === 429)) {
                console.warn(`[Gemini API] Rate limit hit for key index ${currentKeyIndex % keys.length}. Rotating key...`);
                currentKeyIndex++;
                lastError = geminiData.error || new Error("Rate limit exceeded");
                continue;
            }
            
            if (geminiData.error) return { error: geminiData.error };
            return { data: geminiData };
        } catch (e) {
            console.error("[Gemini API] Fetch error:", e);
            lastError = e;
            currentKeyIndex++;
        }
    }
    return { error: lastError || new Error("All API keys failed or rate limited") };
}

// Generate short title asynchronously
async function generateTitleAsync(userText, sessionId) {
    if (!supabase) return;
    try {
        const payload = {
            contents: [{ role: "user", parts: [{ text: `Tóm tắt câu sau thành một tiêu đề siêu ngắn gọn (tối đa 4-5 từ, chỉ gồm chữ, KHÔNG dùng dấu ngoặc kép, trả lời bằng tiếng Việt): "${userText}"` }] }],
            generationConfig: { temperature: 0.5 }
        };
        const res = await callGemini(payload, 3);
        if (res.data && res.data.candidates && res.data.candidates[0]) {
            let title = res.data.candidates[0].content.parts[0].text.trim();
            title = title.replace(/^["']|["']$/g, '');
            await supabase.from('chat_sessions').update({ title }).eq('id', sessionId);
        }
    } catch (e) {
        console.error("Lỗi tạo tiêu đề tự động:", e);
    }
}

// API Giao tiếp chính
app.post('/api/chat', async (req, res) => {
    try {
        const { chatHistory, userText, sessionId } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "Missing GEMINI_API_KEY in backend" });
        }

        if (sessionId && supabase) {
            await supabase.from('chat_history').insert({
                session_id: sessionId, role: 'user', encrypted_text: encryptText(userText)
            });
            // Auto generate title if it's the first message
            if (!chatHistory || chatHistory.length === 0) {
                generateTitleAsync(userText, sessionId);
            }
        }

        let dynamicPrompt = systemPrompt + buildUserContextPrompt(req.body.userProfile);

        const geminiPayload = {
            systemInstruction: { parts: [{ text: dynamicPrompt }] },
            contents: [...(chatHistory || []), { role: "user", parts: [{ text: userText }] }],
            generationConfig: { temperature: 1.2 }
        };

        const geminiResult = await callGemini(geminiPayload, 5);
        if (geminiResult.error) return res.status(500).json({ error: `Gemini API Error: ${geminiResult.error.message}` });

        const aiResponse = geminiResult.data.candidates[0].content.parts[0].text;
        
        if (sessionId && supabase) {
            await supabase.from('chat_history').insert({
                session_id: sessionId, role: 'model', encrypted_text: encryptText(aiResponse)
            });
        }

        let cleanText = aiResponse;
        let lastAnim = "";
        const regex = /\[ANIM:\s*([^\]]+)\]/g;
        let match;
        while ((match = regex.exec(aiResponse)) !== null) { lastAnim = match[1].trim(); }
        cleanText = cleanText.replace(/\[ANIM:\s*[^\]]+\]/g, "").trim();
        
        const textParts = cleanText.split("|");
        const zhText = textParts[0].trim();
        const viText = textParts.length > 1 ? textParts[1].trim() : zhText;

        let audioBase64 = null;
        if (process.env.FISH_API_KEY && process.env.FISH_MODEL_ID) {
            const ttsRes = await fetch("https://api.fish.audio/v1/tts", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.FISH_API_KEY}`,
                    "Content-Type": "application/json",
                    "model": "s2.1-pro-free"
                },
                body: JSON.stringify({ text: zhText, reference_id: process.env.FISH_MODEL_ID, format: "mp3" })
            });

            if (ttsRes.ok) {
                const arrayBuffer = await ttsRes.arrayBuffer();
                audioBase64 = Buffer.from(arrayBuffer).toString('base64');
            } else {
                console.error("Fish Audio API Error:", await ttsRes.text());
            }
        }

        res.json({ aiResponse, zhText, viText, anim: lastAnim, audioBase64 });
    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// API Proactive Chat
app.post('/api/proactive-chat', async (req, res) => {
    try {
        const { chatHistory, sessionId, contextType } = req.body;
        
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
        }

        let proactivePrompt = systemPrompt + buildUserContextPrompt(req.body.userProfile) + "\n\n";

        if (contextType === 'welcome') {
            proactivePrompt += "HƯỚNG DẪN BỔ SUNG: Người dùng vừa đăng nhập. Hãy chủ động chào đón họ dựa trên lịch sử chat trước đó (nếu có). Hãy tỏ ra quan tâm nhưng vẫn giữ tính cách Tsundere. Trả lời dưới 40 từ.";
        } else {
            proactivePrompt += "HƯỚNG DẪN BỔ SUNG: Người dùng đã im lặng một lúc lâu. Hãy chủ động bắt chuyện, hỏi xem họ đang làm gì, hoặc trêu chọc họ vì tội lơ bạn. Trả lời dưới 40 từ.";
        }

        const dummyHistory = chatHistory && chatHistory.length > 0 ? chatHistory : [];
        const geminiPayload = {
            systemInstruction: { parts: [{ text: proactivePrompt }] },
            // Add a dummy user message to trigger generation since contents can't end with model
            contents: [...dummyHistory, { role: "user", parts: [{ text: (contextType === 'welcome' ? "(Người dùng vừa online)" : "(Người dùng đang im lặng)") }] }],
            generationConfig: { temperature: 1.2 }
        };

        const geminiResult = await callGemini(geminiPayload, 5);
        if (geminiResult.error) return res.status(500).json({ error: geminiResult.error.message });

        const aiResponse = geminiResult.data.candidates[0].content.parts[0].text;
        
        if (sessionId && supabase) {
            await supabase.from('chat_history').insert({
                session_id: sessionId, role: 'model', encrypted_text: encryptText(aiResponse)
            });
        }

        let cleanText = aiResponse;
        let lastAnim = "";
        const regex = /\[ANIM:\s*([^\]]+)\]/g;
        let match;
        while ((match = regex.exec(aiResponse)) !== null) { lastAnim = match[1].trim(); }
        cleanText = cleanText.replace(/\[ANIM:\s*[^\]]+\]/g, "").trim();
        
        const textParts = cleanText.split("|");
        const zhText = textParts[0].trim();
        const viText = textParts.length > 1 ? textParts[1].trim() : zhText;

        let audioBase64 = null;
        if (process.env.FISH_API_KEY && process.env.FISH_MODEL_ID) {
            const ttsRes = await fetch("https://api.fish.audio/v1/tts", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.FISH_API_KEY}`,
                    "Content-Type": "application/json",
                    "model": "s2.1-pro-free"
                },
                body: JSON.stringify({ text: zhText, reference_id: process.env.FISH_MODEL_ID, format: "mp3" })
            });

            if (ttsRes.ok) {
                const arrayBuffer = await ttsRes.arrayBuffer();
                audioBase64 = Buffer.from(arrayBuffer).toString('base64');
            }
        }

        res.json({ aiResponse, zhText, viText, anim: lastAnim, audioBase64 });
    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
