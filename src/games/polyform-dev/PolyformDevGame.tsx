import { useEffect } from 'react';
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

  const gameState = roomData?.gameState;
  const players = gameState?.players ?? [];

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
      onStartGame={startGame}
      onUpdateSettings={updateSettings}
      onBack={onBack}
      debugMode={true}
      onAddTestPlayer={addTestPlayer}
    />
  );
};
