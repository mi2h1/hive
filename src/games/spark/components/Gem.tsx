import type { GemColor } from '../types/game';

interface GemProps {
  color: GemColor;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// 宝石の色に対応するCSSフィルター
// 元画像はモノクロなので、sepia + hue-rotate で着色
const colorFilters: Record<GemColor, string> = {
  blue: 'sepia(1) saturate(5) hue-rotate(180deg) brightness(0.9)', // 青
  yellow: 'sepia(1) saturate(5) hue-rotate(10deg) brightness(1.1)', // 黄
  red: 'sepia(1) saturate(5) hue-rotate(-10deg) brightness(0.9)', // 赤
  white: 'brightness(1.2)', // 白（そのまま明るく）
};

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export const Gem = ({ color, size = 'md', className = '' }: GemProps) => {
  return (
    <img
      src="/boards/images/i_gem.png"
      alt={color}
      className={`${sizeClasses[size]} ${className}`}
      style={{ filter: colorFilters[color] }}
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
