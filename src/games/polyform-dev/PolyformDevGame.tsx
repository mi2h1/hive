import { useEffect, useState } from 'react';
import { usePlayer } from '../../shared/hooks/usePlayer';
import { useRoom } from './hooks/useRoom';
import { Lobby } from './components/Lobby';
import { GamePlayPhase } from './components/GamePlayPhase';
import { GameStartTransition } from './components/GameStartTransition';

interface PolyformDevGameProps {
  onBack?: () => void;
}

export const PolyformDevGame = ({ onBack }: PolyformDevGameProps) => {
  const { playerId, playerName } = usePlayer();
  const {
    roomCode,
    roomData,
    error,
    isLoading,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    updateGameState,
    updateSettings,
    addTestPlayer,
  } = useRoom(playerId, playerName);

  // ブラウザタブタイトル設定
  useEffect(() => {
    document.title = 'PolyformDEV';
    return () => {
      document.title = 'HIVE';
    };
  }, []);

  // フェードアウト状態
  const [isFadingOut, setIsFadingOut] = useState(false);
  // トランジション表示状態
  const [showTransition, setShowTransition] = useState(false);

  const gameState = roomData?.gameState;
  const players = gameState?.players ?? [];

  // ゲーム開始処理（ロビーをフェードアウトしてからゲーム開始）
  const handleStartGame = () => {
    if (!isHost) return;

    // トランジションを表示
    setShowTransition(true);
    // ロビーをフェードアウト
    setIsFadingOut(true);

    // フェードアウト完了後にゲーム開始
    setTimeout(() => {
      startGame();
    }, 300);
  };

  // もう一度プレイ（ロビーに戻る）
  const handlePlayAgain = () => {
    if (!isHost || !gameState) return;

    // ローカル状態をリセット
    setIsFadingOut(false);
    setShowTransition(false);

    // プレイヤーの状態をリセット
    const resetPlayers = gameState.players.map((p) => ({
      id: p.id,
      name: p.name,
      pieces: [],
      workingPuzzles: [],
      completedPuzzles: [],
      completedPuzzleIds: [],
      score: 0,
      remainingActions: 0,
      completedWhite: 0,
      completedBlack: 0,
      usedMasterAction: false,
      finishingPenalty: 0,
      finishingDone: false,
    }));

    updateGameState({
      phase: 'waiting',
      players: resetPlayers,
      currentPlayerIndex: 0,
      playerOrder: [],
      whitePuzzleDeck: [],
      blackPuzzleDeck: [],
      whitePuzzleMarket: [],
      blackPuzzleMarket: [],
      finalRound: false,
      finalRoundTurnNumber: null,
      currentTurnNumber: 1,
    });
  };

  // ゲームプレイ中
  if (gameState && gameState.phase !== 'waiting' && playerId) {
    return (
      <>
        {/* ゲーム開始トランジション */}
        {showTransition && (
          <GameStartTransition onComplete={() => setShowTransition(false)} />
        )}
        <GamePlayPhase
          gameState={gameState}
          currentPlayerId={playerId}
          isHost={isHost}
          onLeaveRoom={leaveRoom}
          onUpdateGameState={updateGameState}
          onPlayAgain={handlePlayAgain}
        />
      </>
    );
  }

  // ロビー画面（デバッグモード有効）
  return (
    <>
      {/* ゲーム開始トランジション（ロビーの上に表示） */}
      {showTransition && (
        <GameStartTransition onComplete={() => setShowTransition(false)} />
      )}
      <Lobby
        roomCode={roomCode}
        players={players}
        isHost={isHost}
        isLoading={isLoading}
        error={error}
        hostId={roomData?.hostId ?? ''}
        playerName={playerName}
        settings={gameState?.settings}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onLeaveRoom={leaveRoom}
        onStartGame={handleStartGame}
        onUpdateSettings={updateSettings}
        onBack={onBack}
        debugMode={true}
        onAddTestPlayer={addTestPlayer}
        isFadingOut={isFadingOut}
      />
    </>
  );
};
