import { Skull, Target } from 'lucide-react';
import type { Player, LocalPlayerState } from '../types/game';

interface PlayerWordDisplayProps {
  player: Player;
  localState?: LocalPlayerState; // 自分の場合のみ
  isCurrentTurn: boolean;
  isMe: boolean;
}

export const PlayerWordDisplay = ({
  player,
  localState,
  isCurrentTurn,
  isMe,
}: PlayerWordDisplayProps) => {
  const { name, wordLength, revealedPositions, revealedCharacters, isEliminated } = player;

  // 表示する文字を生成
  const displayChars: string[] = [];
  for (let i = 0; i < wordLength; i++) {
    if (isMe && localState) {
      // 自分の場合は全文字表示
      displayChars.push(localState.normalizedWord[i]);
    } else if (revealedPositions[i] && revealedCharacters[i]) {
      // 公開された文字
      displayChars.push(revealedCharacters[i]);
    } else {
      // 未公開
      displayChars.push('?');
    }
  }

  return (
    <div
      className={`
        rounded-xl p-4 transition-all
        ${isEliminated
          ? 'bg-gray-600/30 opacity-60'
          : isCurrentTurn
            ? 'bg-pink-500/30 ring-2 ring-pink-400'
            : 'bg-white/10'
        }
      `}
    >
      {/* プレイヤー名 */}
      <div className="flex items-center gap-2 mb-3">
        {isCurrentTurn && !isEliminated && (
          <Target className="w-4 h-4 text-pink-400" />
        )}
        {isEliminated && (
          <Skull className="w-4 h-4 text-gray-400" />
        )}
        <span className={`font-bold ${isEliminated ? 'text-gray-400' : 'text-white'}`}>
          {name}
        </span>
        {isMe && (
          <span className="text-white/40 text-sm">(あなた)</span>
        )}
        {isCurrentTurn && !isEliminated && (
          <span className="text-pink-300 text-sm ml-auto">攻撃中</span>
        )}
      </div>

      {/* 文字表示 */}
      <div className="flex gap-1 flex-wrap">
        {displayChars.map((char, i) => {
          const isRevealed = revealedPositions[i] || isMe;
          return (
            <div
              key={i}
              className={`
                w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center
                rounded font-bold text-lg
                ${isEliminated
                  ? 'bg-gray-600/50 text-gray-400'
                  : isRevealed
                    ? 'bg-pink-500/50 text-white'
                    : 'bg-white/20 text-white/60'
                }
              `}
            >
              {char}
            </div>
          );
        })}
      </div>

      {/* 脱落時のメッセージ */}
      {isEliminated && player.eliminatedAt && (
        <p className="text-gray-400 text-sm mt-2">
          {player.eliminatedAt}番目に脱落
        </p>
      )}
    </div>
  );
};
