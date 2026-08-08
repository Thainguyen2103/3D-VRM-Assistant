# 3D VRM AI Assistant (3D VRM AI アシスタント)

**🌐 デモサイト (Live Demo):** [https://3-d-vrm-assistant.vercel.app/](https://3-d-vrm-assistant.vercel.app/)

## プロジェクト概要 (Project Overview)
本プロジェクトは、Three.jsとVRM技術を活用し、ブラウザ上で動作するインタラクティブな3D AIアシスタントです。Google Gemini APIと音声合成（Fish Audio API）を統合することで、ユーザーとの自然な会話・感情豊かな表情変化・会話に応じた自動アニメーション再生を実現しています。

初期実装のGenshin Impactにインスパイアされた5体のキャラクターに加え、新たに**「ディスカバー (Discover)」**というコミュニティハブ機能を追加しました。これにより、ユーザー自身がVRMモデル（キャラクター）やFBXファイル（アニメーション）をアップロード・共有し、AIチャット画面で自由に呼び出して使用することが可能になりました。

## 主な機能 (Key Features)

### 🌟 コミュニティ＆拡張機能 (Discover Hub) [NEW]
- **カスタムアバター＆アニメーションの共有**: ユーザーが独自のVRMファイルとFBXアニメーションをアップロードし、コミュニティで共有可能。
- **3Dプレビューア**: ディスカバー画面に統合された専用の3Dビューア（AnimationViewer & VrmViewer）により、ダウンロードせずにブラウザ上で直接モデルとアニメーションの動きを確認できます。
- **マイコレクション機能**: コミュニティで見つけたお気に入りのキャラクターやアニメーションを保存し、メインのAIチャット画面にシームレスにインポートして使用可能。
- **動的な属性・テーマ設定**: アップロードされたキャラクターごとに、固有の属性（炎、水、風、雷、草など）を設定でき、選択時にUI全体のカラーテーマが自動的に切り替わります。

### 🤖 AIチャット＆インタラクション
- **インタラクティブな3Dアバター**: `@pixiv/three-vrm`とThree.jsによる高品質VRMレンダリング。
- **AIチャットシステム**: Gemini APIを通じたキャラクター別の詳細なシステムプロンプト設計。
- **音声合成 (TTS)**: Fish Audio APIによりキャラクターごとに固有の音声IDを使用。
- **感情連動アニメーション**: AIの返答に含まれる感情タグを解析し、アニメーションと表情を自動トリガー。
- **プロアクティブチャット**: ユーザーのアイドル状態を検知し、キャラクターが自発的に話しかける機能。

### ⚙️ システム＆UIコントロール
- **スマートカメラ制御**: キャラクターの体型に合わせた自動カメラ調整（全身・上半身・顔のズームプリセット）。
- **高度なUIコントロールパネル**: 環境設定（時間帯・天候）、手動ポーズ調整、表情スライダー。
- **多言語対応 (i18n)**: UIと音声を独立して設定可能（日本語・英語・ベトナム語・中国語・韓国語）。
- **ユーザー認証・プロフィール**: Supabase Authによるセキュアなログイン、プロフィール管理、暗号化されたチャット履歴。

## 技術スタック (Tech Stack)
- **フロントエンド**: HTML5, CSS3, TypeScript, Vite, Three.js, `@pixiv/three-vrm`
- **バックエンド**: Node.js, Express.js
- **データベース・ストレージ**: Supabase (PostgreSQL, Auth, Storage Bucket)
- **外部API**: Google Gemini 1.5 Flash API (LLM), Fish Audio API (TTS)
- **デプロイ**: Vercel (Frontend) + Render (Backend)

## ディレクトリ構成 (Directory Structure)
- `src/` : フロントエンドのソースコード
  - `pages/discover/` : ディスカバー機能（モデル・アニメーション共有ハブ）のUIと3Dビューア制御
  - `scene/` : 環境・空・天候の3Dレンダリング設定
  - `vrm/` : メイン画面のVRMモデルロードとアニメーション制御
  - `features/chat/` : チャットUIとGemini API通信の実装
  - `core/` : Supabase認証・i18n（多言語対応）
  - `styles/` : 全CSS + キャラクター属性別のカラーテーマ定義
- `backend/` : Node.jsサーバー (APIプロキシ・Supabase DB連携・暗号化処理)
- `public/` : 静的アセット (基本VRMモデル・デフォルトFBXアニメーション・アイコン)

## セットアップと実行方法 (How to Run)

### 前提条件 (Prerequisites)
- Node.js (v18以上)
- Google Gemini API キー
- Fish Audio API キー
- Supabase プロジェクト (Database, Auth, Storage)

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
FISH_MODEL_ID_CITLALI=your_citlali_voice_id
# その他のキャラクターの音声ID...

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
npm run start
```

### 4. フロントエンド開発サーバーの起動 (別ターミナル)
```bash
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスしてください。

## アピールポイント (For Recruiters)
本プロジェクトは、単なる3Dモデルの静的表示にとどまらず、**LLMのプロンプトエンジニアリング**と**動的アニメーション制御**を高度に統合したアプリケーションです。
今回の「ディスカバー機能」の追加により、**Supabase Storageを活用した3Dアセット(VRM/FBX)のアップロード・クラウド管理機能**、および**アップロードされたアセットをブラウザ上で即座にパース・レンダリングする動的3Dビューアの実装**を実現しました。フロントエンドからバックエンド・DB設計に至るまで、一貫したフルスタック開発能力とUX（ユーザー体験）への強いこだわりを示しています。
