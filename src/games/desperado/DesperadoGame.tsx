import { useEffect } from 'react';
import { usePlayer } from '../../shared/hooks/usePlayer';
import { useRoom } from './hooks/useRoom';
import { Lobby } from './components/Lobby';

interface DesperadoGameProps {
  onBack: () => void;
}

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
      players: players.map(p => ({
        ...p,
        currentRoll: null,
        hasRolled: false,
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

  // ゲームプレイ画面（後で実装）
  if (phase === 'rolling' || phase === 'result') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 to-red-900">
        <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
          <div className="bg-slate-800/95 rounded-xl p-6 max-w-2xl w-full text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Desperado</h1>
            <p className="text-amber-400 mb-4">ラウンド {gameState?.currentRound}</p>
            <p className="text-slate-400 mb-8">ゲームプレイ画面は開発中...</p>
            <button
              onClick={handleLeaveRoom}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold"
            >
              退出
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ゲーム終了画面（後で実装）
  if (phase === 'game_end') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 to-red-900">
        <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
          <div className="bg-slate-800/95 rounded-xl p-6 max-w-2xl w-full text-center">
            <h1 className="text-3xl font-bold text-white mb-4">ゲーム終了</h1>
            <p className="text-slate-400 mb-8">結果画面は開発中...</p>
            <button
              onClick={handleLeaveRoom}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold"
            >
              退出
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
