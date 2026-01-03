import { useEffect, useMemo } from 'react';
import { usePlayer } from '../../shared/hooks/usePlayer';
import { useRoom } from './hooks/useRoom';
import { Lobby } from './components/Lobby';
import { createGameDeck } from './lib/cards';
import { DEFAULT_SETTINGS } from './types/game';

interface JackalGameProps {
  onBack: () => void;
}

export const JackalGame = ({ onBack }: JackalGameProps) => {
  // デバッグモード検出（URLパラメータ ?debug=true）
  const debugMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === 'true';
  }, []);

  const { playerId, playerName, isLoading: isPlayerLoading } = usePlayer();
  const {
    roomCode,
    roomData,
    error,
    isLoading: isRoomLoading,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom,
    updateGameState,
    updateSettings,
    addTestPlayer,
  } = useRoom(playerId, playerName);

  // ブラウザタブのタイトルを設定
  useEffect(() => {
    document.title = 'ジャッカル';
    return () => { document.title = 'Game Board'; };
  }, []);

  const gameState = roomData?.gameState;
  const players = gameState?.players ?? [];
  const settings = gameState?.settings ?? DEFAULT_SETTINGS;

  // ゲーム開始処理
  const handleStartGame = () => {
    if (!isHost || !gameState) return;

    // デッキを作成
    const deck = createGameDeck();

    // ターン順をシャッフル
    const playerIds = players.map(p => p.id);
    const shuffledOrder = [...playerIds].sort(() => Math.random() - 0.5);

    // 各プレイヤーにカードを配る
    const dealtCards: Record<string, typeof deck[0]> = {};
    const remainingDeck = [...deck];

    for (const playerId of playerIds) {
      const card = remainingDeck.pop();
      if (card) {
        dealtCards[playerId] = card;
      }
    }

    updateGameState({
      phase: 'round_start',
      deck: remainingDeck,
      dealtCards,
      turnOrder: shuffledOrder,
      currentTurnPlayerId: shuffledOrder[0],
      round: 1,
      currentDeclaredValue: null,
      lastDeclarerId: null,
      judgmentResult: null,
    });
  };

  // ローディング中
  if (isPlayerLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  // ロビー画面（ルーム未参加 or ゲーム開始前）
  if (!roomCode || !gameState || gameState.phase === 'waiting') {
    return (
      <Lobby
        roomCode={roomCode}
        players={players}
        isHost={isHost}
        isLoading={isRoomLoading}
        error={error}
        hostId={roomData?.hostId ?? ''}
        playerName={playerName}
        settings={settings}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onLeaveRoom={leaveRoom}
        onStartGame={handleStartGame}
        onUpdateSettings={updateSettings}
        onBack={onBack}
        debugMode={debugMode}
        onAddTestPlayer={addTestPlayer}
      />
    );
  }

  // ゲーム画面（TODO: 実装予定）
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/95 rounded-xl p-6 max-w-2xl w-full text-center">
        <h1 className="text-2xl font-bold text-white mb-4">ジャッカル</h1>
        <p className="text-white/60 mb-4">
          フェーズ: {gameState.phase} / ラウンド: {gameState.round}
        </p>
        <p className="text-white/40 text-sm mb-6">
          ゲーム画面は実装中です...
        </p>

        {/* デバッグ情報 */}
        {debugMode && (
          <div className="bg-slate-700/50 rounded-lg p-4 text-left text-sm">
            <h3 className="text-orange-400 font-bold mb-2">デバッグ情報</h3>
            <div className="text-slate-300 space-y-1">
              <div>プレイヤー数: {players.length}</div>
              <div>山札残り: {gameState.deck.length}枚</div>
              <div>配られたカード: {Object.keys(gameState.dealtCards).length}枚</div>
              <div>現在のターン: {gameState.currentTurnPlayerId}</div>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            leaveRoom();
          }}
          className="mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
        >
          退出
        </button>
      </div>
    </div>
  );
};
