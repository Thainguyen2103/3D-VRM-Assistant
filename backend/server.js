const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

app.post('/api/chat', async (req, res) => {
    try {
        const { chatHistory, userText } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "Missing GEMINI_API_KEY in backend" });
        }

        // 1. GỌI GEMINI API
        const geminiPayload = {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [
                ...(chatHistory || []),
                { role: "user", parts: [{ text: userText }] }
            ],
            generationConfig: {
                temperature: 1.2
            }
        };

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
        });

        const geminiData = await geminiRes.json();
        
        if (geminiData.error) {
            return res.status(500).json({ error: `Gemini API Error: ${geminiData.error.message}` });
        }

        const aiResponse = geminiData.candidates[0].content.parts[0].text;
        
        // 2. XỬ LÝ TEXT
        let cleanText = aiResponse;
        let lastAnim = "";
        
        const regex = /\[ANIM:\s*([^\]]+)\]/g;
        let match;
        while ((match = regex.exec(aiResponse)) !== null) {
            lastAnim = match[1].trim();
        }
        
        cleanText = cleanText.replace(/\[ANIM:\s*[^\]]+\]/g, "").trim();
        
        const textParts = cleanText.split("|");
        const zhText = textParts[0].trim();
        const viText = textParts.length > 1 ? textParts[1].trim() : zhText;

        // 3. GỌI FISH AUDIO API
        let audioBase64 = null;
        if (process.env.FISH_API_KEY && process.env.FISH_MODEL_ID) {
            const ttsRes = await fetch("https://api.fish.audio/v1/tts", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.FISH_API_KEY}`,
                    "Content-Type": "application/json",
                    "model": "s2.1-pro-free"
                },
                body: JSON.stringify({
                    text: zhText,
                    reference_id: process.env.FISH_MODEL_ID,
                    format: "mp3"
                })
            });

            if (ttsRes.ok) {
                const arrayBuffer = await ttsRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                audioBase64 = buffer.toString('base64');
            } else {
                console.error("Fish Audio API Error:", await ttsRes.text());
            }
        }

        // 4. TRẢ KẾT QUẢ
        res.json({
            aiResponse: aiResponse,
            zhText: zhText,
            viText: viText,
            anim: lastAnim,
            audioBase64: audioBase64
        });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
