// ジャッカル カードデッキ生成

import type { Card } from '../types/game';

// カードIDのカウンター
let cardIdCounter = 0;

const generateCardId = (): string => {
  cardIdCounter += 1;
  return `card-${cardIdCounter}-${Date.now()}`;
};

// カードIDカウンターをリセット
export const resetCardIdCounter = (): void => {
  cardIdCounter = 0;
};

// 数字カードを生成
const createNumberCard = (value: number): Card => ({
  id: generateCardId(),
  type: 'number',
  value,
  label: String(value),
});

// 特殊カードを生成
const createSpecialCard = (type: Card['type'], label: string, value: number | null = null): Card => ({
  id: generateCardId(),
  type,
  value,
  label,
});

// 基本デッキを生成（36枚構成）
export const createBaseDeck = (): Card[] => {
  const cards: Card[] = [];

  // 数字カード
  // -10: 1枚
  cards.push(createNumberCard(-10));

  // -5: 2枚
  for (let i = 0; i < 2; i++) {
    cards.push(createNumberCard(-5));
  }

  // 0（通常）: 3枚
  for (let i = 0; i < 3; i++) {
    cards.push(createNumberCard(0));
  }

  // 1〜5: 各4枚
  for (let value = 1; value <= 5; value++) {
    for (let i = 0; i < 4; i++) {
      cards.push(createNumberCard(value));
    }
  }

  // 10: 3枚
  for (let i = 0; i < 3; i++) {
    cards.push(createNumberCard(10));
  }

  // 15: 2枚
  for (let i = 0; i < 2; i++) {
    cards.push(createNumberCard(15));
  }

  // 20: 1枚
  cards.push(createNumberCard(20));

  // 特殊カード
  // 0（シャッフル）: 1枚 - 捨て札を山札に混ぜてシャッフル
  cards.push(createSpecialCard('shuffle_zero', '0⟳', 0));

  // ×2: 1枚
  cards.push(createSpecialCard('double', '×2'));

  // MAX→0: 1枚
  cards.push(createSpecialCard('max_zero', 'MAX→0'));

  // ?: 1枚
  cards.push(createSpecialCard('mystery', '?'));

  return cards;
};

// デッキをシャッフル（Fisher-Yates）
export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// ゲーム用デッキを作成（シャッフル済み）
export const createGameDeck = (): Card[] => {
  resetCardIdCounter();
  return shuffleDeck(createBaseDeck());
};

// 合計値を計算（特殊カード効果適用）
export interface CalculationResult {
  totalValue: number;
  maxValue: number;
  hasDouble: boolean;
  hasMaxZero: boolean;
  hasShuffleZero: boolean;
  mysteryResolvedCard: Card | null;
  cardValues: {
    playerId: string;
    card: Card;
    resolvedValue: number;
  }[];
}

export const calculateTotal = (
  dealtCards: Record<string, Card>,
  mysteryDrawnCard: Card | null = null
): CalculationResult => {
  const cardValues: CalculationResult['cardValues'] = [];
  let hasDouble = false;
  let hasMaxZero = false;
  let hasShuffleZero = false;
  let hasMystery = false;
  let mysteryResolvedCard: Card | null = null;

  // Step 1: 各カードの値を取得（?は後で処理するので0として扱う）
  for (const [playerId, card] of Object.entries(dealtCards)) {
    let resolvedValue = 0;

    switch (card.type) {
      case 'number':
        resolvedValue = card.value ?? 0;
        break;
      case 'shuffle_zero':
        hasShuffleZero = true;
        resolvedValue = 0;
        break;
      case 'double':
        hasDouble = true;
        resolvedValue = 0;
        break;
      case 'max_zero':
        hasMaxZero = true;
        resolvedValue = 0;
        break;
      case 'mystery':
        hasMystery = true;
        resolvedValue = 0; // ?は最後に処理
        break;
    }

    cardValues.push({ playerId, card, resolvedValue });
  }

  // Step 2: MAX→0 の処理（?を除く数字カードの中で最大値を0に）
  const numericCards = cardValues.filter(cv =>
    cv.card.type === 'number' || cv.card.type === 'shuffle_zero'
  );
  let maxValue = numericCards.length > 0
    ? Math.max(...numericCards.map(cv => cv.resolvedValue))
    : 0;

  if (hasMaxZero && maxValue > 0) {
    for (const cv of numericCards) {
      if (cv.resolvedValue === maxValue) {
        cv.resolvedValue = 0;
        break; // 1枚だけ
      }
    }
    maxValue = 0;
  }

  // Step 3: ?を除く数字カードを合計
  let totalValue = cardValues.reduce((sum, cv) => {
    if (cv.card.type !== 'mystery') {
      return sum + cv.resolvedValue;
    }
    return sum;
  }, 0);

  // Step 4: ×2 を適用
  if (hasDouble) {
    totalValue *= 2;
  }

  // Step 5: ?カードの処理（最後に追加、×2の影響を受けない）
  if (hasMystery && mysteryDrawnCard) {
    mysteryResolvedCard = mysteryDrawnCard;
    let mysteryValue = 0;

    if (mysteryDrawnCard.type === 'number' || mysteryDrawnCard.type === 'shuffle_zero') {
      mysteryValue = mysteryDrawnCard.value ?? 0;
    }
    // 特殊カードが出た場合は0として扱う

    // ?カードのresolvedValueを更新
    const mysteryCardValue = cardValues.find(cv => cv.card.type === 'mystery');
    if (mysteryCardValue) {
      mysteryCardValue.resolvedValue = mysteryValue;
    }

    // 合計に追加（×2の後なので2倍されない）
    totalValue += mysteryValue;
  }

  return {
    totalValue,
    maxValue,
    hasDouble,
    hasMaxZero,
    hasShuffleZero,
    mysteryResolvedCard,
    cardValues,
  };
};

// カード一覧（参照用）
export const CARD_REFERENCE = {
  numbers: [
    { value: -10, count: 1 },
    { value: -5, count: 2 },
    { value: 0, count: 4, note: 'うち1枚は特殊0（シャッフル）' },
    { value: 1, count: 4 },
    { value: 2, count: 4 },
    { value: 3, count: 4 },
    { value: 4, count: 4 },
    { value: 5, count: 4 },
    { value: 10, count: 3 },
    { value: 15, count: 2 },
    { value: 20, count: 1 },
  ],
  special: [
    { label: '0⟳', effect: '捨て札を山札に混ぜてシャッフル' },
    { label: '×2', effect: '合計値を2倍' },
    { label: 'MAX→0', effect: '最大数字を0に' },
    { label: '?', effect: '山札から1枚引いて置換' },
  ],
  totalCards: 36,
};
