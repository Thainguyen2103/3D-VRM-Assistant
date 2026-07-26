# 3D VRM AI Assistant (3D VRM AI アシスタント)

**🌐 Live Demo:** [https://3-d-vrm-assistant.vercel.app/](https://3-d-vrm-assistant.vercel.app/)

---

## 📖 Giới thiệu dự án (Project Overview)

**3D VRM AI Assistant** là ứng dụng trợ lý ảo 3D chạy hoàn toàn trên trình duyệt, kết hợp công nghệ **Three.js**, **VRM (Virtual Reality Model)** và **AI (Google Gemini)** để tạo ra những nhân vật 3D có khả năng trò chuyện, phát âm thanh giọng nói tự nhiên và thể hiện cảm xúc thông qua hoạt ảnh.

Người dùng có thể tương tác với **5 nhân vật 3D** lấy cảm hứng từ game Genshin Impact, mỗi nhân vật có cá tính, giao diện màu sắc và giọng nói riêng biệt.

---

## 🎭 Danh sách nhân vật (Characters)

| Nhân vật | Vai trò | Tính cách | Theme màu |
|---|---|---|---|
| **🌸 Citlali** | Cô hầu gái Tsundere | Lạnh lùng bên ngoài, ấm áp bên trong | Xanh Đêm Chàm (`#3f51b5`) |
| **☁️ Xianyun** | Tiên nhân Nhàn Vân (Cloud Retainer) | Thanh tao, quý phái, mẫu tử ngầm | Xanh Ngọc (`#00838f`) |
| **🌙 Lauma** | Nguyệt Ca Sư (Moonchanter) | Nhân ái, bình yên, chữa lành | Xanh Lá (`#2e7d32`) |
| **🌿 Nahida** | Tiểu Thảo Thần (Dendro Archon) | Ngây thơ, hiếu kỳ, thông thái | Xanh Lá Nhạt (`#558b2f`) |
| **🦊 Yae Miko** | Đại Miko Đền Narukami (Guuji Yae) | Ma mãnh, tinh nghịch, bí ẩn | Hồng Anh Đào (`#e94560`) |

---

## ✨ Tính năng chính (Key Features)

### 🤖 AI & Hội thoại
- **Trò chuyện đa ngôn ngữ**: UI và giọng nói có thể cài đặt độc lập (Tiếng Việt, Nhật, Anh, Trung, Hàn)
- **Nhân cách AI chuyên sâu**: Mỗi nhân vật có system prompt riêng phản ánh đúng tính cách trong game
- **Hội thoại chủ động (Proactive Chat)**: Nhân vật tự chủ động mở lời khi chào mừng hoặc phát hiện người dùng nhàn rỗi
- **Lịch sử chat đa phiên**: Mỗi phiên hội thoại được lưu trữ và mã hoá trên Supabase

### 🔊 Giọng nói (TTS)
- Tích hợp **Fish Audio API** với từng ID giọng nói riêng cho từng nhân vật
- Hỗ trợ phát âm thanh real-time cùng với hoạt ảnh nhân vật

### 🎬 Hoạt ảnh & 3D
- Render nhân vật VRM chất lượng cao với `@pixiv/three-vrm` và Three.js
- **Hoạt ảnh cảm xúc tự động**: AI phân tích phản hồi và chèn thẻ `[ANIM: xxx.fbx]` để kích hoạt hoạt ảnh Mixamo (vẫy tay, suy nghĩ, tức giận, xấu hổ, bật khóc...)
- **Điều khiển camera thông minh**: Camera tự động căn chỉnh theo chiều cao từng nhân vật (loli / thiếu nữ / nữ trưởng thành)
- Bảng điều khiển tư thế thủ công với FK/IK xương ngón tay, tham số biểu cảm khuôn mặt

### 🌍 Môi trường 3D động
- Skybox thay đổi theo thời gian thực (sáng / trưa / chiều / tối)
- Hiệu ứng thời tiết động: **Mưa**, **Tuyết**, **Hoa anh đào** bay
- Cảnh quan Nhật Bản: Torii đỏ, hồ nước, rừng anh đào

### 🎨 Giao diện (UI/UX)
- **5 theme màu riêng biệt** cho từng nhân vật, tự động chuyển đổi khi đổi nhân vật
- **Bộ chọn nhân vật** với avatar icon và card UI đẹp mắt
- **Quản lý phiên chat** (tạo mới, xem lịch sử, xoá phiên)
- Hỗ trợ **5 ngôn ngữ giao diện**: Tiếng Việt, Nhật, Anh, Trung, Hàn

### 👤 Người dùng & Xác thực
- Đăng ký / Đăng nhập qua **Supabase Auth**
- Hồ sơ cá nhân: tên hiển thị, biệt danh, avatar, giới thiệu bản thân
- AI tự nhận biết tên người dùng và xưng hô đúng theo tên

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

| Layer | Công nghệ |
|---|---|
| **Frontend** | HTML5, CSS3, TypeScript, Vite, Three.js, `@pixiv/three-vrm` |
| **Backend** | Node.js, Express.js |
| **Database & Auth** | Supabase (PostgreSQL + Auth) |
| **AI / LLM** | Google Gemini 3.1 Flash API |
| **TTS** | Fish Audio API |
| **Deployment** | Vercel (Frontend) + Render (Backend) |

---

## 📁 Cấu trúc thư mục (Directory Structure)

```
3D-VRM-Assistant-main/
├── backend/                # Node.js Express server
│   ├── server.js           # API chính (chat, sessions, TTS proxy)
│   └── .env                # Biến môi trường (không commit)
├── public/                 # Assets tĩnh
│   ├── *.vrm               # Model 3D (Citlali, Xianyun, Lauma, Nahida, YaeMiko)
│   ├── Icon_Models/        # Avatar icon từng nhân vật
│   ├── flaticons/          # Icon PNG
│   └── animations/         # FBX animation files (Mixamo)
├── src/                    # Frontend TypeScript source
│   ├── scene/              # Skybox, môi trường, thời tiết
│   ├── vrm/                # VRM loader, animation, camera
│   ├── ui/                 # Chat UI, UIManager, Profile, CustomDialog
│   ├── core/               # Auth (Supabase)
│   ├── constants.ts        # Hằng số nhân vật
│   ├── i18n.ts             # Đa ngôn ngữ + UI theo nhân vật
│   ├── style.css           # CSS + 5 theme màu nhân vật
│   └── customSelect.ts     # Component select tuỳ chỉnh
├── index.html
├── login.html
├── profile.html
├── vite.config.ts
├── tsconfig.json
└── vercel.json
```

---

## 🚀 Hướng dẫn chạy local (How to Run Locally)

### Yêu cầu
- Node.js v18+
- Google Gemini API Key
- Fish Audio API Key
- Supabase Project

### 1. Clone & cài đặt
```bash
git clone https://github.com/Thainguyen2103/3D-VRM-Assistant.git
cd 3D-VRM-Assistant-main
npm install
cd backend && npm install && cd ..
```

### 2. Cấu hình biến môi trường
Tạo file `backend/.env`:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key

FISH_API_KEY=your_fish_api_key_default
FISH_API_KEY_NAHIDA=your_fish_api_key_nahida
FISH_MODEL_ID_CITLALI=your_citlali_voice_id
FISH_MODEL_ID_XIANYUN=your_xianyun_voice_id
FISH_MODEL_ID_LAUMA=your_lauma_voice_id
FISH_MODEL_ID_NAHIDA=your_nahida_voice_id
FISH_MODEL_ID_YAEMIKO=your_yaemiko_voice_id

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

CHAT_ENCRYPTION_KEY=your_32_char_secret_key
FRONTEND_URL=http://localhost:5173
```

Tạo file `.env` tại thư mục gốc:
```env
VITE_BACKEND_URL=http://localhost:3000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Chạy Backend
```bash
cd backend && node server.js
```

### 4. Chạy Frontend (terminal khác)
```bash
npm run dev
```

Truy cập `http://localhost:5173`

---

## ☁️ Deployment

| Service | Vai trò |
|---|---|
| **Vercel** | Frontend — tự động deploy khi push `main` |
| **Render** | Backend Node.js — cần thêm env vars trong dashboard |
| **Supabase** | Database + Auth — tables: `user_profiles`, `chat_sessions`, `chat_history` |

---

## 💡 Điểm nổi bật kỹ thuật (For Recruiters)

- **Prompt Engineering nâng cao**: System prompt động theo nhân vật, ngôn ngữ UI/voice độc lập, thời gian thực và thông tin người dùng. Xử lý dual-language output với fallback tự dịch qua Gemini.
- **Full-stack TypeScript/JavaScript**: Frontend TypeScript + Vite, Backend Node.js/Express, tích hợp 3 external API (Gemini, Fish Audio, Supabase).
- **3D Real-time Rendering**: Three.js + VRM, camera thích ứng theo nhân vật, môi trường động (skybox, thời tiết, ánh sáng), hoạt ảnh FBX qua Mixamo.
- **Bảo mật**: Lịch sử chat mã hoá AES-256-CBC trước khi lưu vào Supabase.
- **UX Đa nhân vật**: 5 theme CSS, camera preset, voice ID, system prompt riêng — chuyển đổi mượt mà không reload trang.
