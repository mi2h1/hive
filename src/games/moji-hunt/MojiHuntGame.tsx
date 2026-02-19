import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { usePlayer } from '../../shared/hooks/usePlayer';
import { useRoom } from './hooks/useRoom';
import { Lobby } from './components/Lobby';
import { WordInputPhase } from './components/WordInputPhase';
import { GamePlayPhase } from './components/GamePlayPhase';
import { ResultScreen } from './components/ResultScreen';
import { TopicSelectionPhase } from './components/TopicSelectionPhase';
import { GameStartTransition } from './components/GameStartTransition';
import { RulesModal } from './components/RulesModal';
import type { LocalPlayerState } from './types/game';
import { DEFAULT_SETTINGS, getRandomTopic } from './types/game';

interface MojiHuntGameProps {
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

export const MojiHuntGame = ({ onBack }: MojiHuntGameProps) => {
  // ブラウザタブのタイトルを設定
  useEffect(() => {
    document.title = 'もじはんと';
    return () => { document.title = 'HIVE'; };
  }, []);

  // 本番はデバッグモードOFF
  const debugMode = false;

  const { playerId, playerName } = usePlayer();

  // URLパラメータからの自動参加を一度だけ実行
  const hasAutoJoined = useRef(false);
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
    updateTopicMode,
  } = useRoom(playerId, playerName);

  // URLパラメータからルームに自動参加
  useEffect(() => {
    if (hasAutoJoined.current) return;
    if (roomCode) return; // 既にルームに参加している場合はスキップ
    if (!playerId || !playerName) return; // プレイヤー情報がロードされるまで待つ

    const urlRoomCode = getRoomCodeFromUrl();
    if (urlRoomCode && urlRoomCode.length === 4) {
      hasAutoJoined.current = true;
      clearRoomCodeFromUrl();
      joinRoom(urlRoomCode);
    }
  }, [roomCode, joinRoom, playerId, playerName]);

  // ローカルで保持する秘密の言葉
  const [localState, setLocalState] = useState<LocalPlayerState | null>(null);

  // ゲーム開始時のトランジション表示
  const [showTransition, setShowTransition] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [transitionTopic, setTransitionTopic] = useState<string | null>(null);
  const prevPhaseRef = useRef<string | null>(null);

  // ルールモーダル表示
  const [showRules, setShowRules] = useState(false);

  const gameState = roomData?.gameState;
  const players = gameState?.players ?? [];
  const settings = gameState?.settings ?? DEFAULT_SETTINGS;
  const phase = gameState?.phase ?? 'waiting';
  const currentTopic = gameState?.currentTopic ?? '';
  const topicMode = roomData?.topicMode ?? 'random';

  const prevTopicRef = useRef<string | null>(null);

  // フェーズ変更を監視（他プレイヤー用）
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;

    // word_input への遷移を検知した時（ランダムモード: waiting/game_end→word_input、選択式: topic_selection→word_input）
    if (
      (prevPhase === 'waiting' || prevPhase === 'game_end' || prevPhase === 'topic_selection') &&
      phase === 'word_input' &&
      !showTransition
    ) {
      // ローカル状態をリセット（前回のゲームの状態をクリア）
      setLocalState(null);
      setTransitionTopic(currentTopic || null);
      setShowTransition(true);
    }
    prevPhaseRef.current = phase;
  }, [phase, currentTopic, showTransition]);

  // お題変更を監視（お題チェンジ投票で変わった時、他プレイヤー用）
  useEffect(() => {
    // word_input中にお題が変わった時（自分がトランジション表示中でなければ）
    if (
      phase === 'word_input' &&
      prevTopicRef.current !== null &&
      prevTopicRef.current !== currentTopic &&
      currentTopic &&
      !showTransition
    ) {
      setTransitionTopic(currentTopic);
      setShowTransition(true);
    }
    prevTopicRef.current = currentTopic;
  }, [currentTopic, phase, showTransition]);

  // ゲーム開始処理（フェードアウト付き）
  const handleStartGame = () => {
    if (!isHost || !gameState) return;

    // ローカル状態をリセット（前回のゲームの状態をクリア）
    setLocalState(null);
    setIsStartingGame(true);

    const roundNumber = gameState.roundNumber ?? 0;

    if (topicMode === 'selection') {
      // 選択式: topic_selection フェーズへ
      const topicSelectorId = players[roundNumber % players.length].id;

      setTimeout(() => {
        const playerIds = players.map(p => p.id);
        const shuffledOrder = [...playerIds].sort(() => Math.random() - 0.5);

        updateGameState({
          phase: 'topic_selection',
          turnOrder: shuffledOrder,
          currentTurnPlayerId: shuffledOrder[0],
          topicSelectorId,
          roundNumber,
          topicChangeVotes: [],
        });
      }, 300);
    } else {
      // ランダム: 現行通り word_input へ
      const topic = getRandomTopic();
      setTransitionTopic(topic);
      setShowTransition(true);

      setTimeout(() => {
        const playerIds = players.map(p => p.id);
        const shuffledOrder = [...playerIds].sort(() => Math.random() - 0.5);

        updateGameState({
          phase: 'word_input',
          currentTopic: topic,
          turnOrder: shuffledOrder,
          currentTurnPlayerId: shuffledOrder[0],
          topicChangeVotes: [],
          roundNumber,
        });
      }, 300);
    }
  };

  // お題選択式: 担当プレイヤーがお題を確定
  const handleSelectTopic = (topic: string) => {
    if (!gameState) return;

    setTransitionTopic(topic);
    setShowTransition(true);

    setTimeout(() => {
      updateGameState({
        phase: 'word_input',
        currentTopic: topic,
        topicChangeVotes: [],
      });
    }, 300);
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

  // 入力完了を取り消して再編集
  const handleCancelReady = () => {
    if (!playerId || !gameState) return;

    // ローカル状態をクリア
    setLocalState(null);

    // Firebaseのプレイヤー状態をリセット
    const updatedPlayers = players.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          isReady: false,
          wordLength: 0,
          normalizedWord: '',
          revealedPositions: [],
          revealedCharacters: [],
        };
      }
      return p;
    });

    updateGameState({ players: updatedPlayers });
  };

  // お題チェンジ投票処理
  const handleVoteTopicChange = () => {
    if (!playerId || !gameState) return;

    const currentVotes = gameState.topicChangeVotes ?? [];
    if (currentVotes.includes(playerId)) return; // 既に投票済み

    const newVotes = [...currentVotes, playerId];

    // 全員投票したらお題を変更
    if (newVotes.length >= players.length) {
      // 全員の入力をリセット
      const resetPlayers = players.map(p => ({
        ...p,
        isReady: false,
        wordLength: 0,
        normalizedWord: '',
        revealedPositions: [],
        revealedCharacters: [],
      }));

      // ローカル状態もリセット
      setLocalState(null);

      if (topicMode === 'selection') {
        // 選択式: topic_selection に戻す（同じ担当者で）
        updateGameState({
          phase: 'topic_selection',
          currentTopic: '',
          topicChangeVotes: [],
          players: resetPlayers,
        });
      } else {
        // ランダム: 新しいお題を選出
        const newTopic = getRandomTopic();
        setTransitionTopic(newTopic);
        setShowTransition(true);

        updateGameState({
          currentTopic: newTopic,
          topicChangeVotes: [],
          players: resetPlayers,
        });
      }
    } else {
      // まだ全員投票していない
      updateGameState({ topicChangeVotes: newVotes });
    }
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
      <>
        {/* ゲーム開始トランジション（ロビーの上に表示） */}
        {showTransition && transitionTopic && (
          <GameStartTransition
            topic={transitionTopic}
            onComplete={() => {
              setShowTransition(false);
              setTransitionTopic(null);
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
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onLeaveRoom={leaveRoom}
        onStartGame={handleStartGame}
        onBack={handleBack}
        topicMode={topicMode}
        onUpdateTopicMode={updateTopicMode}
        debugMode={debugMode}
        isFadingOut={isStartingGame}
      />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 to-orange-900 p-4">
      {/* ルールモーダル */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {/* ゲーム開始トランジション */}
      {showTransition && transitionTopic && (
        <GameStartTransition
          topic={transitionTopic}
          onComplete={() => {
            setShowTransition(false);
            setTransitionTopic(null);
          }}
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
          <div className="flex items-center gap-3 flex-1">
            <img
              src="/hive/images/vec_logo_moji-hant.svg"
              alt="もじはんと"
              className="h-8"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            {phase === 'playing' && gameState?.currentTopic && (
              <span className="bg-white/20 text-white/80 px-3 py-1 rounded-full text-sm">
                お題: {gameState.currentTopic}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowRules(true)}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="遊び方"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
        </header>

        {phase === 'topic_selection' && gameState && (
          <TopicSelectionPhase
            players={players}
            currentPlayerId={playerId ?? ''}
            topicSelectorId={gameState.topicSelectorId ?? ''}
            roundNumber={gameState.roundNumber ?? 0}
            onSelectTopic={handleSelectTopic}
          />
        )}

        {phase === 'word_input' && gameState && (
          <WordInputPhase
            settings={settings}
            currentTopic={gameState.currentTopic}
            players={players}
            currentPlayerId={playerId ?? ''}
            isReady={localState !== null}
            onSubmitWord={handleWordSubmit}
            onCancelReady={handleCancelReady}
            topicChangeVotes={gameState.topicChangeVotes ?? []}
            onVoteTopicChange={handleVoteTopicChange}
            turnOrder={gameState.turnOrder}
            debugMode={debugMode}
          />
        )}

        {phase === 'playing' && gameState && localState && (
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
              // ローカル状態をリセット
              setLocalState(null);
              setIsStartingGame(false);

              const nextRound = (gameState.roundNumber ?? 0) + 1;

              // プレイヤーをリセット
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

              // ターン順をシャッフル
              const playerIds = players.map(p => p.id);
              const shuffledOrder = [...playerIds].sort(() => Math.random() - 0.5);

              if (topicMode === 'selection') {
                // 選択式: topic_selection へ（次の担当者で）
                const topicSelectorId = players[nextRound % players.length].id;

                updateGameState({
                  phase: 'topic_selection',
                  players: resetPlayers,
                  currentTopic: '',
                  currentTurnPlayerId: shuffledOrder[0],
                  turnOrder: shuffledOrder,
                  usedCharacters: [],
                  attackHistory: [],
                  lastAttackHadHit: false,
                  winnerId: null,
                  topicChangeVotes: [],
                  roundNumber: nextRound,
                  topicSelectorId,
                });
              } else {
                // ランダム: 現行通り word_input へ
                const newTopic = getRandomTopic();
                setTransitionTopic(newTopic);
                setShowTransition(true);

                updateGameState({
                  phase: 'word_input',
                  players: resetPlayers,
                  currentTopic: newTopic,
                  currentTurnPlayerId: shuffledOrder[0],
                  turnOrder: shuffledOrder,
                  usedCharacters: [],
                  attackHistory: [],
                  lastAttackHadHit: false,
                  winnerId: null,
                  topicChangeVotes: [],
                  roundNumber: nextRound,
                });
              }
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
