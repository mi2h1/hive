import { useEffect } from 'react';
import { usePlayer } from '../../shared/hooks/usePlayer';
import { useRoom } from './hooks/useRoom';
import { Lobby } from './components/Lobby';
import { GamePlayPhase } from './components/GamePlayPhase';
import { ResultScreen } from './components/ResultScreen';

interface DesperadoGameProps {
  onBack: () => void;
}

const INITIAL_LIVES = 5;

export const DesperadoGame = ({ onBack }: DesperadoGameProps) => {
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
    updateGameState,
    addTestPlayer,
  } = useRoom(playerId, playerName);

  // ブラウザタイトルを設定
  useEffect(() => {
    document.title = 'デスペラード';
    return () => {
      document.title = 'Game Board';
    };
  }, []);

  const gameState = roomData?.gameState;
  const phase = gameState?.phase ?? 'waiting';
  const players = gameState?.players ?? [];

  // ゲーム開始
  const handleStartGame = () => {
    if (!gameState || players.length < 2) return;

    // ターン順をシャッフル
    const shuffledOrder = [...players.map(p => p.id)].sort(() => Math.random() - 0.5);

    updateGameState({
      phase: 'rolling',
      currentRound: 1,
      desperadoRolledThisRound: false,
      turnOrder: shuffledOrder,
      currentTurnPlayerId: shuffledOrder[0],
      rollingPlayerId: null,
      players: players.map(p => ({
        ...p,
        currentRoll: null,
        hasRolled: false,
      })),
    });
  };

  // もう一度遊ぶ
  const handlePlayAgain = () => {
    if (!gameState) return;

    // ターン順をシャッフル
    const shuffledOrder = [...players.map(p => p.id)].sort(() => Math.random() - 0.5);

    updateGameState({
      phase: 'rolling',
      currentRound: 1,
      desperadoRolledThisRound: false,
      turnOrder: shuffledOrder,
      currentTurnPlayerId: shuffledOrder[0],
      winnerId: null,
      lastLoser: null,
      rollingPlayerId: null,
      players: players.map(p => ({
        ...p,
        lives: INITIAL_LIVES,
        currentRoll: null,
        hasRolled: false,
        isEliminated: false,
      })),
    });
  };

  // 退出
  const handleLeaveRoom = () => {
    leaveRoom();
    onBack();
  };

  // ロビー画面
  if (phase === 'waiting') {
    return (
      <Lobby
        roomCode={roomCode}
        players={players}
        isHost={isHost}
        isLoading={isLoading}
        error={error}
        hostId={roomData?.hostId ?? ''}
        playerName={playerName}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onLeaveRoom={handleLeaveRoom}
        onStartGame={handleStartGame}
        onBack={onBack}
        debugMode={false}
        onAddTestPlayer={addTestPlayer}
      />
    );
  }

  // ゲームプレイ画面
  if ((phase === 'rolling' || phase === 'result') && gameState && playerId && roomCode) {
    return (
      <GamePlayPhase
        gameState={gameState}
        playerId={playerId}
        roomCode={roomCode}
        onUpdateGameState={updateGameState}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  // ゲーム終了画面
  if (phase === 'game_end' && gameState && playerId) {
    return (
      <ResultScreen
        gameState={gameState}
        playerId={playerId}
        onPlayAgain={handlePlayAgain}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  return null;
};
