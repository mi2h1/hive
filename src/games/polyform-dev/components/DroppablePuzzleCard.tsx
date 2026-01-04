import { useRef, useCallback } from 'react';
import { PieceDisplay } from './PieceDisplay';
import { getTransformedShape } from './PieceDisplay';
import type { PuzzleCard, PlacedPiece, PieceType } from '../types/game';
import { PIECE_DEFINITIONS } from '../data/pieces';

interface DroppablePuzzleCardProps {
  card: PuzzleCard;
  placedPieces?: PlacedPiece[];
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  completed?: boolean; // 完成ハイライト
  // ドラッグ中のピース情報
  draggingPiece?: {
    type: PieceType;
    rotation: 0 | 90 | 180 | 270;
    flipped: boolean;
  } | null;
  hoverPosition?: { x: number; y: number } | null;
  onDrop?: (position: { x: number; y: number }) => void;
  onHover?: (position: { x: number; y: number } | null) => void;
  onClick?: () => void;
}

// 配置が有効かどうかをチェック
export function isValidPlacement(
  card: PuzzleCard,
  placedPieces: PlacedPiece[],
  pieceType: PieceType,
  rotation: 0 | 90 | 180 | 270,
  flipped: boolean,
  position: { x: number; y: number }
): boolean {
  const shape = getTransformedShape(pieceType, rotation, flipped);

  // 配置済みピースのセルを計算
  const occupiedCells = new Set<string>();
  placedPieces.forEach((placed) => {
    const placedShape = getTransformedShape(placed.type, placed.rotation, false);
    placedShape.forEach(([dx, dy]) => {
      occupiedCells.add(`${placed.position.x + dx},${placed.position.y + dy}`);
    });
  });

  // 新しいピースの各セルをチェック
  for (const [dx, dy] of shape) {
    const x = position.x + dx;
    const y = position.y + dy;

    // 範囲外チェック
    if (x < 0 || x >= 5 || y < 0 || y >= 5) {
      return false;
    }

    // パズルの有効マスかチェック
    if (!card.shape[y][x]) {
      return false;
    }

    // 既に配置済みのセルかチェック
    if (occupiedCells.has(`${x},${y}`)) {
      return false;
    }
  }

  return true;
}

export const DroppablePuzzleCard = ({
  card,
  placedPieces = [],
  size = 'md',
  selected = false,
  completed = false,
  draggingPiece,
  hoverPosition,
  onDrop,
  onHover,
  onClick,
}: DroppablePuzzleCardProps) => {
  const gridRef = useRef<HTMLDivElement>(null);

  // セルサイズ（px）- PuzzleCardDisplayと同じ
  const cellPx = { sm: 24, md: 28, lg: 36 }[size];
  const cellSize = { sm: 'w-6 h-6', md: 'w-7 h-7', lg: 'w-9 h-9' }[size];

  // カード全体のサイズ - PuzzleCardDisplayと同じ
  const cardSize = {
    sm: 'w-[140px] h-[175px]',
    md: 'w-[180px] h-[225px]',
    lg: 'w-[230px] h-[285px]',
  }[size];

  // 配置済みピースのセル情報を計算
  const placedCells: Map<string, { color: string; pieceId: string }> = new Map();
  placedPieces.forEach((placed) => {
    const definition = PIECE_DEFINITIONS[placed.type];
    if (!definition) return;

    const shape = getTransformedShape(placed.type, placed.rotation, false);
    shape.forEach(([dx, dy]) => {
      const x = placed.position.x + dx;
      const y = placed.position.y + dy;
      placedCells.set(`${x},${y}`, { color: definition.color, pieceId: placed.pieceId });
    });
  });

  // ホバー中のプレビューセルを計算
  const previewCells = new Set<string>();
  let isValidHover = false;
  if (draggingPiece && hoverPosition) {
    isValidHover = isValidPlacement(
      card,
      placedPieces,
      draggingPiece.type,
      draggingPiece.rotation,
      draggingPiece.flipped,
      hoverPosition
    );

    const shape = getTransformedShape(
      draggingPiece.type,
      draggingPiece.rotation,
      draggingPiece.flipped
    );
    shape.forEach(([dx, dy]) => {
      previewCells.add(`${hoverPosition.x + dx},${hoverPosition.y + dy}`);
    });
  }

  // マウス位置からグリッド座標を計算
  const getGridPosition = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      if (!gridRef.current) return null;

      const rect = gridRef.current.getBoundingClientRect();
      const x = Math.floor((clientX - rect.left) / (cellPx + 2)); // gap考慮
      const y = Math.floor((clientY - rect.top) / (cellPx + 2));

      if (x < 0 || x >= 5 || y < 0 || y >= 5) return null;
      return { x, y };
    },
    [cellPx]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingPiece || !onHover) return;
      const pos = getGridPosition(e.clientX, e.clientY);
      onHover(pos);
    },
    [draggingPiece, onHover, getGridPosition]
  );

  const handleMouseLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  const handleMouseUp = useCallback(() => {
    if (hoverPosition && isValidHover && onDrop) {
      onDrop(hoverPosition);
    }
  }, [hoverPosition, isValidHover, onDrop]);

  // 埋まっているマス数を計算
  const totalCells = card.shape.flat().filter(Boolean).length;
  const filledCells = placedCells.size;
  const isComplete = filledCells === totalCells;

  // カード画像パス
  const cardImage = card.type === 'white'
    ? '/boards/images/cards/card_pf_front_w.png'
    : '/boards/images/cards/card_pf_front_b.png';

  return (
    <div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      className={`${cardSize} flex flex-col rounded-lg p-3 transition-all bg-cover bg-center ${
        selected ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-900' : ''
      } ${completed ? 'ring-4 ring-green-400 shadow-lg shadow-green-400/50' : isComplete ? 'ring-2 ring-yellow-400' : ''} ${
        draggingPiece ? 'cursor-crosshair' : ''
      }`}
      style={{ backgroundImage: `url(${cardImage})` }}
    >
      {/* カード情報ヘッダー（固定高さ） */}
      <div className="flex items-center justify-between h-6 mb-2">
        <div
          className={`text-xs font-bold px-1.5 py-0.5 rounded ${
            card.type === 'white' ? 'bg-slate-700 text-white' : 'bg-yellow-500 text-black'
          }`}
        >
          {card.points}pt
        </div>
        {card.rewardPieceType && (
          <PieceDisplay type={card.rewardPieceType} size="sm" />
        )}
      </div>

      {/* 5x5グリッド（下寄せ） */}
      <div className="flex-1 flex items-end justify-center">
        <div ref={gridRef} className={`flex flex-col gap-px p-0.5 rounded border ${
          card.type === 'white' ? 'border-slate-400' : 'border-slate-500'
        }`}>
        {card.shape.map((row, y) => (
          <div key={y} className="flex gap-px">
            {row.map((isActive, x) => {
              const key = `${x},${y}`;
              const placed = placedCells.get(key);
              const isPreview = previewCells.has(key);

              if (!isActive) {
                // 枠外は「・」で表示
                return (
                  <div
                    key={x}
                    className={`${cellSize} flex items-center justify-center`}
                  >
                    <div className={`w-1 h-1 rounded-full ${
                      card.type === 'white' ? 'bg-slate-500' : 'bg-slate-300'
                    }`} />
                  </div>
                );
              }

              if (placed) {
                return (
                  <div
                    key={x}
                    className={`${cellSize} ${placed.color} rounded-[2px] border border-black/20`}
                  />
                );
              }

              if (isPreview) {
                const previewColor = draggingPiece
                  ? PIECE_DEFINITIONS[draggingPiece.type]?.color
                  : '';
                return (
                  <div
                    key={x}
                    className={`${cellSize} rounded-[2px] ${
                      isValidHover
                        ? `${previewColor} opacity-70 border border-white/50 shadow-sm`
                        : 'bg-red-500/50 border border-red-400'
                    }`}
                  />
                );
              }

              return (
                <div
                  key={x}
                  className={`${cellSize} rounded-[2px] border-2 border-dashed ${
                    card.type === 'white'
                      ? 'bg-white border-slate-400'
                      : 'bg-slate-700 border-slate-500'
                  }`}
                />
              );
            })}
          </div>
        ))}
        </div>
      </div>
    </div>
  );
};
