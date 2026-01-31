import type { GemColor } from '../types/game';

interface GemProps {
  color: GemColor;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// 宝石の色に対応する画像パス
const colorImages: Record<GemColor, string> = {
  blue: '/hive/images/i_gem_b.png',
  yellow: '/hive/images/i_gem_y.png',
  red: '/hive/images/i_gem_r.png',
  white: '/hive/images/i_gem_w.png',
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
  const gemSize = 22; // 宝石のサイズ（px）
  const platformSize = 80; // 台のサイズ（px）

  // 3x3のグリッドで配置（最大9個）
  const cols = 3;
  const rows = 3;
  const cellWidth = platformSize / cols;
  const cellHeight = platformSize / rows;

  // グリッド位置をシャッフル（gem.idベースで決定的に）
  const positions = Array.from({ length: cols * rows }, (_, i) => i);
  const firstGemId = gems[0]?.id || 'default';
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(firstGemId, i) * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  return (
    <div
      className={`relative ${className}`}
      style={{ width: platformSize, height: platformSize }}
    >
      {gems.slice(0, 9).map((gem, index) => {
        const pos = positions[index];
        const col = pos % cols;
        const row = Math.floor(pos / cols);

        // セル内でのランダムオフセット（小さめ）
        const offsetX = (seededRandom(gem.id, 0) - 0.5) * 6;
        const offsetY = (seededRandom(gem.id, 1) - 0.5) * 6;
        const rotate = (seededRandom(gem.id, 2) - 0.5) * 30; // -15deg ~ +15deg

        // セルの中央に配置
        const x = col * cellWidth + (cellWidth - gemSize) / 2 + offsetX;
        const y = row * cellHeight + (cellHeight - gemSize) / 2 + offsetY;

        return (
          <img
            key={gem.id}
            src={colorImages[gem.color]}
            alt={gem.color}
            className="absolute object-contain"
            style={{
              width: gemSize,
              height: 'auto',
              left: x,
              top: y,
              transform: `rotate(${rotate}deg)`,
              zIndex: index,
              opacity: 0.9,
            }}
          />
        );
      })}
    </div>
  );
};
