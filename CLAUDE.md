# Game Board

オンラインボードゲームポータル。複数のゲームを一つのサイトで提供する。

## プロジェクト概要

- **リポジトリ**: https://github.com/mi2h1/boards
- **公開URL**: https://mi2h1.github.io/boards/
- **デプロイ**: GitHub Actions → GitHub Pages

## 技術スタック

- React 19 + TypeScript
- Vite 7
- Tailwind CSS v4 (@tailwindcss/vite)
- Firebase Realtime Database（無料枠内で運用）
- Lucide React（アイコン）

## ディレクトリ構造

```
src/
├── App.tsx                    # ポータル（名前入力・ゲーム選択）
├── admin/                     # 管理画面
│   ├── AdminPage.tsx          # 管理ダッシュボード
│   └── hooks/
│       └── useAdminRooms.ts   # 部屋監視フック
├── games/
│   ├── aoa/                   # アトランティスの深淵
│   │   ├── AoaGame.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   ├── moji-hunt/             # もじはんと（本番）
│   │   ├── MojiHuntGame.tsx
│   │   ├── components/
│   │   │   ├── Lobby.tsx
│   │   │   ├── WordInputPhase.tsx
│   │   │   ├── GamePlayPhase.tsx
│   │   │   ├── ResultScreen.tsx
│   │   │   ├── HiraganaBoard.tsx
│   │   │   ├── PlayerWordDisplay.tsx
│   │   │   ├── RulesModal.tsx
│   │   │   └── GameStartTransition.tsx
│   │   ├── hooks/
│   │   │   └── useRoom.ts
│   │   ├── lib/
│   │   │   └── hiragana.ts
│   │   └── types/
│   │       └── game.ts
│   ├── moji-hunt-dev/         # もじはんと（開発版）
│   │   └── ...                # 本番と同構造 + デバッグ機能
│   ├── jackal/                # ジャッカル（本番）
│   │   ├── JackalGame.tsx
│   │   ├── components/
│   │   │   ├── Lobby.tsx
│   │   │   ├── GamePlayPhase.tsx
│   │   │   ├── JudgmentPhase.tsx
│   │   │   ├── GameEndPhase.tsx
│   │   │   └── Card.tsx
│   │   ├── hooks/
│   │   │   └── useRoom.ts
│   │   ├── lib/
│   │   │   └── cards.ts
│   │   └── types/
│   │       └── game.ts
│   ├── jackal-dev/            # ジャッカル（開発版）
│   │   └── ...                # 本番と同構造 + デバッグ機能
│   └── polyform-dev/          # POLYFORM（開発版）
│       ├── PolyformDevGame.tsx
│       ├── components/
│       ├── hooks/
│       ├── data/
│       └── types/
└── shared/
    └── hooks/
        └── usePlayer.ts       # プレイヤー名管理（共用）
```

## 実装済みゲーム

### アトランティスの深淵 (aoa)
- パス: `/boards/aoa`
- 状態: 完成・稼働中
- 概要: 宝を求めて潜水するチキンレースゲーム
- ルールセット: アトランティス / インカの黄金（選択可）

### もじはんと (moji-hunt)
- パス: `/boards/moji-hunt`（本番）、`/boards/moji-hunt-dev`（開発版）
- 状態: 完成・稼働中
- 概要: ひらがな当てバトルゲーム（2〜5人）
- 仕様: `docs/moji-hunt-spec.md` 参照

### ジャッカル (jackal)
- パス: `/boards/jackal`（本番）、`/boards/jackal-dev`（開発版）
- 状態: 完成・稼働中
- 概要: ブラフ＆心理戦カードゲーム（2〜10人）
- 仕様: `docs/jackal-spec.md` 参照
- 特徴: 自分のカードだけ見えない状態で場の合計値を推理

### POLYFORM (polyform)
- パス: `/boards/polyform-dev`（開発版）
- 状態: 開発中
- 概要: パズル × 拡大再生産ゲーム（2〜4人）
- 仕様: `docs/polyform-spec.md` 参照
- 特徴: ピースを集めてパズルカードを完成させる

### 管理画面 (admin)
- パス: `/boards/admin`
- 概要: 全ゲームの部屋をリアルタイム監視
- 機能:
  - 部屋一覧表示（AOA / もじはんと / ジャッカル / POLYFORM + 各DEV版）
  - 部屋の詳細情報（プレイヤー、フェーズ、お題等）
  - もじはんとの文字パネル状況表示（50音グリッド）
  - 古い部屋の一括削除
  - 個別部屋の削除

## URL ルーティング

- `/boards/` → ゲーム選択画面
- `/boards/aoa` → アトランティスの深淵
- `/boards/moji-hunt` → もじはんと（本番）
- `/boards/moji-hunt-dev` → もじはんと（開発版・デバッグ機能付き）
- `/boards/jackal` → ジャッカル（本番）
- `/boards/jackal-dev` → ジャッカル（開発版・デバッグ機能付き）
- `/boards/polyform-dev` → POLYFORM（開発版・デバッグ機能付き）
- `/boards/admin` → 管理画面

GitHub Pagesでは404.htmlによるSPAリダイレクトを使用。

## ブラウザタブタイトル

各画面で適切なタイトルを表示：

| 画面 | タイトル |
|------|----------|
| ゲーム一覧 | Game Board |
| AOA（アトランティスルール） | アトランティスの深淵 |
| AOA（インカルール） | インカの黄金 |
| もじはんと | もじはんと |
| もじはんとDEV | もじはんとDEV |
| ジャッカル | ジャッカル |
| ジャッカルDEV | ジャッカルDEV |
| PolyformDEV | PolyformDEV |
| 管理画面 | Game Board - Admin Dashboard |

## 部屋の自動削除

- Firebase `onDisconnect` を使用したプレゼンスシステム
- ホストが切断すると別のプレイヤーにホスト権限を継承
- 全プレイヤーが切断すると部屋を自動削除
- テストプレイヤー（ID: `test-`プレフィックス）はプレゼンス対象外

---

# 開発ポリシー

## セッション開始時の自動確認

**重要**: 新しいセッション（会話）が開始されたら、ユーザーからの指示を待たずに、まずこのCLAUDE.mdを読み込んで内容を把握すること。これにより作業方針の一貫性を保つ。

## コミュニケーション原則

### 言語設定
- **基本会話は日本語で行う**
- **カジュアルだけど敬語で会話する**（堅すぎず、フレンドリーに）
- コード内の変数名・関数名は英語、コメントは日本語とする

## コミットメッセージ原則

### 基本方針
- **日本語でコミットメッセージを記録する**
- 変更内容を詳細に説明し、将来のメンテナンス性を向上させる

### コミットメッセージ構造
```
type: 簡潔な変更概要

## 変更内容
- 具体的な変更点1
- 具体的な変更点2

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### コミットタイプ
- `feat`: 新機能追加
- `fix`: バグ修正
- `refactor`: リファクタリング
- `docs`: ドキュメント更新
- `style`: コードスタイル修正
- `chore`: その他の作業

## 命名規則

### フロントエンド（TypeScript/React）

| 対象 | 規則 | 例 |
|------|------|-----|
| ページファイル | PascalCase + `Page`接尾辞 | `GamePage.tsx`, `LobbyPage.tsx` |
| コンポーネントファイル | PascalCase | `HiraganaBoard.tsx`, `PlayerList.tsx` |
| コンポーネント名 | PascalCase（ファイル名と同じ） | `HiraganaBoard`, `PlayerList` |

### 共通ルール
- **英語を使用**: 変数名・関数名・クラス名はすべて英語
- **略語は避ける**: `calc` → `calculation`, `btn` → `button`（ただし一般的な略語 `id`, `url` は可）
- **一貫性を優先**: 既存コードのパターンに従う

## 開発プラクティス

### ファイル編集
- 既存ファイルの編集を優先する
- 新規ファイル作成は必要最小限に留める
- コードスタイルは既存プロジェクトに合わせる

### エラーハンドリング
- 部分的な障害が全体に影響しないよう配慮
- 適切なログ出力とユーザーフィードバック

### UI/UX設計
- 論理的な機能グループ化
- 無意味な指標や冗長な表示の排除
- モバイルフレンドリーな設計

### 絵文字・アイコンの使用方針
- **UIラベルやボタンでは絵文字を使用しない**
- アイコンが必要な場合は **Lucide React** を使用する
  - インポート例: `import { Play } from 'lucide-react';`
  - 使用例: `<Play className="w-4 h-4" />`
- **例外**: 結果画面の勝者表示など、演出目的では絵文字を使用可

## 注意事項
- セキュリティベストプラクティスの遵守
- 既存機能への影響を最小限に抑制
- 段階的に動くものを作りながら進める（バイブコーディング）
