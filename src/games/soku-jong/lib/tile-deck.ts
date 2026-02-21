import type { Tile, TileKind } from '../types/game';

// 索子9種
export const BAMBOO_KINDS: TileKind[] = [
  '1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s',
];

// 字牌2種
export const HONOR_KINDS: TileKind[] = ['hatsu', 'chun'];

// 全11種
export const ALL_TILE_KINDS: TileKind[] = [...BAMBOO_KINDS, ...HONOR_KINDS];

// kind→数値マッピング（順子判定用）
export const BAMBOO_NUMBER: Partial<Record<TileKind, number>> = {
  '1s': 1, '2s': 2, '3s': 3, '4s': 4, '5s': 5,
  '6s': 6, '7s': 7, '8s': 8, '9s': 9,
};

// 44枚生成（各kind×4、索子は1枚赤）
export function createFullDeck(): Tile[] {
  const tiles: Tile[] = [];

  for (const kind of BAMBOO_KINDS) {
    // 赤牌1枚
    tiles.push({ id: `${kind}_r`, kind, isRed: true });
    // 通常牌3枚
    for (let i = 1; i <= 3; i++) {
      tiles.push({ id: `${kind}_${i}`, kind, isRed: false });
    }
  }

  for (const kind of HONOR_KINDS) {
    for (let i = 1; i <= 4; i++) {
      tiles.push({ id: `${kind}_${i}`, kind, isRed: false });
    }
  }

  return tiles;
}

// Fisher-Yatesシャッフル
export function shuffleDeck(deck: Tile[]): Tile[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ドラ1枚+各プレイヤー5枚配牌
export function dealTiles(
  deck: Tile[],
  playerCount: number,
): { hands: Tile[][]; doraTile: Tile; remainingDeck: Tile[] } {
  const remaining = [...deck];
  const doraTile = remaining.shift()!;

  const hands: Tile[][] = [];
  for (let p = 0; p < playerCount; p++) {
    hands.push(remaining.splice(0, 5));
  }

  return { hands, doraTile, remainingDeck: remaining };
}

// 1枚ツモ
export function drawTile(
  deck: Tile[],
): { drawnTile: Tile; remainingDeck: Tile[] } | null {
  if (deck.length === 0) return null;
  const remaining = [...deck];
  const drawnTile = remaining.shift()!;
  return { drawnTile, remainingDeck: remaining };
}
