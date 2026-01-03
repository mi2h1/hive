import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Card } from './Card';
import type { GameState } from '../types/game';

interface JudgmentPhaseProps {
  gameState: GameState;
  playerId: string;
  onNextRound: () => void;
  onLeaveRoom: () => void;
}

// アニメーションのステージ
type AnimationStage = 'jackal' | 'declared' | 'total' | 'cards' | 'result' | 'done';

export const JudgmentPhase = ({
  gameState,
  playerId,
  onNextRound,
  onLeaveRoom,
}: JudgmentPhaseProps) => {
  const { judgmentResult, round, players, turnOrder } = gameState;
  const [stage, setStage] = useState<AnimationStage>('jackal');

  // アニメーションのタイミング制御
  useEffect(() => {
    if (!judgmentResult) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // ステージ1: ジャッカル宣言（即座に表示）
    // ステージ2: 宣言された数字（1秒後）
    timers.push(setTimeout(() => setStage('declared'), 1000));
    // ステージ3: 合計（2秒後）
    timers.push(setTimeout(() => setStage('total'), 2000));
    // ステージ4: カード公開（3秒後）
    timers.push(setTimeout(() => setStage('cards'), 3000));
    // ステージ5: 結果（4秒後）
    timers.push(setTimeout(() => setStage('result'), 4000));
    // ステージ6: 完了（4.5秒後）
    timers.push(setTimeout(() => setStage('done'), 4500));

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [judgmentResult]);

  if (!judgmentResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="text-white">判定結果を読み込み中...</div>
      </div>
    );
  }

  const {
    jackalCallerName,
    declarerName,
    declaredValue,
    totalValue,
    loserId,
    loserName,
    reason,
    cardDetails,
    mysteryCard,
    hasDouble,
    hasMaxZero,
  } = judgmentResult;

  const loser = players.find(p => p.id === loserId);
  const isLoserMe = loserId === playerId;

  // ターン順でカードをソート
  const sortedCardDetails = [...cardDetails].sort((a, b) => {
    const aIndex = turnOrder.indexOf(a.playerId);
    const bIndex = turnOrder.indexOf(b.playerId);
    return aIndex - bIndex;
  });

  // フェードインのクラス
  const fadeIn = 'animate-[fadeIn_0.5s_ease-out_forwards]';
  const hidden = 'opacity-0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 p-4">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-4">
          <span className="text-slate-400 text-sm">ラウンド {round}</span>
        </div>

        {/* ジャッカル宣言 */}
        <div className={`text-center mb-8 ${fadeIn}`}>
          <div className="text-3xl font-bold text-orange-400 mb-2">
            {jackalCallerName} が
          </div>
          <div className="text-5xl font-bold text-white">
            ジャッカル！
          </div>
        </div>

        {/* 宣言された数字 */}
        <div className={`text-center mb-6 ${stage === 'jackal' ? hidden : fadeIn}`}>
          <div className="bg-slate-800/80 rounded-xl p-4 inline-block">
            <div className="text-slate-400 text-sm mb-1">
              {declarerName}が宣言した数字
            </div>
            <div className="text-4xl font-bold text-white">
              {declaredValue}
            </div>
          </div>
        </div>

        {/* 場の合計 */}
        <div className={`text-center mb-6 ${['jackal', 'declared'].includes(stage) ? hidden : fadeIn}`}>
          <div className="bg-slate-800/80 rounded-xl p-4 inline-block">
            <div className="text-slate-400 text-sm mb-1">場の合計</div>
            <div className="text-4xl font-bold text-white">
              {totalValue}
              {hasDouble && <span className="text-pink-400 text-base ml-2">(×2)</span>}
              {hasMaxZero && <span className="text-emerald-400 text-base ml-2">(MAX→0)</span>}
            </div>
          </div>
        </div>

        {/* 比較結果 */}
        <div className={`text-center mb-6 ${['jackal', 'declared'].includes(stage) ? hidden : fadeIn}`}>
          <div className="text-2xl">
            {declaredValue} {' '}
            {declaredValue > totalValue ? (
              <span className="text-red-400 font-bold">{'>'}</span>
            ) : (
              <span className="text-green-400 font-bold">{'≤'}</span>
            )}
            {' '} {totalValue}
          </div>
        </div>

        {/* カード公開 */}
        <div className={`mb-6 ${['jackal', 'declared', 'total'].includes(stage) ? hidden : fadeIn}`}>
          <div className="bg-slate-800/60 rounded-xl p-4">
            <div className="flex flex-wrap justify-center gap-4">
              {sortedCardDetails.map((detail) => {
                const isMe = detail.playerId === playerId;
                const isLoser = detail.playerId === loserId;

                return (
                  <div
                    key={detail.playerId}
                    className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                      isMe
                        ? 'bg-yellow-500/30 ring-2 ring-yellow-400'
                        : isLoser
                          ? 'bg-red-900/30'
                          : 'bg-slate-700/50'
                    }`}
                  >
                    <Card card={detail.card} size="md" highlighted={isMe} />
                    <div className="mt-2 text-center">
                      <div className={`text-sm font-medium ${isMe ? 'text-yellow-300' : 'text-white'}`}>
                        {detail.playerName}
                        {isMe && ' (自分)'}
                      </div>
                      <div className="text-slate-400 text-xs">
                        → {detail.resolvedValue}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ?カードで引いたカード */}
            {mysteryCard && (
              <div className="mt-4 pt-4 border-t border-slate-600 text-center">
                <div className="text-slate-400 text-sm mb-2">?カードで引いたカード</div>
                <div className="flex justify-center">
                  <Card card={mysteryCard} size="sm" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 結果 */}
        <div className={`text-center mb-6 ${['jackal', 'declared', 'total', 'cards'].includes(stage) ? hidden : fadeIn}`}>
          <div className={`rounded-xl p-6 ${isLoserMe ? 'bg-red-900/50' : 'bg-slate-800/80'}`}>
            <div className="text-xl font-bold mb-2">
              {reason === 'over' ? (
                <span className="text-red-400">宣言オーバー！</span>
              ) : (
                <span className="text-orange-400">ジャッカル失敗！</span>
              )}
            </div>
            <div className={`text-2xl font-bold ${isLoserMe ? 'text-red-300' : 'text-white'}`}>
              {loserName} がライフ -1
            </div>
            {loser && (
              <div className="flex items-center justify-center gap-1 mt-3">
                {Array.from({ length: loser.life }).map((_, i) => (
                  <Heart key={i} className="w-6 h-6 text-red-400 fill-red-400" />
                ))}
                {loser.life === 0 && (
                  <span className="text-red-400 font-bold ml-2">脱落！</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* アクションボタン */}
        <div className={`flex gap-3 ${stage !== 'done' ? hidden : fadeIn}`}>
          <button
            onClick={onLeaveRoom}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
          >
            退出
          </button>
          <button
            onClick={onNextRound}
            className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-lg text-white font-bold transition-all"
          >
            次のラウンドへ
          </button>
        </div>
      </div>
    </div>
  );
};
