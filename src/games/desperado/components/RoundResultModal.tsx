import { useState, useEffect } from 'react';
import { Heart, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';
import type { GameState, DiceResult } from '../types/game';
import { getRollRank, getRollDisplayName, findWeakestPlayers } from '../lib/dice';

interface RoundResultModalProps {
  gameState: GameState;
  playerId: string;
  isHost: boolean;
  onNextRound: () => void;
}

// アニメーションのステージ
type AnimationStage = 'ranking' | 'loser' | 'damage' | 'done';

// サイコロの目に対応するアイコン
const DiceIcon = ({ value, className }: { value: number; className?: string }) => {
  const icons = {
    1: Dice1,
    2: Dice2,
    3: Dice3,
    4: Dice4,
    5: Dice5,
    6: Dice6,
  };
  const Icon = icons[value as keyof typeof icons] || Dice1;
  return <Icon className={className} />;
};

export const RoundResultModal = ({
  gameState,
  playerId,
  isHost,
  onNextRound,
}: RoundResultModalProps) => {
  const [stage, setStage] = useState<AnimationStage>('ranking');
  const activePlayers = gameState.players.filter(p => !p.isEliminated);

  // 負けたプレイヤーを特定
  const rolledPlayers = activePlayers
    .filter(p => p.currentRoll)
    .map(p => ({ playerId: p.id, roll: p.currentRoll as DiceResult }));
  const loserIds = findWeakestPlayers(rolledPlayers);
  const penalty = gameState.desperadoRolledThisRound ? 2 : 1;

  // ランキングを作成（強い順）
  const rankings = [...rolledPlayers]
    .map(rp => {
      const player = gameState.players.find(p => p.id === rp.playerId)!;
      const rank = getRollRank(rp.roll);
      return { player, roll: rp.roll, rank };
    })
    .sort((a, b) => b.rank.value - a.rank.value);

  // アニメーションのタイミング制御
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // ステージ1: ランキング表示（即座）
    // ステージ2: 敗者ハイライト（1秒後）
    timers.push(setTimeout(() => setStage('loser'), 1000));
    // ステージ3: ダメージアニメーション（2秒後）
    timers.push(setTimeout(() => setStage('damage'), 2000));
    // ステージ4: 完了（3秒後）
    timers.push(setTimeout(() => setStage('done'), 3000));

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // フェードインのクラス
  const fadeIn = 'animate-[fadeIn_0.5s_ease-out_forwards]';
  const hidden = 'opacity-0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        @keyframes heartBreak {
          0% { transform: scale(1); opacity: 1; }
          25% { transform: scale(1.3); opacity: 0.9; }
          50% { transform: scale(0.8); opacity: 0.6; }
          75% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 0.3; }
        }
        .shake {
          animation: shake 0.5s ease-in-out;
        }
        .heart-break {
          animation: heartBreak 0.8s ease-out forwards;
        }
      `}</style>

      <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {/* ヘッダー */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">ラウンド {gameState.currentRound} 結果</h2>
          {gameState.desperadoRolledThisRound && (
            <p className="text-red-400 font-bold mt-2 animate-pulse">
              デスペラード発動！ペナルティ2倍！
            </p>
          )}
        </div>

        {/* ランキング */}
        <div className="space-y-2 mb-6">
          {rankings.map((entry, index) => {
            const isLoser = loserIds.includes(entry.player.id);
            const isMe = entry.player.id === playerId;
            const rankType = entry.rank.type;

            return (
              <div
                key={entry.player.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  isLoser && ['loser', 'damage', 'done'].includes(stage)
                    ? 'bg-red-900/50 ring-2 ring-red-500'
                    : isMe
                    ? 'bg-amber-900/30 ring-1 ring-amber-500/50'
                    : 'bg-slate-700/50'
                } ${isLoser && stage === 'damage' ? 'shake' : ''}`}
              >
                {/* 順位 */}
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold w-6 ${
                    index === 0 ? 'text-amber-400' :
                    index === 1 ? 'text-slate-300' :
                    index === 2 ? 'text-amber-600' :
                    'text-slate-500'
                  }`}>
                    {index + 1}
                  </span>

                  {/* 名前 */}
                  <div>
                    <span className="text-white font-medium">
                      {entry.player.name}
                    </span>
                    {isMe && <span className="text-slate-400 text-xs ml-1">(自分)</span>}
                  </div>
                </div>

                {/* 出目と役名 */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    <DiceIcon value={entry.roll.die1} className="w-5 h-5 text-white" />
                    <DiceIcon value={entry.roll.die2} className="w-5 h-5 text-white" />
                  </div>
                  <span className={`text-sm font-bold min-w-16 text-right ${
                    rankType === 'desperado' ? 'text-amber-400' :
                    rankType === 'doubles' ? 'text-purple-400' :
                    'text-slate-300'
                  }`}>
                    {getRollDisplayName(entry.roll)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 敗者とダメージ表示 */}
        <div className={`text-center mb-6 ${stage === 'ranking' ? hidden : fadeIn}`}>
          <div className="bg-red-900/40 rounded-xl p-4">
            <p className="text-red-300 font-bold text-lg mb-3">
              {loserIds.map(id => gameState.players.find(p => p.id === id)?.name).join(', ')}
              が ライフ -{penalty}
            </p>

            {/* ライフのアニメーション表示 */}
            <div className="flex flex-wrap justify-center gap-4">
              {loserIds.map(loserId => {
                const loser = gameState.players.find(p => p.id === loserId)!;
                const currentLives = loser.lives;
                const livesAfterDamage = Math.max(0, currentLives - penalty);
                const isEliminated = livesAfterDamage === 0;

                return (
                  <div key={loserId} className="flex flex-col items-center">
                    <span className="text-white text-sm mb-1">{loser.name}</span>
                    <div className="flex items-center gap-0.5">
                      {/* 残るライフ */}
                      {[...Array(livesAfterDamage)].map((_, i) => (
                        <Heart
                          key={`remain-${i}`}
                          className="w-5 h-5 text-red-500 fill-red-500"
                        />
                      ))}
                      {/* 失うライフ（アニメーション） */}
                      {[...Array(penalty)].map((_, i) => (
                        <Heart
                          key={`lose-${i}`}
                          className={`w-5 h-5 text-red-500 ${
                            stage === 'damage' || stage === 'done' ? 'heart-break' : 'fill-red-500'
                          }`}
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                      {/* 既に失っていたライフ */}
                      {[...Array(5 - currentLives)].map((_, i) => (
                        <Heart
                          key={`lost-${i}`}
                          className="w-5 h-5 text-slate-600"
                        />
                      ))}
                    </div>
                    {isEliminated && ['damage', 'done'].includes(stage) && (
                      <span className="text-red-400 text-xs font-bold mt-1">脱落！</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 次へボタン */}
        <div className={`${stage !== 'done' ? hidden : fadeIn}`}>
          {isHost ? (
            <button
              onClick={onNextRound}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500
                hover:from-amber-600 hover:to-orange-600 rounded-lg text-white font-bold transition-all"
            >
              次のラウンドへ
            </button>
          ) : (
            <div className="text-center text-slate-400 py-3">
              ホストの操作を待っています...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
