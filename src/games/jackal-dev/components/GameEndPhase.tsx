import { Trophy, Medal } from 'lucide-react';
import type { GameState } from '../types/game';

interface GameEndPhaseProps {
  gameState: GameState;
  playerId: string;
  isHost: boolean;
  onBackToLobby: () => void;
  onLeaveRoom: () => void;
}

export const GameEndPhase = ({
  gameState,
  playerId,
  isHost,
  onBackToLobby,
  onLeaveRoom,
}: GameEndPhaseProps) => {
  const { players, round, winnerId } = gameState;

  const winner = players.find(p => p.id === winnerId);
  const isWinnerMe = winnerId === playerId;

  // 脱落順でソート（脱落していない人が先、脱落した順番が遅い人が上位）
  const sortedPlayers = [...players].sort((a, b) => {
    if (!a.isEliminated && b.isEliminated) return -1;
    if (a.isEliminated && !b.isEliminated) return 1;
    if (a.isEliminated && b.isEliminated) {
      return (b.eliminatedAt ?? 0) - (a.eliminatedAt ?? 0);
    }
    return 0;
  });

  // 順位の色を取得
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-400 bg-yellow-500/20';
      case 2:
        return 'text-slate-300 bg-slate-400/20';
      case 3:
        return 'text-amber-600 bg-amber-600/20';
      default:
        return 'text-slate-400 bg-slate-600/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 p-4">
      <div className="max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">ゲーム終了</h1>
          <p className="text-slate-400">全{round}ラウンド</p>
        </div>

        {/* 勝者表示（横並び） */}
        <div className={`rounded-xl p-4 mb-6 ${
          isWinnerMe ? 'bg-yellow-500/20' : 'bg-slate-800/80'
        }`}>
          <div className="flex items-center gap-4">
            <Trophy className={`w-12 h-12 flex-shrink-0 ${
              isWinnerMe ? 'text-yellow-400' : 'text-yellow-500'
            }`} />
            <div>
              <div className="text-slate-400 text-sm">勝者</div>
              <div className={`text-2xl font-bold ${
                isWinnerMe ? 'text-yellow-300' : 'text-white'
              }`}>
                {winner?.name}
                {isWinnerMe && ' (あなた)'}
              </div>
            </div>
          </div>
        </div>

        {/* 順位一覧 */}
        <div className="bg-slate-800/60 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold text-center mb-4">最終順位</h3>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => {
              const rank = index + 1;
              const isMe = player.id === playerId;

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${getRankStyle(rank)} ${
                    isMe ? 'ring-2 ring-yellow-400' : ''
                  }`}
                >
                  <div className="w-8 h-8 flex items-center justify-center font-bold text-lg">
                    {rank === 1 ? (
                      <Medal className="w-6 h-6 text-yellow-400" />
                    ) : (
                      <span>{rank}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${isMe ? 'text-yellow-300' : 'text-white'}`}>
                      {player.name}
                      {isMe && ' (あなた)'}
                    </div>
                    {player.isEliminated && (
                      <div className="text-xs text-slate-500">
                        ラウンド {player.eliminatedAt ?? '?'} で脱落
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* アクションボタン */}
        {isHost ? (
          <div className="flex gap-3">
            <button
              onClick={onLeaveRoom}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold transition-colors"
            >
              退出
            </button>
            <button
              onClick={onBackToLobby}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-lg text-white font-bold transition-all"
            >
              もう一度プレイ
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-slate-400 animate-pulse">ホストの選択を待っています...</div>
            <button
              onClick={onLeaveRoom}
              className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
            >
              退出
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
