import type { Tile, TileKind, Mentsu } from '../types/game';
import { BAMBOO_NUMBER } from './tile-deck';

export type YakumanType = 'all-green' | 'chinroto' | 'super-red';

export interface ScoreResult {
  total: number;
  breakdown: {
    mentsu: number;
    red: number;
    dora: number;
    dealer: number;
    tanyao: number;
    chanta: number;
  };
  yakuman: YakumanType | null;
  yakumanPoints: number;
}

// オールグリーン対象牌
const ALL_GREEN_KINDS: TileKind[] = ['2s', '3s', '4s', '6s', '8s', 'hatsu'];

// チンヤオ対象牌
const CHINROTO_KINDS: TileKind[] = ['1s', '9s', 'hatsu', 'chun'];

// タンヤオ対象牌（2〜8索）
const TANYAO_KINDS: TileKind[] = ['2s', '3s', '4s', '5s', '6s', '7s', '8s'];

// チャンタ対象牌（1,9索 + 字牌）
const CHANTA_KINDS: TileKind[] = ['1s', '9s', 'hatsu', 'chun'];

// 役満判定
export function checkYakuman(allTiles: Tile[]): YakumanType | null {
  // スーパーレッド: 全牌が赤索子 or チュン
  const isSuperRed = allTiles.every(
    (t) => t.isRed || t.kind === 'chun',
  );
  if (isSuperRed) return 'super-red';

  // チンヤオ: 全牌が1s/9s/hatsu/chun
  const isChinroto = allTiles.every((t) =>
    CHINROTO_KINDS.includes(t.kind),
  );
  if (isChinroto) return 'chinroto';

  // オールグリーン: 全牌が2s/3s/4s/6s/8s/hatsu かつ赤なし
  const isAllGreen =
    allTiles.every((t) => ALL_GREEN_KINDS.includes(t.kind)) &&
    allTiles.every((t) => !t.isRed);
  if (isAllGreen) return 'all-green';

  return null;
}

// 点数計算
export function calculateScore(
  mentsuList: Mentsu[],
  allTiles: Tile[],
  doraTile: Tile | null,
  isDealer: boolean,
): ScoreResult {
  // 役満チェック
  const yakuman = checkYakuman(allTiles);
  if (yakuman) {
    const yakumanPoints =
      yakuman === 'super-red' ? 20 : yakuman === 'chinroto' ? 15 : 10;
    return {
      total: yakumanPoints,
      breakdown: { mentsu: 0, red: 0, dora: 0, dealer: 0, tanyao: 0, chanta: 0 },
      yakuman,
      yakumanPoints,
    };
  }

  // 面子点: 順子1点、刻子2点
  const mentsuPoints = mentsuList.reduce(
    (sum, m) => sum + (m.type === 'shuntsu' ? 1 : 2),
    0,
  );

  // 赤牌点
  const redPoints = allTiles.filter((t) => t.isRed).length;

  // ドラ点
  const doraPoints = doraTile
    ? allTiles.filter((t) => t.kind === doraTile.kind).length
    : 0;

  // 親ボーナス
  const dealerPoints = isDealer ? 2 : 0;

  // タンヤオ: 全牌が2〜8索
  const tanyaoPoints = allTiles.every((t) =>
    TANYAO_KINDS.includes(t.kind),
  )
    ? 1
    : 0;

  // チャンタ: 全面子にヤオチュウ牌を含む
  const chantaPoints = mentsuList.every((m) =>
    m.tiles.some((t) => CHANTA_KINDS.includes(t.kind)),
  )
    ? 1
    : 0;

  // タンヤオとチャンタは排他（両方成立することはない）
  const total =
    mentsuPoints + redPoints + doraPoints + dealerPoints + tanyaoPoints + chantaPoints;

  return {
    total,
    breakdown: {
      mentsu: mentsuPoints,
      red: redPoints,
      dora: doraPoints,
      dealer: dealerPoints,
      tanyao: tanyaoPoints,
      chanta: chantaPoints,
    },
    yakuman: null,
    yakumanPoints: 0,
  };
}

// 5点以上で和了成立
export function isValidWin(
  mentsuList: Mentsu[],
  allTiles: Tile[],
  doraTile: Tile | null,
  isDealer: boolean,
): boolean {
  const result = calculateScore(mentsuList, allTiles, doraTile, isDealer);
  return result.total >= 5;
}
