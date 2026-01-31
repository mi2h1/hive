import { useState, useEffect } from 'react';
import { FlaskConical } from 'lucide-react';
import { CardReference } from './CardReference';
import { PlayerCardsPolygon } from './PlayerCardsPolygon';
import { DeclarationPanel } from './DeclarationPanel';
import type { GameState } from '../types/game';

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
    settings,
  } = gameState;

  const initialLife = settings.initialLife;

  const isMyTurn = currentTurnPlayerId === controlledPlayerId;
  const currentPlayer = players.find(p => p.id === currentTurnPlayerId);
  const lastDeclarer = players.find(p => p.id === lastDeclarerId);

  // アクティブなプレイヤー（脱落していない）
  const activePlayers = players.filter(p => !p.isEliminated);
  const eliminatedPlayers = players.filter(p => p.isEliminated);

  // 宣言可能な最小値
  const minDeclareValue = (currentDeclaredValue ?? 0) + 1;

  // 自分のターンになったら最小値を自動入力
  useEffect(() => {
    if (isMyTurn) {
      setInputValue(String(minDeclareValue));
    }
  }, [isMyTurn, minDeclareValue]);

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

  const inputValueNum = parseInt(inputValue, 10);
  const isValidInput = !isNaN(inputValueNum) && inputValueNum >= minDeclareValue;

  // ジャッカルは2手目以降（誰かが既に宣言した後）のみ可能
  const canCallJackal = !!lastDeclarerId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 p-4 pb-44 md:pb-4">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src="/hive/images/vec_logo_jackal.svg"
              alt="ジャッカル"
              className="h-7 filter brightness-0 invert"
            />
            <h1 className="text-xl font-bold text-white">ラウンド {round}</h1>
          </div>
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

        {/* メインレイアウト: PC(lg) = 左右分割 / タブレット(md) = 上下分割 / スマホ = 多角形+下部固定 */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 左カラム（PC: 70%程度） */}
          <div className="flex-1">
            {/* 多角形配置のプレイヤーカード + 中央宣言値 */}
            <PlayerCardsPolygon
              activePlayers={activePlayers}
              eliminatedPlayers={eliminatedPlayers}
              turnOrder={turnOrder}
              currentTurnPlayerId={currentTurnPlayerId}
              controlledPlayerId={controlledPlayerId}
              dealtCards={dealtCards}
              initialLife={initialLife}
              currentDeclaredValue={currentDeclaredValue}
              lastDeclarerName={lastDeclarer?.name}
              currentPlayerName={currentPlayer?.name}
              isMyTurn={isMyTurn}
              phase={phase}
            />

            {/* タブレット用: 宣言パネル（mdで表示、lgで非表示） */}
            <div className="hidden md:block lg:hidden mt-4">
              <DeclarationPanel
                inputValue={inputValue}
                setInputValue={setInputValue}
                minDeclareValue={minDeclareValue}
                currentDeclaredValue={currentDeclaredValue}
                canCallJackal={canCallJackal}
                isMyTurn={isMyTurn}
                isValidInput={isValidInput}
                currentPlayerName={currentPlayer?.name}
                phase={phase as 'declaring' | 'round_start'}
                onDeclare={handleDeclare}
                onCallJackal={handleCallJackal}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {/* 右カラム（PC専用: lg:w-72） */}
          <div className="hidden lg:flex lg:w-72 flex-col gap-4">
            {/* 宣言パネル */}
            <div className="h-40">
              <DeclarationPanel
                inputValue={inputValue}
                setInputValue={setInputValue}
                minDeclareValue={minDeclareValue}
                currentDeclaredValue={currentDeclaredValue}
                canCallJackal={canCallJackal}
                isMyTurn={isMyTurn}
                isValidInput={isValidInput}
                currentPlayerName={currentPlayer?.name}
                phase={phase as 'declaring' | 'round_start'}
                onDeclare={handleDeclare}
                onCallJackal={handleCallJackal}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* カード一覧 */}
            <CardReference />
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

      {/* スマホ用: 下部固定の入力パネル */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-slate-900/95 backdrop-blur border-t border-slate-700 p-4">
        {phase === 'declaring' && isMyTurn ? (
          <div className="max-w-lg mx-auto">
            {/* 数字入力 */}
            <div className="text-slate-400 text-xs mb-2 text-center">
              {currentDeclaredValue !== null
                ? `${minDeclareValue}以上を宣言`
                : '数字を宣言'}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => {
                  const current = parseInt(inputValue, 10) || minDeclareValue;
                  if (current > minDeclareValue) {
                    setInputValue(String(current - 1));
                  }
                }}
                disabled={!inputValue || parseInt(inputValue, 10) <= minDeclareValue}
                className="w-12 h-12 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-bold text-2xl transition-all flex-shrink-0"
              >
                −
              </button>
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={String(minDeclareValue)}
                min={minDeclareValue}
                className="flex-1 min-w-0 px-3 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-2xl text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={() => {
                  const current = parseInt(inputValue, 10) || minDeclareValue - 1;
                  setInputValue(String(current + 1));
                }}
                className="w-12 h-12 bg-slate-600 hover:bg-slate-500 rounded-lg text-white font-bold text-2xl transition-all flex-shrink-0"
              >
                +
              </button>
            </div>

            {/* 宣言ボタン / ジャッカルボタン */}
            <div className="flex gap-3">
              <button
                onClick={handleDeclare}
                disabled={!isValidInput}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 rounded-lg text-white font-bold transition-all"
              >
                宣言
              </button>
              {canCallJackal && (
                <button
                  onClick={handleCallJackal}
                  className="flex-1 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-lg text-white font-bold transition-all"
                >
                  ジャッカル！
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 py-2">
            {isMyTurn ? 'ラウンド開始中...' : `${currentPlayer?.name}のターンです`}
          </div>
        )}
      </div>
    </div>
  );
};
