# LOOOOP

**プロフェッショナル向けループ動画作成ツール**

LOOOOPは、動画クリップの「正再生→逆再生」ループを直感的に組み合わせ、高度な速度制御により独創的な映像表現を可能にするElectronベースのデスクトップアプリケーションです。

## 主な機能

- 🔄 **ループ動画作成**: 正再生→逆再生のループパターンを簡単に設定
- ⚡ **リアルタイムプレビュー**: 変更が即座に反映される高速プレビュー
- 📈 **速度曲線エディタ**: ベジェ曲線による精密な速度制御
- 🎨 **直感的なUI**: プロフェッショナル向けのダークテーマインターフェース
- 💾 **プロジェクト管理**: プロジェクトファイルによる作業の保存・復元

## システム要件

### 最小要件
- **OS**: Windows 10/11, macOS 11+, Ubuntu 20.04+
- **CPU**: Intel Core i5 第8世代以降 または 同等
- **RAM**: 8GB以上
- **GPU**: DirectX 11対応
- **ストレージ**: 500MB以上の空き容量

### 推奨要件
- **CPU**: Intel Core i7 第10世代以降 または Apple M1以降
- **RAM**: 16GB以上
- **GPU**: 専用グラフィックカード（NVIDIA GTX 1060以上）
- **ストレージ**: SSD with 2GB以上の空き容量

## インストール

### 開発環境

```bash
# リポジトリをクローン
git clone https://github.com/your-org/loooop.git
cd loooop

# 依存関係をインストール
npm install

# 開発モードで実行
npm run dev
```

### 本番ビルド

```bash
# 全プラットフォーム用ビルド
npm run build

# Windows用ビルド
npm run build:win

# macOS用ビルド
npm run build:mac

# Linux用ビルド
npm run build:linux
```

## 基本的な使い方

1. **動画をインポート**  
   メディアプールの「インポート」ボタンをクリック、または動画ファイルをドラッグ&ドロップ

2. **タイムラインに配置**  
   メディアプールからタイムラインへクリップをドラッグ

3. **ループ設定**  
   インスペクターでループ回数を調整（1-99回）

4. **速度調整**  
   速度曲線エディタで制御点をドラッグして理想的な速度変化を作成

5. **プレビュー確認**  
   プレビューパネルでリアルタイムに結果を確認

6. **エクスポート**  
   メニューから「Export Video」を選択し、高品質な動画を出力

## キーボードショートカット

| ショートカット | 機能 |
|:--------------|:-----|
| `Space` | 再生/一時停止 |
| `Ctrl+N` | 新規プロジェクト |
| `Ctrl+O` | プロジェクトを開く |
| `Ctrl+S` | プロジェクトを保存 |
| `Ctrl+I` | 動画をインポート |
| `Ctrl+E` | 動画をエクスポート |
| `Delete` | 選択したクリップを削除 |

## 技術スタック

- **フレームワーク**: Electron 28.x
- **言語**: JavaScript (ES2022)
- **UI**: HTML5 + CSS3 (Grid/Flexbox)
- **ビデオ処理**: FFmpeg 6.x
- **グラフィックス**: WebGL/Canvas API
- **状態管理**: カスタム実装

## プロジェクト構造

```
LOOOOP/
├── src/
│   ├── main.js              # Electronメインプロセス
│   ├── preload.js           # プリロードスクリプト
│   ├── renderer/            # レンダラープロセス
│   │   ├── index.html       # メインUI
│   │   ├── app.js           # アプリケーションロジック
│   │   ├── styles.css       # スタイルシート
│   │   └── components/      # UIコンポーネント
│   ├── modules/             # コアモジュール
│   │   ├── videoProcessor.js # ビデオ処理エンジン
│   │   ├── projectManager.js # プロジェクト管理
│   │   └── exportEngine.js   # エクスポート処理
│   └── config/              # 設定ファイル
├── assets/                  # アセット
├── temp/                    # 一時ファイル
└── dist/                    # ビルド出力
```

## 開発

### デバッグモード

```bash
npm run dev
```

開発者ツールが自動で開き、詳細なログが出力されます。

### テスト

```bash
npm test
```

### コード品質チェック

```bash
npm run lint
```

## コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## サポート

- **Issues**: [GitHub Issues](https://github.com/your-org/loooop/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/loooop/discussions)
- **Email**: dev@loooop.app

## 更新履歴

### v1.0.0 (2025-01-20)
- 初回リリース
- 基本的なループ動画作成機能
- 速度曲線エディタ
- リアルタイムプレビュー
- プロジェクト管理機能