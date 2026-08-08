# 3D VRM AI Assistant (3D VRM AI アシスタント)

**🌐 デモサイト (Live Demo):** [https://3-d-vrm-assistant.vercel.app/](https://3-d-vrm-assistant.vercel.app/)

## プロジェクト概要 (Project Overview)
本プロジェクトは、Three.jsとVRM技術を活用し、ブラウザ上で動作するフルスタックのインタラクティブな3D AIアシスタントアプリケーションです。Google Gemini APIと音声合成（Fish Audio API）を統合することで、ユーザーとの自然な会話・感情豊かな表情変化・会話の文脈に応じた自動アニメーション再生を実現しています。

本アプリケーションは、単なるAIチャットシステムにとどまらず、**「ディスカバー (Discover)」**と呼ばれるコミュニティ機能も備えており、ユーザー自身が3Dモデル（VRM）やアニメーション（FBX）をアップロードして管理・共有できる包括的なプラットフォームとして設計されています。

## 主な機能 (Key Features)

### 🌟 コミュニティ＆拡張機能 (Discover & Assets Management)
- **カスタムアバター＆アニメーションの共有**: ユーザー独自のVRMファイルとFBXアニメーションをクラウドにアップロードし、共有可能。
- **ブラウザ内3Dプレビューア**: アップロードされたモデルやアニメーションをダウンロードすることなく、専用の3Dビューアでブラウザ上で即座にプレビュー可能。
- **マイコレクション統合機能**: ディスカバー画面で見つけたお気に入りのキャラクターやアニメーションを保存し、メインのAIチャットシステムに直接インポートして利用可能。
- **動的なテーマシステム**: 選択したキャラクターの属性に合わせて、アプリケーション全体のカラーテーマやUIデザインがシームレスに変化します。

### 🤖 AIチャット＆インタラクション
- **インタラクティブな3Dアバター**: `@pixiv/three-vrm`とThree.jsによるブラウザベースの高品質VRMレンダリング。
- **インテリジェントAIシステム**: Gemini APIの高度なプロンプトエンジニアリングを活用し、キャラクターごとに異なる性格や知識を持たせた対話を実現。
- **音声合成 (TTS)**: Fish Audio APIを利用し、キャラクターの個性に合わせた自然な音声を生成。
- **感情・動作の自動連動**: AIのテキスト返答に含まれる感情・動作タグをリアルタイムに解析し、3Dモデルの表情変化とアニメーションを自動的にトリガー。
- **プロアクティブチャット**: ユーザーのアイドル状態（無操作時間）を検知し、キャラクター側から自発的に話しかけるスマートな機能。

### ⚙️ システム＆UIコントロール
- **スマートカメラ制御**: ユーザーの操作やキャラクターの体型に合わせ、カメラアングル（全身・上半身・顔など）をスムーズに自動調整。
- **高度なUIコントロールパネル**: 仮想空間の時間帯（昼夜）や天候の切り替え、手動ポーズ調整、表情スライダーなど豊富なカスタマイズ機能。
- **多言語対応 (i18n)**: UIテキストと音声認識・合成言語を独立して設定可能（日本語・英語・ベトナム語・中国語・韓国語に対応）。
- **ユーザー認証とセキュリティ**: Supabase Authによる安全なログインシステムと、AES-256暗号化によるチャット履歴のセキュアな保存。

## 技術スタック (Tech Stack)
- **フロントエンド**: HTML5, CSS3, TypeScript, Vite, Three.js, `@pixiv/three-vrm`
- **バックエンド**: Node.js, Express.js
- **データベース・ストレージ**: Supabase (PostgreSQL, Authentication, Storage Bucket)
- **外部API連携**: Google Gemini 1.5 Flash API (LLM), Fish Audio API (TTS)
- **ホスティング・デプロイ**: Vercel (Frontend), Render (Backend)

## ディレクトリ構成 (Directory Structure)
- `src/` : フロントエンドのソースコード
  - `pages/discover/` : ディスカバー機能（モデル・アニメーション共有ハブ）のUIおよび3Dビューア制御
  - `scene/` : 環境・空・天候の3Dレンダリング設定
  - `vrm/` : メイン画面のVRMモデルロードおよびアニメーション制御ロジック
  - `features/chat/` : チャットUIコンポーネントとGemini API通信実装
  - `core/` : Supabase認証システムおよびi18n（多言語対応）モジュール
  - `styles/` : 全CSSおよびキャラクター属性別のカラーテーマ定義
- `backend/` : Node.jsサーバー (APIプロキシ・Supabase DB連携・暗号化処理)
- `public/` : 静的アセット (基本VRMモデル・デフォルトFBXアニメーション・アイコンなど)

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

FISH_API_KEY=your_fish_api_key
FISH_MODEL_ID_1=your_voice_id_1
FISH_MODEL_ID_2=your_voice_id_2

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
本プロジェクトは、開発者のフルスタック開発能力と最新技術（AI、3Dグラフィックス）への高い関心を示す個人学習・ポートフォリオ用プロジェクトです。

単なるAPIの呼び出しや3Dモデルの静的表示にとどまらず、**LLMのプロンプトエンジニアリングと動的アニメーション制御の高度な統合**を実現しています。また、Supabaseを活用したDB設計・ファイルアップロード管理から、Viteによるフロントエンド最適化、バックエンドにおける暗号化処理に至るまで、システム全体のアーキテクチャ設計を一貫して行いました。フロントエンドのユーザー体験（UX）向上と、セキュアでスケーラブルなバックエンド構成の両立を目指して開発しています。
