import type { Tile, TileKind, Player } from '../types/game';
import { ALL_TILE_KINDS } from './tile-deck';
import { findAllMentsuCombinations } from './win-detector';
import { isValidWin } from './scoring';

// 5枚手牌に何を加えたら和了か（全11種を試行）
export function findWaitingTiles(
  hand: Tile[],
  doraTile: Tile | null,
  isDealer: boolean,
): TileKind[] {
  if (hand.length !== 5) return [];

  const waitingKinds: TileKind[] = [];

  for (const kind of ALL_TILE_KINDS) {
    // 仮想牌を追加して判定
    const testTile: Tile = { id: `_test_${kind}`, kind, isRed: false };
    const testHand = [...hand, testTile];

    const combinations = findAllMentsuCombinations(testHand);
    for (const mentsuList of combinations) {
      if (isValidWin(mentsuList, testHand, doraTile, isDealer)) {
        waitingKinds.push(kind);
        break;
      }
    }
  }

  return waitingKinds;
}

// 捨て牌にwaitingのkindがあるか
export function isFuriten(
  player: Player,
  waitingTiles: TileKind[],
): boolean {
  return player.discards.some((d) => waitingTiles.includes(d.kind));
}

// ロン可能か（和了+5点以上+非フリテン）
export function canRon(
  player: Player,
  discardedTile: Tile,
  doraTile: Tile | null,
): boolean {
  if (player.hand.length !== 5) return false;

  const testHand = [...player.hand, discardedTile];
  const combinations = findAllMentsuCombinations(testHand);

  // 和了形が存在し、5点以上の組み合わせがあるか
  const hasValidWin = combinations.some((mentsuList) =>
    isValidWin(mentsuList, testHand, doraTile, player.isDealer),
  );
  if (!hasValidWin) return false;

  // フリテン判定
  const waitingTiles = findWaitingTiles(player.hand, doraTile, player.isDealer);
  if (isFuriten(player, waitingTiles)) return false;

  return true;
}
