// 宣言入力パネルコンポーネント

interface DeclarationPanelProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  minDeclareValue: number;
  currentDeclaredValue: number | null;
  canCallJackal: boolean;
  isMyTurn: boolean;
  isValidInput: boolean;
  currentPlayerName?: string;
  phase: 'round_start' | 'declaring';
  onDeclare: () => void;
  onCallJackal: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export const DeclarationPanel = ({
  inputValue,
  setInputValue,
  minDeclareValue,
  currentDeclaredValue,
  canCallJackal,
  isMyTurn,
  isValidInput,
  currentPlayerName,
  phase,
  onDeclare,
  onCallJackal,
  onKeyDown,
}: DeclarationPanelProps) => {
  const handleDecrement = () => {
    const current = parseInt(inputValue, 10) || minDeclareValue;
    if (current > minDeclareValue) {
      setInputValue(String(current - 1));
    }
  };

  const handleIncrement = () => {
    const current = parseInt(inputValue, 10) || minDeclareValue - 1;
    setInputValue(String(current + 1));
  };

  if (phase === 'declaring' && isMyTurn) {
    return (
      <div className="bg-slate-800/80 rounded-xl p-4 flex flex-col h-full">
        {/* 数字入力 */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-slate-400 text-xs mb-2 text-center">
            {currentDeclaredValue !== null
              ? `${minDeclareValue}以上を宣言`
              : '数字を宣言'}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDecrement}
              disabled={!inputValue || parseInt(inputValue, 10) <= minDeclareValue}
              className="w-10 h-10 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-bold text-xl transition-all flex-shrink-0"
            >
              −
            </button>
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={String(minDeclareValue)}
              min={minDeclareValue}
              className="flex-1 min-w-0 px-2 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-xl text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={handleIncrement}
              className="w-10 h-10 bg-slate-600 hover:bg-slate-500 rounded-lg text-white font-bold text-xl transition-all flex-shrink-0"
            >
              +
            </button>
          </div>
        </div>

        {/* 宣言ボタン / ジャッカルボタン */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={onDeclare}
            disabled={!isValidInput}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 rounded-lg text-white font-bold transition-all text-sm"
          >
            宣言
          </button>
          {canCallJackal && (
            <button
              onClick={onCallJackal}
              className="flex-1 py-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-lg text-white font-bold transition-all text-sm"
            >
              ジャッカル！
            </button>
          )}
        </div>
      </div>
    );
  }

  // 自分のターンでない場合
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 flex items-center justify-center h-full">
      <div className="text-slate-500 text-sm text-center whitespace-pre-line">
        {isMyTurn ? 'ラウンド開始中...' : `${currentPlayerName}の\nターンです`}
      </div>
    </div>
  );
};
