import { useState, useEffect } from 'react';
import { Heart, FlaskConical } from 'lucide-react';
import { Card } from './Card';
import { CardReference } from './CardReference';
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
    settings,
  } = gameState;

  const initialLife = settings.initialLife;

  const isMyTurn = currentTurnPlayerId === controlledPlayerId;
  const currentPlayer = players.find(p => p.id === currentTurnPlayerId);
  const lastDeclarer = players.find(p => p.id === lastDeclarerId);

  // アクティブなプレイヤー（脱落していない）
  const activePlayers = players.filter(p => !p.isEliminated);

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

  // プレイヤーのカードを取得
  const getPlayerCard = (player: Player): CardType | undefined => {
    return dealtCards[player.id];
  };

  const inputValueNum = parseInt(inputValue, 10);
  const isValidInput = !isNaN(inputValueNum) && inputValueNum >= minDeclareValue;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 p-4 pb-44 md:pb-4">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー（全幅） */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src="/boards/images/vec_logo_jackal.svg"
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

        {/* デバッグ用: プレイヤー切り替え（全幅） */}
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

        {/* カラムレイアウト */}
        <div className="flex gap-4">
          {/* 左カラム: カード一覧（PC専用） */}
          <div className="hidden lg:block w-44 flex-shrink-0">
            <CardReference />
          </div>

          {/* 右カラム: メインコンテンツ */}
          <div className="flex-1">
          {/* 上段: インフォボード（スマホ: 全幅 / PC: 70%+30%横並び） */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* インフォボード（スマホ: 全幅 / PC: 70%） */}
          <div className="w-full md:w-[70%] h-40 bg-slate-800/80 rounded-xl p-4 flex flex-col justify-center">
            {/* 現在の宣言値 */}
            <div className="text-center mb-3">
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

          {/* 宣言エリア（PC: 30%横並び / スマホ: 下部固定で別途表示） */}
          <div className="hidden md:flex w-[30%] h-40 bg-slate-800/80 rounded-xl p-4 flex-col">
            {phase === 'declaring' && isMyTurn ? (
              <>
                {/* 数字入力 */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="text-slate-400 text-xs mb-2 text-center">
                    {currentDeclaredValue !== null
                      ? `${minDeclareValue}以上を宣言`
                      : '数字を宣言'}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const current = parseInt(inputValue, 10) || minDeclareValue;
                        if (current > minDeclareValue) {
                          setInputValue(String(current - 1));
                        }
                      }}
                      disabled={!inputValue || parseInt(inputValue, 10) <= minDeclareValue}
                      className="w-10 h-10 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-bold text-xl transition-all flex-shrink-0"
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
                      className="flex-1 min-w-0 px-2 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-xl text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => {
                        const current = parseInt(inputValue, 10) || minDeclareValue - 1;
                        setInputValue(String(current + 1));
                      }}
                      className="w-10 h-10 bg-slate-600 hover:bg-slate-500 rounded-lg text-white font-bold text-xl transition-all flex-shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 宣言ボタン / ジャッカルボタン */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleDeclare}
                    disabled={!isValidInput}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 rounded-lg text-white font-bold transition-all text-sm"
                  >
                    宣言
                  </button>
                  {currentDeclaredValue !== null && (
                    <button
                      onClick={handleCallJackal}
                      className="flex-1 py-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-lg text-white font-bold transition-all text-sm"
                    >
                      ジャッカル！
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm text-center whitespace-pre-line">
                {isMyTurn ? 'ラウンド開始中...' : `${currentPlayer?.name}の\nターンです`}
              </div>
            )}
          </div>
        </div>

        {/* 下段: プレイヤーカード（全幅） */}
        <div className="bg-slate-800/50 rounded-xl p-4">
          <div className="flex flex-wrap justify-center gap-4">
            {/* アクティブプレイヤー（ターン順） */}
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
                      size="lg"
                      highlighted={isCurrent}
                    />
                    <div className="mt-2 text-center">
                      <div className={`text-sm font-medium truncate max-w-20 ${isMe ? 'text-yellow-300' : 'text-white'}`}>
                        {player.name}
                        {isMe && ' (自分)'}
                      </div>
                      <div className="flex items-center justify-center gap-0.5 mt-1">
                        {/* 現在のライフ（塗りつぶし） */}
                        {Array.from({ length: player.life }).map((_, i) => (
                          <Heart key={`filled-${i}`} className="w-3 h-3 text-red-400 fill-red-400" />
                        ))}
                        {/* 失ったライフ（中抜き） */}
                        {Array.from({ length: initialLife - player.life }).map((_, i) => (
                          <Heart key={`empty-${i}`} className="w-3 h-3 text-red-400/50" strokeWidth={2} />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* 脱落プレイヤー（右側にグレーアウト表示） */}
            {players
              .filter(p => p.isEliminated)
              .sort((a, b) => (a.eliminatedAt ?? 0) - (b.eliminatedAt ?? 0))
              .map((player) => {
                const isMe = player.id === controlledPlayerId;

                return (
                  <div
                    key={player.id}
                    className="flex flex-col items-center p-3 rounded-lg bg-slate-700/30 opacity-50 grayscale"
                  >
                    <Card
                      hidden={true}
                      size="lg"
                    />
                    <div className="mt-2 text-center">
                      <div className={`text-sm font-medium truncate max-w-20 text-slate-400`}>
                        {player.name}
                        {isMe && ' (自分)'}
                      </div>
                      <div className="flex items-center justify-center gap-0.5 mt-1">
                        {/* 全て失ったライフ（中抜き） */}
                        {Array.from({ length: initialLife }).map((_, i) => (
                          <Heart key={`empty-${i}`} className="w-3 h-3 text-red-400/50" strokeWidth={2} />
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
          {/* 右カラム終わり */}
        </div>
        {/* カラムレイアウト終わり */}
      </div>
      {/* max-w-7xl終わり */}

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
                className="flex-1 min-w-0 px-3 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-2xl text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              {currentDeclaredValue !== null && (
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
