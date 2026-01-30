import { useCallback, useEffect, useRef } from 'react';
import type { GameState, TrapType, FieldCard, Card, ReturnInfo, RuleSet } from '../types/game';
import { RULE_SETS } from '../types/game';
import { createDeck, shuffleDeck, addRelicToDeck, rollRelicValue, getFixedRelicValue, removeTrapFromDeck, shouldBeMystery, rollTurnEvent } from '../deck';

// 初期の罠カウント（アトランティス用 + インカ用）
const createInitialTrapCounts = (): Record<TrapType, number> => ({
  // アトランティス用
  shark: 0,
  light: 0,
  rope: 0,
  bombe: 0,
  pressure: 0,
  // インカ用
  scorpion: 0,
  zombi: 0,
  snake: 0,
  fire: 0,
  rock: 0,
});

// Firebaseはundefinedを受け付けないのでnullに変換
const sanitizeForFirebase = (state: Partial<GameState>): Partial<GameState> => ({
  ...state,
  returnResolve: state.returnResolve ?? null,
  relicRoll: state.relicRoll ?? null,
  mysteryReveal: state.mysteryReveal ?? null,
  cardDraw: state.cardDraw ?? null,
  drawThree: state.drawThree ?? null,
});

interface UseGameProps {
  gameState: GameState;
  playerId: string | null;
  isHost: boolean;
  ruleSet?: RuleSet;
  updateGameState: (state: Partial<GameState>) => Promise<void>;
  updatePlayerDecision: (decision: 'proceed' | 'return') => Promise<void>;
}

export const useGame = ({
  gameState,
  playerId,
  isHost,
  ruleSet = RULE_SETS.atlantis,
  updateGameState,
  updatePlayerDecision,
}: UseGameProps) => {
  // 配列を安全に取得
  const players = Array.isArray(gameState.players) ? gameState.players : [];
  const deck = Array.isArray(gameState.deck) ? gameState.deck : [];
  const field = Array.isArray(gameState.field) ? gameState.field : [];

  // ゲーム開始（ホストのみ）
  const startGame = useCallback(async () => {
    if (!isHost) return;

    const newDeck = createDeck(ruleSet);
    await updateGameState({
      deck: newDeck,
      phase: 'round_start',
      round: 1,
      turn: 0,
      field: [],
      remainderGems: 0,
      trapCounts: createInitialTrapCounts(),
      currentEvent: null,
      relicsOnField: 0,
      comboCount: 0,
      returnResolve: null,
      relicRoll: null,
      mysteryReveal: null,
      players: players.map(p => ({
        ...p,
        confirmedGems: 0,
        pendingGems: 0,
        isExploring: true,
        hasReturnedThisTurn: false,
        isAllIn: false,
        decision: null,
        relics: [],
      })),
    });
  }, [isHost, players, updateGameState]);

  // ラウンド開始（ホストのみ）
  const startRound = useCallback(async () => {
    if (!isHost) return;

    const event = rollTurnEvent(gameState.round, ruleSet.useEvents);
    const needsTurnStart = event === 'all_in_time';

    // ラウンド2以降はデッキに遺物1枚追加
    const updatedDeck = gameState.round >= 2 ? addRelicToDeck(deck) : deck;

    await updateGameState(sanitizeForFirebase({
      phase: needsTurnStart ? 'turn_start' : 'decision',
      turn: 1,
      currentEvent: event,
      deck: updatedDeck,
      players: players.map(p => ({
        ...p,
        isExploring: true,
        pendingGems: 0,
        hasReturnedThisTurn: false,
        isAllIn: false,
        decision: null,
      })),
    }));
  }, [isHost, gameState.round, deck, players, updateGameState]);

  // オールイン宣言
  const declareAllIn = useCallback(async (declare: boolean) => {
    if (!playerId) return;

    await updateGameState(sanitizeForFirebase({
      phase: 'decision',
      players: players.map(p =>
        p.id === playerId ? { ...p, isAllIn: declare, decision: null } : p
      ),
    }));
  }, [playerId, players, updateGameState]);

  // 次のラウンドへ（ホストのみ）
  const nextRound = useCallback(async () => {
    if (!isHost) return;

    if (gameState.round >= 5) {
      await updateGameState(sanitizeForFirebase({ phase: 'game_end' }));
      return;
    }

    await updateGameState(sanitizeForFirebase({
      phase: 'round_start',
      round: gameState.round + 1,
      turn: 0,
      deck: shuffleDeck(createDeck(ruleSet)),
      field: [],
      remainderGems: 0,
      trapCounts: createInitialTrapCounts(),
      currentEvent: null,
      relicsOnField: 0,
      comboCount: 0,
      players: players.map(p => ({
        ...p,
        isExploring: true,
        pendingGems: 0,
        hasReturnedThisTurn: false,
        isAllIn: false,
        decision: null,
      })),
    }));
  }, [isHost, gameState.round, players, updateGameState]);

  // プレイヤーの決定を送信
  const makeDecision = useCallback(async (decision: 'proceed' | 'return') => {
    await updatePlayerDecision(decision);
  }, [updatePlayerDecision]);

  // カードの効果を処理
  const resolveCard = (state: GameState, card: Card, rules: RuleSet): GameState => {
    const exploringPlayers = state.players.filter(p => p.isExploring);

    // 宝石カード
    if (card.type === 'gem' && card.value !== undefined) {
      // 探索中のプレイヤーがいない場合は全て端数に
      if (exploringPlayers.length === 0) {
        // 最後のカードに端数を記録
        const updatedField = [...state.field];
        if (updatedField.length > 0) {
          const lastIdx = updatedField.length - 1;
          updatedField[lastIdx] = {
            ...updatedField[lastIdx],
            remainderGems: (updatedField[lastIdx].remainderGems || 0) + card.value,
          };
        }
        return {
          ...state,
          phase: 'decision',
          field: updatedField,
          remainderGems: state.remainderGems + card.value,
          players: state.players.map(p => ({ ...p, decision: null })),
        };
      }

      const perPlayer = Math.floor(card.value / exploringPlayers.length);
      const remainder = card.value % exploringPlayers.length;

      let comboBonus = 0;
      let newComboCount = state.comboCount;
      if (state.currentEvent === 'combo_chance' && card.value > 0) {
        newComboCount++;
        comboBonus = 5 * newComboCount;
      }

      // 最後のカード（今めくったカード）に端数を記録
      const updatedField = [...state.field];
      if (remainder > 0 && updatedField.length > 0) {
        const lastIdx = updatedField.length - 1;
        updatedField[lastIdx] = {
          ...updatedField[lastIdx],
          remainderGems: (updatedField[lastIdx].remainderGems || 0) + remainder,
        };
      }

      return {
        ...state,
        phase: 'decision',
        field: updatedField,
        remainderGems: state.remainderGems + (remainder > 0 ? remainder : 0),
        comboCount: newComboCount,
        players: state.players.map(p =>
          p.isExploring
            ? { ...p, pendingGems: p.pendingGems + perPlayer + (comboBonus > 0 ? Math.floor(comboBonus / exploringPlayers.length) : 0), decision: null }
            : p
        ),
      };
    }

    // 罠カード
    if (card.type === 'trap' && card.trapType) {
      const newTrapCounts = { ...state.trapCounts };
      newTrapCounts[card.trapType]++;

      // 罠脱落条件はルールに依存（アトランティス: 3枚、インカ: 2枚）
      if (newTrapCounts[card.trapType] >= rules.trapBustCount) {
        const updatedPlayers = state.players.map(p => {
          if (p.isExploring) {
            if (p.isAllIn) {
              return { ...p, confirmedGems: 0, pendingGems: 0, isExploring: false, decision: null };
            }
            return { ...p, pendingGems: 0, isExploring: false, decision: null };
          }
          return p;
        });

        // インカルールでは罠脱落時にデッキから該当罠を1枚除去
        let updatedDeck = state.deck;
        if (rules.removeTrapOnBust && card.trapType) {
          updatedDeck = removeTrapFromDeck(state.deck, card.trapType);
        }

        return {
          ...state,
          phase: 'round_end',
          deck: updatedDeck,
          trapCounts: newTrapCounts,
          players: updatedPlayers,
        };
      }

      return {
        ...state,
        phase: 'decision',
        trapCounts: newTrapCounts,
        comboCount: 0,
        players: state.players.map(p => ({ ...p, decision: null })),
      };
    }

    // 特殊カード
    if (card.type === 'special' && card.specialEffect) {
      switch (card.specialEffect) {
        case 'double_remainder':
          return {
            ...state,
            phase: 'decision',
            remainderGems: state.remainderGems * 2,
            players: state.players.map(p => ({ ...p, decision: null })),
          };

        case 'bonus_all':
          return {
            ...state,
            phase: 'decision',
            players: state.players.map(p =>
              p.isExploring ? { ...p, pendingGems: p.pendingGems + 5, decision: null } : { ...p, decision: null }
            ),
          };

        case 'draw_three':
          // 3枚をデッキから取得（演出用）
          const cardsToDrawList: { card: Card; isMystery: boolean }[] = [];
          let remainingDeckForDraw = [...state.deck];
          const exploringCount = state.players.filter(p => p.isExploring).length;
          for (let i = 0; i < 3 && remainingDeckForDraw.length > 0; i++) {
            const [nextCard, ...rest] = remainingDeckForDraw;
            remainingDeckForDraw = rest;
            // 探索者が2人以上の時のみミステリー判定
            cardsToDrawList.push({ card: nextCard, isMystery: exploringCount > 1 && shouldBeMystery(ruleSet.useMysteryCards) });
          }
          if (cardsToDrawList.length === 0) {
            return { ...state, phase: 'decision', players: state.players.map(p => ({ ...p, decision: null })) };
          }
          // 最初のカードを場に追加して演出フェーズへ
          const firstCard = cardsToDrawList[0];
          return {
            ...state,
            phase: 'draw_three',
            deck: remainingDeckForDraw,
            field: [...state.field, { card: firstCard.card, isMystery: firstCard.isMystery, isRevealed: !firstCard.isMystery, remainderGems: 0 }],
            drawThree: {
              cards: cardsToDrawList,
              currentIndex: 0,
              isFlipping: true,
            },
          };

        case 'remove_trap':
          const trapTypes: TrapType[] = ['shark', 'light', 'rope', 'bombe', 'pressure'];
          const newTrapCounts = { ...state.trapCounts };
          let removedTrapType: TrapType | null = null;
          for (const trapType of trapTypes) {
            if (newTrapCounts[trapType] > 0) {
              newTrapCounts[trapType]--;
              removedTrapType = trapType;
              break;
            }
          }
          // 場から該当する罠カードを1枚削除
          let newField = [...state.field];
          if (removedTrapType) {
            const trapIndex = newField.findIndex(
              fc => fc.card.type === 'trap' && fc.card.trapType === removedTrapType
            );
            if (trapIndex >= 0) {
              newField = newField.filter((_, idx) => idx !== trapIndex);
            }
          }
          return {
            ...state,
            phase: 'decision',
            field: newField,
            trapCounts: newTrapCounts,
            players: state.players.map(p => ({ ...p, decision: null })),
          };
      }
    }

    // 遺物カード
    if (card.type === 'relic') {
      return {
        ...state,
        phase: 'decision',
        relicsOnField: (state.relicsOnField || 0) + 1,
        players: state.players.map(p => ({ ...p, decision: null })),
      };
    }

    return { ...state, phase: 'decision', players: state.players.map(p => ({ ...p, decision: null })) };
  };

  // ターンを進める（ホストのみ、全員の決定が揃ったら）
  const processTurn = useCallback(async () => {
    if (!isHost) return;

    const exploringPlayersList = players.filter(p => p.isExploring);

    // 帰還するプレイヤーの処理
    const returningPlayers = exploringPlayersList.filter(p => p.decision === 'return');
    const proceedingPlayers = exploringPlayersList.filter(p => p.decision === 'proceed');

    let newState = {
      ...gameState,
      players,
      deck,
      field,
      returnResolve: gameState.returnResolve ?? null,
      relicRoll: gameState.relicRoll ?? null,
    };

    // 帰還処理（帰還者がいる場合は演出フェーズへ）
    if (returningPlayers.length > 0) {
      // ラストサバイバーボーナス判定（1人だけ帰還し、他に進む人がいる場合）
      const isLastSurvivor = gameState.currentEvent === 'last_survivor' &&
        returningPlayers.length === 1 && proceedingPlayers.length > 0;

      // 帰還情報を計算（遺物の価値もこの時点でロール）
      const returningPlayersInfo: ReturnInfo[] = returningPlayers.map((p) => {
        // 端数は常に帰還者で分配
        const bonusGems = Math.floor(newState.remainderGems / returningPlayers.length);
        let lastSurvivorBonus = 0;
        let relicsCount = 0;
        let rolledRelics: number[] = [];

        // 遺物は1人の時のみ獲得（全ての場の遺物を獲得）
        if ((newState.relicsOnField || 0) > 0 && returningPlayers.length === 1) {
          relicsCount = newState.relicsOnField || 0;
          // 遺物の価値をロール（インカルールでは固定値）
          for (let i = 0; i < relicsCount; i++) {
            if (ruleSet.relicValueType === 'fixed') {
              // インカルール: プレイヤーの既存遺物数 + ロール済みの数で価値を決定
              const currentRelicCount = (p.relics?.length || 0) + i;
              rolledRelics.push(getFixedRelicValue(currentRelicCount));
            } else {
              rolledRelics.push(rollRelicValue());
            }
          }
        }

        // ラストサバイバーボーナス
        if (isLastSurvivor) {
          lastSurvivorBonus = 20;
        }

        const allInMultiplier = p.isAllIn ? 2 : 1;
        const relicsTotal = rolledRelics.reduce((sum, v) => sum + v, 0);
        const baseTotal = p.pendingGems + bonusGems + lastSurvivorBonus + relicsTotal;
        const total = baseTotal * allInMultiplier;

        return {
          playerId: p.id,
          playerName: p.name,
          pendingGems: p.pendingGems,
          bonusGems,
          lastSurvivorBonus,
          relicsCount,
          rolledRelics,
          allInMultiplier,
          total,
        };
      });

      // ラストサバイバーボーナスを獲得したらイベントをクリア（同ラウンド内での重複獲得を防ぐ）
      if (isLastSurvivor) {
        newState = { ...newState, currentEvent: null };
      }

      // 帰還演出フェーズに移行
      await updateGameState(sanitizeForFirebase({
        ...newState,
        phase: 'return_resolve',
        returnResolve: {
          returningPlayers: returningPlayersInfo,
          currentIndex: 0,
        },
      }));
      return;
    }

    // 帰還者なし：進むプレイヤーがいる場合、カードめくり演出へ
    if (proceedingPlayers.length > 0) {
      if (newState.deck.length === 0) {
        await updateGameState(sanitizeForFirebase({ ...newState, phase: 'round_end' }));
        return;
      }

      const [drawnCard, ...remainingDeck] = newState.deck;
      // 探索者が2人以上の時のみミステリー判定
      const isMystery = proceedingPlayers.length > 1 && shouldBeMystery(ruleSet.useMysteryCards);

      // カードを場に追加
      const newFieldCard: FieldCard = {
        card: drawnCard,
        isMystery,
        isRevealed: !isMystery,
        remainderGems: 0,
      };

      newState = {
        ...newState,
        deck: remainingDeck,
        field: [...newState.field, newFieldCard],
        turn: newState.turn + 1,
      };

      // カードめくり演出フェーズへ
      await updateGameState(sanitizeForFirebase({
        ...newState,
        phase: 'card_draw',
        cardDraw: {
          card: drawnCard,
          isMystery,
        },
      }));
      return;
    }

    await updateGameState(sanitizeForFirebase(newState));
  }, [isHost, gameState, players, deck, field, updateGameState]);

  // 帰還演出を完了して次へ進める（ホストのみ）- 全員一括処理
  const processNextReturn = useCallback(async () => {
    if (!isHost || !gameState.returnResolve) return;

    const { returningPlayers } = gameState.returnResolve;

    let newState: GameState = {
      ...gameState,
      players,
      deck,
      field,
      returnResolve: gameState.returnResolve ?? null,
      relicRoll: gameState.relicRoll ?? null,
      mysteryReveal: gameState.mysteryReveal ?? null,
    };

    // 全帰還者のプレイヤー状態を一括更新
    newState = {
      ...newState,
      players: newState.players.map(p => {
        const returnInfo = returningPlayers.find(r => r.playerId === p.id);
        if (returnInfo) {
          return {
            ...p,
            confirmedGems: p.confirmedGems + returnInfo.total,
            pendingGems: 0,
            isExploring: false,
            hasReturnedThisTurn: true,
            decision: null,
            relics: [...(p.relics || []), ...returnInfo.rolledRelics],
          };
        }
        return p;
      }),
    };

    // 端数の更新（カード上の表示も更新）
    const totalBonusGems = returningPlayers.reduce((sum, r) => sum + r.bonusGems, 0);
    const newRemainderGems = newState.remainderGems - totalBonusGems;

    // カード上の端数表示をクリアし、残りがあれば一番新しいカードに表示
    let updatedField = newState.field.map(fc => ({ ...fc, remainderGems: 0 }));
    if (newRemainderGems > 0 && updatedField.length > 0) {
      const lastIdx = updatedField.length - 1;
      updatedField[lastIdx] = { ...updatedField[lastIdx], remainderGems: newRemainderGems };
    }

    newState = {
      ...newState,
      remainderGems: newRemainderGems,
      field: updatedField,
    };

    // 遺物がある場合は場からクリア（カードも削除）
    const hasRelics = returningPlayers.some(r => r.relicsCount > 0);
    if (hasRelics) {
      newState = {
        ...newState,
        relicsOnField: 0,
        field: newState.field.filter(fc => fc.card.type !== 'relic'),
      };
    }

    // 完了処理へ
    await finishReturnAndContinue(newState);
  }, [isHost, gameState, players, deck, field, updateGameState]);

  // 遺物ロールを進める（ホストのみ）- ドラムロール後に結果を表示
  const processRelicRoll = useCallback(async () => {
    if (!isHost || !gameState.relicRoll) return;

    const { playerId, playerName, relicsToRoll, rolledValues } = gameState.relicRoll;
    let newState = {
      ...gameState,
      players,
      deck,
      field,
      returnResolve: gameState.returnResolve ?? null,
      relicRoll: gameState.relicRoll ?? null,
    };

    // 遺物の価値をロール（インカルールでは固定値）
    let newValue: number;
    if (ruleSet.relicValueType === 'fixed') {
      // インカルール: プレイヤーの既存遺物数で価値を決定
      const player = newState.players.find(p => p.id === playerId);
      const currentRelicCount = player?.relics?.length || 0;
      newValue = getFixedRelicValue(currentRelicCount);
    } else {
      newValue = rollRelicValue();
    }
    const newRolledValues = [...rolledValues, newValue];

    // プレイヤーの遺物リストに追加
    newState = {
      ...newState,
      players: newState.players.map(p => {
        if (p.id === playerId) {
          return {
            ...p,
            relics: [...(p.relics || []), newValue],
            confirmedGems: p.confirmedGems + newValue * (p.isAllIn ? 2 : 1),
          };
        }
        return p;
      }),
    };

    // 結果を表示状態に（まだ次には進まない）
    await updateGameState(sanitizeForFirebase({
      ...newState,
      relicRoll: {
        playerId,
        playerName,
        relicsToRoll,
        rolledValues: newRolledValues,
        currentRolling: false,
        showingResult: true,
      },
    }));
  }, [isHost, gameState, players, deck, field, updateGameState]);

  // 遺物ロール結果表示後に次へ進む（ホストのみ）
  const continueAfterRelicResult = useCallback(async () => {
    if (!isHost || !gameState.relicRoll) return;

    const { playerId, playerName, relicsToRoll, rolledValues } = gameState.relicRoll;
    let newState = {
      ...gameState,
      players,
      deck,
      field,
      returnResolve: gameState.returnResolve ?? null,
      relicRoll: gameState.relicRoll ?? null,
    };

    // まだロールする遺物がある場合
    if (rolledValues.length < relicsToRoll) {
      await updateGameState(sanitizeForFirebase({
        ...newState,
        relicRoll: {
          playerId,
          playerName,
          relicsToRoll,
          rolledValues,
          currentRolling: true,
          showingResult: false,
        },
      }));
      return;
    }

    // 全遺物ロール完了：returnResolveに戻る
    const returnResolve = gameState.returnResolve;
    if (!returnResolve) {
      // returnResolveがない場合は何かおかしいが、続行
      await updateGameState(sanitizeForFirebase({ ...newState, phase: 'decision', relicRoll: null }));
      return;
    }

    await finishReturnAndContinue({ ...newState, relicRoll: null });
  }, [isHost, gameState, players, deck, field, updateGameState]);

  // 帰還処理完了後の継続処理
  const finishReturnAndContinue = useCallback(async (state: GameState) => {
    let newState = state;

    // ミステリーカードがあれば公開フェーズへ
    const mysteryIndices = newState.field
      .map((fc, idx) => fc.isMystery && !fc.isRevealed ? idx : -1)
      .filter(idx => idx >= 0);

    if (mysteryIndices.length > 0) {
      // ミステリーカード公開フェーズへ移行
      await updateGameState(sanitizeForFirebase({
        ...newState,
        phase: 'mystery_reveal',
        returnResolve: null,
        mysteryReveal: {
          mysteryIndices,
          currentIndex: 0,
          isFlipping: true,
        },
      }));
      return;
    }

    // ミステリーカードがない場合はそのまま続行
    newState = { ...newState, returnResolve: null };

    // 全員帰還したらラウンド終了/次ラウンド
    const stillExploring = newState.players.filter(p => p.isExploring);
    if (stillExploring.length === 0) {
      if (newState.round >= 5) {
        await updateGameState(sanitizeForFirebase({ ...newState, phase: 'game_end' }));
      } else {
        await updateGameState(sanitizeForFirebase({
          ...newState,
          phase: 'round_start',
          round: newState.round + 1,
          turn: 0,
          deck: shuffleDeck(createDeck(ruleSet)),
          field: [],
          remainderGems: 0,
          trapCounts: createInitialTrapCounts(),
          currentEvent: null,
          relicsOnField: 0,
          comboCount: 0,
          players: newState.players.map(p => ({
            ...p,
            isExploring: true,
            pendingGems: 0,
            hasReturnedThisTurn: false,
            isAllIn: false,
            decision: null,
          })),
        }));
      }
      return;
    }

    // 進むプレイヤーがいる場合、カードめくり演出フェーズへ
    if (newState.deck.length === 0) {
      await updateGameState(sanitizeForFirebase({ ...newState, phase: 'round_end' }));
      return;
    }

    const [drawnCard, ...remainingDeck] = newState.deck;
    // 探索者が2人以上の時のみミステリー判定
    const isMystery = stillExploring.length > 1 && shouldBeMystery(ruleSet.useMysteryCards);

    const newFieldCard: FieldCard = {
      card: drawnCard,
      isMystery,
      isRevealed: !isMystery,
      remainderGems: 0,
    };

    newState = {
      ...newState,
      deck: remainingDeck,
      field: [...newState.field, newFieldCard],
      turn: newState.turn + 1,
    };

    // カードめくり演出フェーズへ
    await updateGameState(sanitizeForFirebase({
      ...newState,
      phase: 'card_draw',
      cardDraw: {
        card: drawnCard,
        isMystery,
      },
    }));
  }, [updateGameState]);

  // ミステリーカード公開を進める（ホストのみ）
  const processMysteryReveal = useCallback(async () => {
    if (!isHost || !gameState.mysteryReveal) return;

    const { mysteryIndices, currentIndex } = gameState.mysteryReveal;
    const fieldIndex = mysteryIndices[currentIndex];

    let newState: GameState = {
      ...gameState,
      players,
      deck,
      field: [...field],
      returnResolve: gameState.returnResolve ?? null,
      relicRoll: gameState.relicRoll ?? null,
      mysteryReveal: gameState.mysteryReveal ?? null,
    };

    // 現在のカードを公開済みにする
    newState.field[fieldIndex] = {
      ...newState.field[fieldIndex],
      isRevealed: true,
      revealedAtTurn: newState.turn,
    };

    // カードの効果を処理
    const revealedCard = newState.field[fieldIndex].card;
    const resolvedState = resolveCard(newState, revealedCard, ruleSet);
    newState = {
      ...resolvedState,
      returnResolve: resolvedState.returnResolve ?? null,
      relicRoll: resolvedState.relicRoll ?? null,
      mysteryReveal: resolvedState.mysteryReveal ?? null,
    };

    // 罠で全滅した場合
    if (newState.phase === 'round_end') {
      await updateGameState(sanitizeForFirebase({
        ...newState,
        mysteryReveal: null,
      }));
      return;
    }

    // 次のミステリーカードへ
    const nextIndex = currentIndex + 1;
    if (nextIndex < mysteryIndices.length) {
      await updateGameState(sanitizeForFirebase({
        ...newState,
        phase: 'mystery_reveal',
        mysteryReveal: {
          mysteryIndices,
          currentIndex: nextIndex,
          isFlipping: true,
        },
      }));
      return;
    }

    // 全ミステリーカード公開完了
    await finishMysteryRevealAndContinue(newState);
  }, [isHost, gameState, players, deck, field, updateGameState]);

  // ミステリーカード公開完了後の継続処理
  const finishMysteryRevealAndContinue = useCallback(async (state: GameState) => {
    let newState: GameState = { ...state, mysteryReveal: null };

    // 全員帰還したらラウンド終了/次ラウンド
    const stillExploring = newState.players.filter(p => p.isExploring);
    if (stillExploring.length === 0) {
      if (newState.round >= 5) {
        await updateGameState(sanitizeForFirebase({ ...newState, phase: 'game_end' }));
      } else {
        await updateGameState(sanitizeForFirebase({
          ...newState,
          phase: 'round_start',
          round: newState.round + 1,
          turn: 0,
          deck: shuffleDeck(createDeck(ruleSet)),
          field: [],
          remainderGems: 0,
          trapCounts: createInitialTrapCounts(),
          currentEvent: null,
          relicsOnField: 0,
          comboCount: 0,
          players: newState.players.map(p => ({
            ...p,
            isExploring: true,
            pendingGems: 0,
            hasReturnedThisTurn: false,
            isAllIn: false,
            decision: null,
          })),
        }));
      }
      return;
    }

    // 進むプレイヤーがいる場合、カードめくり演出フェーズへ
    if (newState.deck.length === 0) {
      await updateGameState(sanitizeForFirebase({ ...newState, phase: 'round_end' }));
      return;
    }

    const [drawnCard, ...remainingDeck] = newState.deck;
    // 探索者が2人以上の時のみミステリー判定
    const isMystery = stillExploring.length > 1 && shouldBeMystery(ruleSet.useMysteryCards);

    const newFieldCard: FieldCard = {
      card: drawnCard,
      isMystery,
      isRevealed: !isMystery,
      remainderGems: 0,
    };

    newState = {
      ...newState,
      deck: remainingDeck,
      field: [...newState.field, newFieldCard],
      turn: newState.turn + 1,
    };

    // カードめくり演出フェーズへ
    await updateGameState(sanitizeForFirebase({
      ...newState,
      phase: 'card_draw',
      cardDraw: {
        card: drawnCard,
        isMystery,
      },
    }));
  }, [updateGameState]);

  // 全員が決定済みかチェック（nullとundefined両方をチェック）
  const exploringPlayers = players.filter(p => p.isExploring);
  const allDecided = exploringPlayers.length > 0 && exploringPlayers.every(p => p.decision === 'proceed' || p.decision === 'return');

  // 現在のプレイヤー
  const currentPlayer = players.find(p => p.id === playerId);

  // 全員決定したら自動でターンを進める（ホストのみ）
  const isProcessingRef = useRef(false);
  useEffect(() => {
    if (isHost && allDecided && gameState.phase === 'decision' && !isProcessingRef.current) {
      isProcessingRef.current = true;
      // 2秒間、全員の決定を表示してから進める
      const timer = setTimeout(() => {
        processTurn().finally(() => {
          isProcessingRef.current = false;
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isHost, allDecided, gameState.phase, processTurn]);

  // 帰還演出を自動で進める（ホストのみ）- 全員同時表示
  const isProcessingReturnRef = useRef(false);
  useEffect(() => {
    if (isHost && gameState.phase === 'return_resolve' && gameState.returnResolve && !isProcessingReturnRef.current) {
      isProcessingReturnRef.current = true;
      // 遺物の最大数に応じて待機時間を調整（基本2.5秒 + 遺物ごとに1秒）
      const maxRelics = Math.max(...gameState.returnResolve.returningPlayers.map(r => r.relicsCount || 0), 0);
      const waitTime = 2500 + (maxRelics * 1000);
      const timer = setTimeout(() => {
        processNextReturn().finally(() => {
          isProcessingReturnRef.current = false;
        });
      }, waitTime);
      return () => clearTimeout(timer);
    }
  }, [isHost, gameState.phase, gameState.returnResolve, processNextReturn]);

  // 遺物ロール演出を自動で進める（ホストのみ）- ドラムロール中のみ
  const isProcessingRelicRef = useRef(false);
  useEffect(() => {
    if (isHost && gameState.phase === 'relic_roll' && gameState.relicRoll?.currentRolling && !isProcessingRelicRef.current) {
      isProcessingRelicRef.current = true;
      // 2秒間のドラムロール演出後にロール
      const timer = setTimeout(() => {
        processRelicRoll().finally(() => {
          isProcessingRelicRef.current = false;
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isHost, gameState.phase, gameState.relicRoll?.currentRolling, gameState.relicRoll?.rolledValues?.length, processRelicRoll]);

  // 遺物ロール結果表示後に次へ進める（ホストのみ）
  const isProcessingRelicResultRef = useRef(false);
  useEffect(() => {
    if (isHost && gameState.phase === 'relic_roll' && gameState.relicRoll?.showingResult && !isProcessingRelicResultRef.current) {
      isProcessingRelicResultRef.current = true;
      // 1.5秒間結果を表示してから次へ
      const timer = setTimeout(() => {
        continueAfterRelicResult().finally(() => {
          isProcessingRelicResultRef.current = false;
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isHost, gameState.phase, gameState.relicRoll?.showingResult, gameState.relicRoll?.rolledValues?.length, continueAfterRelicResult]);

  // ミステリーカード公開演出を自動で進める（ホストのみ）
  const isProcessingMysteryRef = useRef(false);
  const lastMysteryIndexRef = useRef(-1);
  useEffect(() => {
    // カードが変わったらフラグをリセット
    const currentIndex = gameState.mysteryReveal?.currentIndex ?? -1;
    if (currentIndex !== lastMysteryIndexRef.current) {
      isProcessingMysteryRef.current = false;
      lastMysteryIndexRef.current = currentIndex;
    }

    if (isHost && gameState.phase === 'mystery_reveal' && gameState.mysteryReveal?.isFlipping && !isProcessingMysteryRef.current) {
      isProcessingMysteryRef.current = true;
      // 2秒間のフリップ演出後に次へ
      const timer = setTimeout(() => {
        processMysteryReveal().finally(() => {
          isProcessingMysteryRef.current = false;
        });
      }, 2000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isHost, gameState.phase, gameState.mysteryReveal?.isFlipping, gameState.mysteryReveal?.currentIndex, processMysteryReveal]);

  // カードめくり演出後の処理（ホストのみ）
  const processCardDraw = useCallback(async () => {
    if (!isHost || !gameState.cardDraw) return;

    const { card: drawnCard, isMystery } = gameState.cardDraw;

    let newState: GameState = {
      ...gameState,
      players,
      deck,
      field,
      returnResolve: gameState.returnResolve ?? null,
      relicRoll: gameState.relicRoll ?? null,
      mysteryReveal: gameState.mysteryReveal ?? null,
      cardDraw: null,
    };

    if (!isMystery) {
      const resolved = resolveCard(newState, drawnCard, ruleSet);
      newState = {
        ...resolved,
        returnResolve: resolved.returnResolve ?? null,
        relicRoll: resolved.relicRoll ?? null,
        mysteryReveal: resolved.mysteryReveal ?? null,
        cardDraw: null,
      };
    } else {
      newState = {
        ...newState,
        phase: 'decision',
        players: newState.players.map(p => ({ ...p, decision: null })),
      };
    }

    await updateGameState(sanitizeForFirebase(newState));
  }, [isHost, gameState, players, deck, field, updateGameState]);

  // カードめくり演出を自動で進める（ホストのみ）
  const isProcessingCardDrawRef = useRef(false);
  useEffect(() => {
    if (isHost && gameState.phase === 'card_draw' && gameState.cardDraw && !isProcessingCardDrawRef.current) {
      isProcessingCardDrawRef.current = true;
      // 2秒間の演出後に処理
      const timer = setTimeout(() => {
        processCardDraw().finally(() => {
          isProcessingCardDrawRef.current = false;
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isHost, gameState.phase, gameState.cardDraw, processCardDraw]);

  // 3枚ドロー演出の処理（ホストのみ）
  const processDrawThree = useCallback(async () => {
    if (!isHost || !gameState.drawThree) return;

    const { cards, currentIndex } = gameState.drawThree;
    if (currentIndex >= cards.length) return;

    const { card: currentCard, isMystery } = cards[currentIndex];

    let newState: GameState = {
      ...gameState,
      players,
      deck,
      field,
      returnResolve: gameState.returnResolve ?? null,
      relicRoll: gameState.relicRoll ?? null,
      mysteryReveal: gameState.mysteryReveal ?? null,
      cardDraw: gameState.cardDraw ?? null,
      drawThree: gameState.drawThree ?? null,
    };

    // ミステリーでない場合はカード効果を処理（カードは既に場に追加済み）
    if (!isMystery) {
      const resolved = resolveCard(newState, currentCard, ruleSet);
      newState = {
        ...resolved,
        returnResolve: resolved.returnResolve ?? null,
        relicRoll: resolved.relicRoll ?? null,
        mysteryReveal: resolved.mysteryReveal ?? null,
        cardDraw: resolved.cardDraw ?? null,
        drawThree: resolved.drawThree ?? null,
      };

      // 罠で全滅した場合は中断
      if (newState.phase === 'round_end') {
        await updateGameState(sanitizeForFirebase({
          ...newState,
          drawThree: null,
        }));
        return;
      }
    }

    // 次のカードへ or 完了
    const nextIndex = currentIndex + 1;
    if (nextIndex < cards.length) {
      // 次のカードを場に追加
      const nextCard = cards[nextIndex];
      const newFieldCard: FieldCard = {
        card: nextCard.card,
        isMystery: nextCard.isMystery,
        isRevealed: !nextCard.isMystery,
        remainderGems: 0,
      };
      await updateGameState(sanitizeForFirebase({
        ...newState,
        phase: 'draw_three',
        field: [...newState.field, newFieldCard],
        drawThree: {
          cards,
          currentIndex: nextIndex,
          isFlipping: true,
        },
      }));
    } else {
      // 全カード処理完了
      await updateGameState(sanitizeForFirebase({
        ...newState,
        phase: 'decision',
        drawThree: null,
        players: newState.players.map(p => ({ ...p, decision: null })),
      }));
    }
  }, [isHost, gameState, players, deck, field, updateGameState]);

  // 3枚ドロー演出を自動で進める（ホストのみ）
  const isProcessingDrawThreeRef = useRef(false);
  const lastDrawThreeIndexRef = useRef(-1);
  useEffect(() => {
    // カードが変わったらフラグをリセット
    const currentIndex = gameState.drawThree?.currentIndex ?? -1;
    if (currentIndex !== lastDrawThreeIndexRef.current) {
      isProcessingDrawThreeRef.current = false;
      lastDrawThreeIndexRef.current = currentIndex;
    }

    if (isHost && gameState.phase === 'draw_three' && gameState.drawThree?.isFlipping && !isProcessingDrawThreeRef.current) {
      isProcessingDrawThreeRef.current = true;
      // 1.5秒間の演出後に処理
      const timer = setTimeout(() => {
        processDrawThree().finally(() => {
          isProcessingDrawThreeRef.current = false;
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isHost, gameState.phase, gameState.drawThree?.isFlipping, gameState.drawThree?.currentIndex, processDrawThree]);

  return {
    gameState,
    currentPlayer,
    allDecided,
    startGame,
    startRound,
    nextRound,
    makeDecision,
    declareAllIn,
    processNextReturn,
    processRelicRoll,
  };
};
