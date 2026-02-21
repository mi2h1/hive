import type { Tile, TileKind, Mentsu } from '../types/game';
import { ALL_TILE_KINDS, BAMBOO_NUMBER } from './tile-deck';

// kind順ソート
export function sortTilesByKind(tiles: Tile[]): Tile[] {
  const order = ALL_TILE_KINDS;
  return [...tiles].sort(
    (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind),
  );
}

// 6枚から2面子の全組み合わせ列挙（バックトラッキング）
export function findAllMentsuCombinations(tiles: Tile[]): Mentsu[][] {
  const sorted = sortTilesByKind(tiles);
  const results: Mentsu[][] = [];
  backtrack(sorted, [], results);
  return results;
}

function backtrack(
  remaining: Tile[],
  current: Mentsu[],
  results: Mentsu[][],
): void {
  if (remaining.length === 0) {
    if (current.length === 2) {
      results.push([...current]);
    }
    return;
  }

  if (remaining.length < 3) return;

  const first = remaining[0];

  // 刻子を試す: 先頭と同じkindが3枚以上あるか
  const sameKind = remaining.filter((t) => t.kind === first.kind);
  if (sameKind.length >= 3) {
    const koutsuTiles = sameKind.slice(0, 3) as [Tile, Tile, Tile];
    const rest = removeUsedTiles(remaining, koutsuTiles);
    current.push({ type: 'koutsu', tiles: koutsuTiles });
    backtrack(rest, current, results);
    current.pop();
  }

  // 順子を試す: 字牌は順子不可
  const num = BAMBOO_NUMBER[first.kind];
  if (num !== undefined) {
    const next1Kind = numberToKind(num + 1);
    const next2Kind = numberToKind(num + 2);
    if (next1Kind && next2Kind) {
      const t2 = remaining.find((t) => t.kind === next1Kind);
      const t3 = remaining.find((t) => t.kind === next2Kind);
      if (t2 && t3) {
        const shuntsuTiles = [first, t2, t3] as [Tile, Tile, Tile];
        const rest = removeUsedTiles(remaining, shuntsuTiles);
        current.push({ type: 'shuntsu', tiles: shuntsuTiles });
        backtrack(rest, current, results);
        current.pop();
      }
    }
  }
}

function numberToKind(n: number): TileKind | null {
  if (n < 1 || n > 9) return null;
  return `${n}s` as TileKind;
}

function removeUsedTiles(remaining: Tile[], used: Tile[]): Tile[] {
  const result = [...remaining];
  for (const tile of used) {
    const idx = result.findIndex((t) => t.id === tile.id);
    if (idx !== -1) result.splice(idx, 1);
  }
  return result;
}

// 2面子が成立するか
export function isWinningHand(tiles: Tile[]): boolean {
  if (tiles.length !== 6) return false;
  return findAllMentsuCombinations(tiles).length > 0;
}
