import { PIECE_DEFINITIONS } from '../data/pieces';
import type { PieceType } from '../types/game';
import { getTransformedShape } from './PieceDisplay';

interface DraggablePieceProps {
  pieceId: string;
  type: PieceType;
  rotation: 0 | 90 | 180 | 270;
  flipped: boolean;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onSelect?: () => void;
  onDragStart?: (pieceId: string, e: React.MouseEvent | React.TouchEvent) => void;
  onDragEnd?: () => void;
}

export const DraggablePiece = ({
  pieceId,
  type,
  rotation,
  flipped,
  size = 'md',
  selected = false,
  onSelect,
  onDragStart,
}: DraggablePieceProps) => {
  const definition = PIECE_DEFINITIONS[type];
  if (!definition) return null;

  // 形状を変換
  const shape = getTransformedShape(type, rotation, flipped);

  // バウンディングボックス
  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;

  // セルサイズ
  const cellSize = { sm: 'w-3 h-3', md: 'w-5 h-5', lg: 'w-7 h-7' }[size];

  // 角丸
  const cellRounded = { sm: 'rounded-[1px]', md: 'rounded-[2px]', lg: 'rounded-sm' }[size];

  // グリッドを生成
  const grid: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));

  shape.forEach(([x, y]) => {
    if (y >= 0 && y < height && x >= 0 && x < width) {
      grid[y][x] = true;
    }
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart?.(pieceId, e);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    onDragStart?.(pieceId, e);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      className={`inline-block p-1 rounded transition-all cursor-grab active:cursor-grabbing select-none ${
        selected ? 'ring-2 ring-white bg-white/20' : 'hover:bg-white/10'
      }`}
      style={{ touchAction: 'none' }}
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

// ドラッグ中のピース表示（カーソル追従用）
interface DragOverlayProps {
  type: PieceType;
  rotation: 0 | 90 | 180 | 270;
  flipped: boolean;
  position: { x: number; y: number };
  cellSize?: number;
}

export const DragOverlay = ({
  type,
  rotation,
  flipped,
  position,
  cellSize = 24,
}: DragOverlayProps) => {
  const definition = PIECE_DEFINITIONS[type];
  if (!definition) return null;

  const shape = getTransformedShape(type, rotation, flipped);

  // バウンディングボックス
  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;

  // グリッドを生成
  const grid: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));

  shape.forEach(([x, y]) => {
    if (y >= 0 && y < height && x >= 0 && x < width) {
      grid[y][x] = true;
    }
  });

  // ピースの中心をカーソルに合わせる（gap-pxの1pxも考慮）
  const gap = 1;
  const totalWidth = width * cellSize + (width - 1) * gap;
  const totalHeight = height * cellSize + (height - 1) * gap;
  const offsetX = totalWidth / 2;
  const offsetY = totalHeight / 2;

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: position.x - offsetX,
        top: position.y - offsetY,
      }}
    >
      <div className="flex flex-col gap-px opacity-80">
        {grid.map((row, y) => (
          <div key={y} className="flex gap-px">
            {row.map((filled, x) => (
              <div
                key={x}
                className={`rounded-[2px] ${filled ? definition.color : 'bg-transparent'}`}
                style={{ width: cellSize, height: cellSize }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
