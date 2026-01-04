import type { PuzzleCard } from '../types/game';

// 白パズル（簡単、32枚予定だがとりあえずサンプル）
export const WHITE_PUZZLES: PuzzleCard[] = [
  // 3マス
  {
    id: 'w001',
    type: 'white',
    points: 1,
    rewardPieceLevel: null,
    shape: [[true, true, true]],
    width: 3,
    height: 1,
  },
  {
    id: 'w002',
    type: 'white',
    points: 1,
    rewardPieceLevel: null,
    shape: [[true], [true], [true]],
    width: 1,
    height: 3,
  },
  {
    id: 'w003',
    type: 'white',
    points: 1,
    rewardPieceLevel: 1,
    shape: [
      [true, true],
      [true, false],
    ],
    width: 2,
    height: 2,
  },
  {
    id: 'w004',
    type: 'white',
    points: 1,
    rewardPieceLevel: 1,
    shape: [
      [true, true],
      [false, true],
    ],
    width: 2,
    height: 2,
  },

  // 4マス
  {
    id: 'w005',
    type: 'white',
    points: 2,
    rewardPieceLevel: 1,
    shape: [[true, true, true, true]],
    width: 4,
    height: 1,
  },
  {
    id: 'w006',
    type: 'white',
    points: 2,
    rewardPieceLevel: 2,
    shape: [
      [true, true],
      [true, true],
    ],
    width: 2,
    height: 2,
  },
  {
    id: 'w007',
    type: 'white',
    points: 2,
    rewardPieceLevel: 1,
    shape: [
      [true, true, true],
      [true, false, false],
    ],
    width: 3,
    height: 2,
  },
  {
    id: 'w008',
    type: 'white',
    points: 2,
    rewardPieceLevel: 2,
    shape: [
      [false, true, false],
      [true, true, true],
    ],
    width: 3,
    height: 2,
  },

  // 5マス
  {
    id: 'w009',
    type: 'white',
    points: 3,
    rewardPieceLevel: 2,
    shape: [[true, true, true, true, true]],
    width: 5,
    height: 1,
  },
  {
    id: 'w010',
    type: 'white',
    points: 3,
    rewardPieceLevel: 2,
    shape: [
      [true, true, true],
      [true, false, false],
      [true, false, false],
    ],
    width: 3,
    height: 3,
  },
  {
    id: 'w011',
    type: 'white',
    points: 3,
    rewardPieceLevel: 2,
    shape: [
      [true, true],
      [true, true],
      [true, false],
    ],
    width: 2,
    height: 3,
  },
  {
    id: 'w012',
    type: 'white',
    points: 3,
    rewardPieceLevel: 2,
    shape: [
      [true, true, true],
      [false, true, false],
      [false, true, false],
    ],
    width: 3,
    height: 3,
  },

  // 6マス
  {
    id: 'w013',
    type: 'white',
    points: 4,
    rewardPieceLevel: 2,
    shape: [
      [true, true, true],
      [true, true, true],
    ],
    width: 3,
    height: 2,
  },
  {
    id: 'w014',
    type: 'white',
    points: 4,
    rewardPieceLevel: 3,
    shape: [
      [true, true, true, true],
      [true, false, false, true],
    ],
    width: 4,
    height: 2,
  },
  {
    id: 'w015',
    type: 'white',
    points: 4,
    rewardPieceLevel: 3,
    shape: [
      [true, false, false],
      [true, true, true],
      [true, false, false],
      [true, false, false],
    ],
    width: 3,
    height: 4,
  },
  {
    id: 'w016',
    type: 'white',
    points: 4,
    rewardPieceLevel: 3,
    shape: [
      [true, true],
      [true, true],
      [true, true],
    ],
    width: 2,
    height: 3,
  },
];

// 黒パズル（難しい、20枚予定だがとりあえずサンプル）
export const BLACK_PUZZLES: PuzzleCard[] = [
  // 6マス
  {
    id: 'b001',
    type: 'black',
    points: 4,
    rewardPieceLevel: 3,
    shape: [
      [true, true, false],
      [false, true, true],
      [false, false, true],
      [false, false, true],
    ],
    width: 3,
    height: 4,
  },
  {
    id: 'b002',
    type: 'black',
    points: 4,
    rewardPieceLevel: 3,
    shape: [
      [true, true, true],
      [true, false, false],
      [true, true, false],
    ],
    width: 3,
    height: 3,
  },

  // 7マス
  {
    id: 'b003',
    type: 'black',
    points: 5,
    rewardPieceLevel: 3,
    shape: [
      [true, true, true, true],
      [true, false, false, false],
      [true, true, false, false],
    ],
    width: 4,
    height: 3,
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
      [false, true, false],
    ],
    width: 3,
    height: 5,
  },

  // 8マス
  {
    id: 'b005',
    type: 'black',
    points: 6,
    rewardPieceLevel: 4,
    shape: [
      [true, true, true, true],
      [true, true, true, true],
    ],
    width: 4,
    height: 2,
  },
  {
    id: 'b006',
    type: 'black',
    points: 6,
    rewardPieceLevel: 4,
    shape: [
      [true, true, true],
      [true, false, true],
      [true, true, true],
    ],
    width: 3,
    height: 3,
  },
  {
    id: 'b007',
    type: 'black',
    points: 6,
    rewardPieceLevel: 4,
    shape: [
      [true, true, false, false],
      [true, true, true, false],
      [false, true, true, true],
    ],
    width: 4,
    height: 3,
  },

  // 9マス
  {
    id: 'b008',
    type: 'black',
    points: 7,
    rewardPieceLevel: 4,
    shape: [
      [true, true, true],
      [true, true, true],
      [true, true, true],
    ],
    width: 3,
    height: 3,
  },
  {
    id: 'b009',
    type: 'black',
    points: 7,
    rewardPieceLevel: 4,
    shape: [
      [true, true, true, true, true],
      [true, false, false, false, false],
      [true, false, false, false, false],
      [true, true, false, false, false],
    ],
    width: 5,
    height: 4,
  },
  {
    id: 'b010',
    type: 'black',
    points: 8,
    rewardPieceLevel: 4,
    shape: [
      [true, true, false, false],
      [true, true, true, false],
      [false, true, true, true],
      [false, false, true, true],
    ],
    width: 4,
    height: 4,
  },
];

// 全パズルを取得
export const ALL_PUZZLES: PuzzleCard[] = [...WHITE_PUZZLES, ...BLACK_PUZZLES];

// IDからパズルを取得
export const getPuzzleById = (id: string): PuzzleCard | undefined => {
  return ALL_PUZZLES.find((p) => p.id === id);
};
