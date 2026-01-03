import { HIRAGANA_ROWS } from '../lib/hiragana';

interface HiraganaBoardProps {
  usedCharacters: string[];
  disabled: boolean;
  onSelectCharacter: (char: string) => void;
  highlightedChar?: string;
}

export const HiraganaBoard = ({
  usedCharacters,
  disabled,
  onSelectCharacter,
  highlightedChar,
}: HiraganaBoardProps) => {
  return (
    <div className="bg-white/10 rounded-xl p-2 sm:p-4">
      <div className="grid gap-0.5 sm:gap-1">
        {HIRAGANA_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-0.5 sm:gap-1">
            {row.map((char, colIndex) => {
              if (char === null) {
                // 空白セル
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="w-7 h-7 sm:w-10 sm:h-10"
                  />
                );
              }

              const isUsed = usedCharacters.includes(char);
              const isHighlighted = char === highlightedChar;
              const isDisabled = disabled || isUsed;

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => onSelectCharacter(char)}
                  disabled={isDisabled}
                  className={`
                    w-7 h-7 sm:w-10 sm:h-10 rounded sm:rounded-lg font-bold text-sm sm:text-lg
                    transition-all duration-150
                    ${isHighlighted
                      ? 'bg-yellow-400 text-black scale-110 ring-2 ring-yellow-300 animate-pulse'
                      : isUsed
                        ? 'bg-gray-600/50 text-gray-500 cursor-not-allowed'
                        : isDisabled
                          ? 'bg-white/10 text-white/40 cursor-not-allowed'
                          : 'bg-white/20 text-white hover:bg-pink-500 hover:scale-105 active:scale-95'
                    }
                  `}
                >
                  {isUsed ? '×' : char}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
