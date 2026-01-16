import { Trophy, Skull, RotateCcw } from 'lucide-react';
import type { GameState } from '../types/game';

interface ResultScreenProps {
  gameState: GameState;
  playerId: string;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export const ResultScreen = ({
  gameState,
  playerId,
  onPlayAgain,
  onLeaveRoom,
}: ResultScreenProps) => {
  const winner = gameState.players.find(p => p.id === gameState.winnerId);
  const isWinner = gameState.winnerId === playerId;

  // プレイヤーを脱落順でソート（生存者が最初、その後脱落順）
  const sortedPlayers = [...gameState.players].sort((a, b) => {
    if (!a.isEliminated && b.isEliminated) return -1;
    if (a.isEliminated && !b.isEliminated) return 1;
    return b.lives - a.lives;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 to-red-900">
      <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
        <div className="bg-slate-800/95 rounded-xl p-6 max-w-md w-full">
          {/* 勝者表示 */}
          <div className="text-center mb-6">
            {winner ? (
              <>
                <Trophy className={`w-16 h-16 mx-auto mb-4 ${isWinner ? 'text-yellow-400' : 'text-amber-500'}`} />
                <h1 className="text-3xl font-bold text-white mb-2">
                  {isWinner ? '勝利！' : `${winner.name} の勝利！`}
                </h1>
                {isWinner && (
                  <p className="text-amber-400">おめでとうございます！</p>
                )}
              </>
            ) : (
              <>
                <Skull className="w-16 h-16 mx-auto mb-4 text-slate-500" />
                <h1 className="text-3xl font-bold text-white mb-2">引き分け</h1>
              </>
            )}
            <p className="text-slate-400 text-sm mt-2">
              全{gameState.currentRound}ラウンド
            </p>
          </div>

          {/* 結果一覧 */}
          <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
            <h2 className="text-slate-400 text-sm mb-3">最終結果</h2>
            <div className="space-y-2">
              {sortedPlayers.map((player, index) => {
                const isMe = player.id === playerId;
                const isTheWinner = player.id === gameState.winnerId;

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-2 rounded ${
                      isTheWinner
                        ? 'bg-amber-600/30'
                        : player.isEliminated
                        ? 'bg-slate-600/30'
                        : 'bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-sm w-6">{index + 1}.</span>
                      {isTheWinner && <Trophy className="w-4 h-4 text-yellow-400" />}
                      {player.isEliminated && <Skull className="w-4 h-4 text-slate-500" />}
                      <span className={`font-bold ${isTheWinner ? 'text-amber-400' : 'text-white'}`}>
                        {player.name}
                      </span>
                      {isMe && <span className="text-slate-400 text-xs">(自分)</span>}
                    </div>
                    <span className={`text-sm ${player.isEliminated ? 'text-red-400' : 'text-slate-400'}`}>
                      {player.isEliminated ? '脱落' : `残りライフ ${player.lives}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="space-y-3">
            <button
              onClick={onPlayAgain}
              className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500
                hover:from-amber-600 hover:to-orange-600 rounded-lg text-white font-bold transition-all
                flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              もう一度遊ぶ
            </button>
            <button
              onClick={onLeaveRoom}
              className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600
                rounded-lg text-slate-300 font-bold transition-all"
            >
              退出
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
