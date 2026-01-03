import { useState } from 'react';
import { Heart, FlaskConical } from 'lucide-react';
import { Card } from './Card';
import type { GameState, Player, Card as CardType } from '../types/game';

interface GamePlayPhaseProps {
  gameState: GameState;
  playerId: string;
  playerName: string;
  debugMode?: boolean;
  onDeclare: (value: number, actingPlayerId: string) => void;
  onCallJackal: (actingPlayerId: string) => void;
  onLeaveRoom: () => void;
}

export const GamePlayPhase = ({
  gameState,
  playerId,
  playerName,
  debugMode = false,
  onDeclare,
  onCallJackal,
  onLeaveRoom,
}: GamePlayPhaseProps) => {
  const [selectedValue, setSelectedValue] = useState<number | null>(null);

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

  // 自分以外のプレイヤー（脱落していない）
  const activePlayers = players.filter(p => !p.isEliminated);
  const otherPlayers = activePlayers.filter(p => p.id !== controlledPlayerId);
  const myPlayer = players.find(p => p.id === controlledPlayerId);

  // 宣言可能な数字の範囲を計算
  const minDeclareValue = (currentDeclaredValue ?? 0) + 1;
  const maxDeclareValue = 100; // 合理的な上限

  // 宣言数字の選択肢を生成
  const declareOptions = [];
  for (let i = minDeclareValue; i <= Math.min(minDeclareValue + 19, maxDeclareValue); i++) {
    declareOptions.push(i);
  }

  const handleDeclare = () => {
    if (selectedValue !== null && selectedValue >= minDeclareValue) {
      onDeclare(selectedValue, controlledPlayerId);
      setSelectedValue(null);
    }
  };

  const handleCallJackal = () => {
    onCallJackal(controlledPlayerId);
  };

  // プレイヤーのカードを取得（自分のは見えない）
  const getPlayerCard = (player: Player): CardType | undefined => {
    return dealtCards[player.id];
  };

  // ターン順での位置を取得
  const getTurnPosition = (pid: string): number => {
    return turnOrder.indexOf(pid);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-white">ラウンド {round}</h1>
          {debugMode && (
            <span className="text-xs bg-orange-600 text-white px-2 py-0.5 rounded inline-flex items-center gap-1 mt-1">
              <FlaskConical className="w-3 h-3" />
              デバッグモード
            </span>
          )}
        </div>

        {/* デバッグ用: プレイヤー切り替え */}
        {debugMode && (
          <div className="bg-orange-900/30 border border-orange-600/50 rounded-xl p-4 mb-4">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-orange-400" />
              デバッグ: プレイヤー操作
            </h3>
            <div className="flex flex-wrap gap-2">
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
                      px-3 py-2 rounded-lg text-sm font-bold transition-all
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
            <p className="text-orange-300/70 text-xs mt-2">
              ★=現在のターン / 操作したいプレイヤーをクリック
            </p>
          </div>
        )}

        {/* 現在の宣言値 */}
        <div className="bg-slate-800/80 rounded-xl p-4 mb-4 text-center">
          <div className="text-slate-400 text-sm mb-1">
            {lastDeclarer ? `${lastDeclarer.name}の宣言` : '最初の宣言'}
          </div>
          <div className="text-4xl font-bold text-white">
            {currentDeclaredValue !== null ? currentDeclaredValue : '—'}
          </div>
        </div>

        {/* ターン表示 */}
        <div className="bg-slate-800/60 rounded-lg p-3 mb-4 text-center">
          {phase === 'declaring' && (
            <span className="text-white">
              {isMyTurn ? (
                <span className="text-yellow-400 font-bold">あなたの番です</span>
              ) : (
                <span>{currentPlayer?.name}の番...</span>
              )}
            </span>
          )}
          {phase === 'round_start' && (
            <span className="text-white">ラウンド開始！</span>
          )}
        </div>

        {/* 他プレイヤーのカード表示 */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
          <h3 className="text-slate-400 text-sm mb-3 text-center">他のプレイヤー</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {otherPlayers.map((player) => {
              const card = getPlayerCard(player);
              const isCurrent = player.id === currentTurnPlayerId;
              const turnPos = getTurnPosition(player.id);

              return (
                <div
                  key={player.id}
                  className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                    isCurrent ? 'bg-yellow-500/20 ring-2 ring-yellow-500' : 'bg-slate-700/50'
                  }`}
                >
                  <Card card={card} size="md" highlighted={isCurrent} />
                  <div className="mt-2 text-center">
                    <div className="text-white text-sm font-medium truncate max-w-20">
                      {player.name}
                    </div>
                    <div className="flex items-center justify-center gap-0.5 mt-1">
                      {Array.from({ length: player.life }).map((_, i) => (
                        <Heart key={i} className="w-3 h-3 text-red-400 fill-red-400" />
                      ))}
                    </div>
                    <div className="text-slate-500 text-xs mt-1">
                      #{turnPos + 1}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 自分のカード（見えない） */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
          <h3 className="text-slate-400 text-sm mb-3 text-center">あなたのカード</h3>
          <div className="flex justify-center">
            <div className={`flex flex-col items-center p-3 rounded-lg ${
              isMyTurn ? 'bg-yellow-500/20 ring-2 ring-yellow-500' : 'bg-slate-700/50'
            }`}>
              <Card hidden size="lg" highlighted={isMyTurn} />
              <div className="mt-2 text-center">
                <div className="text-white text-sm font-medium">{myPlayer?.name ?? playerName}</div>
                <div className="flex items-center justify-center gap-0.5 mt-1">
                  {Array.from({ length: myPlayer?.life ?? 0 }).map((_, i) => (
                    <Heart key={i} className="w-3 h-3 text-red-400 fill-red-400" />
                  ))}
                </div>
                <div className="text-slate-500 text-xs mt-1">
                  #{getTurnPosition(controlledPlayerId) + 1}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* アクション領域 */}
        {phase === 'declaring' && isMyTurn && (
          <div className="bg-slate-800/80 rounded-xl p-4 mb-4">
            <h3 className="text-white font-bold text-center mb-3">アクション</h3>

            {/* 数字宣言 */}
            <div className="mb-4">
              <div className="text-slate-400 text-sm mb-2">
                {currentDeclaredValue !== null
                  ? `${currentDeclaredValue}より大きい数字を宣言`
                  : '最初の数字を宣言'}
              </div>
              <div className="flex flex-wrap gap-2 mb-3 max-h-32 overflow-y-auto">
                {declareOptions.map((value) => (
                  <button
                    key={value}
                    onClick={() => setSelectedValue(value)}
                    className={`w-10 h-10 rounded-lg font-bold transition-all ${
                      selectedValue === value
                        ? 'bg-indigo-500 text-white ring-2 ring-indigo-300'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <button
                onClick={handleDeclare}
                disabled={selectedValue === null}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 rounded-lg text-white font-bold transition-all"
              >
                {selectedValue !== null ? `${selectedValue} を宣言` : '数字を選択してください'}
              </button>
            </div>

            {/* ジャッカル宣言 */}
            {currentDeclaredValue !== null && (
              <div className="border-t border-slate-600 pt-4">
                <button
                  onClick={handleCallJackal}
                  className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-lg text-white font-bold text-lg transition-all"
                >
                  ジャッカル！
                </button>
                <p className="text-slate-500 text-xs text-center mt-2">
                  {currentDeclaredValue}が合計を超えていると思ったら
                </p>
              </div>
            )}
          </div>
        )}

        {/* 待機中メッセージ */}
        {phase === 'declaring' && !isMyTurn && (
          <div className="bg-slate-800/60 rounded-xl p-6 mb-4 text-center">
            <div className="text-slate-400">
              {currentPlayer?.name}のターンです...
            </div>
          </div>
        )}

        {/* デバッグ情報 */}
        {debugMode && (
          <div className="bg-slate-700/50 rounded-lg p-4 text-left text-sm mb-4">
            <h3 className="text-orange-400 font-bold mb-2">デバッグ情報</h3>
            <div className="text-slate-300 space-y-1 text-xs">
              <div>フェーズ: {phase}</div>
              <div>山札残り: {gameState.deck.length}枚</div>
              <div>ターン順: {turnOrder.map((id, i) => {
                const p = players.find(p => p.id === id);
                return `${i+1}.${p?.name}`;
              }).join(' → ')}</div>
              <div className="mt-2 font-bold text-yellow-400">全カード（デバッグ用）:</div>
              {Object.entries(dealtCards).map(([pid, card]) => {
                const p = players.find(p => p.id === pid);
                return (
                  <div key={pid} className={pid === playerId ? 'text-yellow-300' : ''}>
                    {p?.name}: {card.label} {pid === playerId && '(自分)'}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 退出ボタン */}
        <div className="text-center">
          <button
            onClick={onLeaveRoom}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
          >
            退出
          </button>
        </div>
      </div>
    </div>
  );
};
