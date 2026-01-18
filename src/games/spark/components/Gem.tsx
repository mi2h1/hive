import type { GemColor } from '../types/game';

interface GemProps {
  color: GemColor;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// 宝石の色に対応する画像パス
const colorImages: Record<GemColor, string> = {
  blue: '/boards/images/i_gem_b.png',
  yellow: '/boards/images/i_gem_y.png',
  red: '/boards/images/i_gem_r.png',
  white: '/boards/images/i_gem_w.png',
};

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export const Gem = ({ color, size = 'md', className = '' }: GemProps) => {
  return (
    <img
      src={colorImages[color]}
      alt={color}
      className={`${sizeClasses[size]} ${className}`}
    />
  );
};

// 複数の宝石を表示するコンポーネント
interface GemStackProps {
  gems: { id: string; color: GemColor }[];
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
  className?: string;
}

export const GemStack = ({ gems, size = 'md', maxDisplay = 10, className = '' }: GemStackProps) => {
  const displayGems = gems.slice(0, maxDisplay);
  const remainingCount = gems.length - maxDisplay;

  return (
    <div className={`flex flex-wrap gap-1 items-center ${className}`}>
      {displayGems.map((gem) => (
        <Gem key={gem.id} color={gem.color} size={size} />
      ))}
      {remainingCount > 0 && (
        <span className="text-slate-400 text-sm ml-1">+{remainingCount}</span>
      )}
    </div>
  );
};

// 宝石のカウント表示
interface GemCountProps {
  color: GemColor;
  count: number;
  size?: 'sm' | 'md' | 'lg';
}

export const GemCount = ({ color, count, size = 'md' }: GemCountProps) => {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <Gem color={color} size={size} />
      <span className="text-white font-bold">×{count}</span>
    </div>
  );
};

// IDから決定的な乱数を生成（0-1の範囲）
const seededRandom = (seed: string, index: number = 0): number => {
  const str = seed + index.toString();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs((hash % 1000) / 1000);
};

// 宝石台の表示（宝石がランダムに散らばる）
interface GemPlatformProps {
  gems: { id: string; color: GemColor }[];
  className?: string;
}

export const GemPlatform = ({ gems, className = '' }: GemPlatformProps) => {
  const gemSize = 28; // 宝石のサイズ（px）
  const platformSize = 80; // 台のサイズ（px）
  const padding = 8; // 端からの余白

  return (
    <div
      className={`relative ${className}`}
      style={{ width: platformSize, height: platformSize }}
    >
      {gems.map((gem, index) => {
        // gem.idから決定的なランダム値を生成
        const randX = seededRandom(gem.id, 0);
        const randY = seededRandom(gem.id, 1);
        const randRotate = seededRandom(gem.id, 2);

        // 位置を計算（台の範囲内に収める）
        const maxOffset = platformSize - gemSize - padding * 2;
        const x = padding + randX * maxOffset;
        const y = padding + randY * maxOffset;
        const rotate = (randRotate - 0.5) * 40; // -20deg ~ +20deg

        return (
          <img
            key={gem.id}
            src={colorImages[gem.color]}
            alt={gem.color}
            className="absolute"
            style={{
              width: gemSize,
              height: gemSize,
              left: x,
              top: y,
              transform: `rotate(${rotate}deg)`,
              zIndex: index,
            }}
          />
        );
      })}
    </div>
  );
};
