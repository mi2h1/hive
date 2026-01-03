import { Trophy, RotateCcw, LogOut } from 'lucide-react';
import type { GameState, LocalPlayerState } from '../types/game';

interface ResultScreenProps {
  gameState: GameState;
  localState: LocalPlayerState | null;
  playerId: string;
  isHost: boolean;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export const ResultScreen = ({
  gameState,
  localState,
  playerId,
  isHost,
  onPlayAgain,
  onLeaveRoom,
}: ResultScreenProps) => {
  const { players, winnerId } = gameState;

  const winner = players.find(p => p.id === winnerId);
  const isWinner = winnerId === playerId;

  // 脱落順でソート（勝者が最後）
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.id === winnerId) return -1;
    if (b.id === winnerId) return 1;
    if (a.eliminatedAt && b.eliminatedAt) {
      return b.eliminatedAt - a.eliminatedAt; // 遅く脱落した方が上位
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* 勝者表示 */}
      <div className="bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-xl p-8 text-center">
        <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-white mb-2">
          {isWinner ? 'あなたの勝ち！' : `${winner?.name} の勝ち！`}
        </h2>
        {winner && (
          <p className="text-white/80">
            最後まで言葉を守り抜きました
          </p>
        )}
      </div>

      {/* 全員の言葉 */}
      <div className="bg-white/10 rounded-xl p-6">
        <h3 className="text-white font-bold mb-4">みんなの言葉</h3>
        <div className="space-y-3">
          {sortedPlayers.map((player) => {
            const isMe = player.id === playerId;
            const isPlayerWinner = player.id === winnerId;

            return (
              <div
                key={player.id}
                className={`
                  flex items-center gap-4 p-3 rounded-lg
                  ${isPlayerWinner
                    ? 'bg-yellow-500/20'
                    : 'bg-white/5'
                  }
                `}
              >
                {/* 順位 */}
                <div className={`
                  w-8 h-8 flex items-center justify-center rounded-full font-bold
                  ${isPlayerWinner
                    ? 'bg-yellow-500 text-white'
                    : 'bg-white/10 text-white/60'
                  }
                `}>
                  {isPlayerWinner ? '1' : player.eliminatedAt ? players.length - player.eliminatedAt + 1 : '-'}
                </div>

                {/* プレイヤー名 */}
                <div className="flex-1">
                  <span className={`font-bold ${isPlayerWinner ? 'text-yellow-300' : 'text-white'}`}>
                    {player.name}
                  </span>
                  {isMe && (
                    <span className="text-white/40 text-sm ml-2">(あなた)</span>
                  )}
                </div>

                {/* 言葉 */}
                <div className="flex gap-1">
                  {isMe && localState ? (
                    // 自分の言葉は表示
                    Array.from(localState.normalizedWord).map((char, i) => (
                      <span
                        key={i}
                        className="w-8 h-8 flex items-center justify-center bg-white/20 rounded text-white font-bold"
                      >
                        {char}
                      </span>
                    ))
                  ) : (
                    // 他プレイヤーの言葉（公開された文字のみ、または脱落時は全部）
                    Array.from({ length: player.wordLength }).map((_, i) => (
                      <span
                        key={i}
                        className={`
                          w-8 h-8 flex items-center justify-center rounded font-bold
                          ${player.revealedPositions[i]
                            ? 'bg-pink-500/50 text-white'
                            : 'bg-white/10 text-white/40'
                          }
                        `}
                      >
                        {player.revealedCharacters[i] || '?'}
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 統計 */}
      <div className="bg-white/10 rounded-xl p-6">
        <h3 className="text-white font-bold mb-4">ゲーム統計</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-white/60 text-sm">使用した文字</p>
            <p className="text-2xl font-bold text-white">
              {gameState.usedCharacters.length}
            </p>
          </div>
          <div>
            <p className="text-white/60 text-sm">攻撃回数</p>
            <p className="text-2xl font-bold text-white">
              {gameState.attackHistory.length}
            </p>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-3">
        <button
          onClick={onLeaveRoom}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10
            hover:bg-white/20 rounded-lg text-white/80 transition-all"
        >
          <LogOut className="w-5 h-5" />
          退出
        </button>
        {isHost && (
          <button
            onClick={onPlayAgain}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3
              bg-gradient-to-r from-pink-500 to-orange-500
              hover:from-pink-600 hover:to-orange-600
              rounded-lg text-white font-bold transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            もう一度遊ぶ
          </button>
        )}
        {!isHost && (
          <div className="flex-1 flex items-center justify-center px-6 py-3
            bg-white/5 rounded-lg text-white/60">
            ホストが次のゲームを開始するのを待っています...
          </div>
        )}
      </div>
    </div>
  );
};
