import { Skull, Target } from 'lucide-react';
import type { Player, LocalPlayerState } from '../types/game';

// 他プレイヤーに見せる固定文字数（文字数を隠すため）
const DISPLAY_LENGTH = 7;

interface PlayerWordDisplayProps {
  player: Player;
  localState?: LocalPlayerState; // 自分の場合のみ
  isCurrentTurn: boolean;
  isMe: boolean;
  revealingPositions?: number[]; // フリップアニメーション中の位置
  revealingCharacters?: string[]; // フリップで公開される文字
}

export const PlayerWordDisplay = ({
  player,
  localState,
  isCurrentTurn,
  isMe,
  revealingPositions,
  revealingCharacters,
}: PlayerWordDisplayProps) => {
  const { name, wordLength, revealedPositions, revealedCharacters, isEliminated } = player;

  // 表示する文字を生成
  type DisplayChar = { char: string; type: 'revealed' | 'hidden' | 'dummy' | 'self' | 'self-revealed' };
  const displayChars: DisplayChar[] = [];

  if (isMe && localState) {
    // 自分の場合も7枚表示
    for (let i = 0; i < DISPLAY_LENGTH; i++) {
      if (i < localState.normalizedWord.length) {
        const isRevealed = revealedPositions[i];
        displayChars.push({
          char: localState.normalizedWord[i],
          type: isRevealed ? 'self-revealed' : 'self',
        });
      } else {
        // ダミー文字
        displayChars.push({ char: '-', type: 'dummy' });
      }
    }
  } else {
    // 他プレイヤーの場合は常に7文字表示（文字数を隠すため）
    for (let i = 0; i < DISPLAY_LENGTH; i++) {
      if (i < wordLength) {
        // 実際の言葉の範囲内
        if (revealedPositions[i] && revealedCharacters[i]) {
          // 当てられた文字は公開
          displayChars.push({ char: revealedCharacters[i], type: 'revealed' });
        } else {
          // 未公開は「?」
          displayChars.push({ char: '?', type: 'hidden' });
        }
      } else {
        // ダミー部分も「?」で文字数を隠す（脱落後は「-」）
        if (isEliminated) {
          displayChars.push({ char: '-', type: 'dummy' });
        } else {
          displayChars.push({ char: '?', type: 'hidden' });
        }
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
          const revealingIndex = revealingPositions?.indexOf(i) ?? -1;
          const isRevealing = revealingIndex !== -1;
          const revealedChar = isRevealing && revealingCharacters ? revealingCharacters[revealingIndex] : null;

          // タイプに応じたスタイル
          let bgClass = 'bg-white/20 text-white';
          let revealedBgClass = 'bg-red-500/50 text-white';
          if (isEliminated) {
            bgClass = 'bg-gray-600/50 text-gray-400';
            revealedBgClass = 'bg-gray-600/50 text-gray-400';
          } else if (item.type === 'revealed' || item.type === 'self-revealed') {
            bgClass = 'bg-red-500/50 text-white';
          } else if (item.type === 'dummy') {
            bgClass = 'bg-white/5 text-white/30';
          }

          // フリップ中のカードは3D構造で表示
          if (isRevealing && revealedChar) {
            return (
              <div
                key={i}
                className="w-8 h-8 relative"
                style={{ perspective: '200px' }}
              >
                <div
                  className="w-full h-full relative"
                  style={{
                    transformStyle: 'preserve-3d',
                    animation: 'cardFlip 0.6s ease-in-out forwards',
                  }}
                >
                  {/* 表面（?） */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center rounded font-bold text-base ${bgClass}`}
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    {item.char}
                  </div>
                  {/* 裏面（公開される文字） */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center rounded font-bold text-base ${revealedBgClass}`}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    {revealedChar}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={i}
              className={`w-8 h-8 flex items-center justify-center rounded font-bold text-base ${bgClass}`}
            >
              {item.char}
            </div>
          );
        })}
      </div>

      {/* フリップアニメーション用CSS */}
      <style>{`
        @keyframes cardFlip {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(180deg); }
        }
      `}</style>

      {/* 脱落時のメッセージ */}
      {isEliminated && player.eliminatedAt && (
        <p className="text-gray-400 text-sm mt-2">
          {player.eliminatedAt}番目に脱落
        </p>
      )}
    </div>
  );
};
