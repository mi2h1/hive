# 進捗・作業ログ

最終更新: 2026-02-21

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
- 速雀: 卓（テーブル）3D表現の実装
  - `TableScene.tsx` 新規作成（後でゲーム画面に流用可能）
  - テーブル面: フェルト風テクスチャ（放射グラデーション + 微細ノイズ, roughness=0.95）
  - テーブル枠: RoundedBoxGeometry で角丸 + Canvas 生成の木目テクスチャ
  - 中央に情報パネル用の黒い正方形（局数・ドラ・残牌数表示用）
  - 4家の牌配置（自家=表向き少し立て、他家=直立裏面、河=寝かせ表向き）
  - group でY回転分離し Euler 軸干渉を解消
  - 牌マテリアル調整
    - 側面: ガラス風光沢（clearcoat=0.8, ior=1.5）
    - 絵柄面: マット + bumpMap で彫り込み表現（bumpScale=-0.025）
    - 背面・側面ブラウンを `#cc9900` に変更
    - anisotropy=16 で斜め視点のテクスチャぼやけ対策
  - flattenAlpha 多重適用バグ修正（userData._flattened フラグ）
  - カメラ: `[0,6,5]` FOV=30, target=`[0,0,0.4]`
  - ライト: environmentIntensity=0.1 + ambient=0.4 + key=0.5 + fill=0.2
  - ヘッダーに X/Y/Z/FOV スライダー追加（カメラ位置リアルタイム調整用）
  - TileTestPage を卓テストに変更（`/hive/soku-jong/test`）

---

## 次のタスク

- 速雀: ゲーム画面UI（中央パネルに局数・ドラ・残牌数表示）
- 速雀: ゲームロジック結合（配牌・ツモ・打牌・和了判定・点数計算）
- 速雀: アニメーション（ツモ牌の手牌右側配置、打牌演出など）
