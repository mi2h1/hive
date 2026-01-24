import { useCallback, useRef } from 'react';
import { Skull, Heart, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';
import type { GameState, DiceResult } from '../types/game';
import { getRollRank, getRollDisplayName, findWeakestPlayers } from '../lib/dice';
import { DiceRoller, type DiceRollerHandle } from './DiceRoller';

interface GamePlayPhaseProps {
  gameState: GameState;
  playerId: string;
  isHost: boolean;
  onUpdateGameState: (state: Partial<GameState>) => void;
  onLeaveRoom: () => void;
}

// サイコロの目に対応するアイコン
const DiceIcon = ({ value, className }: { value: number; className?: string }) => {
  const icons = {
    1: Dice1,
    2: Dice2,
    3: Dice3,
    4: Dice4,
    5: Dice5,
    6: Dice6,
  };
  const Icon = icons[value as keyof typeof icons] || Dice1;
  return <Icon className={className} />;
};

export const GamePlayPhase = ({
  gameState,
  playerId,
  isHost,
  onUpdateGameState,
  onLeaveRoom,
}: GamePlayPhaseProps) => {
  const currentPlayer = gameState.players.find(p => p.id === playerId);
  const activePlayers = gameState.players.filter(p => !p.isEliminated);
  const isMyTurn = gameState.currentTurnPlayerId === playerId;
  const diceRollerRef = useRef<DiceRollerHandle>(null);

  // ダイスを振り始める（dddiceに通知）
  const handleStartRoll = useCallback(() => {
    if (!currentPlayer || currentPlayer.hasRolled || !isMyTurn) return;
    // 他のプレイヤーに「振り始めた」ことを通知
    onUpdateGameState({ rollingPlayerId: playerId });
  }, [currentPlayer, isMyTurn, playerId, onUpdateGameState]);

  // dddiceからの結果を受け取る（振り直し可能な状態に）
  const handleRollComplete = useCallback((die1: number, die2: number) => {
    const result: DiceResult = { die1, die2 };

    // プレイヤーの出目を更新
    // 振り直しの場合のみrerollsRemainingを減らす（最初のロールでは減らさない）
    const updatedPlayers = gameState.players.map(p => {
      if (p.id === playerId) {
        const isReroll = p.currentRoll != null; // 既に出目があれば振り直し（null/undefined両方チェック）
        return {
          ...p,
          currentRoll: result,
          rerollsRemaining: isReroll ? Math.max(0, (p.rerollsRemaining ?? 2) - 1) : (p.rerollsRemaining ?? 2),
        };
      }
      return p;
    });

    onUpdateGameState({
      players: updatedPlayers,
      rollingPlayerId: null,
    });
  }, [gameState.players, playerId, onUpdateGameState]);

  // 出目をキープして次のプレイヤーへ
  const handleKeepRoll = useCallback(() => {
    if (!currentPlayer || !currentPlayer.currentRoll) return;

    const rank = getRollRank(currentPlayer.currentRoll);
    const isDesperado = rank.type === 'desperado';

    // hasRolledをtrueに
    const updatedPlayers = gameState.players.map(p => {
      if (p.id === playerId) {
        return { ...p, hasRolled: true };
      }
      return p;
    });

    // 次のプレイヤーを決定
    const currentIndex = gameState.turnOrder.indexOf(playerId);
    let nextPlayerId: string | null = null;

    for (let i = 1; i < gameState.turnOrder.length; i++) {
      const nextIndex = (currentIndex + i) % gameState.turnOrder.length;
      const nextId = gameState.turnOrder[nextIndex];
      const nextPlayer = updatedPlayers.find(p => p.id === nextId);
      if (nextPlayer && !nextPlayer.isEliminated && !nextPlayer.hasRolled) {
        nextPlayerId = nextId;
        break;
      }
    }

    // 全員振ったかチェック
    const allHaveRolled = updatedPlayers
      .filter(p => !p.isEliminated)
      .every(p => p.hasRolled);

    onUpdateGameState({
      players: updatedPlayers,
      currentTurnPlayerId: allHaveRolled ? null : nextPlayerId,
      desperadoRolledThisRound: gameState.desperadoRolledThisRound || isDesperado,
      phase: allHaveRolled ? 'result' : 'rolling',
    });
  }, [currentPlayer, gameState.players, gameState.turnOrder, gameState.desperadoRolledThisRound, playerId, onUpdateGameState]);

  // dddice ルームが作成された時
  const handleDddiceRoomCreated = useCallback((slug: string) => {
    onUpdateGameState({ dddiceRoomSlug: slug });
  }, [onUpdateGameState]);

  // 振り直し（DiceRollerのtriggerRollを呼ぶ）
  const handleReroll = useCallback(() => {
    diceRollerRef.current?.triggerRoll();
  }, []);

  // 次のラウンドへ
  const handleNextRound = () => {
    // 負けたプレイヤーを特定
    const rolledPlayers = activePlayers
      .filter(p => p.currentRoll)
      .map(p => ({ playerId: p.id, roll: p.currentRoll as DiceResult }));

    const loserIds = findWeakestPlayers(rolledPlayers);
    const penalty = gameState.desperadoRolledThisRound ? 2 : 1;

    // ライフを減らす & 振り直し回数をリセット
    const updatedPlayers = gameState.players.map(p => {
      if (loserIds.includes(p.id)) {
        const newLives = Math.max(0, p.lives - penalty);
        return {
          ...p,
          lives: newLives,
          isEliminated: newLives <= 0,
          currentRoll: null,
          hasRolled: false,
          rerollsRemaining: 2,
        };
      }
      return {
        ...p,
        currentRoll: null,
        hasRolled: false,
        rerollsRemaining: 2,
      };
    });

    // 残りプレイヤーをチェック
    const remainingPlayers = updatedPlayers.filter(p => !p.isEliminated);

    if (remainingPlayers.length <= 1) {
      // ゲーム終了
      onUpdateGameState({
        players: updatedPlayers,
        phase: 'game_end',
        winnerId: remainingPlayers[0]?.id ?? null,
        rollingPlayerId: null,
      });
    } else {
      // 次のラウンド開始
      // 新しいターン順（前回の負けた人から開始、または既存順）
      const newTurnOrder = [...gameState.turnOrder].filter(id =>
        updatedPlayers.find(p => p.id === id && !p.isEliminated)
      );

      onUpdateGameState({
        players: updatedPlayers,
        phase: 'rolling',
        currentRound: gameState.currentRound + 1,
        desperadoRolledThisRound: false,
        currentTurnPlayerId: loserIds[0] && !updatedPlayers.find(p => p.id === loserIds[0])?.isEliminated
          ? loserIds[0]
          : newTurnOrder[0],
        turnOrder: newTurnOrder,
        lastLoser: loserIds[0] ?? null,
        rollingPlayerId: null,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 to-red-900">
      <div className="min-h-screen bg-black/20 p-4">
        <div className="max-w-2xl mx-auto">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src="/boards/images/vec_logo_desperado.svg"
                alt="Desperado"
                className="h-6"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <span className="text-amber-400 font-bold">ラウンド {gameState.currentRound}</span>
            </div>
            <button
              onClick={onLeaveRoom}
              className="px-4 py-2 bg-slate-700/80 hover:bg-slate-600
                rounded-lg text-slate-300 text-sm font-bold transition-all"
            >
              退出
            </button>
          </div>
          {gameState.desperadoRolledThisRound && (
            <p className="text-red-400 font-bold text-center mb-4 animate-pulse">
              デスペラード発動中！ペナルティ2倍！
            </p>
          )}

          {/* プレイヤー一覧 */}
          <div className="bg-slate-800/90 rounded-xl p-4 mb-4">
            <h2 className="text-slate-400 text-sm mb-3">プレイヤー</h2>
            <div className="space-y-2">
              {gameState.players.map((player) => {
                const isCurrentTurn = gameState.currentTurnPlayerId === player.id;
                const isMe = player.id === playerId;
                const isLoser = gameState.phase === 'result' &&
                  findWeakestPlayers(
                    activePlayers
                      .filter(p => p.currentRoll)
                      .map(p => ({ playerId: p.id, roll: p.currentRoll as DiceResult }))
                  ).includes(player.id);

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                      player.isEliminated
                        ? 'bg-slate-700/50 opacity-50'
                        : isCurrentTurn
                        ? 'bg-amber-600/30 ring-2 ring-amber-500'
                        : isLoser
                        ? 'bg-red-600/30 ring-2 ring-red-500'
                        : 'bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* 名前 */}
                      <div className="flex items-center gap-2">
                        {player.isEliminated && <Skull className="w-4 h-4 text-slate-500" />}
                        <span className={`font-bold ${player.isEliminated ? 'text-slate-500 line-through' : 'text-white'}`}>
                          {player.name}
                        </span>
                        {isMe && <span className="text-slate-400 text-xs">(自分)</span>}
                      </div>

                      {/* ライフ */}
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Heart
                            key={i}
                            className={`w-4 h-4 ${i < player.lives ? 'text-red-500 fill-red-500' : 'text-slate-600'}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* 出目 */}
                    <div className="flex items-center gap-2">
                      {player.currentRoll ? (
                        <>
                          <div className="flex items-center gap-1">
                            <DiceIcon value={player.currentRoll.die1} className="w-8 h-8 text-white" />
                            <DiceIcon value={player.currentRoll.die2} className="w-8 h-8 text-white" />
                          </div>
                          <span className={`text-sm font-bold ${
                            getRollRank(player.currentRoll).type === 'desperado'
                              ? 'text-amber-400'
                              : getRollRank(player.currentRoll).type === 'doubles'
                              ? 'text-purple-400'
                              : 'text-slate-300'
                          }`}>
                            {getRollDisplayName(player.currentRoll)}
                          </span>
                        </>
                      ) : player.hasRolled ? (
                        <span className="text-slate-500">振り済み</span>
                      ) : isCurrentTurn && !player.isEliminated ? (
                        <span className="text-amber-400 animate-pulse">振る番</span>
                      ) : !player.isEliminated ? (
                        <span className="text-slate-500">待機中</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ダイスエリア（常に表示） */}
          {(gameState.phase === 'rolling' || gameState.phase === 'result') && (() => {
            // 現在のターンプレイヤー
            const currentTurnPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
            // 誰かがダイスを振っているか
            const someoneIsRolling = !!gameState.rollingPlayerId;
            // 振っている人
            const rollingPlayer = gameState.players.find(p => p.id === gameState.rollingPlayerId);

            return (
              <div className="bg-slate-800/90 rounded-xl p-4 space-y-4">
                {/* ステータス表示 */}
                {gameState.phase === 'rolling' && (
                  <div className="text-center">
                    {isMyTurn && currentPlayer && !currentPlayer.hasRolled && currentPlayer.currentRoll ? (
                      <p className="text-amber-400 font-bold">キープするか振り直すか選んでください</p>
                    ) : isMyTurn && currentPlayer && !currentPlayer.hasRolled ? (
                      <p className="text-amber-400 font-bold">あなたの番です</p>
                    ) : someoneIsRolling ? (
                      <p className="text-amber-400">
                        {`${rollingPlayer?.name}がダイスを振っています`}
                      </p>
                    ) : currentPlayer?.hasRolled ? (
                      <p className="text-slate-400">{currentTurnPlayer?.name}の番を待っています...</p>
                    ) : (
                      <p className="text-amber-400">{currentTurnPlayer?.name}の番です</p>
                    )}
                  </div>
                )}

                {/* DiceRoller - dddiceで全員に同期表示 */}
                <DiceRoller
                  ref={diceRollerRef}
                  isHost={isHost}
                  dddiceRoomSlug={gameState.dddiceRoomSlug}
                  onDddiceRoomCreated={handleDddiceRoomCreated}
                  onRollComplete={handleRollComplete}
                  isMyTurn={isMyTurn && !currentPlayer?.hasRolled && gameState.phase === 'rolling'}
                  onStartRoll={handleStartRoll}
                  showButton={!!(
                    gameState.phase === 'rolling' &&
                    isMyTurn &&
                    currentPlayer &&
                    !currentPlayer.hasRolled &&
                    !currentPlayer.currentRoll // まだ振っていない場合のみ「ダイスを振る」表示
                  )}
                  rollingPlayerId={gameState.rollingPlayerId}
                />

                {/* 振り直し/キープ選択（自分のターンで、振った後、まだ確定していない場合） */}
                {gameState.phase === 'rolling' &&
                  isMyTurn &&
                  currentPlayer &&
                  !currentPlayer.hasRolled &&
                  currentPlayer.currentRoll && (
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-white font-bold">
                          {getRollDisplayName(currentPlayer.currentRoll)}
                        </p>
                        <p className="text-slate-400 text-sm">
                          残り振り直し: {currentPlayer.rerollsRemaining ?? 0}回
                        </p>
                      </div>
                      <div className="flex gap-3">
                        {(currentPlayer.rerollsRemaining ?? 0) > 0 && (
                          <button
                            onClick={handleReroll}
                            className="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-500
                              rounded-lg text-white font-bold transition-all"
                          >
                            振り直す
                          </button>
                        )}
                        <button
                          onClick={handleKeepRoll}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500
                            hover:from-amber-600 hover:to-orange-600 rounded-lg text-white font-bold transition-all"
                        >
                          キープ
                        </button>
                      </div>
                    </div>
                  )}

                {/* 結果表示 */}
                {gameState.phase === 'result' && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-white text-lg mb-2">ラウンド結果</p>
                      {(() => {
                        const loserIds = findWeakestPlayers(
                          activePlayers
                            .filter(p => p.currentRoll)
                            .map(p => ({ playerId: p.id, roll: p.currentRoll as DiceResult }))
                        );
                        const losers = loserIds.map(id => gameState.players.find(p => p.id === id)?.name).join(', ');
                        const penalty = gameState.desperadoRolledThisRound ? 2 : 1;
                        return (
                          <p className="text-red-400 font-bold">
                            {losers} が ライフ-{penalty}
                          </p>
                        );
                      })()}
                    </div>
                    {isHost ? (
                      <button
                        onClick={handleNextRound}
                        className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500
                          hover:from-amber-600 hover:to-orange-600 rounded-lg text-white font-bold transition-all"
                      >
                        次のラウンドへ
                      </button>
                    ) : (
                      <div className="text-center text-slate-400 py-3">
                        ホストの操作を待っています...
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
};
