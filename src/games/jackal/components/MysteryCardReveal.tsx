// ハテナカードのフリップ演出コンポーネント

import { useState, useEffect } from 'react';
import type { Card } from '../types/game';

interface MysteryCardRevealProps {
  mysteryCard: Card;
  onAnimationEnd: () => void;
}

// カードの画像パスを取得
const getCardImagePath = (card: Card): string => {
  const basePath = import.meta.env.BASE_URL + 'images/cards/';

  switch (card.type) {
    case 'number':
      if (card.value === null) return '';
      if (card.value >= 1 && card.value <= 5) {
        return `${basePath}card_jackal_0${card.value}.png`;
      }
      return `${basePath}card_jackal_${card.value}.png`;
    case 'shuffle_zero':
      return `${basePath}card_jackal_0_sp.png`;
    case 'double':
      return `${basePath}card_jackal_x2.png`;
    case 'max_zero':
      return `${basePath}card_jackal_max0.png`;
    case 'mystery':
      return `${basePath}card_jackal_mistery.png`;
    default:
      return '';
  }
};

export const MysteryCardReveal = ({
  mysteryCard,
  onAnimationEnd,
}: MysteryCardRevealProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const backImagePath = import.meta.env.BASE_URL + 'images/cards/card_jackal_back.png';
  const frontImagePath = getCardImagePath(mysteryCard);

  useEffect(() => {
    // 0.5秒後にフリップ開始
    const flipTimer = setTimeout(() => {
      setIsFlipped(true);
    }, 500);

    // フリップ完了後（1.5秒後）にアニメーション終了を通知
    const endTimer = setTimeout(() => {
      onAnimationEnd();
    }, 2000);

    return () => {
      clearTimeout(flipTimer);
      clearTimeout(endTimer);
    };
  }, [onAnimationEnd]);

  return (
    <div className="flex flex-col items-center justify-center">
      <style>{`
        .flip-card {
          perspective: 1000px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .flip-card-inner.flipped {
          transform: rotateY(180deg);
        }
        .flip-card-front,
        .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
      `}</style>

      {/* タイトル */}
      <div className="text-white text-xl md:text-2xl font-bold mb-6 animate-pulse">
        ?カードの結果...
      </div>

      {/* フリップカード */}
      <div className="flip-card w-32 h-32 md:w-40 md:h-40">
        <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
          {/* 裏面（最初に見える） */}
          <div className="flip-card-front">
            <img
              src={backImagePath}
              alt="カード裏面"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
          {/* 表面（フリップ後に見える） */}
          <div className="flip-card-back">
            <img
              src={frontImagePath}
              alt={mysteryCard.label}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        </div>
      </div>

      {/* 結果テキスト（フリップ後に表示） */}
      <div
        className={`mt-6 text-center transition-opacity duration-500 ${
          isFlipped ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="text-2xl md:text-3xl font-bold text-yellow-400">
          {mysteryCard.label}
        </div>
        <div className="text-slate-400 text-sm mt-1">
          が山札から出ました
        </div>
      </div>
    </div>
  );
};
