import { useState } from 'react';
import { Heart, FlaskConical } from 'lucide-react';
import { Card } from './Card';
import type { GameState, Player, Card as CardType } from '../types/game';

interface GamePlayPhaseProps {
  gameState: GameState;
  playerId: string;
  debugMode?: boolean;
  onDeclare: (value: number, actingPlayerId: string) => void;
  onCallJackal: (actingPlayerId: string) => void;
  onLeaveRoom: () => void;
}

export const GamePlayPhase = ({
  gameState,
  playerId,
  debugMode = false,
  onDeclare,
  onCallJackal,
  onLeaveRoom,
}: GamePlayPhaseProps) => {
  const [inputValue, setInputValue] = useState<string>('');

  // デバッグモード用: どのプレイヤーを操作しているか
  const [debugControlledPlayerId, setDebugControlledPlayerId] = useState<string | null>(null);

  // デバッグモードで操作中のプレイヤーを決定
  const controlledPlayerId = debugMode && debugControlledPlayerId ? debugControlledPlayerId : playerId;

  const {
    phase,
    players,
    dealtCards,
    round,
    currentTurnPlayerId,
    currentDeclaredValue,
    lastDeclarerId,
    turnOrder,
  } = gameState;

  const isMyTurn = currentTurnPlayerId === controlledPlayerId;
  const currentPlayer = players.find(p => p.id === currentTurnPlayerId);
  const lastDeclarer = players.find(p => p.id === lastDeclarerId);

  // アクティブなプレイヤー（脱落していない）
  const activePlayers = players.filter(p => !p.isEliminated);

  // 宣言可能な最小値
  const minDeclareValue = (currentDeclaredValue ?? 0) + 1;

  const handleDeclare = () => {
    const value = parseInt(inputValue, 10);
    if (!isNaN(value) && value >= minDeclareValue) {
      onDeclare(value, controlledPlayerId);
      setInputValue('');
    }
  };

  const handleCallJackal = () => {
    onCallJackal(controlledPlayerId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDeclare();
    }
  };

  // プレイヤーのカードを取得
  const getPlayerCard = (player: Player): CardType | undefined => {
    return dealtCards[player.id];
  };

  const inputValueNum = parseInt(inputValue, 10);
  const isValidInput = !isNaN(inputValueNum) && inputValueNum >= minDeclareValue;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 p-4">
      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">ラウンド {round}</h1>
          <div className="flex items-center gap-2">
            {debugMode && (
              <span className="text-xs bg-orange-600 text-white px-2 py-0.5 rounded inline-flex items-center gap-1">
                <FlaskConical className="w-3 h-3" />
                DEV
              </span>
            )}
            <button
              onClick={onLeaveRoom}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm transition-colors"
            >
              退出
            </button>
          </div>
        </div>

        {/* デバッグ用: プレイヤー切り替え */}
        {debugMode && (
          <div className="bg-orange-900/30 border border-orange-600/50 rounded-xl p-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-orange-400 text-sm font-bold">操作:</span>
              {activePlayers.map((player) => {
                const isControlled = debugControlledPlayerId
                  ? player.id === debugControlledPlayerId
                  : player.id === playerId;
                const isCurrentTurnPlayer = player.id === currentTurnPlayerId;

                return (
                  <button
                    key={player.id}
                    onClick={() => setDebugControlledPlayerId(player.id === playerId ? null : player.id)}
                    className={`
                      px-2 py-1 rounded text-xs font-bold transition-all
                      ${isControlled
                        ? 'bg-orange-600 text-white'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }
                      ${isCurrentTurnPlayer ? 'ring-2 ring-yellow-400' : ''}
                    `}
                  >
                    {player.name}
                    {player.id === playerId && ' (自分)'}
                    {isCurrentTurnPlayer && ' ★'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 上段: インフォボード(70%) + 宣言エリア(30%) */}
        <div className="flex gap-4 mb-4">
          {/* 左: インフォボード */}
          <div className="w-[70%] bg-slate-800/80 rounded-xl p-4">
            {/* 現在の宣言値 */}
            <div className="text-center mb-4">
              <div className="text-slate-400 text-sm mb-1">
                {lastDeclarer ? `${lastDeclarer.name}の宣言` : '最初の宣言を待っています'}
              </div>
              <div className="text-5xl font-bold text-white">
                {currentDeclaredValue !== null ? currentDeclaredValue : '—'}
              </div>
            </div>

            {/* ターン表示 */}
            <div className="text-center py-2 rounded-lg bg-slate-700/50">
              {phase === 'declaring' && (
                <span className="text-white">
                  {isMyTurn ? (
                    <span className="text-yellow-400 font-bold text-lg">あなたの番です</span>
                  ) : (
                    <span>{currentPlayer?.name}の番...</span>
                  )}
                </span>
              )}
              {phase === 'round_start' && (
                <span className="text-white">ラウンド開始！</span>
              )}
            </div>
          </div>

          {/* 右: 宣言エリア */}
          <div className="w-[30%] bg-slate-800/80 rounded-xl p-4 flex flex-col">
            {phase === 'declaring' && isMyTurn ? (
              <>
                {/* 数字入力 */}
                <div className="flex-1">
                  <div className="text-slate-400 text-xs mb-2">
                    {currentDeclaredValue !== null
                      ? `${minDeclareValue}以上を宣言`
                      : '数字を宣言'}
                  </div>
                  <input
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={String(minDeclareValue)}
                    min={minDeclareValue}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-xl text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleDeclare}
                    disabled={!isValidInput}
                    className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 rounded-lg text-white font-bold transition-all text-sm"
                  >
                    宣言
                  </button>
                </div>

                {/* ジャッカル宣言 */}
                {currentDeclaredValue !== null && (
                  <div className="mt-3 pt-3 border-t border-slate-600">
                    <button
                      onClick={handleCallJackal}
                      className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-lg text-white font-bold transition-all"
                    >
                      ジャッカル！
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm text-center">
                {isMyTurn ? 'ラウンド開始中...' : `${currentPlayer?.name}の\nターンです`}
              </div>
            )}
          </div>
        </div>

        {/* 下段: プレイヤーカード（全幅） */}
        <div className="bg-slate-800/50 rounded-xl p-4">
          <div className="flex flex-wrap justify-center gap-4">
            {turnOrder
              .map(pid => activePlayers.find(p => p.id === pid))
              .filter((p): p is Player => p !== undefined)
              .map((player) => {
                const card = getPlayerCard(player);
                const isCurrent = player.id === currentTurnPlayerId;
                const isMe = player.id === controlledPlayerId;

                return (
                  <div
                    key={player.id}
                    className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                      isCurrent ? 'bg-yellow-500/20 ring-2 ring-yellow-500' : 'bg-slate-700/50'
                    }`}
                  >
                    <Card
                      card={card}
                      hidden={isMe}
                      size="md"
                      highlighted={isCurrent}
                    />
                    <div className="mt-2 text-center">
                      <div className={`text-sm font-medium truncate max-w-20 ${isMe ? 'text-yellow-300' : 'text-white'}`}>
                        {player.name}
                        {isMe && ' (自分)'}
                      </div>
                      <div className="flex items-center justify-center gap-0.5 mt-1">
                        {Array.from({ length: player.life }).map((_, i) => (
                          <Heart key={i} className="w-3 h-3 text-red-400 fill-red-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* デバッグ情報 */}
        {debugMode && (
          <div className="bg-slate-700/50 rounded-lg p-3 text-left text-xs mt-4">
            <div className="text-slate-300 space-y-1">
              <span className="text-orange-400 font-bold">DEBUG: </span>
              <span>山札: {gameState.deck.length}枚 | </span>
              <span>カード: {Object.entries(dealtCards).map(([pid, card]) => {
                const p = players.find(p => p.id === pid);
                return `${p?.name}:${card.label}`;
              }).join(', ')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
