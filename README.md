# Game Board

オンラインで遊べるボードゲームポータルサイト。

## ゲーム一覧

### アトランティスの深淵 (Abyss of Atlantis)
宝を求めて深海へ潜るチキンレースゲーム。潜れば潜るほど宝は増えるが、酸素切れのリスクも高まる。

- **アトランティスルール**: オリジナルルール
- **インカの黄金ルール**: 別バリエーション

### もじはんと (Moji Hunt)
ひらがな当てバトルゲーム（2〜5人）。お題に沿った言葉を設定し、相手の言葉を当てながら自分の言葉を守る。

- **本番版**: `/boards/moji-hunt`
- **開発版**: `/boards/moji-hunt-dev`（デバッグ機能付き）

### ジャッカル (Jackal)
ブラフ＆心理戦カードゲーム（2〜10人）。自分のカードだけ見えない状態で、場の合計値を推理する。

- **本番版**: `/boards/jackal`
- **開発版**: `/boards/jackal-dev`（デバッグ機能付き）

### POLYFORM
パズルピースを集めて配置し、パズルカードを完成させる拡大再生産パズルゲーム（2〜4人）。

- **開発版**: `/boards/polyform-dev`（デバッグ機能付き）
- **本番版**: 未実装

### デスペラード (Desperado)
サイコロ2個を振って出目の強さを競うダイスバトルゲーム（2〜8人）。最弱の出目を出したプレイヤーがライフを失い、最後まで生き残れ！

- **本番版**: `/boards/desperado`
- **特徴**: dddice連携による3Dダイスアニメーション同期

## 管理画面

`/boards/admin` で全ゲームの部屋をリアルタイム監視できる。

- 部屋一覧（AOA / もじはんと / ジャッカル / POLYFORM / デスペラード + 各DEV版）
- プレイヤー情報、ゲームフェーズ、お題表示
- もじはんとの文字パネル状況（50音グリッド）
- 古い部屋の一括削除

## 技術スタック

- React 19 + TypeScript
- Vite 7
- Tailwind CSS v4
- Firebase Realtime Database
- Lucide React

## 開発

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build
```

## デプロイ

`main` ブランチへのプッシュで GitHub Actions が自動実行され、GitHub Pages にデプロイされる。

## ドキュメント

- `CLAUDE.md` - 開発ポリシー・プロジェクト概要
- `docs/moji-hunt-spec.md` - もじはんと仕様書
- `docs/jackal-spec.md` - ジャッカル仕様書
- `docs/polyform-spec.md` - POLYFORM仕様書
- `docs/desperado-spec.md` - デスペラード仕様書
- `src/games/aoa/README.md` - AOA詳細

## ライセンス

MIT
