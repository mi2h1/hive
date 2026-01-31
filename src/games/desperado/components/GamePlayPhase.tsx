import { useCallback, useRef } from 'react';
import { Skull, Heart, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';
import type { GameState, DiceResult } from '../types/game';
import { getRollRank, getRollDisplayName, findWeakestPlayers } from '../lib/dice';
import { DiceRoller, type DiceRollerHandle } from './DiceRoller';
import { RoundResultModal } from './RoundResultModal';

interface GamePlayPhaseProps {
  gameState: GameState;
  playerId: string;
  isHost: boolean;
  onUpdateGameState: (state: Partial<GameState>) => void;
  onSetDddiceReady: (playerId: string) => void;
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
  onSetDddiceReady,
  onLeaveRoom,
}: GamePlayPhaseProps) => {
  const currentPlayer = gameState.players.find(p => p.id === playerId);
  const activePlayers = gameState.players.filter(p => !p.isEliminated);
  const isMyTurn = gameState.currentTurnPlayerId === playerId;
  const diceRollerRef = useRef<DiceRollerHandle>(null);

  // 全員がdddice接続完了しているかチェック
  const dddiceReady = gameState.dddiceReady || {};
  const allPlayersReady = activePlayers.every(p => dddiceReady[p.id]);

  // dddice接続完了時のハンドラ
  const handleDddiceConnected = useCallback(() => {
    onSetDddiceReady(playerId);
  }, [playerId, onSetDddiceReady]);

  // ダイスを振り始める（dddiceに通知）
  const handleStartRoll = useCallback(() => {
    if (!currentPlayer || currentPlayer.hasRolled || !isMyTurn) return;
    onUpdateGameState({ rollingPlayerId: playerId });
  }, [currentPlayer, isMyTurn, playerId, onUpdateGameState]);

  // dddiceからの結果を受け取る
  const handleRollComplete = useCallback((die1: number, die2: number) => {
    const result: DiceResult = { die1, die2 };

    const updatedPlayers = gameState.players.map(p => {
      if (p.id === playerId) {
        const isReroll = p.currentRoll != null;
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

  // 振り直し
  const handleReroll = useCallback(() => {
    diceRollerRef.current?.triggerRoll();
  }, []);

  // 次のラウンドへ
  const handleNextRound = () => {
    const rolledPlayers = activePlayers
      .filter(p => p.currentRoll)
      .map(p => ({ playerId: p.id, roll: p.currentRoll as DiceResult }));

    const loserIds = findWeakestPlayers(rolledPlayers);
    const penalty = gameState.desperadoRolledThisRound ? 2 : 1;

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

    const remainingPlayers = updatedPlayers.filter(p => !p.isEliminated);

    if (remainingPlayers.length <= 1) {
      onUpdateGameState({
        players: updatedPlayers,
        phase: 'game_end',
        winnerId: remainingPlayers[0]?.id ?? null,
        rollingPlayerId: null,
      });
    } else {
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

  // 現在のターンプレイヤー
  const currentTurnPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
  const someoneIsRolling = !!gameState.rollingPlayerId;
  const rollingPlayer = gameState.players.find(p => p.id === gameState.rollingPlayerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 to-red-900">
      <div className="min-h-screen bg-black/20 p-4">
        <div className="max-w-5xl mx-auto">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src="/hive/images/vec_logo_desperado.svg"
                alt="Desperado"
                className="h-6"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <span className="text-amber-400 font-bold">ラウンド {gameState.currentRound}</span>
            </div>
            {/* 中央: デスペラード発動中表示 */}
            <div className="flex-1 text-center">
              {gameState.desperadoRolledThisRound && (
                <span className="text-red-400 font-bold animate-pulse text-sm">
                  デスペラード発動中！ペナルティ2倍！
                </span>
              )}
            </div>
            <button
              onClick={onLeaveRoom}
              className="px-4 py-2 bg-slate-700/80 hover:bg-slate-600
                rounded-lg text-slate-300 text-sm font-bold transition-all"
            >
              退出
            </button>
          </div>

          {/* 2カラムレイアウト（左:ダイス 広め、右:プレイヤー 狭め） */}
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
            {/* 左カラム: ダイスフィールド */}
            <div className="bg-slate-800/90 rounded-xl p-4 space-y-4">
              {/* ステータス表示（min-height: 2行分を確保） */}
              <div className="text-center min-h-[3.5rem] flex flex-col items-center justify-center">
                {gameState.phase === 'rolling' && (
                  <>
                    {!allPlayersReady ? (
                      <p className="text-slate-400 animate-pulse">全員の準備完了を待っています...</p>
                    ) : isMyTurn && currentPlayer && !currentPlayer.hasRolled && gameState.rollingPlayerId === playerId ? (
                      <p className="text-amber-400 font-bold animate-pulse">ダイスロール中...</p>
                    ) : isMyTurn && currentPlayer && !currentPlayer.hasRolled && currentPlayer.currentRoll ? (
                      <>
                        <p className="text-amber-400 font-bold">キープするか振り直すか選んでください</p>
                        <p className="text-slate-400 text-sm">残り振り直し: {currentPlayer.rerollsRemaining ?? 0}回</p>
                      </>
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
                  </>
                )}
              </div>

              {/* DiceRoller */}
              <DiceRoller
                ref={diceRollerRef}
                isHost={isHost}
                dddiceRoomSlug={gameState.dddiceRoomSlug}
                onDddiceRoomCreated={handleDddiceRoomCreated}
                onRollComplete={handleRollComplete}
                onStartRoll={handleStartRoll}
                rollingPlayerId={gameState.rollingPlayerId}
                onConnected={handleDddiceConnected}
                displayedDice={currentTurnPlayer?.currentRoll ?? null}
              />

              {/* ボタンエリア（高さ固定） */}
              <div className="min-h-[6rem] flex flex-col justify-center">
                {/* ダイスを振るボタン */}
                {gameState.phase === 'rolling' &&
                  allPlayersReady &&
                  isMyTurn &&
                  currentPlayer &&
                  !currentPlayer.hasRolled &&
                  !currentPlayer.currentRoll &&
                  !someoneIsRolling && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => diceRollerRef.current?.triggerRoll()}
                        className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500
                          hover:from-amber-600 hover:to-orange-600 rounded-full text-white
                          font-bold text-lg transition-all shadow-lg border-2 border-amber-300/30"
                      >
                        ダイスを振る
                      </button>
                    </div>
                  )}

                {/* 振り直し/キープ選択 */}
                {gameState.phase === 'rolling' &&
                  isMyTurn &&
                  currentPlayer &&
                  !currentPlayer.hasRolled &&
                  currentPlayer.currentRoll && (
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-white font-bold text-lg">
                          {getRollDisplayName(currentPlayer.currentRoll)}
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
              </div>
            </div>

            {/* 右カラム: プレイヤー一覧 */}
            <div className="bg-slate-800/90 rounded-xl p-4">
              <h2 className="text-slate-400 text-sm mb-3">プレイヤー</h2>
              <div className="space-y-2">
                {gameState.players.map((player) => {
                  const isCurrentTurn = gameState.currentTurnPlayerId === player.id;
                  const isMe = player.id === playerId;

                  return (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg transition-all ${
                        player.isEliminated
                          ? 'bg-slate-700/50 opacity-50'
                          : isCurrentTurn
                          ? 'bg-amber-600/30 ring-2 ring-amber-500'
                          : 'bg-slate-700/50'
                      }`}
                    >
                      {/* 上段: 名前 + ライフ */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {player.isEliminated && <Skull className="w-4 h-4 text-slate-500" />}
                          <span className={`font-bold ${player.isEliminated ? 'text-slate-500 line-through' : 'text-white'}`}>
                            {player.name}
                          </span>
                          {isMe && <span className="text-slate-400 text-xs">(自分)</span>}
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Heart
                              key={i}
                              className={`w-4 h-4 ${i < player.lives ? 'text-red-500 fill-red-500' : 'text-slate-600'}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* 下段: ダイス状況 */}
                      <div className="flex items-center justify-end gap-2">
                        {player.currentRoll ? (
                          <>
                            <div className="flex items-center gap-0.5">
                              <DiceIcon value={player.currentRoll.die1} className="w-6 h-6 text-white" />
                              <DiceIcon value={player.currentRoll.die2} className="w-6 h-6 text-white" />
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
                          <span className="text-slate-500 text-sm">振り済み</span>
                        ) : isCurrentTurn && !player.isEliminated ? (
                          <span className="text-amber-400 text-sm animate-pulse">振る番</span>
                        ) : !player.isEliminated ? (
                          <span className="text-slate-500 text-sm">待機中</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ラウンド結果モーダル */}
      {gameState.phase === 'result' && (
        <RoundResultModal
          gameState={gameState}
          playerId={playerId}
          isHost={isHost}
          onNextRound={handleNextRound}
        />
      )}
    </div>
  );
};
