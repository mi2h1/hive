import { useEffect, useState } from 'react';
import { usePlayer } from '../../shared/hooks/usePlayer';
import { useRoom } from './hooks/useRoom';
import { Lobby } from './components/Lobby';
import { GamePlayPhase } from './components/GamePlayPhase';

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
      document.title = 'Game Board';
    };
  }, []);

  // フェードアウト状態
  const [isFadingOut, setIsFadingOut] = useState(false);

  const gameState = roomData?.gameState;
  const players = gameState?.players ?? [];

  // ゲーム開始処理（ロビーをフェードアウトしてからゲーム開始）
  const handleStartGame = () => {
    if (!isHost) return;

    // ロビーをフェードアウト
    setIsFadingOut(true);

    // フェードアウト完了後にゲーム開始
    setTimeout(() => {
      startGame();
    }, 300);
  };

  // ゲームプレイ中
  if (gameState && gameState.phase !== 'waiting' && playerId) {
    return (
      <GamePlayPhase
        gameState={gameState}
        currentPlayerId={playerId}
        onLeaveRoom={leaveRoom}
        onUpdateGameState={updateGameState}
      />
    );
  }

  // ロビー画面（デバッグモード有効）
  return (
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
  );
};
