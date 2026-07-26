# 3D VRM AI Assistant (3D VRM AI アシスタント)

**🌐 デモサイト (Live Demo):** [https://3-d-vrm-assistant.vercel.app/](https://3-d-vrm-assistant.vercel.app/)

## プロジェクト概要 (Project Overview)
本プロジェクトは、Three.jsとVRM技術を活用し、ブラウザ上で動作するインタラクティブな3D AIアシスタントです。Google Gemini APIと音声合成（Fish Audio API）を統合することで、ユーザーとの自然な会話・感情豊かな表情変化・会話に応じた自動アニメーション再生を実現しています。

ユーザーはGenshin Impactにインスパイアされた**5体の3Dキャラクター**と会話できます。各キャラクターは固有のAIパーソナリティ、カラーテーマ、音声を持ちます。

## 主な機能 (Key Features)
- **インタラクティブな3Dアバター**: `@pixiv/three-vrm`とThree.jsによる高品質VRMレンダリング
- **AIチャットシステム**: Gemini APIを通じたキャラクター別の詳細なシステムプロンプト設計
- **音声合成 (TTS)**: Fish Audio APIによりキャラクターごとに固有の音声IDを使用
- **感情連動アニメーション**: AIの返答に含まれる感情タグ（例: `[ANIM: Waving.fbx]`）を解析し、Mixamoベースのアニメーションと表情を自動トリガー
- **プロアクティブチャット**: ユーザーのアイドル状態を検知し、キャラクターが自発的に話しかける機能
- **スマートカメラ制御**: キャラクターの体型（幼女・少女・成人女性）に合わせた自動カメラ調整
- **5種類のキャラクターテーマ**: キャラクター切替時にUI全体のカラーテーマが自動変更
- **高度なUIコントロールパネル**: カメラアングル切替、環境設定（時間帯・天候）、手動ポーズ調整、表情スライダー
- **多言語対応 (i18n)**: UIと音声を独立して設定可能（日本語・英語・ベトナム語・中国語・韓国語）
- **ユーザー認証・プロフィール**: Supabase Authによるログイン、プロフィール管理、チャット履歴の暗号化保存

## 技術スタック (Tech Stack)
- **フロントエンド**: HTML5, CSS3, TypeScript, Vite, Three.js, `@pixiv/three-vrm`
- **バックエンド**: Node.js, Express.js
- **データベース・認証**: Supabase (PostgreSQL + Auth)
- **外部API**: Google Gemini 3.1 Flash API (LLM), Fish Audio API (TTS)
- **デプロイ**: Vercel (Frontend) + Render (Backend)

## ディレクトリ構成 (Directory Structure)
- `src/` : フロントエンドのソースコード
  - `scene/` : 環境・空・天候の設定
  - `vrm/` : VRMモデルのロードとアニメーション制御
  - `ui/` : チャットUI・UIManager・プロフィール
  - `core/` : Supabase認証
  - `i18n.ts` : 多言語対応 + キャラクター別UI更新
  - `style.css` : 全CSS + 5キャラクターカラーテーマ
  - `constants.ts` : キャラクター定数定義
- `backend/` : Node.jsサーバー (APIプロキシ・プロンプト処理・暗号化)
- `public/` : 静的アセット (VRMモデル・FBXアニメーション・アイコン)

## セットアップと実行方法 (How to Run)

### 前提条件 (Prerequisites)
- Node.js (v18以上)
- Google Gemini API キー
- Fish Audio API キー
- Supabase プロジェクト

### 1. リポジトリのクローンと依存関係のインストール
```bash
git clone https://github.com/Thainguyen2103/3D-VRM-Assistant.git
cd 3D-VRM-Assistant-main
npm install
cd backend && npm install && cd ..
```

### 2. 環境変数の設定
`backend/.env` を作成:
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

プロジェクトルートに `.env` を作成:
```env
VITE_BACKEND_URL=http://localhost:3000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. バックエンドサーバーの起動
```bash
cd backend
node server.js
```

### 4. フロントエンド開発サーバーの起動 (別ターミナル)
```bash
npm run dev
```

ブラウザで `http://localhost:5173` にアクセス。

## アピールポイント (For Recruiters)
本プロジェクトは、単なる3Dモデル表示にとどまらず、**LLMのプロンプトエンジニアリング**（キャラクター別・UI/音声言語独立設定・Geminiフォールバック自動翻訳）、**AES-256-CBCによるチャット履歴の暗号化**、**Three.jsによる複雑な3Dシーン・アニメーション・カメラ管理**、そして**フロントエンドからバックエンドまで一貫したフルスタック開発能力**を示しています。5キャラクター分のCSSテーマ・カメラプリセット・音声IDの独立管理をページリロードなしにシームレスに切り替える点が本プロジェクトの技術的な特徴です。
