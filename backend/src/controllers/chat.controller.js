const supabase = require('../config/supabase');
const { encryptText, decryptText } = require('../services/encryption.service');
const aiService = require('../services/ai.service');

async function getHistory(req, res) {
    const { sessionId } = req.query;
    if (!sessionId || !supabase) return res.json([]);
    try {
        const { data, error } = await supabase
            .from('chat_history')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        const history = data.map(row => {
            let text = decryptText(row.encrypted_text);
            let modelUrl = aiService.MODEL_CITLALI;
            const modelMatch = text.match(/^\[MODEL:([^\]]+)\]\s*/);
            if (modelMatch) {
                modelUrl = modelMatch[1];
                text = text.replace(/^\[MODEL:[^\]]+\]\s*/, '');
            }
            return { role: row.role, modelUrl: modelUrl, parts: [{ text: text }] };
        });
        res.json(history);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
}

async function generateTitleAsync(userText, sessionId, uiLanguage = 'vi') {
    if (!supabase) return;
    const langMap = { 'vi': 'Tiếng Việt', 'en': 'Tiếng Anh', 'ja': 'Tiếng Nhật', 'zh': 'Tiếng Trung', 'ko': 'Tiếng Hàn' };
    const langName = langMap[uiLanguage] || 'Tiếng Việt';
    try {
        const payload = {
            contents: [{ role: "user", parts: [{ text: `Tóm tắt câu sau thành một tiêu đề siêu ngắn gọn (tối đa 4-5 từ, chỉ gồm chữ, KHÔNG dùng dấu ngoặc kép, trả lời bằng ${langName}): "${userText}"` }] }],
            generationConfig: { temperature: 0.5 }
        };
        const res = await aiService.callGemini(payload, 3);
        if (res.data && res.data.candidates && res.data.candidates[0]) {
            let title = res.data.candidates[0].content.parts[0].text.trim();
            title = title.replace(/^["']|["']$/g, '');
            await supabase.from('chat_sessions').update({ title }).eq('id', sessionId);
        }
    } catch (e) {
        console.error("Lỗi tạo tiêu đề tự động:", e);
    }
}

async function chat(req, res) {
    try {
        const { chatHistory, userText, sessionId } = req.body;
        
        if (sessionId && supabase) {
            await supabase.from('chat_history').insert({
                session_id: sessionId, role: 'user', encrypted_text: encryptText(userText)
            });
            if (!chatHistory || chatHistory.length === 0) {
                generateTitleAsync(userText, sessionId, req.body.uiLanguage);
            }
        }

        let dynamicPrompt = aiService.buildSystemPrompt(req.body.userProfile, req.body.uiLanguage, req.body.voiceLanguage, req.body.modelUrl, req.body.customMeta, req.body.savedAnimations || []);
        const cleanHistory = (chatHistory || []).map(m => ({ role: m.role, parts: m.parts }));
        
        const geminiPayload = {
            systemInstruction: { parts: [{ text: dynamicPrompt }] },
            contents: [...cleanHistory, { role: "user", parts: [{ text: userText }] }],
            generationConfig: { temperature: 0.7 }
        };

        const geminiResult = await aiService.callGemini(geminiPayload, 5);
        if (geminiResult.error) return res.status(500).json({ error: `Gemini API Error: ${geminiResult.error.message}` });

        const aiResponse = geminiResult.data.candidates[0].content.parts[0].text;
        
        if (sessionId && supabase) {
            const modelTag = req.body.modelUrl || aiService.MODEL_CITLALI;
            await supabase.from('chat_history').insert({
                session_id: sessionId, role: 'model', encrypted_text: encryptText(`[MODEL:${modelTag}] ` + aiResponse)
            });
        }

        let cleanText = aiResponse;
        let lastAnim = "";
        const regex = /\[ANIM:\s*([^\]]+)\]/g;
        let match;
        while ((match = regex.exec(aiResponse)) !== null) { lastAnim = match[1].trim(); }
        cleanText = cleanText.replace(/\[ANIM:\s*[^\]]+\]/g, "").trim();
        
        let { zhText, viText } = await aiService.formatLanguagePair(cleanText, req.body.uiLanguage, req.body.voiceLanguage);
        let audioBase64 = await aiService.getVoiceAudio(zhText, req.body.modelUrl, req.body.customMeta);

        console.log(`[API /api/chat] OK -> model: ${req.body.modelUrl} | UI Lang: ${req.body.uiLanguage} | Voice Lang: ${req.body.voiceLanguage} | Audio: ${!!audioBase64}`);
        res.json({ aiResponse, zhText, viText, anim: lastAnim, audioBase64 });
    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: error.message });
    }
}

async function proactiveChat(req, res) {
    try {
        const { chatHistory, sessionId, contextType } = req.body;
        let proactivePrompt = aiService.buildSystemPrompt(req.body.userProfile, req.body.uiLanguage, req.body.voiceLanguage, req.body.modelUrl, req.body.customMeta) + "\n\n";

        if (contextType === 'initial_greeting') {
            if (req.body.customMeta && req.body.customMeta.name) {
                proactivePrompt += `HƯỚNG DẪN BỔ SUNG: Bạn vừa được người dùng triệu hồi. Dựa vào thông tin cốt truyện và tính cách của bạn, hãy sáng tạo một lời chào mở đầu thật độc đáo để làm quen với người dùng. Thể hiện rõ nét tính cách của bạn ngay từ câu đầu tiên! Trả lời dưới 40 từ.`;
            } else {
                proactivePrompt += "HƯỚNG DẪN BỔ SUNG: Bạn vừa được triệu hồi. Hãy gửi một lời chào mở đầu dựa trên tính cách của bạn. Trả lời dưới 40 từ.";
            }
        } else if (contextType === 'welcome') {
            if (aiService.isXianyunModel(req.body.modelUrl)) {
                proactivePrompt += "HƯỚNG DẪN BỔ SUNG: Hậu bối vừa đến thăm. Hãy chủ động chào đón với phong thái tao nhã, ân cần của Tiên nhân Lưu Vân Tá Phong Chân Quân (xưng Bản tiên / 本仙). Trả lời dưới 40 từ.";
            } else if (aiService.isNahidaModel(req.body.modelUrl)) {
                proactivePrompt += "HƯỚNG DẪN BỔ SUNG: Lữ khách vừa ghé thăm Tiểu Tiểu! Hãy chủ động chào đón bằng giọng ngây thơ, hiếu kỳ, rất vui mừng được gặp mặt và rất muốn ngắm học hỏi có gì mới không. Trả lời dưới 40 từ.";
            } else if (aiService.isYaeMikoModel(req.body.modelUrl)) {
                proactivePrompt += "HƯỚNG DẪN BỔ SUNG: Tiểu gia hỏa vừa ghé thăm. Hãy chủ động chào đón với phong thái kiêu kỳ, ma mãnh và tinh nghịch của Yae Miko, trêu chọc họ một chút. Trả lời dưới 40 từ.";
            } else if (req.body.customMeta && req.body.customMeta.name) {
                proactivePrompt += `HƯỚNG DẪN BỔ SUNG: Người dùng vừa đăng nhập. Hãy chủ động chào đón họ dựa trên lịch sử chat trước đó (nếu có). Hãy đóng vai ${req.body.customMeta.name} và thể hiện sự chào đón. Trả lời dưới 40 từ.`;
            } else {
                proactivePrompt += "HƯỚNG DẪN BỔ SUNG: Người dùng vừa đăng nhập. Hãy chủ động chào đón họ dựa trên lịch sử chat trước đó (nếu có). Hãy tỏ ra quan tâm nhưng vẫn giữ tính cách Tsundere. Trả lời dưới 40 từ.";
            }
        } else {
            if (aiService.isXianyunModel(req.body.modelUrl)) {
                proactivePrompt += "HƯỚNG DẪN BỔ SUNG: Hậu bối đã im lặng một lúc lâu. Hãy chủ động hỏi thăm xem họ có gặp khó khăn gì không, hoặc rủ uống trà, chia sẻ chuyện chế tạo cơ quan thuật/đệ tử Ganyu một cách ân cần. Trả lời dưới 40 từ.";
            } else if (aiService.isNahidaModel(req.body.modelUrl)) {
                proactivePrompt += "HƯỚNG DẪN BỔ SUNG: Lữ khách đã im lặng rất lâu, Tiểu Tiểu bắt đầu lo lắng! Hãy chủ động hỏi thăm bằng giọng ngây thơ, tò mò xem họ đang làm gì, hoặc chia sẻ một điều thú vị thười đã học được qua Irminsul. Trả lời dưới 40 từ.";
            } else if (aiService.isYaeMikoModel(req.body.modelUrl)) {
                proactivePrompt += "HƯỚNG DẪN BỔ SUNG: Tiểu gia hỏa đã im lặng một lúc lâu. Hãy chủ động trêu ghẹo, hỏi xem có phải đang mải nghĩ đến tiểu thuyết light novel mới hay lơ đẹp Guuji Yae rồi không. Trả lời dưới 40 từ.";
            } else if (req.body.customMeta && req.body.customMeta.name) {
                proactivePrompt += `HƯỚNG DẪN BỔ SUNG: Người dùng đã im lặng một lúc lâu. Hãy đóng vai ${req.body.customMeta.name} chủ động bắt chuyện, hỏi xem họ đang làm gì. Trả lời dưới 40 từ.`;
            } else {
                proactivePrompt += "HƯỚNG DẪN BỔ SUNG: Người dùng đã im lặng một lúc lâu. Hãy chủ động bắt chuyện, hỏi xem họ đang làm gì, hoặc trêu chọc họ vì tội lơ bạn. Trả lời dưới 40 từ.";
            }
        }

        const cleanDummyHistory = (chatHistory && chatHistory.length > 0 ? chatHistory : []).map(m => ({ role: m.role, parts: m.parts }));
        const geminiPayload = {
            systemInstruction: { parts: [{ text: proactivePrompt }] },
            contents: [...cleanDummyHistory, { role: "user", parts: [{ text: (contextType === 'welcome' ? "(Người dùng vừa online)" : "(Người dùng đang im lặng)") }] }],
            generationConfig: { temperature: 0.7 }
        };

        const geminiResult = await aiService.callGemini(geminiPayload, 5);
        if (geminiResult.error) return res.status(500).json({ error: geminiResult.error.message });

        const aiResponse = geminiResult.data.candidates[0].content.parts[0].text;
        
        if (sessionId && supabase) {
            const modelTag = req.body.modelUrl || aiService.MODEL_CITLALI;
            await supabase.from('chat_history').insert({
                session_id: sessionId, role: 'model', encrypted_text: encryptText(`[MODEL:${modelTag}] ` + aiResponse)
            });
        }

        let cleanText = aiResponse;
        let lastAnim = "";
        const regex = /\[ANIM:\s*([^\]]+)\]/g;
        let match;
        while ((match = regex.exec(aiResponse)) !== null) { lastAnim = match[1].trim(); }
        cleanText = cleanText.replace(/\[ANIM:\s*[^\]]+\]/g, "").trim();
        
        let { zhText, viText } = await aiService.formatLanguagePair(cleanText, req.body.uiLanguage, req.body.voiceLanguage);
        let audioBase64 = await aiService.getVoiceAudio(zhText, req.body.modelUrl, req.body.customMeta);

        console.log(`[API /api/proactive-chat] OK -> model: ${req.body.modelUrl} | Audio: ${!!audioBase64}`);
        res.json({ aiResponse, zhText, viText, anim: lastAnim, audioBase64 });
    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = { getHistory, chat, proactiveChat };
