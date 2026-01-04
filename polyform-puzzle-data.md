# POLYFORM パズルカード定義データ

このファイルは実装時に `src/games/polyform/data/puzzles.ts` として使用する。

## 注意事項

原作のパズルカードを参考に定義しているが、正確な枚数・形状は原作ルールブックを確認すること。
以下は実装の参考用サンプルデータ。

---

## パズルカードの形状表現

```typescript
// true = 埋める必要があるマス
// false = 穴がない部分

// 例: L字型パズル
const lShape = [
  [true, false],
  [true, false],
  [true, true]
];
```

---

## 白パズル（32枚）サンプル

```typescript
// data/puzzles.ts

export const WHITE_PUZZLES: PuzzleCard[] = [
  // === 3マスパズル（簡単）===
  {
    id: 'w001',
    type: 'white',
    points: 1,
    rewardPieceLevel: null,
    shape: [[true, true, true]],  // 横一列
    width: 3,
    height: 1
  },
  {
    id: 'w002',
    type: 'white',
    points: 1,
    rewardPieceLevel: null,
    shape: [
      [true],
      [true],
      [true]
    ],  // 縦一列
    width: 1,
    height: 3
  },
  {
    id: 'w003',
    type: 'white',
    points: 1,
    rewardPieceLevel: 1,
    shape: [
      [true, true],
      [true, false]
    ],  // L字小
    width: 2,
    height: 2
  },
  {
    id: 'w004',
    type: 'white',
    points: 1,
    rewardPieceLevel: 1,
    shape: [
      [true, true],
      [false, true]
    ],  // 逆L字小
    width: 2,
    height: 2
  },

  // === 4マスパズル ===
  {
    id: 'w005',
    type: 'white',
    points: 2,
    rewardPieceLevel: 1,
    shape: [[true, true, true, true]],  // 横一列4マス
    width: 4,
    height: 1
  },
  {
    id: 'w006',
    type: 'white',
    points: 2,
    rewardPieceLevel: 1,
    shape: [
      [true],
      [true],
      [true],
      [true]
    ],  // 縦一列4マス
    width: 1,
    height: 4
  },
  {
    id: 'w007',
    type: 'white',
    points: 2,
    rewardPieceLevel: 2,
    shape: [
      [true, true],
      [true, true]
    ],  // 正方形
    width: 2,
    height: 2
  },
  {
    id: 'w008',
    type: 'white',
    points: 2,
    rewardPieceLevel: 1,
    shape: [
      [true, true, true],
      [true, false, false]
    ],  // L字
    width: 3,
    height: 2
  },
  {
    id: 'w009',
    type: 'white',
    points: 2,
    rewardPieceLevel: 1,
    shape: [
      [true, false, false],
      [true, true, true]
    ],  // 逆L字
    width: 3,
    height: 2
  },
  {
    id: 'w010',
    type: 'white',
    points: 2,
    rewardPieceLevel: 1,
    shape: [
      [true, true],
      [false, true],
      [false, true]
    ],  // L字縦
    width: 2,
    height: 3
  },
  {
    id: 'w011',
    type: 'white',
    points: 2,
    rewardPieceLevel: 2,
    shape: [
      [false, true],
      [true, true],
      [true, false]
    ],  // S字
    width: 2,
    height: 3
  },
  {
    id: 'w012',
    type: 'white',
    points: 2,
    rewardPieceLevel: 2,
    shape: [
      [true, false],
      [true, true],
      [false, true]
    ],  // Z字
    width: 2,
    height: 3
  },
  {
    id: 'w013',
    type: 'white',
    points: 2,
    rewardPieceLevel: 2,
    shape: [
      [false, true, false],
      [true, true, true]
    ],  // T字
    width: 3,
    height: 2
  },

  // === 5マスパズル ===
  {
    id: 'w014',
    type: 'white',
    points: 3,
    rewardPieceLevel: 2,
    shape: [[true, true, true, true, true]],  // 横一列5マス
    width: 5,
    height: 1
  },
  {
    id: 'w015',
    type: 'white',
    points: 3,
    rewardPieceLevel: 2,
    shape: [
      [true, true, true],
      [true, false, false],
      [true, false, false]
    ],  // 大L字
    width: 3,
    height: 3
  },
  {
    id: 'w016',
    type: 'white',
    points: 3,
    rewardPieceLevel: 2,
    shape: [
      [true, true, true],
      [false, true, false],
      [false, true, false]
    ],  // 十字
    width: 3,
    height: 3
  },
  {
    id: 'w017',
    type: 'white',
    points: 3,
    rewardPieceLevel: 2,
    shape: [
      [true, true],
      [true, true],
      [true, false]
    ],  // P字
    width: 2,
    height: 3
  },
  {
    id: 'w018',
    type: 'white',
    points: 3,
    rewardPieceLevel: 2,
    shape: [
      [true, true],
      [true, true],
      [false, true]
    ],  // 逆P字
    width: 2,
    height: 3
  },

  // === 6マスパズル ===
  {
    id: 'w019',
    type: 'white',
    points: 4,
    rewardPieceLevel: 2,
    shape: [
      [true, true, true],
      [true, true, true]
    ],  // 2x3長方形
    width: 3,
    height: 2
  },
  {
    id: 'w020',
    type: 'white',
    points: 4,
    rewardPieceLevel: 3,
    shape: [
      [true, true, true, true],
      [true, false, false, true]
    ],  // U字
    width: 4,
    height: 2
  },
  {
    id: 'w021',
    type: 'white',
    points: 4,
    rewardPieceLevel: 3,
    shape: [
      [true, false, false],
      [true, true, true],
      [true, false, false],
      [true, false, false]
    ],  // 変形L
    width: 3,
    height: 4
  },

  // 残りの白パズル（w022-w032）は同様のパターンで定義
  // ... 省略（実装時に追加）
];
```

---

## 黒パズル（20枚）サンプル

```typescript
export const BLACK_PUZZLES: PuzzleCard[] = [
  // === 6マスパズル（複雑な形状）===
  {
    id: 'b001',
    type: 'black',
    points: 4,
    rewardPieceLevel: 3,
    shape: [
      [true, true, false],
      [false, true, true],
      [false, false, true],
      [false, false, true]
    ],
    width: 3,
    height: 4
  },
  {
    id: 'b002',
    type: 'black',
    points: 4,
    rewardPieceLevel: 3,
    shape: [
      [true, true, true],
      [true, false, false],
      [true, true, false]
    ],
    width: 3,
    height: 3
  },

  // === 7マスパズル ===
  {
    id: 'b003',
    type: 'black',
    points: 5,
    rewardPieceLevel: 3,
    shape: [
      [true, true, true, true],
      [true, false, false, false],
      [true, true, false, false]
    ],
    width: 4,
    height: 3
  },
  {
    id: 'b004',
    type: 'black',
    points: 5,
    rewardPieceLevel: 3,
    shape: [
      [false, true, false],
      [true, true, true],
      [false, true, false],
      [false, true, false],
      [false, true, false]
    ],  // 十字の長いバージョン
    width: 3,
    height: 5
  },
  {
    id: 'b005',
    type: 'black',
    points: 5,
    rewardPieceLevel: 3,
    shape: [
      [true, false, false, false],
      [true, true, false, false],
      [false, true, true, false],
      [false, false, true, true]
    ],  // 階段状
    width: 4,
    height: 4
  },

  // === 8マスパズル ===
  {
    id: 'b006',
    type: 'black',
    points: 6,
    rewardPieceLevel: 4,
    shape: [
      [true, true, true, true],
      [true, true, true, true]
    ],  // 2x4長方形
    width: 4,
    height: 2
  },
  {
    id: 'b007',
    type: 'black',
    points: 6,
    rewardPieceLevel: 4,
    shape: [
      [true, true, false, false],
      [true, true, true, false],
      [false, true, true, true]
    ],
    width: 4,
    height: 3
  },
  {
    id: 'b008',
    type: 'black',
    points: 6,
    rewardPieceLevel: 4,
    shape: [
      [true, true, true],
      [true, false, true],
      [true, true, true]
    ],  // 四角の中抜き（ドーナツ型）
    width: 3,
    height: 3
  },
  {
    id: 'b009',
    type: 'black',
    points: 6,
    rewardPieceLevel: 4,
    shape: [
      [true, false, true],
      [true, true, true],
      [true, false, true],
      [true, false, false]
    ],
    width: 3,
    height: 4
  },

  // === 9マスパズル（最高難易度）===
  {
    id: 'b010',
    type: 'black',
    points: 7,
    rewardPieceLevel: 4,
    shape: [
      [true, true, true],
      [true, true, true],
      [true, true, true]
    ],  // 3x3正方形
    width: 3,
    height: 3
  },
  {
    id: 'b011',
    type: 'black',
    points: 7,
    rewardPieceLevel: 4,
    shape: [
      [true, true, true, true, true],
      [true, false, false, false, false],
      [true, false, false, false, false],
      [true, true, false, false, false]
    ],
    width: 5,
    height: 4
  },
  {
    id: 'b012',
    type: 'black',
    points: 8,
    rewardPieceLevel: 4,
    shape: [
      [true, true, false, false],
      [true, true, true, false],
      [false, true, true, true],
      [false, false, true, true]
    ],
    width: 4,
    height: 4
  },

  // 残りの黒パズル（b013-b020）は同様のパターンで定義
  // ... 省略（実装時に追加）
];
```

---

## ピース定義データ

```typescript
// data/pieces.ts

export interface PieceDefinition {
  type: PieceType;
  level: number;
  shape: [number, number][];
  color: string;  // Tailwind CSS color class
}

export const PIECE_DEFINITIONS: Record<PieceType, PieceDefinition> = {
  // Level 1
  dot: {
    type: 'dot',
    level: 1,
    shape: [[0, 0]],
    color: 'bg-yellow-400'
  },

  // Level 2
  i2: {
    type: 'i2',
    level: 2,
    shape: [[0, 0], [1, 0]],
    color: 'bg-orange-400'
  },

  // Level 3
  i3: {
    type: 'i3',
    level: 3,
    shape: [[0, 0], [1, 0], [2, 0]],
    color: 'bg-red-400'
  },
  l3: {
    type: 'l3',
    level: 3,
    shape: [[0, 0], [1, 0], [1, 1]],
    color: 'bg-red-400'
  },
  v3: {
    type: 'v3',
    level: 3,
    shape: [[0, 0], [0, 1], [1, 1]],
    color: 'bg-red-400'
  },
  t3_half: {
    type: 't3_half',
    level: 3,
    shape: [[0, 0], [1, 0], [0, 1]],
    color: 'bg-red-400'
  },

  // Level 4
  i4: {
    type: 'i4',
    level: 4,
    shape: [[0, 0], [1, 0], [2, 0], [3, 0]],
    color: 'bg-purple-400'
  },
  l4: {
    type: 'l4',
    level: 4,
    shape: [[0, 0], [1, 0], [2, 0], [2, 1]],
    color: 'bg-purple-400'
  },
  t4: {
    type: 't4',
    level: 4,
    shape: [[0, 0], [1, 0], [2, 0], [1, 1]],
    color: 'bg-purple-400'
  },
  s4: {
    type: 's4',
    level: 4,
    shape: [[0, 0], [1, 0], [1, 1], [2, 1]],
    color: 'bg-purple-400'
  },
  o4: {
    type: 'o4',
    level: 4,
    shape: [[0, 0], [1, 0], [0, 1], [1, 1]],
    color: 'bg-purple-400'
  }
};

// ピースの初期ストック数
export const INITIAL_PIECE_STOCK: Record<PieceType, number> = {
  dot: 15,
  i2: 12,
  i3: 6,
  l3: 6,
  v3: 6,
  t3_half: 6,
  i4: 6,
  l4: 6,
  t4: 6,
  s4: 6,
  o4: 6
};

// レベルごとのピースタイプ
export const PIECES_BY_LEVEL: Record<number, PieceType[]> = {
  1: ['dot'],
  2: ['i2'],
  3: ['i3', 'l3', 'v3', 't3_half'],
  4: ['i4', 'l4', 't4', 's4', 'o4']
};
```

---

## 使用方法

1. 上記のデータを `src/games/project-l/data/` 配下に配置
2. パズルカードは `shuffleArray()` でシャッフルして山札を作成
3. ゲーム開始時に白4枚、黒4枚を場にオープン

```typescript
// 使用例
import { WHITE_PUZZLES, BLACK_PUZZLES } from './data/puzzles';
import { PIECE_DEFINITIONS, INITIAL_PIECE_STOCK } from './data/pieces';

function initializeGame() {
  const shuffledWhite = shuffleArray([...WHITE_PUZZLES]);
  const shuffledBlack = shuffleArray([...BLACK_PUZZLES]);
  
  return {
    whitePuzzleDeck: shuffledWhite.slice(4).map(p => p.id),
    blackPuzzleDeck: shuffledBlack.slice(4).map(p => p.id),
    whitePuzzleMarket: shuffledWhite.slice(0, 4).map(p => p.id),
    blackPuzzleMarket: shuffledBlack.slice(0, 4).map(p => p.id),
    pieceStock: { ...INITIAL_PIECE_STOCK }
  };
}
```
