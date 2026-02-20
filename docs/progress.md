# 進捗・作業ログ

最終更新: 2026-02-19

## リポジトリ情報

| 項目 | 内容 |
|------|------|
| リポジトリ | https://github.com/mi2h1/hive |
| 公開URL | https://mi2h1.github.io/hive/ |
| ブランチ運用 | main のみ（直接プッシュ） |
| デプロイ | GitHub Actions → GitHub Pages |

## ディレクトリ構成

→ `docs/project-context.md` を参照

---

## 完了したタスク

### Phase 1: 基盤構築・ゲーム実装
- ポータル画面（名前入力・ゲーム選択）
- 6種のゲーム実装（AoA, もじはんと, ジャッカル, POLYFORM, SPARK, デスペラード）
- Firebase Realtime Database による部屋管理
- GitHub Pages デプロイパイプライン

### 直近の作業
- ジャッカルにハテナカードのフリップ演出を追加
- ジャッカルのプレイヤーカードを多角形配置に変更
- 全員切断時に部屋が残り続ける問題を修正
- DEV版ゲーム3種を削除し、SPARK部屋監視を追加
- 未使用の型定義を削除
- CLAUDE.md をリモートから削除し、gitignore に追加
- ドキュメント構成を整理

### 2026-02-19
- もじはんとに「お題選択式」モードを追加
  - ロビーでホストが「お題ランダム」「お題選択式」を切替可能
  - 選択式: 担当プレイヤーが6候補から選択 or 自由記述でお題を決定
  - 担当はラウンドごとにローテーション（参加順）
  - お題チェンジ投票は選択式モード時に topic_selection フェーズへ戻す
- ロビーUIの改善（参加者+お題モードの2カラム配置）
- 開発規約・進捗ログドキュメントの新規作成

### 2026-02-21
- 速雀（SOKU-JONG）の初期構築
  - 仕様書を `docs/soku-jong-spec.md` に配置
  - `src/games/soku-jong/` ディレクトリ作成（types, hooks, components, lib）
  - 型定義（Tile, Player, GameState, RoomData等）
  - Firebase連携フック（useRoom）
  - ロビー画面（Lobby）
  - メインコンポーネント（SokuJongGame）
  - App.tsx にゲーム登録（ルーティング・選択画面）
  - ゲームロジックは未実装（骨組みのみ）

---

## 次のタスク

- 速雀: ゲームロジック実装（配牌・ツモ・打牌・和了判定・点数計算）
