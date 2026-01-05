// カード一覧コンポーネント（カウンティング用）

import { CARD_REFERENCE } from '../lib/cards';

// 0より上のカード
const CARDS_ABOVE_ZERO = [
  { label: '20', displayValue: '20', count: 1, bgColor: 'bg-red-700', textColor: 'text-white' },
  { label: '15', displayValue: '15', count: 2, bgColor: 'bg-orange-400', textColor: 'text-white' },
  { label: '10', displayValue: '10', count: 3, bgColor: 'bg-orange-400', textColor: 'text-white' },
  { label: '5', displayValue: '5', count: 4, bgColor: 'bg-amber-100', textColor: 'text-slate-800' },
  { label: '4', displayValue: '4', count: 4, bgColor: 'bg-amber-100', textColor: 'text-slate-800' },
  { label: '3', displayValue: '3', count: 4, bgColor: 'bg-amber-100', textColor: 'text-slate-800' },
  { label: '2', displayValue: '2', count: 4, bgColor: 'bg-amber-100', textColor: 'text-slate-800' },
  { label: '1', displayValue: '1', count: 4, bgColor: 'bg-amber-100', textColor: 'text-slate-800' },
];

// 0より下のカード
const CARDS_BELOW_ZERO = [
  { label: '-5', displayValue: '-5', count: 2, bgColor: 'bg-cyan-200', textColor: 'text-slate-800' },
  { label: '-10', displayValue: '-10', count: 1, bgColor: 'bg-cyan-200', textColor: 'text-slate-800' },
];

// 特殊カード
const SPECIAL_CARDS = [
  { label: '×2', displayValue: '×2', count: 1, bgColor: 'bg-yellow-400', textColor: 'text-rose-600' },
  { label: 'MAX→0', displayValue: 'M→0', count: 1, bgColor: 'bg-yellow-400', textColor: 'text-rose-600' },
  { label: '?', displayValue: '?', count: 1, bgColor: 'bg-yellow-400', textColor: 'text-rose-600' },
];

// カード行をレンダリングするヘルパー
const CardRow = ({ card }: { card: typeof CARDS_ABOVE_ZERO[0] }) => (
  <div
    className={`flex items-center justify-center gap-4 py-0.5 px-2 rounded ${card.bgColor}`}
  >
    {Array.from({ length: card.count }).map((_, i) => (
      <span
        key={i}
        className={`text-xs font-bold ${card.textColor}`}
      >
        {card.displayValue}
      </span>
    ))}
  </div>
);

export const CardReference = () => {
  return (
    <div className="bg-slate-800/80 rounded-xl p-3 h-fit">
      <div className="text-slate-400 text-xs mb-2 text-center">
        カード一覧（{CARD_REFERENCE.totalCards}枚）
      </div>
      <div className="space-y-1">
        {/* 0より上のカード */}
        {CARDS_ABOVE_ZERO.map((card) => (
          <CardRow key={card.label} card={card} />
        ))}

        {/* 0の行（通常0 + 特殊0を2カラムで表示） */}
        <div className="flex gap-1">
          {/* 通常0: 3枚 */}
          <div className="flex-1 flex items-center justify-center gap-4 py-0.5 px-2 rounded bg-green-200">
            <span className="text-xs font-bold text-slate-800">0</span>
            <span className="text-xs font-bold text-slate-800">0</span>
            <span className="text-xs font-bold text-slate-800">0</span>
          </div>
          {/* 特殊0: 黄色の円に黒文字 */}
          <div className="w-8 flex items-center justify-center py-0.5 rounded bg-black">
            <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
              <span className="text-xs font-bold text-black">0</span>
            </div>
          </div>
        </div>

        {/* 0より下のカード */}
        {CARDS_BELOW_ZERO.map((card) => (
          <CardRow key={card.label} card={card} />
        ))}

        {/* 特殊カード */}
        {SPECIAL_CARDS.map((card) => (
          <CardRow key={card.label} card={card} />
        ))}
      </div>
    </div>
  );
};
