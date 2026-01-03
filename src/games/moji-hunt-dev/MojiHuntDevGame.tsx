import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { usePlayer } from '../../shared/hooks/usePlayer';
import { useRoom } from './hooks/useRoom';
import { Lobby } from './components/Lobby';
import { WordInputPhase } from './components/WordInputPhase';
import { GamePlayPhase } from './components/GamePlayPhase';
import { ResultScreen } from './components/ResultScreen';
import { GameStartTransition } from './components/GameStartTransition';
import type { LocalPlayerState } from './types/game';
import { DEFAULT_SETTINGS, getRandomTopic } from './types/game';

interface MojiHuntDevGameProps {
  onBack: () => void;
}

export const MojiHuntDevGame = ({ onBack }: MojiHuntDevGameProps) => {
  // ブラウザタブのタイトルを設定
  useEffect(() => {
    document.title = 'もじはんと [DEV]';
    return () => { document.title = 'Game Board'; };
  }, []);

  // 開発版は常にデバッグモードON
  const debugMode = true;

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

  // ローカルで保持する秘密の言葉
  const [localState, setLocalState] = useState<LocalPlayerState | null>(null);

  // デバッグ用: 全プレイヤーの言葉を保持
  const [debugLocalStates, setDebugLocalStates] = useState<Record<string, LocalPlayerState>>({});

  // ゲーム開始時のトランジション表示
  const [showTransition, setShowTransition] = useState(false);
  const prevPhaseRef = useRef<string | null>(null);

  const gameState = roomData?.gameState;
  const players = gameState?.players ?? [];
  const settings = gameState?.settings ?? DEFAULT_SETTINGS;
  const phase = gameState?.phase ?? 'waiting';

  // フェーズ変更を監視してトランジションを表示
  useEffect(() => {
    // waiting → word_input の遷移時にトランジションを表示
    if (prevPhaseRef.current === 'waiting' && phase === 'word_input') {
      setShowTransition(true);
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  // ゲーム開始処理
  const handleStartGame = () => {
    if (!isHost || !gameState) return;

    // ターン順をシャッフル
    const playerIds = players.map(p => p.id);
    const shuffledOrder = [...playerIds].sort(() => Math.random() - 0.5);

    // お題をランダムに選出
    const topic = getRandomTopic();

    updateGameState({
      phase: 'word_input',
      currentTopic: topic,
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
        hostId={roomData?.hostId ?? ''}
        playerName={playerName}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onLeaveRoom={leaveRoom}
        onStartGame={handleStartGame}
        onBack={handleBack}
        debugMode={debugMode}
        onAddTestPlayer={addTestPlayer}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 to-orange-900 p-4">
      {/* ゲーム開始トランジション */}
      {showTransition && gameState?.currentTopic && (
        <GameStartTransition
          topic={gameState.currentTopic}
          onComplete={() => setShowTransition(false)}
        />
      )}

      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <header className="flex items-center gap-4 mb-6">
          <button
            onClick={handleBack}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <img
              src="/boards/images/vec_logo_moji-hant.svg"
              alt="もじはんと"
              className="h-8"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            {debugMode && (
              <span className="bg-orange-600 text-white px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">
                <FlaskConical className="w-3 h-3" />
                DEBUG
              </span>
            )}
            {gameState?.currentTopic && (
              <span className="text-white/60 text-sm">
                お題: {gameState.currentTopic}
              </span>
            )}
          </div>
        </header>

        {phase === 'word_input' && gameState && (
          <WordInputPhase
            settings={settings}
            currentTopic={gameState.currentTopic}
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
                currentTopic: '',
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
