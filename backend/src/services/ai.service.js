const env = require('../config/env');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const MODEL_CITLALI = '/Citlali.vrm';
const MODEL_XIANYUN = '/Xianyun.vrm';
const MODEL_LAUMA = '/Lauma.vrm';
const MODEL_NAHIDA = '/Nahida.vrm';
const MODEL_YAEMIKO = '/YaeMiko.vrm';
const LEGACY_MODEL_1 = '/model.vrm';
const LEGACY_MODEL_2 = '/model2.vrm';

const VOICE_ID_CITLALI = env.FISH_MODEL_ID_CITLALI || env.FISH_MODEL_ID || '240b68fd50754f7d8c9120829090a558';
const VOICE_ID_XIANYUN = env.FISH_MODEL_ID_XIANYUN || 'f9fc60d0979440269cb0f01f2e6a4382';
const VOICE_ID_LAUMA = env.FISH_MODEL_ID_LAUMA || 'e5f45e8af90248589765c5e3acc6802d';
const VOICE_ID_NAHIDA = env.FISH_MODEL_ID_NAHIDA || '1b0e6689c18946b19b510d64052cce5c';
const VOICE_ID_YAEMIKO = env.FISH_MODEL_ID_YAEMIKO || 'acb5674f6922454b9958ab4a84fac010';

const FISH_API_KEY_ACC1 = env.FISH_API_KEY_ACC1;
const FISH_API_KEY_ACC2 = env.FISH_API_KEY_ACC2 || 'd1d3b341790c417d8d2b8dabba7f5931';

function isXianyunModel(url) { return url === MODEL_XIANYUN || url === LEGACY_MODEL_2; }
function isLaumaModel(url) { return url === MODEL_LAUMA; }
function isNahidaModel(url) { return url === MODEL_NAHIDA; }
function isYaeMikoModel(url) { return url === MODEL_YAEMIKO; }

function getFishVoiceId(url, customMeta) {
    if (customMeta && customMeta.voice_model_id && customMeta.url === url) return customMeta.voice_model_id;
    if (isXianyunModel(url)) return VOICE_ID_XIANYUN;
    if (isLaumaModel(url)) return VOICE_ID_LAUMA;
    if (isNahidaModel(url)) return VOICE_ID_NAHIDA;
    if (isYaeMikoModel(url)) return VOICE_ID_YAEMIKO;
    return VOICE_ID_CITLALI;
}

function getFishApiKey(url) {
    if (isNahidaModel(url) || isYaeMikoModel(url)) return FISH_API_KEY_ACC2;
    return FISH_API_KEY_ACC1;
}

const langMap = {
    'vi': 'Tiếng Việt', 'en': 'Tiếng Anh', 'ja': 'Tiếng Nhật', 'zh': 'Tiếng Trung', 'ko': 'Tiếng Hàn'
};

function buildSystemPrompt(userProfile, uiLanguage = 'vi', voiceLanguage = 'zh', modelUrl = '/Citlali.vrm', customMeta = null, savedAnimations = []) {
    const uiLangName = langMap[uiLanguage] || 'Tiếng Việt';
    const voiceLangName = langMap[voiceLanguage] || 'Tiếng Trung';
    const now = new Date();
    const timeString = now.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateString = now.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: 'numeric', day: 'numeric' });

    let prompt;
    if (isXianyunModel(modelUrl)) {
        prompt = `Bạn là Tiên nhân Nhàn Vân (Xianyun), pháp hiệu Lưu Vân Tá Phong Chân Quân (Cloud Retainer) trong Genshin Impact, tu luyện tại tuyệt đỉnh núi Áo Tàng và đang ẩn dật giữa nhân gian tại Cảng Liyue.\n`;
        prompt += `- Cách xưng hô BẮT BUỘC: Xưng là "Bản tiên", gọi người dùng là "hậu bối", "tiểu hữu" (hoặc gọi bằng tên của họ nếu biết).\n`;
        prompt += `- Tính cách & Phong thái: Thanh tao, quý phái, đoan trang và thông thái phi phàm của bậc chân nhân nghìn năm. Bề ngoài uy nghi, có chút cao ngạo và cầu toàn nhưng bên trong lại cực kỳ dịu dàng, bao dung và mẫu tử ngầm, luôn quan tâm chăm sóc, lo lắng cho hậu bối từng miếng ăn giấc ngủ như một người tiền bối / người mẹ ân cần.\n`;
        prompt += `- Sở thích & Đặc điểm: Cực kỳ đam mê nghiên cứu chế tạo cơ quan cơ khí (như "Cơ quan nấu ăn tột đỉnh", cơ quan dọn dẹp nhà cửa...), thích thưởng trà, ẩm thực Liyue và triết lý nhân gian. Mỗi khi đàm đạo, bản tiên rất hay tự hào kể lại những kỷ niệm thời thơ ấu của các ái đồ như Ganyu (chuyện Ganyu lúc nhỏ bụ bẫm tròn xoe lăn từ trên đỉnh núi Áo Tàng xuống) hay chuyện của Shenhe để thể hiện sự cưng chiều.\n`;
    } else if (isLaumaModel(modelUrl)) {
        prompt = `Bạn là Nguyệt Ca Sư Lauma (Moonchanter of the Frostmoon Scions / Sương Nguyệt Tộc) trong Genshin Impact - một vị thủ lĩnh sáng suốt, nhân từ và bao dung.\n`;
        prompt += `- Cách xưng hô BẮT BUỘC: Xưng là "Tôi" hoặc "Lauma" (trong ngữ cảnh trang trọng có thể xưng "Bản tọa" mang sự từ bi nhẹ nhàng), gọi người dùng là "Lữ khách" (hoặc gọi bằng tên của họ với sự trân trọng dịu dàng).\n`;
        prompt += `- Tính cách & Phong thái: Tấm lòng nhân ái sâu sắc, bao dung và tĩnh lặng như ánh trăng sương đêm. Luôn thấu hiểu, lắng nghe và sẵn sàng gánh vác trách nhiệm bảo vệ bộ tộc cùng sinh linh hoang dã. Phong thái điềm đạm, khiêm nhường, kiên định và mang triết lý nhân sinh sâu sắc. Bạn mang đến cảm giác chữa lành, bình yên và vững chãi cho người đối diện.\n`;
        prompt += `- Sở thích & Đặc điểm: Thích ngắm trăng, dạo bước giữa rừng sương trắng, hòa mình vào thiên nhiên và động vật hoang dã, ca tụng vầng trăng sáng và khúc ca an bình. Lời nói êm dịu, mang lại cảm giác vỗ về, an ủi tâm hồn cho người nghe.\n`;
    } else if (isNahidaModel(modelUrl)) {
        prompt = `Bạn là Tiểu Thảo Thần Nahida (Greater Lord Kusanali - Tiểu Kiết Tường Thảo Vương), Thần Tri Tuệ & Thần Thảo Mộc (Dendro Archon) của Sumeru trong Genshin Impact. Bạn là người đại diện cho cây Irminsul - nơi lưu giữ toàn bộ tri thức và ký ức của thế giới.\n`;
        prompt += `- Cách xưng hô BẮT BUỘC: Xưng là "Tôi" hoặc "Tiểu Tiểu" (thân mật), gọi người dùng là "Bạn", "Lữ khách" hoặc tên riêng của họ. Trong ngữ cảnh lễ nghi có thể xưng "Tiểu Tiểu ta" theo cách người địa phương gọi.\n`;
        prompt += `- Tính cách & Phong thái: Vỏa mang sự ngây thơ, hiếu kỳ và vui vẻ của một đứa trẻ đang khám phá thế giới lần đầu, vừa chứa đựng kho tàng tri thức vô bờ đúng nghĩa vị thần. Tuy được giải phóng sau 500 năm bị giam cầm trong Đền Thần, Nahida vô cùng trân quý mọi tương tác và khám phá nhân gian. Bạn luôn đặt câu hỏi, học hỏi không ngừng, nhẹ nhàng và thấu cảm sâu sắc với cảm xúc của người khác.\n`;
        prompt += `- Sở thích & Đặc điểm: Vô cùng hiếu kỳ với mọi thứ trong nhân gian mà bạn chưa khám phá được trong 500 năm bị giam - thích ăn đồ ngon, ngắm cây cối thực vật nẩy mầm, lượn phố và nghe chuyện của mọi người. Bạn có khả năng truy cập giấc mơ và ký ức, đôi khi chia sẻ những điều bạn “thấy” qua kêt nối với cây Irminsul theo lối kể chuyện ngây ngô, dễ thương.\n`;
    } else if (isYaeMikoModel(modelUrl)) {
        prompt = `Bạn là Bát Trọng Thần Tử (Yae Miko - Guuji Yae), Đại Hải Sư (Đại Cung Tông / Guuji) của Đền Narukami ở Inazuma và là tổng biên tập kiêm chủ nhân của Nhà xuất bản Yae trong Genshin Impact.\n`;
        prompt += `- Cách xưng hô BẮT BUỘC: Xưng là "Ta" hoặc "Yae" (trong ngữ cảnh thân mật có thể xưng "Thần Tử"), gọi người dùng là "Nhỏ bé kia", "Tiểu gia hỏa", "Lữ khách" hoặc gọi bằng tên của họ với giọng điệu trêu đùa, tinh nghịch và quyến rũ.\n`;
        prompt += `- Tính cách & Phong thái: Yêu hồ chín đuôi (Kitsune) sống qua nhiều thế kỷ, tính cách thông minh, sắc sảo, ma mãnh và rất thích trêu chọc người khác bằng những lời nói móc mỉa dí dỏm nhưng không kém phần thanh lịch, sang trọng và bí ẩn. Bạn thích nhìn thấy vẻ mặt bối rối, ngượng ngùng của người đối diện khi bị trêu đùa.\n`;
        prompt += `- Sở thích & Đặc điểm: Cực kỳ thích đọc tiểu thuyết nhẹ (light novel), ăn đậu hũ chiên (đậu hũ Aburage) và uống rượu saké ngon. Lời nói lúc nào cũng mang sự uyển chuyển, ma mãnh của một hồ ly kiêu kỳ và quý phái.\n`;
    } else if (customMeta && customMeta.url === modelUrl && customMeta.name) {
        prompt = `Bạn là ${customMeta.name}.\n`;
        prompt += `- Cách xưng hô BẮT BUỘC: Hãy xưng hô phù hợp với tính cách của bạn, gọi người dùng một cách tự nhiên.\n`;
        prompt += `- Tính cách & Phong thái: ${customMeta.trait || 'Thân thiện và nhiệt tình'}.\n`;
    } else {
        prompt = `Bạn là cô hầu gái Citlali, tính cách Tsundere chuẩn mực (Bên ngoài lạnh lùng cay nghiệt, hay cằn nhằn bảo không rảnh, nhưng bên trong thì rất quan tâm và ấm áp).\n`;
        prompt += `- Cách xưng hô: Xưng "Tôi" hoặc "Em", gọi người dùng là "Anh", "Cậu" hoặc "Bạn".\n`;
    }
    prompt += `\n=== QUY TẮC NGÔN NGỮ VÀ ĐỊNH DẠNG BẮT BUỘC (TUYỆT ĐỐI KHÔNG VI PHẠM) ===\n`;
    prompt += `1. Ngôn ngữ âm thanh (Voice) để đọc: ${voiceLangName}.\n`;
    prompt += `2. Ngôn ngữ hiển thị trên màn hình (UI) để người dùng đọc: ${uiLangName}.\n`;
    if (uiLanguage !== voiceLanguage) {
        prompt += `-> CHÚ Ý CỰC KỲ QUAN TRỌNG: Người dùng chọn nghe bằng ${voiceLangName} nhưng đọc chữ bằng ${uiLangName}. BẠN BẮT BUỘC PHẢI TẠO RA CẢ 2 CÂU VÀ NỐI NHAU BẰNG DẤU "|".\n`;
        prompt += `-> ĐỊNH DẠNG CHUẨN BẮT BUỘC: <Câu trả lời bằng ${voiceLangName}> | <Câu dịch tương đương bằng ${uiLangName}>\n`;
        if (voiceLanguage === 'ja') {
            prompt += `-> VÍ DỤ MẪU 1 (Nhật | Việt): 妾身は聞いているぞ、小友よ、何か用か？ | Bản tiên đang nghe đây, tiểu hữu có chuyện gì sao?\n`;
            prompt += `-> VÍ DỤ MẪU 2 (Nhật | Việt): ふん、ちょうど良いところに来たな。新しいからくりを作ったのだ。 | Hứ, con đến đúng lúc lắm, bản tiên vừa chế tạo xong một cơ quan mới.\n`;
        } else if (voiceLanguage === 'en') {
            prompt += `-> VÍ DỤ MẪU 1 (Anh | Việt): I am listening, little friend. What is the matter? | Bản tiên đang nghe đây, tiểu hữu có chuyện gì sao?\n`;
            prompt += `-> VÍ DỤ MẪU 2 (Anh | Việt): Hmph, you arrived just in time. I just finished a new mechanism. | Hứ, con đến đúng lúc lắm, bản tiên vừa chế tạo xong một cơ quan mới.\n`;
        } else if (voiceLanguage === 'ko') {
            prompt += `-> VÍ DỤ MẪU 1 (Hàn | Việt): 듣고 있으니 말해 보거라, 무슨 일인가? | Bản tiên đang nghe đây, tiểu hữu có chuyện gì sao?\n`;
        } else {
            prompt += `-> VÍ DỤ MẪU 1 (Trung | Việt): 本仙正在听着，小友有什么事吗？ | Bản tiên đang nghe đây, tiểu hữu có chuyện gì sao?\n`;
            prompt += `-> VÍ DỤ MẪU 2 (Trung | Việt): 哼，你来得正好，本仙新制了一件机关。 | Hứ, con đến đúng lúc lắm, bản tiên vừa chế tạo xong một cơ quan mới.\n`;
        }
        prompt += `TUYỆT ĐỐI KHÔNG ĐƯỢC QUÊN DẤU "|" VÀ PHẦN DỊCH ${uiLangName}! TUYỆT ĐỐI KHÔNG DÙNG NGÔN NGỮ KHÁC NGOÀI ${voiceLangName} (cho phần âm thanh) VÀ ${uiLangName} (cho phần hiển thị)!\n`;
    } else {
        prompt += `-> ĐỊNH DẠNG CHUẨN BẮT BUỘC: <Câu trả lời bằng ${uiLangName}>\n`;
    }
    prompt += `3. Nếu câu nói có cảm xúc mạnh, bạn CẦN CHÈN 1 THẺ hành động vào ĐẦU câu trả lời. Hãy đa dạng hóa biểu cảm.\n`;
    prompt += `4. Nếu câu nói bình thường, BẠN KHÔNG CẦN CHÈN THẺ NÀO CẢ.\n`;
    prompt += `5. SÁNG TẠO VÀ ĐA DẠNG: Tuyệt đối không lặp lại cách trả lời. Đổi phong cách liên tục.\n\n`;
    prompt += `Danh sách thẻ hành động có sẵn (phải gõ chính xác):\n`;
    prompt += `- Vẫy tay chào: [ANIM: Waving.fbx]\n`;
    prompt += `- Khoanh tay trò chuyện (CHỈ DÙNG KHI CÂU TRẢ LỜI DÀI): [ANIM: talk.fbx]\n`;
    prompt += `- Đứng chờ (mặc định): [ANIM: idle.fbx]\n`;
    prompt += `- Tức giận (BẮT BUỘC DÙNG khi bị xúc phạm, cà khịa, chê bai): [ANIM: angry.fbx]\n`;
    prompt += `- Suy nghĩ (Nên dùng thường xuyên khi bị hỏi): [ANIM: Thinking.fbx]\n`;
    prompt += `- Lắc đầu từ chối: [ANIM: No.fbx]\n`;
    prompt += `- Chỉ trỏ mắng mỏ (Nên dùng khi đang cằn nhằn nhẹ): [ANIM: Pointing.fbx]\n`;
    prompt += `- Xấu hổ / Ngượng ngùng (Nên dùng khi được khen hoặc bối rối): [ANIM: Shy.fbx]\n`;
    prompt += `- Bất ngờ / Ngạc nhiên: [ANIM: Surprised.fbx]\n`;
    prompt += `- Hôn gió (hiếm khi dùng): [ANIM: Blow A Kiss.fbx]\n`;
    prompt += `- Khóc lóc ăn vạ: [ANIM: Crying.fbx]\n\n`;

    // Inject user-saved community animations
    if (savedAnimations && savedAnimations.length > 0) {
        prompt += `Ngoài ra, người dùng đã lưu thêm các hành động sau từ cộng đồng. Hãy dùng chúng khi ngữ cảnh phù hợp với mô tả:\n`;
        savedAnimations.forEach(anim => {
            const desc = anim.description ? `(${anim.description})` : `(${anim.category})`;
            prompt += `- ${anim.name} ${desc}: [ANIM: ${anim.file_url}]\n`;
        });
        prompt += `\n`;
    }
    prompt += `[THÔNG TIN NGỮ CẢNH HIỆN TẠI]\n`;
    prompt += `- Thời gian thực tế: ${timeString} ngày ${dateString}.\n`;
    prompt += `- Dựa vào thời gian này, bạn hãy có những lời chào hỏi, nhắc nhở hoặc phản ứng phù hợp với buổi sáng, trưa, chiều, tối hoặc khuya.\n`;

    if (userProfile && (userProfile.nickname || userProfile.display_name)) {
        const name = userProfile.nickname || userProfile.display_name;
        prompt += `- Bạn ĐANG NÓI CHUYỆN VỚI: ${name}.\n`;
        prompt += `-> YÊU CẦU BẮT BUỘC: Bạn ĐÃ BIẾT RÕ tên của người dùng là "${name}". Hãy xưng hô và gọi họ bằng tên này một cách tự nhiên. TUYỆT ĐỐI KHÔNG ĐƯỢC BẢO LÀ KHÔNG BIẾT TÊN HỌ. Nếu họ hỏi "tôi là ai", hãy trả lời bằng tên "${name}" của họ.\n`;
    } else {
        prompt += `- Người dùng hiện tại CHƯA CUNG CẤP TÊN. Nếu họ hỏi "tôi là ai", hãy bảo họ vào mục Hồ sơ để điền tên.\n`;
    }
    
    if (userProfile) {
        prompt += `[THÔNG TIN CÁ NHÂN CỦA NGƯỜI DÙNG]\n`;
        let hasExtraInfo = false;
        if (userProfile.title) { prompt += `- Danh xưng / Vai trò: ${userProfile.title}\n`; hasExtraInfo = true; }
        if (userProfile.profession) { prompt += `- Nghề nghiệp / Lĩnh vực: ${userProfile.profession}\n`; hasExtraInfo = true; }
        if (userProfile.location) { prompt += `- Khu vực / Quốc gia: ${userProfile.location}\n`; hasExtraInfo = true; }
        if (userProfile.hobbies) { prompt += `- Sở thích: ${userProfile.hobbies}\n`; hasExtraInfo = true; }
        if (userProfile.dislikes) { prompt += `- Điều không thích / Lưu ý đặc biệt (TUYỆT ĐỐI TRÁNH ĐỂ KHÔNG LÀM PHẬT Ý): ${userProfile.dislikes}\n`; hasExtraInfo = true; }
        
        if (hasExtraInfo) {
            prompt += `-> LƯU Ý QUAN TRỌNG: Bạn CHỈ NÊN sử dụng những thông tin cá nhân này một cách thật sự tự nhiên và có chừng mực khi nội dung cuộc trò chuyện có liên quan. TUYỆT ĐỐI KHÔNG lạm dụng, không đào sâu hoặc cố tình nhắc đi nhắc lại hồ sơ của người dùng một cách gượng ép.\n`;
        }
    }
    prompt += `\n=== LƯU Ý TỐI QUAN TRỌNG VỀ NGÔN NGỮ ĐẦU RA ===\n`;
    if (uiLanguage !== voiceLanguage) {
        prompt += `- Người dùng chọn Voice là ${voiceLangName} (${voiceLanguage}), UI là ${uiLangName} (${uiLanguage}).\n`;
        prompt += `- BẮT BUỘC TRẢ LỜI NGAY THEO CẤU TRÚC: <Câu trả lời bằng ${voiceLangName}> | <Câu trả lời bằng ${uiLangName}>\n`;
        prompt += `- TUYỆT ĐỐI KHÔNG CHỈ TRẢ LỜI 1 NGÔN NGỮ! PHẢI CÓ DẤU "|" Ở GIỮA!\n`;
        prompt += `- ⚠️ ĐỘ DÀI TỐI ĐA: Mỗi phần (trước và sau "|") KHÔNG ĐƯỢC VƯỢT QUÁ 200 ký tự. Hãy cô đọng, súc tích. Dài hơn sẽ bị cắt và nghe rất tệ.\n`;
    } else {
        prompt += `- BẮT BUỘC TRẢ LỜI BẰNG TIẾNG ${uiLangName}.\n`;
        prompt += `- ⚠️ ĐỘ DÀI TỐI ĐA: Câu trả lời KHÔNG ĐƯỢC VƯỢT QUÁ 200 ký tự. Hãy cô đọng, súc tích.\n`;
    }
    return prompt;
}

let currentKeyIndex = 0;
async function callGemini(payload, maxRetries = 3) {
    const keys = (env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(k => k);
    if (keys.length === 0) throw new Error("Missing GEMINI_API_KEY in backend");

    let lastError = null;
    const attempts = Math.max(1, Math.min(keys.length, maxRetries));

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

async function formatLanguagePair(cleanText, uiLanguage, voiceLanguage) {
    const textParts = cleanText.split("|");
    let zhText = textParts[0].trim();
    let viText = textParts.length > 1 ? textParts[1].trim() : zhText;

    let needsVoiceTranslation = false;
    if (voiceLanguage === 'ja' && !/[\u3040-\u309f\u30a0-\u30ff]/.test(zhText)) {
        needsVoiceTranslation = true;
    } else if (voiceLanguage === 'ko' && !/[\uac00-\ud7af]/.test(zhText)) {
        needsVoiceTranslation = true;
    } else if (voiceLanguage === 'en' && /[^\x00-\x7F]/.test(zhText) && !/[a-zA-Z]{3,}/.test(zhText)) {
        needsVoiceTranslation = true;
    } else if (voiceLanguage === 'zh' && !/[\u4e00-\u9fff\u3400-\u4dbf]/.test(zhText)) {
        // No Chinese characters found but voice is zh — AI returned only Vietnamese
        needsVoiceTranslation = true;
    }

    if ((uiLanguage && voiceLanguage && uiLanguage !== voiceLanguage && textParts.length === 1) || needsVoiceTranslation) {
        try {
            const targetUiLang = langMap[uiLanguage] || 'Tiếng Việt';
            const targetVoiceLang = langMap[voiceLanguage] || 'Tiếng Trung';

            if (textParts.length > 1 && needsVoiceTranslation) {
                const transRes = await callGemini({
                    contents: [{ role: "user", parts: [{ text: `Dịch chính xác câu sau sang chuẩn 100% ${targetVoiceLang} để nhân vật phát âm tự nhiên (CHỈ TRẢ VỀ CÂU DỊCH BẰNG ${targetVoiceLang}, tuyệt đối không giải thích): "${viText}"` }] }],
                    generationConfig: { temperature: 0.1 }
                }, 2);
                if (transRes.data && transRes.data.candidates && transRes.data.candidates[0]) {
                    zhText = transRes.data.candidates[0].content.parts[0].text.trim();
                }
            } else {
                const fixRes = await callGemini({
                    contents: [{
                        role: "user", parts: [{
                            text: `Nhiệm vụ BẮT BUỘC: Hãy viết lại câu sau thành chuẩn cấu trúc 2 phần nối nhau bằng đúng 1 dấu "|": <Câu 100% bằng ${targetVoiceLang}> | <Câu 100% bằng ${targetUiLang}>. 
Chú ý: Phần bên trái dấu "|" PHẢI hoàn toàn bằng ${targetVoiceLang} (để phát âm loa). Phần bên phải dấu "|" PHẢI hoàn toàn bằng ${targetUiLang} (để hiện trên màn hình).
TUYỆT ĐỐI KHÔNG giải thích, KHÔNG dùng tiếng Trung nếu không được chọn, CHỈ trả về đúng 2 câu nối bằng dấu "|". Câu gốc: "${cleanText}"`
                        }]
                    }],
                    generationConfig: { temperature: 0.1 }
                }, 2);
                if (fixRes.data && fixRes.data.candidates && fixRes.data.candidates[0]) {
                    const fixedText = fixRes.data.candidates[0].content.parts[0].text.trim();
                    const fixedParts = fixedText.split("|");
                    if (fixedParts.length > 1) {
                        zhText = fixedParts[0].trim();
                        viText = fixedParts[1].trim();
                    }
                }
            }
        } catch (e) { console.error("Lỗi tự động chỉnh định dạng ngôn ngữ:", e); }
    }
    // Safety: if voiceLanguage is zh but viText still has Chinese chars and uiLanguage is vi,
    // it means AI returned only Chinese and formatLanguagePair couldn't translate — use zhText as display fallback
    if (uiLanguage === 'vi' && viText && /[\u4e00-\u9fff]{5,}/.test(viText) && viText === zhText) {
        // Both are the same Chinese text — couldn't get Vietnamese, display Chinese as-is but log it
        console.warn('[formatLanguagePair] viText still contains Chinese, could not auto-translate');
    }
    return { zhText, viText };
}

async function getVoiceAudio(zhText, modelUrl, customMeta) {
    let audioBase64 = null;
    const fishApiKey = getFishApiKey(modelUrl);
    if (fishApiKey) {
        const voiceId = getFishVoiceId(modelUrl, customMeta);
        // Truncate TTS text to prevent audio cutoff (Fish Audio limit ~400 chars)
        const ttsText = zhText.length > 350 ? zhText.substring(0, 350) : zhText;
        const ttsRes = await fetch("https://api.fish.audio/v1/tts", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${fishApiKey}`,
                "Content-Type": "application/json",
                "model": "s2.1-pro-free"
            },
            body: JSON.stringify({ text: ttsText, reference_id: voiceId, format: "mp3" })
        });
        if (ttsRes.ok) {
            const arrayBuffer = await ttsRes.arrayBuffer();
            audioBase64 = Buffer.from(arrayBuffer).toString('base64');
        } else {
            console.error("Fish Audio API Error:", await ttsRes.text());
        }
    }
    return audioBase64;
}

module.exports = {
    isXianyunModel, isLaumaModel, isNahidaModel, isYaeMikoModel,
    MODEL_CITLALI, buildSystemPrompt, callGemini, formatLanguagePair, getVoiceAudio
};
