import type { Gem, GemColor, Platform, Player, PLAYER_SETTINGS } from '../types/game';

// ユニークID生成
let gemIdCounter = 0;
export const generateGemId = (): string => {
  gemIdCounter++;
  return `gem-${Date.now()}-${gemIdCounter}`;
};

// 宝石を生成
export const createGem = (color: GemColor): Gem => ({
  id: generateGemId(),
  color,
});

// 袋を作成（人数に応じた宝石を入れる）
export const createBag = (_playerCount: number, settings: typeof PLAYER_SETTINGS[number]): Gem[] => {
  const gems: Gem[] = [];

  for (let i = 0; i < settings.blue; i++) {
    gems.push(createGem('blue'));
  }
  for (let i = 0; i < settings.yellow; i++) {
    gems.push(createGem('yellow'));
  }
  for (let i = 0; i < settings.red; i++) {
    gems.push(createGem('red'));
  }
  for (let i = 0; i < settings.white; i++) {
    gems.push(createGem('white'));
  }

  // シャッフル
  return shuffleArray(gems);
};

// 配列をシャッフル
export const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// 宝石台を作成
export const createPlatforms = (count: number): Platform[] => {
  const platforms: Platform[] = [];
  for (let i = 0; i < count; i++) {
    platforms.push({
      id: `platform-${i}`,
      gems: [],
    });
  }
  return platforms;
};

// 宝石台に初期配置（各2個ずつ）
export const distributeInitialGems = (
  platforms: Platform[],
  bag: Gem[]
): { platforms: Platform[]; bag: Gem[] } => {
  const newPlatforms = platforms.map(p => ({ ...p, gems: [...p.gems] }));
  const newBag = [...bag];

  for (const platform of newPlatforms) {
    for (let i = 0; i < 2; i++) {
      const gem = newBag.pop();
      if (gem) {
        platform.gems.push(gem);
      }
    }
  }

  return { platforms: newPlatforms, bag: newBag };
};

// 宝石を補充
export const replenishPlatforms = (
  platforms: Platform[],
  bag: Gem[]
): { platforms: Platform[]; bag: Gem[] } => {
  const newPlatforms = platforms.map(p => ({ ...p, gems: [...p.gems] }));
  const newBag = [...bag];

  for (const platform of newPlatforms) {
    if (newBag.length === 0) break;

    if (platform.gems.length === 0) {
      // 空の宝石台には2個補充
      for (let i = 0; i < 2 && newBag.length > 0; i++) {
        const gem = newBag.pop();
        if (gem) platform.gems.push(gem);
      }
    } else {
      // 宝石が残っている台には1個補充
      const gem = newBag.pop();
      if (gem) platform.gems.push(gem);
    }
  }

  return { platforms: newPlatforms, bag: newBag };
};

// 得点計算
// securedOnly: trueの場合は確定分のみ、falseの場合は金庫と確定分を合算
export const calculateScore = (player: Player, securedOnly = false): {
  total: number;
  colorPoints: number;
  setBonus: number;
  whitePoints: number;
  gemCount: number;
  details: {
    blue: number;
    yellow: number;
    red: number;
    white: number;
    sets: number;
  };
} => {
  // securedOnlyがtrueなら確定分のみ、falseなら金庫と確定分を合算
  const allGems = securedOnly ? [...player.secured] : [...player.vault, ...player.secured];

  // 色ごとにカウント
  const counts = {
    blue: 0,
    yellow: 0,
    red: 0,
    white: 0,
  };

  for (const gem of allGems) {
    counts[gem.color]++;
  }

  // 色付き宝石の得点
  const colorPoints = counts.blue * 1 + counts.yellow * 2 + counts.red * 3;

  // 3色セットボーナス
  const sets = Math.min(counts.blue, counts.yellow, counts.red);
  const setBonus = sets * 4;

  // 白宝石の得点（個数の2乗）
  const whitePoints = counts.white * counts.white;

  const total = colorPoints + setBonus + whitePoints;
  const gemCount = allGems.length;

  return {
    total,
    colorPoints,
    setBonus,
    whitePoints,
    gemCount,
    details: {
      ...counts,
      sets,
    },
  };
};

// 勝者を判定
export const determineWinner = (players: Player[]): string | null => {
  if (players.length === 0) return null;

  const scores = players.map(p => ({
    playerId: p.id,
    ...calculateScore(p),
  }));

  // 得点でソート（同点なら宝石数で比較）
  scores.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return b.gemCount - a.gemCount;
  });

  return scores[0].playerId;
};
