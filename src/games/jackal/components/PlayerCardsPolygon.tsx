// プレイヤーカードを多角形に配置するコンポーネント

import { Heart } from 'lucide-react';
import { Card } from './Card';
import { DeclaredValueDisplay } from './DeclaredValueDisplay';
import { calculatePolygonPositions } from '../lib/layout';
import type { Player, Card as CardType, GamePhase } from '../types/game';

interface PlayerCardsPolygonProps {
  activePlayers: Player[];
  eliminatedPlayers: Player[];
  turnOrder: string[];
  currentTurnPlayerId: string | null;
  controlledPlayerId: string;
  dealtCards: Record<string, CardType>;
  initialLife: number;
  // 中央表示用
  currentDeclaredValue: number | null;
  lastDeclarerName?: string;
  currentPlayerName?: string;
  isMyTurn: boolean;
  phase: GamePhase;
}

export const PlayerCardsPolygon = ({
  activePlayers,
  eliminatedPlayers,
  turnOrder,
  currentTurnPlayerId,
  controlledPlayerId,
  dealtCards,
  initialLife,
  currentDeclaredValue,
  lastDeclarerName,
  currentPlayerName,
  isMyTurn,
  phase,
}: PlayerCardsPolygonProps) => {
  // ターン順でソートされたアクティブプレイヤー
  const sortedActivePlayers = turnOrder
    .map(pid => activePlayers.find(p => p.id === pid))
    .filter((p): p is Player => p !== undefined);

  const playerCount = sortedActivePlayers.length;
  const positions = calculatePolygonPositions(playerCount);

  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      {/* 多角形配置エリア */}
      <div className="relative w-full" style={{ paddingBottom: '75%' }}>
        {/* 中央: 宣言値表示 */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 1 }}
        >
          {(phase === 'declaring' || phase === 'round_start') && (
            <DeclaredValueDisplay
              currentDeclaredValue={currentDeclaredValue}
              lastDeclarerName={lastDeclarerName}
              isMyTurn={isMyTurn}
              currentPlayerName={currentPlayerName}
              phase={phase as 'declaring' | 'round_start'}
            />
          )}
        </div>

        {/* プレイヤーカード配置 */}
        {sortedActivePlayers.map((player, index) => {
          const position = positions[index];
          const card = dealtCards[player.id];
          const isCurrent = player.id === currentTurnPlayerId;
          const isMe = player.id === controlledPlayerId;

          return (
            <div
              key={player.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                zIndex: 10,
              }}
            >
              <div
                className={`flex flex-col items-center p-2 md:p-3 lg:p-4 rounded-lg transition-all ${
                  isCurrent ? 'bg-yellow-500/20 ring-2 ring-yellow-500' : 'bg-slate-700/50'
                }`}
              >
                {/* スマホ: md, タブレット: lg, PC: xl */}
                <div className="md:hidden">
                  <Card
                    card={card}
                    hidden={isMe}
                    size="md"
                    highlighted={isCurrent}
                  />
                </div>
                <div className="hidden md:block lg:hidden">
                  <Card
                    card={card}
                    hidden={isMe}
                    size="lg"
                    highlighted={isCurrent}
                  />
                </div>
                <div className="hidden lg:block">
                  <Card
                    card={card}
                    hidden={isMe}
                    size="xl"
                    highlighted={isCurrent}
                  />
                </div>
                <div className="mt-2 lg:mt-3 text-center">
                  <div className={`text-xs md:text-sm lg:text-base font-medium truncate max-w-16 md:max-w-20 lg:max-w-28 ${isMe ? 'text-yellow-300' : 'text-white'}`}>
                    {player.name}
                    {isMe && ' (自分)'}
                  </div>
                  <div className="flex items-center justify-center gap-0.5 lg:gap-1 mt-1">
                    {/* 現在のライフ（塗りつぶし） */}
                    {Array.from({ length: player.life }).map((_, i) => (
                      <Heart key={`filled-${i}`} className="w-3 h-3 lg:w-4 lg:h-4 text-red-400 fill-red-400" />
                    ))}
                    {/* 失ったライフ（中抜き） */}
                    {Array.from({ length: initialLife - player.life }).map((_, i) => (
                      <Heart key={`empty-${i}`} className="w-3 h-3 lg:w-4 lg:h-4 text-red-400/50" strokeWidth={2} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 脱落プレイヤー（右下に小さく表示） */}
      {eliminatedPlayers.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {eliminatedPlayers
            .sort((a, b) => (a.eliminatedAt ?? 0) - (b.eliminatedAt ?? 0))
            .map((player) => {
              const isMe = player.id === controlledPlayerId;

              return (
                <div
                  key={player.id}
                  className="flex flex-col items-center p-2 rounded-lg bg-slate-700/30 opacity-50 grayscale"
                >
                  <Card hidden={true} size="sm" />
                  <div className="mt-1 text-center">
                    <div className="text-xs font-medium truncate max-w-12 text-slate-400">
                      {player.name}
                      {isMe && ' (自分)'}
                    </div>
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      {Array.from({ length: initialLife }).map((_, i) => (
                        <Heart key={`empty-${i}`} className="w-2 h-2 text-red-400/50" strokeWidth={2} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
