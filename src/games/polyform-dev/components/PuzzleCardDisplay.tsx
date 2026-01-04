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
  // セルサイズ（少し大きめに）
  const cellSize = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  }[size];

  // カード全体のサイズ
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
      const key = `${x},${y}`;
      placedCells.set(key, { color: definition.color, pieceId: placed.pieceId });
    });
  });

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
      className={`${cardSize} flex flex-col rounded-lg p-4 transition-all bg-cover bg-center ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      } ${selected ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-900' : ''} ${
        isComplete ? 'ring-2 ring-yellow-400' : ''
      }`}
      style={{ backgroundImage: `url(${cardImage})` }}
    >
      {/* カード情報ヘッダー（固定高さ） */}
      <div className="flex items-center justify-between h-6 mb-2">
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
        <div className="h-5 flex items-center">
          {showReward && card.rewardPieceType && (
            <PieceDisplay type={card.rewardPieceType} size="sm" />
          )}
        </div>
      </div>

      {/* 5x5グリッド（下寄せ） */}
      <div className="flex-1 flex items-end justify-center">
        <div className="flex flex-col gap-px">
          {card.shape.map((row, y) => (
            <div key={y} className="flex gap-px">
              {row.map((isActive, x) => {
                const key = `${x},${y}`;
                const placed = placedCells.get(key);

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
                  // ピースが配置済み
                  return (
                    <div
                      key={x}
                      className={`${cellSize} ${placed.color} rounded-[2px] border border-black/20`}
                    />
                  );
                }

                // 空のマス
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
