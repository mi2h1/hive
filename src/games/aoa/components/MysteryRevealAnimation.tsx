import { useState, useEffect } from 'react';
import type { FieldCard as FieldCardType, TrapType } from '../types/game';
import { SPECIAL_EMOJI } from '../types/game';

// カード画像パスのヘルパー関数
const getGemImagePath = (value: number): string => {
  if (value >= 15) return '/boards/images/cards/card_gem_l.png';
  if (value >= 7) return '/boards/images/cards/card_gem_m.png';
  return '/boards/images/cards/card_gem_s.png';
};

const getTrapImagePath = (trapType: TrapType): string => {
  return `/boards/images/cards/card_trap_${trapType}.png`;
};

// 遺物画像はカードIDからハッシュで決定的に選択
const getRelicImagePath = (cardId: string): string => {
  const hash = cardId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const relicNum = (hash % 9) + 1;
  return `/boards/images/cards/card_relic_${relicNum.toString().padStart(2, '0')}.png`;
};

// カード裏面
const CARD_BACK_AOA = '/boards/images/cards/card_back_aoa.png';
const CARD_BACK_INCAN = '/boards/images/cards/card_back_incan.png';

const getCardBackPath = (isIncan: boolean): string => {
  return isIncan ? CARD_BACK_INCAN : CARD_BACK_AOA;
};

interface MysteryRevealAnimationProps {
  fieldCard: FieldCardType;
  cardNumber: number;
  totalCards: number;
  isFlipping: boolean;
  isIncan?: boolean;
}

export const MysteryRevealAnimation = ({
  fieldCard,
  cardNumber,
  totalCards,
  isFlipping,
  isIncan = false
}: MysteryRevealAnimationProps) => {
  const [flipped, setFlipped] = useState(false);
  const { card } = fieldCard;

  // カードが変わったらフリップ状態をリセット
  useEffect(() => {
    setFlipped(false);
  }, [cardNumber]);

  // フリップ開始時にアニメーション
  useEffect(() => {
    if (isFlipping && !flipped) {
      const timer = setTimeout(() => {
        setFlipped(true);
      }, 500); // 0.5秒後にフリップ
      return () => clearTimeout(timer);
    }
  }, [isFlipping, flipped, cardNumber]);

  // カードの内容を取得
  const getCardContent = () => {
    if (card.type === 'gem') {
      const value = card.value ?? 0;
      const imagePath = getGemImagePath(value);

      return (
        <div className="w-full h-full rounded-xl overflow-hidden relative">
          <img src={imagePath} alt={`宝石 ${value}`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-bold text-white text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{value}</span>
          </div>
        </div>
      );
    }

    if (card.type === 'trap' && card.trapType) {
      const imagePath = getTrapImagePath(card.trapType);

      return (
        <div className="w-full h-full rounded-xl overflow-hidden">
          <img src={imagePath} alt={`罠 ${card.trapType}`} className="w-full h-full object-cover" />
        </div>
      );
    }

    if (card.type === 'special' && card.specialEffect) {
      const effectLabels: Record<string, string> = {
        double_remainder: '端数2倍',
        bonus_all: '全員+5',
        draw_three: '3枚ドロー',
        remove_trap: '罠削除',
      };

      return (
        <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700
          border-4 border-cyan-300 flex flex-col items-center justify-center">
          <span className="text-5xl">{SPECIAL_EMOJI[card.specialEffect]}</span>
          <span className="text-white font-bold text-sm mt-2 text-center px-2">
            {effectLabels[card.specialEffect]}
          </span>
        </div>
      );
    }

    if (card.type === 'relic') {
      const imagePath = getRelicImagePath(card.id);
      // インカルールでは固定値（5点）を表示
      const relicValueLabel = isIncan ? '5点' : '???点';

      return (
        <div className="w-full h-full rounded-xl overflow-hidden relative">
          <img src={imagePath} alt="遺物" className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-0 right-0 text-center">
            <span className="text-sm text-white bg-black/50 px-2 py-1 rounded">{relicValueLabel}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-purple-300 mb-2">
          ミステリーカード公開
        </h2>
        <p className="text-purple-200/70 text-sm mb-6">
          カード {cardNumber} / {totalCards}
        </p>

        {/* カードフリップコンテナ */}
        <div
          className="relative mx-auto"
          style={{
            width: '160px',
            height: '240px',
            perspective: '1000px',
          }}
        >
          <div
            className="w-full h-full relative transition-transform duration-700"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* 裏面 (ミステリー) */}
            <div
              className="absolute w-full h-full rounded-xl overflow-hidden shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
              }}
            >
              <img src={getCardBackPath(isIncan)} alt="ミステリーカード" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-purple-600/50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl font-bold text-white animate-pulse drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">?</span>
              </div>
            </div>

            {/* 表面 (カード内容) */}
            <div
              className="absolute w-full h-full shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              {getCardContent()}
            </div>
          </div>
        </div>

        {/* ステータス */}
        <div className="mt-6">
          {!flipped ? (
            <p className="text-purple-300/70 animate-pulse">公開中...</p>
          ) : (
            <p className="text-emerald-300 font-bold animate-pulse">✨ 公開完了！</p>
          )}
        </div>
      </div>
    </div>
  );
};
