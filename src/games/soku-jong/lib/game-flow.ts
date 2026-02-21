import type { GameState, Player } from '../types/game';
import type { ScoreResult } from './scoring';
import { createFullDeck, shuffleDeck, dealTiles, drawTile } from './tile-deck';
import { findAllMentsuCombinations } from './win-detector';
import { calculateScore, isValidWin } from './scoring';
import { canRon } from './furiten';

// 局初期化（シャッフル→ドラ→配牌→親決定）
export function initializeRound(
  players: Player[],
  roundNumber: number,
): Partial<GameState> {
  const deck = shuffleDeck(createFullDeck());
  const { hands, doraTile, remainingDeck } = dealTiles(deck, players.length);

  const dealerIndex = (roundNumber - 1) % players.length;

  const updatedPlayers = players.map((p, i) => ({
    ...p,
    hand: hands[i],
    discards: [],
    isDealer: i === dealerIndex,
    seatOrder: i,
  }));

  return {
    phase: 'playing',
    round: roundNumber,
    players: updatedPlayers,
    deck: remainingDeck,
    doraTile,
    currentTurn: updatedPlayers[dealerIndex].id,
    turnPhase: 'draw',
    lastDiscard: null,
    lastDiscardPlayerId: null,
  };
}

// ツモ処理
export function processDraw(
  gameState: GameState,
  playerId: string,
): { newState: Partial<GameState>; canTsumo: boolean; tsumoScore: ScoreResult | null } {
  const result = drawTile(gameState.deck);
  if (!result) {
    // 山札切れ → 流局
    return {
      newState: processExhaustiveDraw(gameState),
      canTsumo: false,
      tsumoScore: null,
    };
  }

  const { drawnTile, remainingDeck } = result;

  const updatedPlayers = gameState.players.map((p) => {
    if (p.id !== playerId) return p;
    return { ...p, hand: [...p.hand, drawnTile] };
  });

  const player = updatedPlayers.find((p) => p.id === playerId)!;

  // ツモ和了判定
  let canTsumo = false;
  let tsumoScore: ScoreResult | null = null;

  if (player.hand.length === 6) {
    const combinations = findAllMentsuCombinations(player.hand);
    for (const mentsuList of combinations) {
      if (isValidWin(mentsuList, player.hand, gameState.doraTile, player.isDealer)) {
        canTsumo = true;
        tsumoScore = calculateScore(
          mentsuList,
          player.hand,
          gameState.doraTile,
          player.isDealer,
        );
        // 最高得点の組み合わせを選ぶ
        for (const ml of combinations) {
          if (isValidWin(ml, player.hand, gameState.doraTile, player.isDealer)) {
            const s = calculateScore(ml, player.hand, gameState.doraTile, player.isDealer);
            if (s.total > tsumoScore.total) {
              tsumoScore = s;
            }
          }
        }
        break;
      }
    }
  }

  return {
    newState: {
      players: updatedPlayers,
      deck: remainingDeck,
      turnPhase: 'discard',
    },
    canTsumo,
    tsumoScore,
  };
}

// 打牌処理
export function processDiscard(
  gameState: GameState,
  playerId: string,
  tileId: string,
): Partial<GameState> {
  let discardedTile = null as GameState['lastDiscard'];

  const updatedPlayers = gameState.players.map((p) => {
    if (p.id !== playerId) return p;
    const tile = p.hand.find((t) => t.id === tileId);
    if (!tile) return p;
    discardedTile = tile;
    return {
      ...p,
      hand: p.hand.filter((t) => t.id !== tileId),
      discards: [...p.discards, tile],
    };
  });

  return {
    players: updatedPlayers,
    lastDiscard: discardedTile,
    lastDiscardPlayerId: playerId,
    turnPhase: 'ron_check',
  };
}

// ロン候補（頭ハネ順 = 打牌者の次の席順から）
export function checkRonCandidates(
  gameState: GameState,
): { playerId: string; score: ScoreResult }[] {
  if (!gameState.lastDiscard || !gameState.lastDiscardPlayerId) return [];

  const discarderId = gameState.lastDiscardPlayerId;
  const discarderIndex = gameState.players.findIndex((p) => p.id === discarderId);
  const playerCount = gameState.players.length;

  const candidates: { playerId: string; score: ScoreResult }[] = [];

  // 頭ハネ順: 打牌者の次の席から順に
  for (let offset = 1; offset < playerCount; offset++) {
    const idx = (discarderIndex + offset) % playerCount;
    const player = gameState.players[idx];

    if (canRon(player, gameState.lastDiscard, gameState.doraTile)) {
      const testHand = [...player.hand, gameState.lastDiscard];
      const combinations = findAllMentsuCombinations(testHand);

      // 最高得点を選ぶ
      let bestScore: ScoreResult | null = null;
      for (const mentsuList of combinations) {
        if (isValidWin(mentsuList, testHand, gameState.doraTile, player.isDealer)) {
          const s = calculateScore(
            mentsuList,
            testHand,
            gameState.doraTile,
            player.isDealer,
          );
          if (!bestScore || s.total > bestScore.total) {
            bestScore = s;
          }
        }
      }

      if (bestScore) {
        candidates.push({ playerId: player.id, score: bestScore });
      }
    }
  }

  return candidates;
}

// ツモ和了精算: 他全員が ceil(total / otherCount) 支払い
export function executeTsumo(
  gameState: GameState,
  winnerId: string,
  score: ScoreResult,
): Partial<GameState> {
  const otherCount = gameState.players.length - 1;
  const perPlayer = Math.ceil(score.total / otherCount);

  const updatedPlayers = gameState.players.map((p) => {
    if (p.id === winnerId) {
      return { ...p, score: p.score + perPlayer * otherCount };
    }
    return { ...p, score: p.score - perPlayer };
  });

  return {
    players: updatedPlayers,
    phase: 'round_result',
  };
}

// ロン精算: 放銃者が全額支払い
export function executeRon(
  gameState: GameState,
  winnerId: string,
  loserId: string,
  score: ScoreResult,
): Partial<GameState> {
  const updatedPlayers = gameState.players.map((p) => {
    if (p.id === winnerId) {
      return { ...p, score: p.score + score.total };
    }
    if (p.id === loserId) {
      return { ...p, score: p.score - score.total };
    }
    return p;
  });

  return {
    players: updatedPlayers,
    phase: 'round_result',
  };
}

// 流局
export function processExhaustiveDraw(
  gameState: GameState,
): Partial<GameState> {
  return {
    phase: 'round_result',
  };
}

// 次の手番
export function getNextTurnPlayerId(
  players: Player[],
  currentId: string,
): string {
  const currentIndex = players.findIndex((p) => p.id === currentId);
  const nextIndex = (currentIndex + 1) % players.length;
  return players[nextIndex].id;
}

// 4局完了 or 0点以下
export function isGameOver(gameState: GameState): boolean {
  if (gameState.round >= gameState.settings.totalRounds) return true;
  return gameState.players.some((p) => p.score <= 0);
}

// 最高得点者
export function determineWinner(players: Player[]): Player {
  return players.reduce((best, p) => (p.score > best.score ? p : best));
}
