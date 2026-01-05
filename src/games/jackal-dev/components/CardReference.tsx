// カード一覧コンポーネント（カウンティング用）

import { CARD_REFERENCE } from '../lib/cards';

// 表示用のカードデータ（高い数字から順に）
const DISPLAY_CARDS: {
  label: string;
  displayValue: string;
  count: number;
  bgColor: string;
  textColor: string;
  type?: 'normal' | 'shuffle_zero' | 'special';
}[] = [
  { label: '20', displayValue: '20', count: 1, bgColor: 'bg-red-700', textColor: 'text-white' },
  { label: '15', displayValue: '15', count: 2, bgColor: 'bg-orange-400', textColor: 'text-white' },
  { label: '10', displayValue: '10', count: 3, bgColor: 'bg-orange-400', textColor: 'text-white' },
  { label: '5', displayValue: '5', count: 4, bgColor: 'bg-amber-100', textColor: 'text-slate-800' },
  { label: '4', displayValue: '4', count: 4, bgColor: 'bg-amber-100', textColor: 'text-slate-800' },
  { label: '3', displayValue: '3', count: 4, bgColor: 'bg-amber-100', textColor: 'text-slate-800' },
  { label: '2', displayValue: '2', count: 4, bgColor: 'bg-amber-100', textColor: 'text-slate-800' },
  { label: '1', displayValue: '1', count: 4, bgColor: 'bg-amber-100', textColor: 'text-slate-800' },
  { label: '0', displayValue: '0', count: 3, bgColor: 'bg-green-200', textColor: 'text-slate-800' },
  { label: '0⟳', displayValue: '0', count: 1, bgColor: 'bg-black', textColor: 'text-black', type: 'shuffle_zero' },
  { label: '-5', displayValue: '-5', count: 2, bgColor: 'bg-cyan-200', textColor: 'text-slate-800' },
  { label: '-10', displayValue: '-10', count: 1, bgColor: 'bg-cyan-200', textColor: 'text-slate-800' },
  // 特殊カード
  { label: '×2', displayValue: '×2', count: 1, bgColor: 'bg-yellow-400', textColor: 'text-rose-600', type: 'special' },
  { label: 'MAX→0', displayValue: 'M→0', count: 1, bgColor: 'bg-yellow-400', textColor: 'text-rose-600', type: 'special' },
  { label: '?', displayValue: '?', count: 1, bgColor: 'bg-yellow-400', textColor: 'text-rose-600', type: 'special' },
];

export const CardReference = () => {
  return (
    <div className="bg-slate-800/80 rounded-xl p-3 h-fit">
      <div className="text-slate-400 text-xs mb-2 text-center">
        カード一覧（{CARD_REFERENCE.totalCards}枚）
      </div>
      <div className="space-y-1">
        {DISPLAY_CARDS.map((card) => (
          <div
            key={card.label}
            className={`flex items-center justify-center gap-1 py-0.5 px-2 rounded ${card.bgColor}`}
          >
            {/* 枚数分の数字を表示 */}
            {card.type === 'shuffle_zero' ? (
              // 特殊0: 黄色の円に黒文字
              <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                <span className="text-xs font-bold text-black">0</span>
              </div>
            ) : (
              Array.from({ length: card.count }).map((_, i) => (
                <span
                  key={i}
                  className={`text-xs font-bold ${card.textColor}`}
                >
                  {card.displayValue}
                </span>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
