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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-6">
        {/* 勝者表示 */}
        <div className="bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-xl p-6 text-center">
          <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-white mb-1">
            {isWinner ? 'あなたの勝ち！' : `${winner?.name} の勝ち！`}
          </h2>
          {winner && (
            <p className="text-white/80 text-sm">
              最後まで言葉を守り抜きました
            </p>
          )}
        </div>

        {/* 全員の言葉 */}
        <div className="bg-white/10 rounded-xl p-4">
          <h3 className="text-white font-bold mb-3 text-sm">みんなの言葉</h3>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => {
              const isMe = player.id === playerId;
              // 順位（sortedPlayersの順番が順位）
              const rank = index + 1;

              // メダルカラー（1位:金, 2位:銀, 3位:銅, 4位以降:グレー）
              const getMedalStyle = () => {
                switch (rank) {
                  case 1: return { bg: 'bg-yellow-500', text: 'text-white', nameBg: 'bg-yellow-500/20', nameText: 'text-yellow-300' };
                  case 2: return { bg: 'bg-slate-400', text: 'text-slate-900', nameBg: 'bg-slate-400/20', nameText: 'text-slate-300' };
                  case 3: return { bg: 'bg-amber-600', text: 'text-white', nameBg: 'bg-amber-600/20', nameText: 'text-amber-300' };
                  default: return { bg: 'bg-white/10', text: 'text-white/60', nameBg: 'bg-white/5', nameText: 'text-white' };
                }
              };
              const medalStyle = getMedalStyle();

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${medalStyle.nameBg}`}
                >
                  {/* 順位 */}
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full font-bold text-sm ${medalStyle.bg} ${medalStyle.text}`}>
                    {rank}
                  </div>

                  {/* プレイヤー名 */}
                  <div className="flex-1 min-w-0">
                    <span className={`font-bold text-sm ${medalStyle.nameText}`}>
                      {player.name}
                    </span>
                    {isMe && (
                      <span className="text-white/40 text-xs ml-1">(自分)</span>
                    )}
                  </div>

                  {/* 言葉（結果画面では全員の言葉を全公開） */}
                  <div className="flex gap-0.5 flex-shrink-0">
                    {(() => {
                      // 自分の言葉はlocalStateから、他プレイヤーはnormalizedWordから取得
                      const word = isMe && localState ? localState.normalizedWord : player.normalizedWord;
                      return Array.from(word || '').map((char, i) => {
                        const wasRevealed = player.revealedPositions[i];
                        return (
                          <span
                            key={i}
                            className={`
                              w-6 h-6 flex items-center justify-center rounded font-bold text-xs
                              ${wasRevealed
                                ? 'bg-pink-500/50 text-white'
                                : 'bg-emerald-500/50 text-emerald-100'
                              }
                            `}
                          >
                            {char}
                          </span>
                        );
                      });
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 統計 */}
        <div className="bg-white/10 rounded-xl p-4">
          <h3 className="text-white font-bold mb-3 text-sm">ゲーム統計</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-white/60 text-xs">使用した文字</p>
              <p className="text-xl font-bold text-white">
                {gameState.usedCharacters.length}
              </p>
            </div>
            <div>
              <p className="text-white/60 text-xs">攻撃回数</p>
              <p className="text-xl font-bold text-white">
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
              bg-white/5 rounded-lg text-white/60 text-sm">
              ホストの開始を待っています...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
