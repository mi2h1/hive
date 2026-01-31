import { useState, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { Card } from './Card';
import { JackalCallOverlay } from './JackalCallOverlay';
import type { GameState } from '../types/game';

interface JudgmentPhaseProps {
  gameState: GameState;
  playerId: string;
  onNextRound: () => void;
  onLeaveRoom: () => void;
}

// アニメーションのステージ
type AnimationStage = 'jackal' | 'declared' | 'total' | 'result' | 'cards' | 'done';

export const JudgmentPhase = ({
  gameState,
  playerId,
  onNextRound,
  onLeaveRoom,
}: JudgmentPhaseProps) => {
  const { judgmentResult, round, players, turnOrder, settings } = gameState;
  const initialLife = settings.initialLife;
  const [showOverlay, setShowOverlay] = useState(true);
  const [stage, setStage] = useState<AnimationStage>('jackal');

  // オーバーレイアニメーション終了時
  const handleOverlayEnd = useCallback(() => {
    setShowOverlay(false);
  }, []);

  // 残りのアクティブプレイヤー数
  const activePlayers = players.filter(p => !p.isEliminated);
  const isGameOver = activePlayers.length <= 1;

  // アニメーションのタイミング制御（オーバーレイ終了後に開始）
  useEffect(() => {
    if (!judgmentResult || showOverlay) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // ステージ1: ジャッカル宣言（即座に表示）
    // ステージ2: 宣言数字（1秒後）
    timers.push(setTimeout(() => setStage('declared'), 1000));
    // ステージ3: 場の合計（2秒後）
    timers.push(setTimeout(() => setStage('total'), 2000));
    // ステージ4: 判定結果（3秒後）
    timers.push(setTimeout(() => setStage('result'), 3000));
    // ステージ5: カード公開（4秒後）
    timers.push(setTimeout(() => setStage('cards'), 4000));
    // ステージ6: 完了（5秒後）
    timers.push(setTimeout(() => setStage('done'), 5000));

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [judgmentResult, showOverlay]);

  // ゲーム終了時の自動遷移（3秒後、またはクリックで即座に遷移）
  useEffect(() => {
    if (stage !== 'done' || !isGameOver) return;

    const timer = setTimeout(() => {
      onNextRound(); // これがgame_endに遷移させる
    }, 3000);

    return () => clearTimeout(timer);
  }, [stage, isGameOver, onNextRound]);

  // クリックで即座に遷移
  const handleScreenClick = () => {
    if (stage === 'done' && isGameOver) {
      onNextRound();
    }
  };

  if (!judgmentResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="text-white">判定結果を読み込み中...</div>
      </div>
    );
  }

  // オーバーレイ表示中
  if (showOverlay) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900">
        <JackalCallOverlay onAnimationEnd={handleOverlayEnd} />
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

  // ジャッカル成功 = 宣言 > 場の合計 (reason === 'over')
  const isJackalSuccess = reason === 'over';

  // ターン順でカードをソート
  const sortedCardDetails = [...cardDetails].sort((a, b) => {
    const aIndex = turnOrder.indexOf(a.playerId);
    const bIndex = turnOrder.indexOf(b.playerId);
    return aIndex - bIndex;
  });

  // フェードインのクラス
  const fadeIn = 'animate-[fadeIn_0.5s_ease-out_forwards]';
  const hidden = 'opacity-0';

  // 宣言数字ボックスのハイライトクラス（判定後）
  const getDeclaredHighlight = () => {
    if (!['result', 'cards', 'done'].includes(stage)) return '';
    return isJackalSuccess
      ? 'ring-4 ring-red-500 bg-red-900/60'
      : 'ring-4 ring-green-500 bg-green-900/60';
  };

  const isClickable = stage === 'done' && isGameOver;

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 p-4 ${isClickable ? 'cursor-pointer' : ''}`}
      onClick={isClickable ? handleScreenClick : undefined}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
          20%, 40%, 60%, 80% { transform: translateX(3px); }
        }
        @keyframes heartBreak {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        .shake {
          animation: shake 0.5s ease-in-out;
        }
        .heart-break {
          animation: heartBreak 0.5s ease-in-out;
        }
      `}</style>

      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-4">
          <span className="text-slate-400 text-sm">ラウンド {round}</span>
        </div>

        {/* ジャッカル宣言（横並び） */}
        <div className={`text-center mb-8 ${fadeIn}`}>
          <div className="flex items-center justify-center gap-2 md:gap-3">
            <span className="text-xl md:text-3xl font-bold text-orange-400">
              {jackalCallerName} が
            </span>
            <span className="text-3xl md:text-5xl font-bold text-white">
              ジャッカル！
            </span>
          </div>
        </div>

        {/* 宣言数字 + 場の合計（横並び、別々にフェードイン） */}
        <div className="flex justify-center gap-3 md:gap-4 mb-6">
          {/* 宣言された数字 */}
          <div className={`rounded-xl p-3 md:p-4 flex-1 max-w-40 md:max-w-48 transition-all duration-300 ${
            stage === 'jackal' ? hidden : fadeIn
          } ${getDeclaredHighlight() || 'bg-slate-800/80'}`}>
            <div className="text-slate-400 text-xs md:text-sm mb-1 text-center">
              {declarerName}の宣言
            </div>
            <div className="text-2xl md:text-4xl font-bold text-white text-center">
              {declaredValue}
            </div>
          </div>

          {/* 場の合計 */}
          <div className={`bg-slate-800/80 rounded-xl p-3 md:p-4 flex-1 max-w-40 md:max-w-48 ${
            ['jackal', 'declared'].includes(stage) ? hidden : fadeIn
          }`}>
            <div className="text-slate-400 text-xs md:text-sm mb-1 text-center">場の合計</div>
            <div className="text-2xl md:text-4xl font-bold text-white text-center">
              {totalValue}
              {hasDouble && <span className="text-pink-400 text-xs md:text-base ml-1 md:ml-2">(×2)</span>}
              {hasMaxZero && <span className="text-emerald-400 text-xs md:text-base ml-1 md:ml-2">(MAX→0)</span>}
            </div>
          </div>
        </div>

        {/* 判定インフォボード */}
        <div className={`text-center mb-6 ${['jackal', 'declared', 'total'].includes(stage) ? hidden : fadeIn}`}>
          <div className={`rounded-xl p-3 md:p-4 inline-block ${
            isJackalSuccess ? 'bg-green-900/60' : 'bg-red-900/60'
          }`}>
            <div className="text-lg md:text-2xl font-bold">
              {isJackalSuccess ? (
                <span className="text-green-300">ジャッカル成功！</span>
              ) : (
                <span className="text-red-300">ジャッカル失敗！</span>
              )}
            </div>
          </div>
        </div>

        {/* カード公開 */}
        <div className={`mb-6 ${['jackal', 'declared', 'total', 'result'].includes(stage) ? hidden : fadeIn}`}>
          <div className="bg-slate-800/60 rounded-xl p-4">
            <div className="flex flex-wrap justify-center gap-4">
              {sortedCardDetails.map((detail) => {
                const isMe = detail.playerId === playerId;
                const isLoserPlayer = detail.playerId === loserId;
                const player = players.find(p => p.id === detail.playerId);
                // 敗者のライフは既に減算されているので、表示用に調整
                const currentLife = player?.life ?? 0;
                // 敗者: ダメージ前のライフ = currentLife + 1
                // 非敗者: そのまま
                const filledHearts = isLoserPlayer ? currentLife : currentLife;
                // 敗者: 今回失うハート1つ（アニメーション付き）
                const damagingHeart = isLoserPlayer ? 1 : 0;
                // 既に失ったハート（中抜き・半透明）
                const lostHearts = initialLife - currentLife - damagingHeart;

                return (
                  <div
                    key={detail.playerId}
                    className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                      isMe
                        ? 'bg-yellow-500/30 ring-2 ring-yellow-400'
                        : isLoserPlayer
                          ? 'bg-red-900/30'
                          : 'bg-slate-700/50'
                    } ${isLoserPlayer && stage === 'cards' ? 'shake' : ''}`}
                  >
                    <Card card={detail.card} size="md" highlighted={isMe} />
                    <div className="mt-2 text-center">
                      <div className={`text-sm font-medium ${isMe ? 'text-yellow-300' : 'text-white'}`}>
                        {detail.playerName}
                        {isMe && ' (自分)'}
                      </div>
                      {/* HP表示 */}
                      <div className="flex items-center justify-center gap-0.5 mt-1">
                        {/* 現在のライフ（塗りつぶし） */}
                        {Array.from({ length: filledHearts }).map((_, i) => (
                          <Heart
                            key={`filled-${i}`}
                            className="w-4 h-4 text-red-400 fill-red-400"
                          />
                        ))}
                        {/* 今回失うハート（敗者のみ、アニメーション付き中抜き） */}
                        {damagingHeart > 0 && (
                          <Heart
                            key="damaging"
                            className={`w-4 h-4 text-red-400 ${stage === 'cards' ? 'heart-break' : ''}`}
                            strokeWidth={2}
                          />
                        )}
                        {/* 既に失ったハート（中抜き・半透明） */}
                        {Array.from({ length: lostHearts }).map((_, i) => (
                          <Heart
                            key={`lost-${i}`}
                            className="w-4 h-4 text-red-400/50"
                            strokeWidth={2}
                          />
                        ))}
                        {initialLife === lostHearts + damagingHeart && (
                          <span className="text-red-400 text-xs font-bold ml-1">脱落</span>
                        )}
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

        {/* 敗者表示 */}
        <div className={`text-center mb-6 ${['jackal', 'declared', 'total', 'result'].includes(stage) ? hidden : fadeIn}`}>
          <div className={`rounded-xl p-3 md:p-4 ${isLoserMe ? 'bg-red-900/50' : 'bg-slate-800/80'}`}>
            <div className={`text-base md:text-xl font-bold ${isLoserMe ? 'text-red-300' : 'text-white'}`}>
              {loserName} がライフ -1
            </div>
            {loser && loser.life === 0 && (
              <div className="text-red-400 font-bold text-sm md:text-base mt-1">脱落！</div>
            )}
          </div>
        </div>

        {/* アクションボタン */}
        <div className={`${stage !== 'done' ? hidden : fadeIn}`}>
          {isGameOver ? (
            <div className="text-center">
              <div className="text-slate-400 mb-2">ゲーム終了</div>
              <div className="text-white/60 text-sm animate-pulse">タップして結果画面へ</div>
            </div>
          ) : (
            <div className="flex gap-3">
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
          )}
        </div>
      </div>
    </div>
  );
};
