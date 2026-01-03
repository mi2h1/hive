import { Skull, Target } from 'lucide-react';
import type { Player, LocalPlayerState } from '../types/game';

// 他プレイヤーに見せる固定文字数（文字数を隠すため）
const DISPLAY_LENGTH = 7;

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
  type DisplayChar = { char: string; type: 'revealed' | 'hidden' | 'dummy' | 'self' | 'self-revealed' };
  const displayChars: DisplayChar[] = [];

  if (isMe && localState) {
    // 自分の場合は実際の文字数を表示
    for (let i = 0; i < localState.normalizedWord.length; i++) {
      const isRevealed = revealedPositions[i];
      displayChars.push({
        char: localState.normalizedWord[i],
        type: isRevealed ? 'self-revealed' : 'self',
      });
    }
  } else {
    // 他プレイヤーの場合は常に7文字表示
    for (let i = 0; i < DISPLAY_LENGTH; i++) {
      if (i < wordLength) {
        // 実際の言葉の範囲内
        if (revealedPositions[i] && revealedCharacters[i]) {
          displayChars.push({ char: revealedCharacters[i], type: 'revealed' });
        } else {
          displayChars.push({ char: '?', type: 'hidden' });
        }
      } else {
        // ダミー文字（実際の言葉より後ろ）
        displayChars.push({ char: '-', type: 'dummy' });
      }
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
      <div className="flex gap-1">
        {displayChars.map((item, i) => {
          // タイプに応じたスタイル
          let bgClass = 'bg-white/20 text-white';
          if (isEliminated) {
            bgClass = 'bg-gray-600/50 text-gray-400';
          } else if (item.type === 'revealed' || item.type === 'self-revealed') {
            bgClass = 'bg-red-500/50 text-white';
          } else if (item.type === 'dummy') {
            bgClass = 'bg-white/5 text-white/30';
          }

          return (
            <div
              key={i}
              className={`
                w-8 h-8 flex items-center justify-center
                rounded font-bold text-base
                ${bgClass}
              `}
            >
              {item.char}
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
