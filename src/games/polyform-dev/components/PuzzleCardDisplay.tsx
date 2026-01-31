import { PieceDisplay } from './PieceDisplay';
import type { PuzzleCard, PlacedPiece } from '../types/game';
import { PIECE_DEFINITIONS } from '../data/pieces';
import { getTransformedShape } from './PieceDisplay';

// カードサイズ定義（7段階）
export type CardSizeType = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export const CARD_SIZES: Record<CardSizeType, { width: number; height: number; cell: string; cellPx: number }> = {
  xxs: { width: 100, height: 125, cell: 'w-4 h-4', cellPx: 16 },
  xs: { width: 115, height: 144, cell: 'w-[18px] h-[18px]', cellPx: 18 },
  sm: { width: 130, height: 163, cell: 'w-[21px] h-[21px]', cellPx: 21 },
  md: { width: 150, height: 188, cell: 'w-6 h-6', cellPx: 24 },
  lg: { width: 170, height: 213, cell: 'w-7 h-7', cellPx: 28 },
  xl: { width: 195, height: 244, cell: 'w-8 h-8', cellPx: 32 },
  xxl: { width: 225, height: 281, cell: 'w-9 h-9', cellPx: 36 },
};

interface PuzzleCardDisplayProps {
  card: PuzzleCard;
  placedPieces?: PlacedPiece[];
  size?: CardSizeType;
  onClick?: () => void;
  selected?: boolean;
  showReward?: boolean;
  compact?: boolean; // パディングを減らしたコンパクト表示
}

export const PuzzleCardDisplay = ({
  card,
  placedPieces = [],
  size = 'md',
  onClick,
  selected = false,
  showReward = true,
  compact = false,
}: PuzzleCardDisplayProps) => {
  const sizeConfig = CARD_SIZES[size];
  const cellSize = sizeConfig.cell;

  // 配置済みピースのセル情報を計算
  const placedCells: Map<string, { color: string; pieceId: string }> = new Map();
  placedPieces.forEach((placed) => {
    const definition = PIECE_DEFINITIONS[placed.type];
    if (!definition) return;

    const shape = getTransformedShape(placed.type, placed.rotation, placed.flipped ?? false);
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
    ? '/hive/images/cards/card_pf_front_w.png'
    : '/hive/images/cards/card_pf_front_b.png';

  return (
    <div
      onClick={onClick}
      className={`flex flex-col rounded-lg ${compact ? 'p-1.5' : 'p-4'} transition-all bg-cover bg-center ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      } ${selected ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-900' : ''} ${
        isComplete ? 'ring-2 ring-yellow-400' : ''
      }`}
      style={{
        width: sizeConfig.width,
        height: sizeConfig.height,
        backgroundImage: `url(${cardImage})`
      }}
    >
      {/* カード情報ヘッダー（固定高さ） */}
      <div className="flex items-center justify-between h-6 mb-2">
        {/* ポイント */}
        <div
          className={`font-bold ${
            compact ? 'text-base ml-1' : 'text-sm ml-1'
          } ${
            card.type === 'white'
              ? 'text-slate-700'
              : 'text-yellow-500'
          }`}
        >
          {card.points}
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
