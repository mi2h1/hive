import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { usePlayer } from '../../shared/hooks/usePlayer';
import { useRoom } from './hooks/useRoom';
import { Lobby } from './components/Lobby';
import { WordInputPhase } from './components/WordInputPhase';
import { GamePlayPhase } from './components/GamePlayPhase';
import { ResultScreen } from './components/ResultScreen';
import type { LocalPlayerState } from './types/game';
import { DEFAULT_SETTINGS, TOPIC_LABELS } from './types/game';

interface MojiGuessGameProps {
  onBack: () => void;
}

export const MojiGuessGame = ({ onBack }: MojiGuessGameProps) => {
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
  } = useRoom(playerId, playerName);

  // ローカルで保持する秘密の言葉
  const [localState, setLocalState] = useState<LocalPlayerState | null>(null);

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

    // Firebaseにプレイヤーの準備完了を通知
    const updatedPlayers = players.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          isReady: true,
          wordLength: normalizedWord.length,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 to-orange-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <header className="flex items-center gap-4 mb-6">
          <button
            onClick={handleBack}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">文字ゲス</h1>
            {roomCode && phase !== 'waiting' && (
              <p className="text-white/60 text-sm">
                お題: {TOPIC_LABELS[settings.topic]}
              </p>
            )}
          </div>
        </header>

        {/* フェーズに応じた画面表示 */}
        {phase === 'waiting' && (
          <Lobby
            roomCode={roomCode}
            players={players}
            isHost={isHost}
            isLoading={isLoading}
            error={error}
            settings={settings}
            hostId={roomData?.hostId ?? ''}
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
            onLeaveRoom={leaveRoom}
            onStartGame={handleStartGame}
            onUpdateSettings={updateSettings}
          />
        )}

        {phase === 'word_input' && gameState && (
          <WordInputPhase
            settings={settings}
            players={players}
            currentPlayerId={playerId ?? ''}
            isReady={localState !== null}
            onSubmitWord={handleWordSubmit}
          />
        )}

        {phase === 'playing' && gameState && localState && (
          <GamePlayPhase
            gameState={gameState}
            localState={localState}
            playerId={playerId ?? ''}
            isHost={isHost}
            updateGameState={updateGameState}
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
              // プレイヤーをリセットしてロビーに戻る
              const resetPlayers = players.map(p => ({
                ...p,
                wordLength: 0,
                revealedPositions: [],
                revealedCharacters: [],
                isEliminated: false,
                isReady: false,
                eliminatedAt: undefined,
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
