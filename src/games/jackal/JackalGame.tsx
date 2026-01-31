import { useEffect, useRef } from 'react';
import { usePlayer } from '../../shared/hooks/usePlayer';
import { useRoom } from './hooks/useRoom';
import { Lobby } from './components/Lobby';
import { GamePlayPhase } from './components/GamePlayPhase';
import { JudgmentPhase } from './components/JudgmentPhase';
import { GameEndPhase } from './components/GameEndPhase';
import { createGameDeck, calculateTotal, shuffleDeck } from './lib/cards';
import { DEFAULT_SETTINGS } from './types/game';
import type { JudgmentResult, Card } from './types/game';

interface JackalGameProps {
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

export const JackalGame = ({ onBack }: JackalGameProps) => {
  // 本番版はデバッグモードOFF
  const debugMode = false;

  const { playerId, playerName, isLoading: isPlayerLoading } = usePlayer();

  // URLパラメータからの自動参加を一度だけ実行
  const hasAutoJoined = useRef(false);
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
  } = useRoom(playerId, playerName);

  // ブラウザタブのタイトルを設定
  useEffect(() => {
    document.title = 'ジャッカル';
    return () => { document.title = 'HIVE'; };
  }, []);

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

  const gameState = roomData?.gameState;
  const players = gameState?.players ?? [];
  const settings = gameState?.settings ?? DEFAULT_SETTINGS;

  // ゲーム開始処理（デバッグモードでは1人でも開始可能）
  const handleStartGame = () => {
    if (!isHost || !gameState) return;

    // デッキを作成
    const deck = createGameDeck();

    // ターン順をシャッフル
    const playerIds = players.map(p => p.id);
    const shuffledOrder = [...playerIds].sort(() => Math.random() - 0.5);

    // 各プレイヤーにカードを配る
    const dealtCards: Record<string, Card> = {};
    const remainingDeck = [...deck];

    for (const pid of playerIds) {
      const card = remainingDeck.pop();
      if (card) {
        dealtCards[pid] = card;
      }
    }

    updateGameState({
      phase: 'declaring',
      deck: remainingDeck,
      discardPile: [],
      dealtCards,
      turnOrder: shuffledOrder,
      currentTurnPlayerId: shuffledOrder[0],
      round: 1,
      currentDeclaredValue: null,
      lastDeclarerId: null,
      judgmentResult: null,
    });
  };

  // 数字を宣言
  const handleDeclare = (value: number, actingPlayerId: string) => {
    if (!gameState) return;
    if (gameState.currentTurnPlayerId !== actingPlayerId) return;

    const currentIndex = gameState.turnOrder.indexOf(actingPlayerId);

    // 次のプレイヤーを探す（脱落していないプレイヤー）
    let nextIndex = (currentIndex + 1) % gameState.turnOrder.length;
    let attempts = 0;
    while (attempts < gameState.turnOrder.length) {
      const nextPlayerId = gameState.turnOrder[nextIndex];
      const nextPlayer = players.find(p => p.id === nextPlayerId);
      if (nextPlayer && !nextPlayer.isEliminated) {
        break;
      }
      nextIndex = (nextIndex + 1) % gameState.turnOrder.length;
      attempts++;
    }

    updateGameState({
      currentDeclaredValue: value,
      lastDeclarerId: actingPlayerId,
      currentTurnPlayerId: gameState.turnOrder[nextIndex],
    });
  };

  // ジャッカルを宣言
  const handleCallJackal = (actingPlayerId: string) => {
    if (!gameState) return;
    if (gameState.currentTurnPlayerId !== actingPlayerId) return;
    if (gameState.currentDeclaredValue === null) return;
    if (!gameState.lastDeclarerId) return; // lastDeclarerIdがない場合は処理しない

    // ?カードがある場合は山札から1枚引く
    let mysteryDrawnCard: Card | null = null;
    const hasMystery = Object.values(gameState.dealtCards).some(c => c.type === 'mystery');
    if (hasMystery && gameState.deck.length > 0) {
      mysteryDrawnCard = gameState.deck[gameState.deck.length - 1];
    }

    // 合計値を計算
    const result = calculateTotal(gameState.dealtCards, mysteryDrawnCard);

    // 判定
    const declaredValue = gameState.currentDeclaredValue;
    const lastDeclarerId = gameState.lastDeclarerId;

    let loserId: string;
    let reason: 'over' | 'jackal';

    if (declaredValue > result.totalValue) {
      // 宣言が合計を超えている → 宣言者の負け
      loserId = lastDeclarerId;
      reason = 'over';
    } else {
      // 宣言が合計以下 → ジャッカル宣言者の負け
      loserId = actingPlayerId;
      reason = 'jackal';
    }

    const loser = players.find(p => p.id === loserId);
    const jackalCaller = players.find(p => p.id === actingPlayerId);
    const declarer = players.find(p => p.id === lastDeclarerId);

    // 判定結果を作成
    // Firebaseはundefinedを許可しないので、mysteryCardは存在する場合のみ設定
    const judgmentResult: JudgmentResult = {
      jackalCallerId: actingPlayerId,
      jackalCallerName: jackalCaller?.name ?? '不明',
      declarerId: lastDeclarerId,
      declarerName: declarer?.name ?? '不明',
      declaredValue,
      totalValue: result.totalValue,
      loserId,
      loserName: loser?.name ?? '不明',
      reason,
      cardDetails: result.cardValues.map(cv => ({
        playerId: cv.playerId,
        playerName: players.find(p => p.id === cv.playerId)?.name ?? '不明',
        card: cv.card,
        resolvedValue: cv.resolvedValue,
      })),
      hasDouble: result.hasDouble,
      hasMaxZero: result.hasMaxZero,
      hasShuffleZero: result.hasShuffleZero,
      maxValue: result.maxValue,
    };
    if (result.mysteryResolvedCard) {
      judgmentResult.mysteryCard = result.mysteryResolvedCard;
    }

    // プレイヤーのライフを減らす
    // Firebaseはundefinedを許可しないので、eliminatedAtは脱落時のみ設定
    const updatedPlayers = players.map(p => {
      // 既存のeliminatedAtを除外してコピー
      const { eliminatedAt: _, ...playerWithoutEliminatedAt } = p;

      if (p.id === loserId) {
        const newLife = p.life - 1;
        const isEliminated = newLife <= 0;
        if (isEliminated) {
          return {
            ...playerWithoutEliminatedAt,
            life: newLife,
            isEliminated,
            eliminatedAt: gameState.round,
          };
        }
        return {
          ...playerWithoutEliminatedAt,
          life: newLife,
          isEliminated,
        };
      }
      // 脱落済みプレイヤーはeliminatedAtを保持
      if (p.eliminatedAt !== undefined) {
        return { ...playerWithoutEliminatedAt, eliminatedAt: p.eliminatedAt };
      }
      return playerWithoutEliminatedAt;
    });

    // 山札を更新（?カード用に引いた場合）
    const updatedDeck = hasMystery && mysteryDrawnCard
      ? gameState.deck.slice(0, -1)
      : gameState.deck;

    updateGameState({
      phase: 'round_end',
      players: updatedPlayers,
      deck: updatedDeck,
      judgmentResult,
    });
  };

  // 次のラウンドへ
  const handleNextRound = () => {
    if (!gameState) return;

    // 生き残っているプレイヤーを確認
    const activePlayers = gameState.players.filter(p => !p.isEliminated);

    // 勝者が決定した場合
    if (activePlayers.length <= 1) {
      updateGameState({
        phase: 'game_end',
        winnerId: activePlayers[0]?.id ?? null,
      });
      return;
    }

    // 今ラウンドで使ったカードを捨て札に追加
    const usedCards = Object.values(gameState.dealtCards);
    let newDiscardPile = [...(gameState.discardPile || []), ...usedCards];

    // 現在の山札
    let currentDeck = [...gameState.deck];

    // 特殊0（シャッフル）があった場合、捨て札を山札に混ぜてシャッフル
    const hasShuffleZero = gameState.judgmentResult?.hasShuffleZero ?? false;
    if (hasShuffleZero && newDiscardPile.length > 0) {
      // 捨て札を山札に追加してシャッフル
      currentDeck = shuffleDeck([...currentDeck, ...newDiscardPile]);
      newDiscardPile = [];
    }

    // 山札が足りない場合は捨て札をシャッフルして補充
    if (currentDeck.length < activePlayers.length && newDiscardPile.length > 0) {
      currentDeck = shuffleDeck([...currentDeck, ...newDiscardPile]);
      newDiscardPile = [];
    }

    // アクティブプレイヤーにカードを配る
    const dealtCards: Record<string, Card> = {};
    const remainingDeck = [...currentDeck];

    for (const player of activePlayers) {
      const card = remainingDeck.pop();
      if (card) {
        dealtCards[player.id] = card;
      }
    }

    // ターン順を更新（脱落者を除外）
    const newTurnOrder = gameState.turnOrder.filter(id =>
      activePlayers.some(p => p.id === id)
    );

    // 負けた人から開始（いなければ最初の人）
    const lastLoserId = gameState.judgmentResult?.loserId;
    let startIndex = 0;
    if (lastLoserId && newTurnOrder.includes(lastLoserId)) {
      startIndex = newTurnOrder.indexOf(lastLoserId);
    }
    const startPlayerId = newTurnOrder[startIndex];

    updateGameState({
      phase: 'declaring',
      deck: remainingDeck,
      discardPile: newDiscardPile,
      dealtCards,
      turnOrder: newTurnOrder,
      currentTurnPlayerId: startPlayerId,
      round: gameState.round + 1,
      currentDeclaredValue: null,
      lastDeclarerId: null,
      judgmentResult: null,
    });
  };

  // ロビーに戻る（ゲーム終了時）
  const handleBackToLobby = () => {
    if (!gameState) return;

    // プレイヤーのライフをリセット（eliminatedAtを除外）
    const resetPlayers = gameState.players.map(p => {
      // eliminatedAtを除外してコピー
      const { eliminatedAt: _, ...playerWithoutEliminatedAt } = p;
      return {
        ...playerWithoutEliminatedAt,
        life: settings.initialLife,
        isEliminated: false,
        cardId: null,
      };
    });

    updateGameState({
      phase: 'waiting',
      players: resetPlayers,
      deck: [],
      discardPile: [],
      dealtCards: {},
      round: 1,
      currentTurnPlayerId: null,
      turnOrder: [],
      currentDeclaredValue: null,
      lastDeclarerId: null,
      judgmentResult: null,
      winnerId: null,
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
      />
    );
  }

  // ゲーム終了画面
  if (gameState.phase === 'game_end') {
    return (
      <GameEndPhase
        gameState={gameState}
        playerId={playerId ?? ''}
        isHost={isHost}
        onBackToLobby={handleBackToLobby}
        onLeaveRoom={leaveRoom}
      />
    );
  }

  // 判定結果画面
  if (gameState.phase === 'round_end' || gameState.phase === 'judging') {
    return (
      <JudgmentPhase
        gameState={gameState}
        playerId={playerId ?? ''}
        isHost={isHost}
        onNextRound={handleNextRound}
        onLeaveRoom={leaveRoom}
      />
    );
  }

  // ゲーム画面（宣言フェーズ）
  return (
    <GamePlayPhase
      gameState={gameState}
      playerId={playerId ?? ''}
      debugMode={debugMode}
      onDeclare={handleDeclare}
      onCallJackal={handleCallJackal}
      onLeaveRoom={leaveRoom}
    />
  );
};
