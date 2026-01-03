import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { usePlayer } from '../../shared/hooks/usePlayer';
import { useRoom } from './hooks/useRoom';
import { Lobby } from './components/Lobby';
import { WordInputPhase } from './components/WordInputPhase';
import { GamePlayPhase } from './components/GamePlayPhase';
import { ResultScreen } from './components/ResultScreen';
import type { LocalPlayerState } from './types/game';
import { DEFAULT_SETTINGS, TOPIC_LABELS } from './types/game';

interface MojiHuntGameProps {
  onBack: () => void;
}

export const MojiHuntGame = ({ onBack }: MojiHuntGameProps) => {
  // ブラウザタブのタイトルを設定
  useEffect(() => {
    document.title = 'もじはんと';
    return () => { document.title = 'Game Board'; };
  }, []);

  // デバッグモード検出（URLパラメータ ?debug=true）
  const debugMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === 'true';
  }, []);

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
    updateSettings,
    addTestPlayer,
  } = useRoom(playerId, playerName);

  // ローカルで保持する秘密の言葉
  const [localState, setLocalState] = useState<LocalPlayerState | null>(null);

  // デバッグ用: 全プレイヤーの言葉を保持
  const [debugLocalStates, setDebugLocalStates] = useState<Record<string, LocalPlayerState>>({});

  const gameState = roomData?.gameState;
  const players = gameState?.players ?? [];
  const settings = gameState?.settings ?? DEFAULT_SETTINGS;
  const phase = gameState?.phase ?? 'waiting';

  // ゲーム開始処理
  const handleStartGame = () => {
    if (!isHost || !gameState) return;

    // ターン順をシャッフル
    const playerIds = players.map(p => p.id);
    const shuffledOrder = [...playerIds].sort(() => Math.random() - 0.5);

    updateGameState({
      phase: 'word_input',
      turnOrder: shuffledOrder,
      currentTurnPlayerId: shuffledOrder[0],
    });
  };

  // 言葉入力完了処理
  const handleWordSubmit = (originalWord: string, normalizedWord: string) => {
    if (!playerId || !gameState) return;

    // ローカル状態を保存
    setLocalState({ originalWord, normalizedWord });

    // Firebaseにプレイヤーの準備完了を通知（normalizedWordも保存）
    const updatedPlayers = players.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          isReady: true,
          wordLength: normalizedWord.length,
          normalizedWord, // Firebaseに保存してヒット判定に使用
          revealedPositions: new Array(normalizedWord.length).fill(false),
          revealedCharacters: new Array(normalizedWord.length).fill(''),
        };
      }
      return p;
    });

    updateGameState({ players: updatedPlayers });
  };

  // デバッグ用: 任意のプレイヤーの言葉を設定
  const handleDebugWordSubmit = (targetPlayerId: string, originalWord: string, normalizedWord: string) => {
    if (!gameState) return;

    // デバッグ用ローカル状態を保存
    setDebugLocalStates(prev => ({
      ...prev,
      [targetPlayerId]: { originalWord, normalizedWord },
    }));

    // 自分自身の場合は通常のlocalStateも更新
    if (targetPlayerId === playerId) {
      setLocalState({ originalWord, normalizedWord });
    }

    // Firebaseにプレイヤーの準備完了を通知（normalizedWordも保存）
    const updatedPlayers = players.map(p => {
      if (p.id === targetPlayerId) {
        return {
          ...p,
          isReady: true,
          wordLength: normalizedWord.length,
          normalizedWord, // Firebaseに保存してヒット判定に使用
          revealedPositions: new Array(normalizedWord.length).fill(false),
          revealedCharacters: new Array(normalizedWord.length).fill(''),
        };
      }
      return p;
    });

    updateGameState({ players: updatedPlayers });
  };

  // 全員準備完了したらゲーム開始
  const allReady = players.length > 0 && players.every(p => p.isReady);
  if (phase === 'word_input' && allReady && isHost) {
    updateGameState({ phase: 'playing' });
  }

  // 戻るボタン処理
  const handleBack = () => {
    if (roomCode) {
      leaveRoom();
    }
    onBack();
  };

  // waitingフェーズはLobbyが全画面表示
  if (phase === 'waiting') {
    return (
      <Lobby
        roomCode={roomCode}
        players={players}
        isHost={isHost}
        isLoading={isLoading}
        error={error}
        settings={settings}
        hostId={roomData?.hostId ?? ''}
        playerName={playerName}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onLeaveRoom={leaveRoom}
        onStartGame={handleStartGame}
        onUpdateSettings={updateSettings}
        onBack={handleBack}
        debugMode={debugMode}
        onAddTestPlayer={addTestPlayer}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 to-orange-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <header className="flex items-center gap-4 mb-6">
          <button
            onClick={handleBack}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              もじはんと
              {debugMode && (
                <span className="bg-orange-600 text-white px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">
                  <FlaskConical className="w-3 h-3" />
                  DEBUG
                </span>
              )}
            </h1>
            {roomCode && (
              <p className="text-white/60 text-sm">
                お題: {TOPIC_LABELS[settings.topic]}
              </p>
            )}
          </div>
        </header>

        {phase === 'word_input' && gameState && (
          <WordInputPhase
            settings={settings}
            players={players}
            currentPlayerId={playerId ?? ''}
            isReady={localState !== null}
            onSubmitWord={handleWordSubmit}
            debugMode={debugMode}
            debugLocalStates={debugLocalStates}
            onDebugWordSubmit={handleDebugWordSubmit}
          />
        )}

        {phase === 'playing' && gameState && (localState || debugMode) && (
          <GamePlayPhase
            gameState={gameState}
            localState={localState}
            playerId={playerId ?? ''}
            isHost={isHost}
            updateGameState={updateGameState}
            debugMode={debugMode}
          />
        )}

        {phase === 'game_end' && gameState && (
          <ResultScreen
            gameState={gameState}
            localState={localState}
            playerId={playerId ?? ''}
            isHost={isHost}
            onPlayAgain={() => {
              setLocalState(null);
              setDebugLocalStates({});
              // プレイヤーをリセットしてロビーに戻る
              // Firebaseはundefinedを許可しないので、eliminatedAtは含めない
              const resetPlayers = players.map(p => ({
                id: p.id,
                name: p.name,
                wordLength: 0,
                normalizedWord: '',
                revealedPositions: [],
                revealedCharacters: [],
                isEliminated: false,
                isReady: false,
              }));
              updateGameState({
                phase: 'waiting',
                players: resetPlayers,
                currentTurnPlayerId: null,
                turnOrder: [],
                usedCharacters: [],
                attackHistory: [],
                lastAttackHadHit: false,
                winnerId: null,
              });
            }}
            onLeaveRoom={() => {
              leaveRoom();
              setLocalState(null);
            }}
          />
        )}
      </div>
    </div>
  );
};
