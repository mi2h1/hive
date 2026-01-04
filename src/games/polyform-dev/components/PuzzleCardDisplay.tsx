import { PieceDisplay } from './PieceDisplay';
import type { PuzzleCard, PlacedPiece } from '../types/game';
import { PIECE_DEFINITIONS } from '../data/pieces';
import { getTransformedShape } from './PieceDisplay';

interface PuzzleCardDisplayProps {
  card: PuzzleCard;
  placedPieces?: PlacedPiece[];
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
  showReward?: boolean;
}

export const PuzzleCardDisplay = ({
  card,
  placedPieces = [],
  size = 'md',
  onClick,
  selected = false,
  showReward = true,
}: PuzzleCardDisplayProps) => {
  // セルサイズ
  const cellSize = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
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
      const key = `${x},${y}`;
      placedCells.set(key, { color: definition.color, pieceId: placed.pieceId });
    });
  });

  // 埋まっているマス数を計算
  const totalCells = card.shape.flat().filter(Boolean).length;
  const filledCells = placedCells.size;
  const isComplete = filledCells === totalCells;

  return (
    <div
      onClick={onClick}
      className={`inline-block rounded-lg p-2 transition-all ${
        card.type === 'white'
          ? 'bg-slate-100 border-2 border-slate-300'
          : 'bg-slate-800 border-2 border-slate-600'
      } ${onClick ? 'cursor-pointer hover:scale-105' : ''} ${
        selected ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-900' : ''
      } ${isComplete ? 'ring-2 ring-yellow-400' : ''}`}
    >
      {/* カード情報ヘッダー */}
      <div className="flex items-center justify-between mb-1 gap-2">
        {/* ポイント */}
        <div
          className={`text-xs font-bold px-1.5 py-0.5 rounded ${
            card.type === 'white'
              ? 'bg-slate-700 text-white'
              : 'bg-yellow-500 text-black'
          }`}
        >
          {card.points}pt
        </div>

        {/* 報酬ピース */}
        {showReward && card.rewardPieceType && (
          <div className="flex items-center gap-1">
            <span
              className={`text-xs ${
                card.type === 'white' ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              +
            </span>
            <PieceDisplay type={card.rewardPieceType} size="sm" />
          </div>
        )}
      </div>

      {/* 5x5グリッド */}
      <div className="flex flex-col gap-0.5">
        {card.shape.map((row, y) => (
          <div key={y} className="flex gap-0.5">
            {row.map((isActive, x) => {
              const key = `${x},${y}`;
              const placed = placedCells.get(key);

              if (!isActive) {
                // 枠外は「・」で表示
                return (
                  <div
                    key={x}
                    className={`${cellSize} flex items-center justify-center ${
                      card.type === 'white' ? 'bg-slate-100 text-slate-300' : 'bg-slate-800 text-slate-600'
                    }`}
                  >
                    <div className="w-1 h-1 rounded-full bg-current" />
                  </div>
                );
              }

              if (placed) {
                // ピースが配置済み
                return (
                  <div
                    key={x}
                    className={`${cellSize} ${placed.color} rounded-sm border border-black/20`}
                  />
                );
              }

              // 空のマス
              return (
                <div
                  key={x}
                  className={`${cellSize} rounded-sm border-2 border-dashed ${
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

      {/* 進捗表示 */}
      {placedPieces.length > 0 && (
        <div
          className={`text-xs text-center mt-1 ${
            card.type === 'white' ? 'text-slate-600' : 'text-slate-400'
          }`}
        >
          {filledCells}/{totalCells}
        </div>
      )}
    </div>
  );
};
