import { useEffect, useState, useRef } from 'react';
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
      document.title = 'Game Board';
    };
  }, []);

  // トランジション状態
  const [showTransition, setShowTransition] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const prevPhaseRef = useRef<string | null>(null);

  const gameState = roomData?.gameState;
  const players = gameState?.players ?? [];
  const phase = gameState?.phase ?? 'waiting';

  // フェーズ変更を監視（他プレイヤー用）
  useEffect(() => {
    // 他プレイヤーが waiting → playing の遷移を検知した時
    if (prevPhaseRef.current === 'waiting' && phase === 'playing' && !showTransition) {
      setShowTransition(true);
    }
    prevPhaseRef.current = phase;
  }, [phase, showTransition]);

  // ゲーム開始処理（トランジション付き）
  const handleStartGame = () => {
    if (!isHost) return;

    // トランジションを表示
    setShowTransition(true);
    setIsStartingGame(true);

    // 少し待ってからゲーム開始
    setTimeout(() => {
      startGame();
    }, 300);
  };

  // ゲームプレイ中
  if (gameState && gameState.phase !== 'waiting' && playerId) {
    return (
      <>
        {/* ゲーム開始トランジション */}
        {showTransition && (
          <GameStartTransition
            onComplete={() => {
              setShowTransition(false);
              setIsStartingGame(false);
            }}
          />
        )}
        <GamePlayPhase
          gameState={gameState}
          currentPlayerId={playerId}
          onLeaveRoom={leaveRoom}
          onUpdateGameState={updateGameState}
        />
      </>
    );
  }

  // ロビー画面（デバッグモード有効）
  return (
    <>
      {/* ゲーム開始トランジション（ロビーの上に表示） */}
      {showTransition && (
        <GameStartTransition
          onComplete={() => {
            setShowTransition(false);
            setIsStartingGame(false);
          }}
        />
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
        isFadingOut={isStartingGame}
      />
    </>
  );
};
