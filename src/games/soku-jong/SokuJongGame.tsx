import { useEffect, useRef } from 'react';
import { usePlayer } from '../../shared/hooks/usePlayer';
import { useRoom } from './hooks/useRoom';
import { Lobby } from './components/Lobby';
import { TileTestPage } from './components/TileTestPage';
import { GameScreen } from './components/GameScreen';
import { initializeRound, isGameOver } from './lib/game-flow';


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

  // ゲーム開始（スコアをリセットして新規ゲーム）
  const handleStartGame = () => {
    if (!gameState || players.length < 2) return;

    const resetPlayers = players.map((p) => ({
      ...p,
      score: gameState.settings.initialScore,
    }));
    const roundState = initializeRound(resetPlayers, 1);
    updateGameState({
      ...roundState,
      settings: gameState.settings,
      timeBank: undefined,
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
        settings={gameState?.settings}
        onUpdateSettings={(s) => updateGameState({ settings: { ...gameState!.settings, ...s } })}
      />
    );
  }

  // ロビーに戻る
  const handleBackToLobby = () => {
    updateGameState({ phase: 'waiting', round: 0, roundResult: undefined, timeBank: undefined });
  };

  // 次の局へ進む
  const handleNextRound = () => {
    if (!gameState) return;
    if (isGameOver(gameState)) {
      updateGameState({ phase: 'finished', roundResult: undefined });
    } else {
      const nextRound = initializeRound(gameState.players, gameState.round + 1);
      updateGameState({
        ...nextRound,
        settings: gameState.settings,
        timeBank: gameState.timeBank,
        roundResult: undefined,
      });
    }
  };

  // playing / round_result フェーズ — ゲーム画面（round_result時はモーダルオーバーレイ付き）
  if ((phase === 'playing' || phase === 'round_result') && gameState) {
    return (
      <GameScreen
        gameState={gameState}
        playerId={playerId ?? ''}
        onBackToLobby={handleBackToLobby}
        onUpdateGameState={updateGameState}
        roundResult={phase === 'round_result' ? gameState.roundResult : undefined}
        onNextRound={handleNextRound}
        isGameOver={isGameOver(gameState)}
      />
    );
  }

  // finished フェーズ — 最終結果画面
  if (phase === 'finished' && gameState) {
    const rankedPlayers = [...players].sort((a, b) => b.score - a.score);
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-green-900">
        <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
          <div className="bg-slate-800/95 rounded-xl p-8 max-w-lg w-full text-center">
            <h1 className="mb-6">
              <img src="/hive/images/vec_logo_soku-jong.svg" alt="速雀" className="h-10 mx-auto" />
            </h1>

            <h2 className="text-2xl font-bold text-amber-300 mb-2">対局終了</h2>
            <p className="text-slate-400 mb-6">東{gameState.settings.totalRounds}局 終了</p>

            {/* ランキング */}
            <div className="space-y-3 mb-8">
              {rankedPlayers.map((p, i) => (
                <div key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                  i === 0 ? 'bg-amber-900/30 border border-amber-700/50' : 'bg-slate-700/30'
                }`}>
                  <span className={`text-lg font-bold w-8 ${
                    i === 0 ? 'text-amber-300' :
                    i === 1 ? 'text-slate-300' :
                    i === 2 ? 'text-amber-600' :
                    'text-slate-500'
                  }`}>
                    {i + 1}位
                  </span>
                  <span className="text-slate-200 flex-1 text-left">{p.name}</span>
                  <span className={`font-mono font-bold text-lg ${
                    i === 0 ? 'text-amber-300' : 'text-slate-300'
                  }`}>
                    {p.score}点
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleBackToLobby}
              className="w-full px-6 py-3 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white font-bold transition-all"
            >
              ロビーに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // フォールバック
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-green-900 flex items-center justify-center">
      <div className="bg-slate-800/95 rounded-xl p-8 max-w-md w-full text-center">
        <p className="text-slate-400 mb-4">読み込み中...</p>
        <button
          onClick={handleBackToLobby}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-bold transition-all"
        >
          ロビーに戻る
        </button>
      </div>
    </div>
  );
};
