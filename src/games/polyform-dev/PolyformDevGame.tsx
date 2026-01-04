import { useEffect } from 'react';
import { usePlayer } from '../../shared/hooks/usePlayer';
import { useRoom } from './hooks/useRoom';
import { Lobby } from './components/Lobby';

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
  if (gameState && gameState.phase !== 'waiting') {
    // TODO: ゲームプレイ画面を実装
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 to-emerald-900">
        <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
          <div className="bg-slate-800/95 rounded-xl p-6 max-w-2xl w-full text-center">
            <h1 className="text-3xl font-bold text-white mb-4">POLYFORM DEV</h1>
            <p className="text-white/60 mb-4">ゲームプレイ画面（開発中）</p>
            <div className="bg-slate-700 rounded-lg p-4 mb-4">
              <p className="text-white">フェーズ: {gameState.phase}</p>
              <p className="text-white">プレイヤー数: {players.length}</p>
            </div>
            <button
              onClick={leaveRoom}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
            >
              退出
            </button>
          </div>
        </div>
      </div>
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
      onCreateRoom={createRoom}
      onJoinRoom={joinRoom}
      onLeaveRoom={leaveRoom}
      onStartGame={startGame}
      onBack={onBack}
      debugMode={true}
      onAddTestPlayer={addTestPlayer}
    />
  );
};
