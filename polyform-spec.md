# POLYFORM 仕様書

## 概要

ボードゲーム「プロジェクトL」をベースにしたWebアプリ「POLYFORM」を実装する。HIVEに新しいゲームとして追加する形で開発を行う。

### 原作ゲーム情報
- **原作ゲーム名**: プロジェクトL (Project L)
- **本プロジェクト名**: POLYFORM
- **プレイ人数**: 1〜4人
- **プレイ時間**: 約20〜30分
- **ジャンル**: パズル × 拡大再生産

### 技術スタック（既存プロジェクト準拠）
- React 19 + TypeScript
- Vite 7
- Tailwind CSS v4
- Firebase Realtime Database
- Lucide React（アイコン）
- GitHub Pages（ホスティング）

---

## ゲームルール詳細

### ゲームの目的
パズルカードにポリオミノピースを配置して完成させ、得点を獲得する。最も高い得点を獲得したプレイヤーが勝利。

### ゲーム準備

#### 各プレイヤーの初期状態
- レベル1ピース（1マス）× 1個
- レベル2ピース（2マス・I字型）× 1個
- 手元のパズルカード: 0枚

#### 場の初期状態
- 白パズル山札からオープン: 4枚
- 黒パズル山札からオープン: 4枚
- 各ピースのストック（共有）

### ピースの種類

| レベル | 形状 | マス数 | 色 |
|--------|------|--------|-----|
| 1 | ■ | 1 | 黄色 |
| 2 | ■■（I字） | 2 | 橙色 |
| 3 | 4種類（I字3マス、L字、V字、T字の一部） | 3 | 赤色 |
| 4 | 5種類（I字4マス、L字、T字、S字、Z字、正方形） | 4 | 紫色 |

#### ピースの詳細定義（相対座標）

```typescript
// レベル1（1種類）
const LEVEL1_PIECES = {
  dot: [[0, 0]]  // ■
};

// レベル2（1種類）
const LEVEL2_PIECES = {
  i2: [[0, 0], [1, 0]]  // ■■
};

// レベル3（4種類）
const LEVEL3_PIECES = {
  i3: [[0, 0], [1, 0], [2, 0]],      // ■■■
  l3: [[0, 0], [1, 0], [1, 1]],      // ■■
                                      //  ■
  v3: [[0, 0], [0, 1], [1, 1]],      // ■
                                      // ■■
  t3_half: [[0, 0], [1, 0], [0, 1]]  // ■■
                                      // ■
};

// レベル4（5種類）
const LEVEL4_PIECES = {
  i4: [[0, 0], [1, 0], [2, 0], [3, 0]],  // ■■■■
  l4: [[0, 0], [1, 0], [2, 0], [2, 1]],  // ■■■
                                          //   ■
  t4: [[0, 0], [1, 0], [2, 0], [1, 1]],  // ■■■
                                          //  ■
  s4: [[0, 0], [1, 0], [1, 1], [2, 1]],  // ■■
                                          //  ■■
  o4: [[0, 0], [1, 0], [0, 1], [1, 1]]   // ■■
                                          // ■■
};
```

### ピースの初期ストック数（4人プレイ時）

| ピース種類 | 個数 |
|------------|------|
| レベル1 (dot) | 15個 |
| レベル2 (i2) | 12個 |
| レベル3 各種 | 各6個（計24個） |
| レベル4 各種 | 各6個（計30個） |
| **合計** | **90個** |

※2〜3人プレイ時も同数使用

### パズルカード

#### 白パズル（32枚）
- 簡単な形状（3〜6マス程度）
- 得点: 1〜4点
- 報酬ピース: なし〜レベル2

#### 黒パズル（20枚）
- 複雑な形状（5〜9マス程度）
- 得点: 3〜8点
- 報酬ピース: レベル2〜レベル4

#### パズルカードのデータ構造

```typescript
interface PuzzleCard {
  id: string;
  type: 'white' | 'black';
  points: number;                    // 得点（左上に表示）
  rewardPieceLevel: number | null;   // 報酬ピースのレベル（右上に表示、nullは報酬なし）
  shape: boolean[][];                // パズルの形状（trueが埋めるマス）
}

// 例: 白パズル（L字型、2点、レベル2ピース報酬）
const exampleWhitePuzzle: PuzzleCard = {
  id: 'white_001',
  type: 'white',
  points: 2,
  rewardPieceLevel: 2,
  shape: [
    [true, false],
    [true, false],
    [true, true]
  ]
};
```

### 手番の流れ

各プレイヤーは手番で **3アクション** を実行する。同じアクションを複数回実行可能。

#### アクション一覧

| アクション | 説明 | 制限 |
|------------|------|------|
| パズル獲得 | 場の8枚から1枚を自分の前に置く | 手元上限4枚 |
| レベル1ピース獲得 | ストックからレベル1ピースを1個獲得 | ストック枯渇時不可 |
| アップグレード | 手持ちピース1個を1レベル上に交換 | レベル4は不可 |
| マスターアクション | 手元の全パズルにピースを1個ずつ配置 | **1手番1回のみ** |
| ピース配置 | 1つのパズルにピースを1個配置 | - |

#### アクションの詳細

**1. パズル獲得**
- 場にオープンされている白パズル4枚、黒パズル4枚の計8枚から1枚選択
- 選んだパズルを自分の作業エリアに置く
- 場のパズルは対応する山札から補充（山札が空なら補充なし）
- **制約**: 手元に置けるパズルは最大4枚

**2. レベル1ピース獲得**
- 共有ストックからレベル1ピース（黄色の1マス）を1個獲得
- 自分の手持ちピースに追加

**3. アップグレード**
- 手持ちのピース1個を場のストックに戻す
- 1レベル上のピースをストックから獲得
- 例: レベル2 → レベル3（任意の形状を選択可）
- **同レベル・下レベルへの交換も可能**（形状変更目的）

**4. マスターアクション（重要）**
- 自分の手元にある **全てのパズル** に対して、ピースを **1個ずつ** 配置できる
- 例: 手元に3枚のパズルがある場合、最大3個のピースを配置可能
- **1手番に1回のみ実行可能**
- 配置しないパズルがあってもOK

**5. ピース配置**
- 1つのパズルに1個のピースを配置
- マスターアクション以外でピースを置きたい場合に使用

### パズル完成時の処理

パズルの全マスがピースで埋まったら完成。

1. **得点獲得**: パズルカードの得点（左上の数字）を獲得
2. **報酬ピース獲得**: パズルカードに報酬が記載されていれば、該当レベルのピースを1個獲得
3. **使用ピース回収**: パズルに配置していた全ピースを手持ちに戻す
4. **カード処理**: 完成したパズルカードは自分の得点用に伏せて置く

### ゲーム終了条件

**黒パズルの山札が尽きたターンの次のターン終了時にゲーム終了**

1. 黒パズル山札が0枚になる
2. そのターンを最後まで行う
3. 次のターン（全員1手番ずつ）を行う
4. ゲーム終了

### 最後の仕上げ

ゲーム終了後、手元に未完成のパズルが残っている場合：

1. 手持ちピースを好きなだけ配置してパズルを完成させてよい
2. **ペナルティ**: 配置したピース1個につき **−1点**
3. 最後の仕上げ後も未完成のパズルは **0点**（ペナルティなし）

### 得点計算

```
最終得点 = Σ(完成パズルの得点) − (最後の仕上げで使用したピース数)
```

最も得点が高いプレイヤーの勝利。同点の場合は手持ちピースの総レベル数が多い方が勝利。

---

## 実装仕様

### ディレクトリ構成

```
src/
├── games/
│   └── polyform/
│       ├── index.tsx              # ゲームのエントリーポイント
│       ├── components/
│       │   ├── GameBoard.tsx      # メインゲームボード
│       │   ├── PuzzleCard.tsx     # パズルカードコンポーネント
│       │   ├── Piece.tsx          # ピースコンポーネント
│       │   ├── PieceInventory.tsx # 手持ちピース一覧
│       │   ├── ActionPanel.tsx    # アクション選択パネル
│       │   ├── PlayerArea.tsx     # プレイヤーエリア（パズル4枚）
│       │   ├── MarketArea.tsx     # 場のパズル表示エリア
│       │   ├── Lobby.tsx          # ロビー画面
│       │   └── GameResult.tsx     # 結果画面
│       ├── hooks/
│       │   ├── useGameState.ts    # ゲーム状態管理
│       │   ├── useDragDrop.ts     # ドラッグ&ドロップ
│       │   └── useFirebase.ts     # Firebase連携
│       ├── utils/
│       │   ├── pieceUtils.ts      # ピース操作ユーティリティ
│       │   ├── puzzleUtils.ts     # パズル判定ユーティリティ
│       │   └── gameLogic.ts       # ゲームロジック
│       ├── data/
│       │   ├── pieces.ts          # ピース定義データ
│       │   └── puzzles.ts         # パズルカード定義データ
│       ├── types/
│       │   └── index.ts           # 型定義
│       └── README.md              # ゲーム固有のドキュメント
```

### 型定義

```typescript
// types/index.ts

// ピースの形状タイプ
type PieceType = 
  // Level 1
  | 'dot'
  // Level 2
  | 'i2'
  // Level 3
  | 'i3' | 'l3' | 'v3' | 't3_half'
  // Level 4
  | 'i4' | 'l4' | 't4' | 's4' | 'o4';

// ピースの定義
interface PieceDefinition {
  type: PieceType;
  level: number;
  shape: [number, number][];  // 相対座標の配列
  color: string;              // Tailwind色クラス
}

// プレイヤーが持つピースのインスタンス
interface PieceInstance {
  id: string;           // 一意のID
  type: PieceType;
  rotation: 0 | 90 | 180 | 270;  // 回転角度
}

// パズルカードの定義
interface PuzzleCard {
  id: string;
  type: 'white' | 'black';
  points: number;
  rewardPieceLevel: number | null;
  shape: boolean[][];   // 2次元配列でマス目を表現
  width: number;        // 横幅（計算用）
  height: number;       // 高さ（計算用）
}

// プレイヤーの作業中パズル
interface WorkingPuzzle {
  cardId: string;
  placedPieces: PlacedPiece[];  // 配置済みピース
}

// 配置済みピース
interface PlacedPiece {
  pieceId: string;
  type: PieceType;
  rotation: 0 | 90 | 180 | 270;
  position: { x: number; y: number };  // パズル内の配置位置（左上基準）
}

// プレイヤー状態
interface PlayerState {
  id: string;
  name: string;
  pieces: PieceInstance[];       // 手持ちピース
  workingPuzzles: WorkingPuzzle[];  // 作業中パズル（最大4枚）
  completedPuzzles: string[];    // 完成パズルのID一覧
  score: number;
  isCurrentTurn: boolean;
  remainingActions: number;      // 残りアクション数（通常3）
  usedMasterAction: boolean;     // マスターアクション使用済みフラグ
}

// ゲーム状態
interface GameState {
  roomId: string;
  phase: GamePhase;
  players: Record<string, PlayerState>;
  playerOrder: string[];         // プレイヤーの順番
  currentPlayerIndex: number;
  
  // 場の状態
  whitePuzzleDeck: string[];     // 白パズル山札（IDの配列）
  blackPuzzleDeck: string[];     // 黒パズル山札
  whitePuzzleMarket: string[];   // 場の白パズル（4枚）
  blackPuzzleMarket: string[];   // 場の黒パズル（4枚）
  
  // ピースストック
  pieceStock: Record<PieceType, number>;
  
  // ゲーム終了関連
  finalRound: boolean;           // 最終ラウンドフラグ
  finalRoundStartPlayer: string | null;  // 最終ラウンド開始時のプレイヤー
  
  // タイムスタンプ
  createdAt: number;
  updatedAt: number;
}

type GamePhase = 
  | 'waiting'      // ロビーで待機中
  | 'playing'      // ゲーム中
  | 'finalRound'   // 最終ラウンド
  | 'finishing'    // 最後の仕上げ
  | 'ended';       // ゲーム終了

// アクション種別
type ActionType = 
  | 'takePuzzle'       // パズル獲得
  | 'takeLevel1Piece'  // レベル1ピース獲得
  | 'upgradePiece'     // アップグレード
  | 'masterAction'     // マスターアクション
  | 'placePiece';      // ピース配置

// アクションペイロード
interface GameAction {
  type: ActionType;
  playerId: string;
  payload: ActionPayload;
}

type ActionPayload = 
  | { puzzleId: string }                                    // takePuzzle
  | {}                                                       // takeLevel1Piece
  | { fromPieceId: string; toPieceType: PieceType }        // upgradePiece
  | { placements: Array<{ puzzleIndex: number; pieceId: string; position: { x: number; y: number }; rotation: number }> }  // masterAction
  | { puzzleIndex: number; pieceId: string; position: { x: number; y: number }; rotation: number };  // placePiece
```

### Firebase データ構造

```
/rooms/{roomId}/
├── meta/
│   ├── createdAt: number
│   ├── hostId: string
│   ├── phase: GamePhase
│   └── playerCount: number
├── players/
│   └── {playerId}/
│       ├── name: string
│       ├── pieces: PieceInstance[]
│       ├── workingPuzzles: WorkingPuzzle[]
│       ├── completedPuzzles: string[]
│       ├── score: number
│       ├── remainingActions: number
│       └── usedMasterAction: boolean
├── game/
│   ├── playerOrder: string[]
│   ├── currentPlayerIndex: number
│   ├── whitePuzzleDeck: string[]
│   ├── blackPuzzleDeck: string[]
│   ├── whitePuzzleMarket: string[]
│   ├── blackPuzzleMarket: string[]
│   ├── pieceStock: Record<PieceType, number>
│   ├── finalRound: boolean
│   └── finalRoundStartPlayer: string | null
└── actions/
    └── {actionId}/
        ├── type: ActionType
        ├── playerId: string
        ├── payload: ActionPayload
        └── timestamp: number
```

### 画面構成

#### 1. ロビー画面 (`/boards/project-l`)

```
┌─────────────────────────────────────────┐
│         プロジェクトL                    │
│                                         │
│  ルームID: XXXX-XXXX                    │
│                                         │
│  参加者:                                │
│  • プレイヤー1 (ホスト) ✓               │
│  • プレイヤー2 ✓                        │
│  • (空き)                               │
│  • (空き)                               │
│                                         │
│  [ゲーム開始]  ← ホストのみ表示          │
│                                         │
│  ─────────────────────                  │
│  または既存ルームに参加:                 │
│  [ルームID入力] [参加]                   │
└─────────────────────────────────────────┘
```

#### 2. ゲーム画面（メイン）

```
┌─────────────────────────────────────────────────────────────┐
│  残りアクション: ●●● (3/3)    現在: プレイヤー1の手番      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ 場のパズル ─────────────────────────────────────────┐  │
│  │  白パズル                    黒パズル                │  │
│  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐   ┌───┐ ┌───┐ ┌───┐ ┌───┐│  │
│  │  │2pt│ │1pt│ │3pt│ │2pt│   │5pt│ │6pt│ │4pt│ │7pt││  │
│  │  └───┘ └───┘ └───┘ └───┘   └───┘ └───┘ └───┘ └───┘│  │
│  │  山札: 28枚                  山札: 16枚              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ 自分の作業エリア（最大4枚）────────────────────────┐  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────┐ │  │
│  │  │ ■ □ □   │  │ □ □ □   │  │ (空き)   │  │空き │ │  │
│  │  │ ■ □     │  │ ■ ■ □   │  │          │  │     │ │  │
│  │  │ ■ ■     │  │ □ □ □   │  │          │  │     │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ 手持ちピース ───────────────────────────────────────┐  │
│  │  [■] [■■] [■■■] [L字] [T字] ...    [回転] [キャンセル]│  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ アクション ─────────────────────────────────────────┐  │
│  │ [パズル獲得] [Lv1獲得] [アップグレード]               │  │
│  │ [マスター] [ピース配置] [ターン終了]                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ 他プレイヤー情報 ───────────────────────────────────┐  │
│  │ P2: 得点12 | ピース5個 | パズル2枚                   │  │
│  │ P3: 得点8  | ピース7個 | パズル3枚                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### 3. 結果画面

```
┌─────────────────────────────────────────┐
│            ゲーム終了！                  │
│                                         │
│  🏆 1位: プレイヤー2  32点              │
│     2位: プレイヤー1  28点              │
│     3位: プレイヤー3  25点              │
│                                         │
│  ────────────────────                   │
│  詳細:                                  │
│  プレイヤー2                            │
│   完成パズル: 35点                      │
│   最後の仕上げ: -3点                    │
│                                         │
│  [もう一度遊ぶ] [ロビーに戻る]          │
└─────────────────────────────────────────┘
```

### コアロジック実装

#### ピースの回転処理

```typescript
// utils/pieceUtils.ts

/**
 * ピースを90度回転させる
 */
function rotatePiece(
  shape: [number, number][], 
  rotation: 0 | 90 | 180 | 270
): [number, number][] {
  return shape.map(([x, y]) => {
    switch (rotation) {
      case 0:   return [x, y];
      case 90:  return [-y, x];
      case 180: return [-x, -y];
      case 270: return [y, -x];
    }
  });
}

/**
 * 回転後の座標を正規化（左上を原点に）
 */
function normalizeShape(shape: [number, number][]): [number, number][] {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => [x - minX, y - minY]);
}
```

#### パズル完成判定

```typescript
// utils/puzzleUtils.ts

/**
 * パズルが完成しているか判定
 */
function isPuzzleComplete(
  puzzleShape: boolean[][],
  placedPieces: PlacedPiece[],
  pieceDefinitions: Record<PieceType, PieceDefinition>
): boolean {
  // パズルの必要マスを取得
  const requiredCells = new Set<string>();
  for (let y = 0; y < puzzleShape.length; y++) {
    for (let x = 0; x < puzzleShape[y].length; x++) {
      if (puzzleShape[y][x]) {
        requiredCells.add(`${x},${y}`);
      }
    }
  }
  
  // 配置済みピースがカバーするマスを取得
  const coveredCells = new Set<string>();
  for (const placed of placedPieces) {
    const def = pieceDefinitions[placed.type];
    const rotatedShape = normalizeShape(rotatePiece(def.shape, placed.rotation));
    for (const [dx, dy] of rotatedShape) {
      const cellKey = `${placed.position.x + dx},${placed.position.y + dy}`;
      coveredCells.add(cellKey);
    }
  }
  
  // 必要マスが全てカバーされているか確認
  for (const cell of requiredCells) {
    if (!coveredCells.has(cell)) return false;
  }
  
  return true;
}

/**
 * ピースを配置できるか判定
 */
function canPlacePiece(
  puzzleShape: boolean[][],
  placedPieces: PlacedPiece[],
  newPiece: { type: PieceType; position: { x: number; y: number }; rotation: number },
  pieceDefinitions: Record<PieceType, PieceDefinition>
): boolean {
  const def = pieceDefinitions[newPiece.type];
  const rotatedShape = normalizeShape(
    rotatePiece(def.shape, newPiece.rotation as 0 | 90 | 180 | 270)
  );
  
  // 既存の配置済みマスを取得
  const occupiedCells = new Set<string>();
  for (const placed of placedPieces) {
    const placedDef = pieceDefinitions[placed.type];
    const placedRotated = normalizeShape(rotatePiece(placedDef.shape, placed.rotation));
    for (const [dx, dy] of placedRotated) {
      occupiedCells.add(`${placed.position.x + dx},${placed.position.y + dy}`);
    }
  }
  
  // 新しいピースの各マスをチェック
  for (const [dx, dy] of rotatedShape) {
    const x = newPiece.position.x + dx;
    const y = newPiece.position.y + dy;
    
    // パズルの範囲外
    if (y < 0 || y >= puzzleShape.length || x < 0 || x >= puzzleShape[0].length) {
      return false;
    }
    
    // パズルの穴でない場所
    if (!puzzleShape[y][x]) {
      return false;
    }
    
    // 既に別のピースがある
    if (occupiedCells.has(`${x},${y}`)) {
      return false;
    }
  }
  
  return true;
}
```

#### ゲーム終了判定

```typescript
// utils/gameLogic.ts

/**
 * ゲーム終了条件のチェック
 */
function checkGameEnd(state: GameState): {
  shouldStartFinalRound: boolean;
  shouldEndGame: boolean;
} {
  // 黒パズル山札が空になった
  if (state.blackPuzzleDeck.length === 0 && !state.finalRound) {
    return { shouldStartFinalRound: true, shouldEndGame: false };
  }
  
  // 最終ラウンド中で、開始プレイヤーの直前まで回った
  if (state.finalRound) {
    const currentPlayerId = state.playerOrder[state.currentPlayerIndex];
    if (currentPlayerId === state.finalRoundStartPlayer) {
      return { shouldStartFinalRound: false, shouldEndGame: true };
    }
  }
  
  return { shouldStartFinalRound: false, shouldEndGame: false };
}
```

### ドラッグ&ドロップ実装

```typescript
// hooks/useDragDrop.ts
// @dnd-kit/core を使用（モバイル対応が良い）

import { 
  DndContext, 
  DragEndEvent, 
  useDraggable, 
  useDroppable,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';

// ピースのドラッグ
function DraggablePiece({ piece }: { piece: PieceInstance }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: piece.id,
    data: { piece }
  });
  
  // ...レンダリング
}

// パズルカードのドロップエリア
function DroppablePuzzle({ puzzle, onDrop }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `puzzle-${puzzle.cardId}`,
    data: { puzzle }
  });
  
  // ...レンダリング
}

// ドロップ時の処理
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  
  if (!over) return;
  
  const piece = active.data.current?.piece as PieceInstance;
  const puzzle = over.data.current?.puzzle as WorkingPuzzle;
  
  // マウス位置からグリッド座標を計算
  const gridPosition = calculateGridPosition(event);
  
  // 配置可能かチェック
  if (canPlacePiece(puzzle, piece, gridPosition)) {
    // アクション実行
    executeAction({
      type: 'placePiece',
      payload: { 
        puzzleIndex: puzzle.index,
        pieceId: piece.id,
        position: gridPosition,
        rotation: piece.rotation
      }
    });
  }
}
```

### セキュリティ考慮事項

#### クライアント側で隠す必要のある情報

このゲームでは **公開情報が多い** ため、セキュリティリスクは比較的低い。

| 情報 | 公開/非公開 | 備考 |
|------|-------------|------|
| 各プレイヤーの手持ちピース | 公開 | 見せても問題なし |
| 作業中のパズル | 公開 | どのピースを置いたか見える |
| 山札の残り枚数 | 公開 | 枚数のみ表示 |
| **山札の順番** | **非公開** | シャッフル後の順番は隠す |
| 得点 | 公開 | リアルタイム表示OK |

#### 実装上の注意点

1. **山札のシャッフル**: サーバー側（Firebase Cloud Functionsまたは最初のプレイヤー）でシャッフルし、クライアントには見せない
2. **アクション検証**: クライアントからのアクションは必ず検証（手持ちにないピースの配置など防止）

### 追加実装（任意）

#### ソロモード
- CPU対戦なし、スコアアタック形式
- 決められたパズル枚数で最高得点を目指す

#### 改訂版ルール対応
原作には改訂版ルールが存在する。実装オプションとして検討：

1. **リサイクルアクション**: 場のパズル1枚を山札の一番下に戻し、新しいカードを補充
2. **パズル上限超過ペナルティ**: 手元4枚超えたら即座に1枚捨てる
3. **未完成パズルペナルティ**: 最後の仕上げ後も未完成なら−2点

---

## 開発タスク

### フェーズ1: 基盤構築
- [ ] ディレクトリ構成作成
- [ ] 型定義ファイル作成
- [ ] ピース・パズルのデータ定義
- [ ] Firebase設定（既存プロジェクトに追加）

### フェーズ2: UI実装
- [ ] ピースコンポーネント（SVG描画）
- [ ] パズルカードコンポーネント
- [ ] ドラッグ&ドロップ実装
- [ ] ピース回転UI

### フェーズ3: ゲームロジック
- [ ] アクション処理実装
- [ ] パズル完成判定
- [ ] ゲーム終了判定
- [ ] 得点計算

### フェーズ4: マルチプレイ
- [ ] ロビー画面
- [ ] Firebase同期
- [ ] ターン管理
- [ ] 再接続処理

### フェーズ5: 仕上げ
- [ ] 結果画面
- [ ] アニメーション追加
- [ ] モバイル対応確認
- [ ] バグ修正・最適化

---

## 参考リンク

- 原作ルール解説: https://boku-boardgame.net/project-l
- 既存リポジトリ: https://github.com/mi2h1/boards
- @dnd-kit ドキュメント: https://docs.dndkit.com/
- Firebase Realtime Database: https://firebase.google.com/docs/database

---

## 注意事項

- このゲームは身内利用を目的としており、著作権対応は行わない
- ゲーム内では「POLYFORM」の名称を使用する
- 既存の `boards` リポジトリのコード規約・スタイルに従うこと
- モバイル対応を考慮した実装を心がける
