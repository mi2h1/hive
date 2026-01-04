import type { PieceType, PieceDefinition } from '../types/game';

export const PIECE_DEFINITIONS: Record<PieceType, PieceDefinition> = {
  // Level 1
  dot: {
    type: 'dot',
    level: 1,
    shape: [[0, 0]],
    color: 'bg-yellow-400',
  },

  // Level 2
  i2: {
    type: 'i2',
    level: 2,
    shape: [[0, 0], [1, 0]],
    color: 'bg-orange-400',
  },

  // Level 3
  i3: {
    type: 'i3',
    level: 3,
    shape: [[0, 0], [1, 0], [2, 0]],
    color: 'bg-red-400',
  },
  l3: {
    type: 'l3',
    level: 3,
    shape: [[0, 0], [1, 0], [1, 1]],
    color: 'bg-red-400',
  },
  v3: {
    type: 'v3',
    level: 3,
    shape: [[0, 0], [0, 1], [1, 1]],
    color: 'bg-red-400',
  },
  t3_half: {
    type: 't3_half',
    level: 3,
    shape: [[0, 0], [1, 0], [0, 1]],
    color: 'bg-red-400',
  },

  // Level 4
  i4: {
    type: 'i4',
    level: 4,
    shape: [[0, 0], [1, 0], [2, 0], [3, 0]],
    color: 'bg-purple-400',
  },
  l4: {
    type: 'l4',
    level: 4,
    shape: [[0, 0], [1, 0], [2, 0], [2, 1]],
    color: 'bg-purple-400',
  },
  t4: {
    type: 't4',
    level: 4,
    shape: [[0, 0], [1, 0], [2, 0], [1, 1]],
    color: 'bg-purple-400',
  },
  s4: {
    type: 's4',
    level: 4,
    shape: [[0, 0], [1, 0], [1, 1], [2, 1]],
    color: 'bg-purple-400',
  },
  o4: {
    type: 'o4',
    level: 4,
    shape: [[0, 0], [1, 0], [0, 1], [1, 1]],
    color: 'bg-purple-400',
  },
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
  o4: 6,
};

// レベルごとのピースタイプ
export const PIECES_BY_LEVEL: Record<number, PieceType[]> = {
  1: ['dot'],
  2: ['i2'],
  3: ['i3', 'l3', 'v3', 't3_half'],
  4: ['i4', 'l4', 't4', 's4', 'o4'],
};

// ピースタイプの日本語名
export const PIECE_NAMES: Record<PieceType, string> = {
  dot: '1マス',
  i2: 'I字(2)',
  i3: 'I字(3)',
  l3: 'L字(3)',
  v3: 'V字',
  t3_half: '角',
  i4: 'I字(4)',
  l4: 'L字(4)',
  t4: 'T字',
  s4: 'S字',
  o4: '正方形',
};
