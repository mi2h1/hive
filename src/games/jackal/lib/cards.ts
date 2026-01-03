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
const createSpecialCard = (type: Card['type'], label: string): Card => ({
  id: generateCardId(),
  type,
  value: null,
  label,
});

// 基本デッキを生成（仕様書準拠）
export const createBaseDeck = (): Card[] => {
  const cards: Card[] = [];

  // 数字カード
  // -10: 1枚
  cards.push(createNumberCard(-10));
  // -5: 1枚
  cards.push(createNumberCard(-5));
  // 0: 1枚
  cards.push(createNumberCard(0));
  // 1〜5: 各4枚
  for (let value = 1; value <= 5; value++) {
    for (let i = 0; i < 4; i++) {
      cards.push(createNumberCard(value));
    }
  }
  // 10: 2枚
  cards.push(createNumberCard(10));
  cards.push(createNumberCard(10));
  // 15: 1枚
  cards.push(createNumberCard(15));
  // 20: 1枚
  cards.push(createNumberCard(20));

  // 特殊カード
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
  let mysteryResolvedCard: Card | null = null;

  // まず各カードの値を取得
  for (const [playerId, card] of Object.entries(dealtCards)) {
    let resolvedValue = 0;

    switch (card.type) {
      case 'number':
        resolvedValue = card.value ?? 0;
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
        // ?カードは山札から引いたカードの値に置き換わる
        if (mysteryDrawnCard && mysteryDrawnCard.type === 'number') {
          resolvedValue = mysteryDrawnCard.value ?? 0;
          mysteryResolvedCard = mysteryDrawnCard;
        }
        break;
    }

    cardValues.push({ playerId, card, resolvedValue });
  }

  // 数値のみのリストを作成
  const numericValues = cardValues
    .filter(cv => cv.card.type === 'number' || cv.card.type === 'mystery')
    .map(cv => cv.resolvedValue);

  // MAX→0 の処理: 最大値を0に
  let maxValue = numericValues.length > 0 ? Math.max(...numericValues) : 0;
  if (hasMaxZero && maxValue > 0) {
    // 最大値を持つカードの値を0に変更
    for (const cv of cardValues) {
      if (cv.resolvedValue === maxValue) {
        cv.resolvedValue = 0;
        break; // 1枚だけ変更
      }
    }
    maxValue = 0;
  }

  // 合計値を計算
  let totalValue = cardValues.reduce((sum, cv) => sum + cv.resolvedValue, 0);

  // ×2 の処理: 合計を2倍
  if (hasDouble) {
    totalValue *= 2;
  }

  return {
    totalValue,
    maxValue,
    hasDouble,
    hasMaxZero,
    mysteryResolvedCard,
    cardValues,
  };
};

// カード一覧（参照用）
export const CARD_REFERENCE = {
  numbers: [
    { value: -10, count: 1 },
    { value: -5, count: 1 },
    { value: 0, count: 1 },
    { value: 1, count: 4 },
    { value: 2, count: 4 },
    { value: 3, count: 4 },
    { value: 4, count: 4 },
    { value: 5, count: 4 },
    { value: 10, count: 2 },
    { value: 15, count: 1 },
    { value: 20, count: 1 },
  ],
  special: [
    { label: '×2', effect: '合計値を2倍' },
    { label: 'MAX→0', effect: '最大数字を0に' },
    { label: '?', effect: '山札から1枚引いて置換' },
  ],
  totalCards: 30,
};
