import { Trophy, RotateCcw } from 'lucide-react';
import type { GameState } from '../types/game';
import { calculateScore } from '../lib/gems';
import { Gem } from './Gem';

interface ResultPhaseProps {
  gameState: GameState;
  playerId: string;
  isHost: boolean;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export const ResultPhase = ({
  gameState,
  playerId,
  isHost,
  onPlayAgain,
  onLeaveRoom,
}: ResultPhaseProps) => {
  // 全プレイヤーのスコアを計算してランキング作成
  const rankings = gameState.players
    .map(player => ({
      player,
      score: calculateScore(player),
    }))
    .sort((a, b) => {
      if (b.score.total !== a.score.total) return b.score.total - a.score.total;
      return b.score.gemCount - a.score.gemCount;
    });

  const winner = rankings[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-900 to-blue-900">
      <div className="min-h-screen bg-black/20 p-4">
        <div className="max-w-2xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-6">
            <img
              src="/hive/images/vec_logo_spark.svg"
              alt="SPARK"
              className="h-10 mx-auto mb-2"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <p className="text-cyan-400 font-bold">ゲーム終了</p>
          </div>

          {/* 勝者表示 */}
          <div className="bg-gradient-to-br from-yellow-500/30 to-amber-600/30 rounded-xl p-6 mb-6 text-center border border-yellow-400/50">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white mb-2">
              🎉 {winner.player.name} 🎉
            </div>
            <div className="text-4xl font-bold text-yellow-400">
              {winner.score.total}点
            </div>
          </div>

          {/* ランキング */}
          <div className="bg-slate-800/90 rounded-xl p-4 mb-6">
            <h2 className="text-white font-bold mb-4">最終結果</h2>
            <div className="space-y-3">
              {rankings.map((entry, index) => {
                const isMe = entry.player.id === playerId;
                const { score } = entry;
                const rank = index + 1;

                return (
                  <div
                    key={entry.player.id}
                    className={`p-4 rounded-lg ${
                      rank === 1
                        ? 'bg-yellow-600/30 border border-yellow-400/50'
                        : rank === 2
                        ? 'bg-slate-400/20 border border-slate-400/30'
                        : rank === 3
                        ? 'bg-amber-700/30 border border-amber-600/30'
                        : 'bg-slate-700/50'
                    } ${isMe ? 'ring-2 ring-cyan-400' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`text-2xl font-bold ${
                          rank === 1 ? 'text-yellow-400' :
                          rank === 2 ? 'text-slate-300' :
                          rank === 3 ? 'text-amber-500' :
                          'text-slate-500'
                        }`}>
                          {rank}位
                        </div>
                        <div>
                          <div className="text-white font-bold">
                            {entry.player.name}
                            {isMe && <span className="text-cyan-400 text-sm ml-2">(自分)</span>}
                          </div>
                          <div className="text-slate-400 text-sm">
                            宝石 {score.gemCount}個
                          </div>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {score.total}点
                      </div>
                    </div>

                    {/* スコア内訳 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div className="bg-slate-800/50 rounded p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Gem color="blue" size="sm" />
                          <Gem color="yellow" size="sm" />
                          <Gem color="red" size="sm" />
                        </div>
                        <div className="text-slate-400">色: {score.colorPoints}点</div>
                      </div>
                      <div className="bg-slate-800/50 rounded p-2 text-center">
                        <div className="text-yellow-400 font-bold mb-1">
                          {score.details.sets}セット
                        </div>
                        <div className="text-slate-400">ボーナス: +{score.setBonus}点</div>
                      </div>
                      <div className="bg-slate-800/50 rounded p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Gem color="white" size="sm" />
                          <span className="text-white">×{score.details.white}</span>
                        </div>
                        <div className="text-slate-400">白: {score.whitePoints}点</div>
                      </div>
                      <div className="bg-slate-800/50 rounded p-2 text-center">
                        <div className="text-xs text-slate-500">
                          青{score.details.blue} 黄{score.details.yellow} 赤{score.details.red}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-3">
            <button
              onClick={onLeaveRoom}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
            >
              退出
            </button>
            {isHost && (
              <button
                onClick={onPlayAgain}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg text-white font-bold transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                もう一度遊ぶ
              </button>
            )}
            {!isHost && (
              <div className="flex-1 py-3 bg-slate-700 rounded-lg text-center text-slate-400">
                ホストの操作を待っています...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
