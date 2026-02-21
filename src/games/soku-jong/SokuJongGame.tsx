import { useEffect, useRef } from 'react';
import { usePlayer } from '../../shared/hooks/usePlayer';
import { useRoom } from './hooks/useRoom';
import { Lobby } from './components/Lobby';
import { TileTestPage } from './components/TileTestPage';
import { GameScreen } from './components/GameScreen';
import { initializeRound } from './lib/game-flow';

interface SokuJongGameProps {
  onBack: () => void;
}

// URLからルームコードを取得
const getRoomCodeFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
};

// URLからルームコードパラメータを削除
const clearRoomCodeFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  params.delete('room');
  const newSearch = params.toString();
  const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
  window.history.replaceState({}, '', newUrl);
};

export const SokuJongGame = ({ onBack }: SokuJongGameProps) => {
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

  // URLパラメータからの自動参加を一度だけ実行
  const hasAutoJoined = useRef(false);

  // ブラウザタイトルを設定
  useEffect(() => {
    document.title = '速雀';
    return () => {
      document.title = 'HIVE';
    };
  }, []);

  // URLパラメータからルームに自動参加
  useEffect(() => {
    if (hasAutoJoined.current) return;
    if (roomCode) return;
    if (!playerId || !playerName) return;

    const urlRoomCode = getRoomCodeFromUrl();
    if (urlRoomCode && urlRoomCode.length === 4) {
      hasAutoJoined.current = true;
      clearRoomCodeFromUrl();
      joinRoom(urlRoomCode);
    }
  }, [roomCode, joinRoom, playerId, playerName]);

  // /test サブルートの検出
  const subPath = window.location.pathname.replace('/hive/soku-jong', '').replace(/^\//, '');
  if (subPath === 'test') {
    return <TileTestPage onBack={onBack} />;
  }

  const gameState = roomData?.gameState;
  const phase = gameState?.phase ?? 'waiting';
  const players = gameState?.players ?? [];

  // ゲーム開始
  const handleStartGame = () => {
    if (!gameState || players.length < 2) return;

    const roundState = initializeRound(players, 1);
    updateGameState({
      ...roundState,
      settings: gameState.settings,
    });
  };

  // 退出
  const handleLeaveToGameTop = () => {
    leaveRoom();
  };

  // ロビー画面（waiting フェーズ）
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
        onLeaveRoom={handleLeaveToGameTop}
        onStartGame={handleStartGame}
        onBack={onBack}
        debugMode={false}
        onAddTestPlayer={addTestPlayer}
      />
    );
  }

  // ロビーに戻る
  const handleBackToLobby = () => {
    updateGameState({ phase: 'waiting', round: 0 });
  };

  // playing フェーズ — ゲーム画面
  if (phase === 'playing' && gameState) {
    return (
      <GameScreen
        gameState={gameState}
        playerId={playerId ?? ''}
        onBackToLobby={handleBackToLobby}
      />
    );
  }

  // round_result / finished フェーズ（プレースホルダー）
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-green-900">
      <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
        <div className="bg-slate-800/95 rounded-xl p-8 max-w-md w-full text-center">
          <h1 className="mb-4"><img src="/hive/images/vec_logo_soku-jong.svg" alt="速雀" className="h-8" /></h1>
          <p className="text-slate-400 mb-2">
            {phase === 'round_result' && '局結果（実装予定）'}
            {phase === 'finished' && 'ゲーム終了（実装予定）'}
          </p>
          <p className="text-slate-500 text-sm mb-6">
            ラウンド: {gameState?.round ?? 0} / プレイヤー: {players.length}人
          </p>
          <button
            onClick={handleBackToLobby}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600
              rounded-lg text-slate-300 font-bold transition-all"
          >
            ロビーに戻る
          </button>
        </div>
      </div>
    </div>
  );
};
