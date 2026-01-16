import type { DiceResult, RollRank } from '../types/game';

/**
 * ダイスの出目からランクを計算する
 *
 * ランク順（強い順）:
 * 1. デスペラード（1,2）: value = 100
 * 2. ゾロ目: value = 90 + 目の値（6-6=96, 5-5=95, ..., 1-1=91）
 * 3. バラ目: value = 合計値（12〜4）
 *
 * 最弱は 1,3 の組み合わせ（合計4）
 */
export function getRollRank(roll: DiceResult): RollRank {
  const { die1, die2 } = roll;

  // デスペラード判定（1と2の組み合わせ）
  if ((die1 === 1 && die2 === 2) || (die1 === 2 && die2 === 1)) {
    return { type: 'desperado', value: 100 };
  }

  // ゾロ目判定
  if (die1 === die2) {
    return { type: 'doubles', value: 90 + die1 };
  }

  // バラ目（合計値）
  return { type: 'normal', value: die1 + die2 };
}

/**
 * 2つのランクを比較する
 * @returns 負の値: a < b, 0: a == b, 正の値: a > b
 */
export function compareRanks(a: RollRank, b: RollRank): number {
  return a.value - b.value;
}

/**
 * 出目の表示名を取得
 */
export function getRollDisplayName(roll: DiceResult): string {
  const rank = getRollRank(roll);

  if (rank.type === 'desperado') {
    return 'デスペラード！';
  }

  if (rank.type === 'doubles') {
    return `ゾロ目 ${roll.die1}-${roll.die2}`;
  }

  return `${roll.die1}-${roll.die2}（合計${roll.die1 + roll.die2}）`;
}

/**
 * ランダムなダイスの出目を生成
 */
export function rollDice(): DiceResult {
  return {
    die1: Math.floor(Math.random() * 6) + 1,
    die2: Math.floor(Math.random() * 6) + 1,
  };
}

/**
 * プレイヤーの出目から最弱のプレイヤーIDを特定
 * 同点の場合は配列で返す（タイブレーク用）
 */
export function findWeakestPlayers(
  rolls: { playerId: string; roll: DiceResult }[]
): string[] {
  if (rolls.length === 0) return [];

  // 各プレイヤーのランクを計算
  const rankedRolls = rolls.map(({ playerId, roll }) => ({
    playerId,
    roll,
    rank: getRollRank(roll),
  }));

  // 最小ランクを見つける
  const minRank = Math.min(...rankedRolls.map((r) => r.rank.value));

  // 最小ランクを持つプレイヤーを返す
  return rankedRolls
    .filter((r) => r.rank.value === minRank)
    .map((r) => r.playerId);
}

/**
 * デスペラードが含まれているか確認
 */
export function hasDesperado(rolls: { roll: DiceResult }[]): boolean {
  return rolls.some(({ roll }) => getRollRank(roll).type === 'desperado');
}
