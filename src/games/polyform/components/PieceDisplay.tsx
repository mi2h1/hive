import { PIECE_DEFINITIONS } from '../data/pieces';
import type { PieceType } from '../types/game';

interface PieceDisplayProps {
  type: PieceType;
  rotation?: 0 | 90 | 180 | 270;
  flipped?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
}

// ピースの形状を回転させる
function rotateShape(
  shape: [number, number][],
  rotation: 0 | 90 | 180 | 270
): [number, number][] {
  if (rotation === 0) return shape;

  return shape.map(([x, y]) => {
    switch (rotation) {
      case 90:
        return [-y, x];
      case 180:
        return [-x, -y];
      case 270:
        return [y, -x];
      default:
        return [x, y];
    }
  });
}

// ピースの形状を反転させる（左右反転）
function flipShape(shape: [number, number][]): [number, number][] {
  return shape.map(([x, y]) => [-x, y]);
}

// 形状を正規化（最小座標を0,0に移動）
function normalizeShape(shape: [number, number][]): [number, number][] {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => [x - minX, y - minY]);
}

// 形状のバウンディングボックスを取得
function getBoundingBox(shape: [number, number][]): { width: number; height: number } {
  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  return {
    width: Math.max(...xs) - Math.min(...xs) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1,
  };
}

export const PieceDisplay = ({
  type,
  rotation = 0,
  flipped = false,
  size = 'md',
  onClick,
  selected = false,
  disabled = false,
}: PieceDisplayProps) => {
  const definition = PIECE_DEFINITIONS[type];
  if (!definition) return null;

  // 形状を変換
  let shape = definition.shape;
  if (flipped) {
    shape = flipShape(shape);
  }
  shape = rotateShape(shape, rotation);
  shape = normalizeShape(shape);

  const { width, height } = getBoundingBox(shape);

  // セルサイズ
  const cellSize = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  }[size];

  // 角丸（小さいサイズは角丸なし）
  const cellRounded = {
    xs: '',
    sm: 'rounded-[1px]',
    md: 'rounded-[2px]',
    lg: 'rounded-sm',
  }[size];

  // グリッドを生成
  const grid: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));

  shape.forEach(([x, y]) => {
    if (y >= 0 && y < height && x >= 0 && x < width) {
      grid[y][x] = true;
    }
  });

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`inline-block p-1 rounded transition-all ${
        onClick && !disabled ? 'cursor-pointer hover:bg-white/10' : ''
      } ${selected ? 'ring-2 ring-white bg-white/20' : ''} ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      <div className="flex flex-col gap-px">
        {grid.map((row, y) => (
          <div key={y} className="flex gap-px">
            {row.map((filled, x) => (
              <div
                key={x}
                className={`${cellSize} ${cellRounded} ${
                  filled ? definition.color : 'bg-transparent'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ピースの変換済み形状を取得するユーティリティ関数
export function getTransformedShape(
  type: PieceType,
  rotation: 0 | 90 | 180 | 270 = 0,
  flipped: boolean = false
): [number, number][] {
  const definition = PIECE_DEFINITIONS[type];
  if (!definition) return [];

  let shape = definition.shape;
  if (flipped) {
    shape = flipShape(shape);
  }
  shape = rotateShape(shape, rotation);
  return normalizeShape(shape);
}
