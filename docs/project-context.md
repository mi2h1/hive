# Project Context

オンラインボードゲームポータル「HIVE」のプロジェクト情報。

## 基本情報

| 項目 | 内容 |
|------|------|
| リポジトリ | https://github.com/mi2h1/hive |
| 公開URL | https://mi2h1.github.io/hive/ |
| デプロイ | GitHub Actions → GitHub Pages |

## 技術スタック

- React 19 + TypeScript
- Vite 7
- Tailwind CSS v4 (@tailwindcss/vite)
- Firebase Realtime Database（無料枠内で運用）
- Lucide React（アイコン）

---

## ディレクトリ構造

```
src/
├── App.tsx                    # ポータル（名前入力・ゲーム選択）
├── admin/                     # 管理画面
│   ├── AdminPage.tsx
│   └── hooks/
│       └── useAdminRooms.ts
├── games/
│   ├── aoa/                   # アトランティスの深淵
│   ├── moji-hunt/             # もじはんと
│   ├── jackal/                # ジャッカル
│   ├── polyform/              # POLYFORM
│   ├── spark/                 # SPARK
│   ├── desperado/             # デスペラード
│   └── soku-jong/             # 速雀
└── shared/
    └── hooks/
        └── usePlayer.ts       # プレイヤー名管理（共用）
```

各ゲームの標準構造:
```
games/[game-name]/
├── [GameName]Game.tsx    # メインコンポーネント
├── components/           # UI コンポーネント
├── hooks/               # カスタムフック（useRoom.ts等）
├── lib/                 # ユーティリティ・ロジック
└── types/               # 型定義
```

---

## 実装済みゲーム

| ゲーム | パス | 状態 | 仕様書 |
|--------|------|------|--------|
| アトランティスの深淵 | `/hive/aoa` | 稼働中 | `docs/aoa-spec.md` |
| もじはんと | `/hive/moji-hunt` | 稼働中 | `docs/moji-hunt-spec.md` |
| ジャッカル | `/hive/jackal` | 稼働中 | `docs/jackal-spec.md` |
| POLYFORM | `/hive/polyform` | 稼働中 | `docs/polyform-spec.md` |
| SPARK | `/hive/spark` | 稼働中 | `docs/spark-spec.md` |
| デスペラード | `/hive/desperado` | 稼働中 | `docs/desperado-spec.md` |
| 速雀 | `/hive/soku-jong` | 開発中 | `docs/soku-jong-spec.md` |

---

## URL ルーティング

| パス | 画面 |
|------|------|
| `/hive/` | ゲーム選択 |
| `/hive/aoa` | アトランティスの深淵 |
| `/hive/moji-hunt` | もじはんと |
| `/hive/jackal` | ジャッカル |
| `/hive/polyform` | POLYFORM |
| `/hive/spark` | SPARK |
| `/hive/desperado` | デスペラード |
| `/hive/soku-jong` | 速雀 |
| `/hive/admin` | 管理画面 |

GitHub Pagesでは `404.html` によるSPAリダイレクトを使用。

---

## 共通機能

### 部屋の自動削除
- Firebase `onDisconnect` を使用したプレゼンスシステム
- ホスト切断時は別プレイヤーにホスト権限を継承
- 全員切断時に部屋を自動削除
- テストプレイヤー（ID: `test-` プレフィックス）はプレゼンス対象外

### ブラウザタブタイトル
各ゲーム画面で適切なタイトルを `document.title` で設定。

---

## 管理画面 (/hive/admin)

- 全ゲームの部屋をリアルタイム監視
- 部屋の詳細情報（プレイヤー、フェーズ等）
- 古い部屋の一括削除 / 個別削除
