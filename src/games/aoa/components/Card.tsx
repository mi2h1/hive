import { useState, useEffect } from 'react';
import type { Card as CardType, TrapType } from '../types/game';
import { SPECIAL_EMOJI } from '../types/game';
import { GemDistributionAnimation } from './GemDistributionAnimation';

// カード画像パス
const CARD_BACK_AOA = '/boards/images/cards/card_back_aoa.png';
const CARD_BACK_INCAN = '/boards/images/cards/card_back_incan.png';
const GEM_ICON_PATH = '/boards/images/i_gem.png';
// モノクロ画像を青色に着色するフィルター
const GEM_BLUE_FILTER = 'sepia(1) saturate(5) hue-rotate(180deg) brightness(0.9)';

// カード裏面のパスを取得
const getCardBackPath = (isIncan: boolean): string => {
  return isIncan ? CARD_BACK_INCAN : CARD_BACK_AOA;
};

// 端数宝石コンポーネント（カード上部に整列表示）
const RemainderGems = ({ count }: { count: number }) => {
  if (count <= 0) return null;

  // 最大表示数は10個
  const displayCount = Math.min(count, 10);

  return (
    <div className="absolute top-1 left-0 right-0 flex justify-center gap-1 flex-wrap px-1">
      {Array.from({ length: displayCount }).map((_, i) => (
        <img
          key={i}
          src={GEM_ICON_PATH}
          alt="宝石"
          className="object-contain drop-shadow-[0_0_3px_rgba(255,255,255,0.9)] drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]"
          style={{ width: '22px', height: '16px', filter: GEM_BLUE_FILTER }}
        />
      ))}
    </div>
  );
};

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

interface CardProps {
  card: CardType;
  isMystery?: boolean;
  isRevealed?: boolean;
  wasJustRevealed?: boolean; // ミステリーから公開されたばかりか
  remainderGems?: number;    // このカードに乗っている端数宝石
  size?: 'small' | 'medium' | 'large';
  isBeingDrawn?: boolean;    // カードがめくられている最中か
  exploringPlayerCount?: number; // 探索中のプレイヤー数（アニメーション用）
  isIncan?: boolean;         // インカの黄金ルールか
}

export const Card = ({ card, isMystery = false, isRevealed = true, wasJustRevealed = false, remainderGems = 0, size = 'medium', isBeingDrawn = false, exploringPlayerCount = 1, isIncan = false }: CardProps) => {
  // フリップアニメーション用の状態
  const [flipped, setFlipped] = useState(!isBeingDrawn);
  // 宝石アニメーション用: カードがめくられた後に一度だけトリガー
  const [gemAnimationKey, setGemAnimationKey] = useState('');

  useEffect(() => {
    if (isBeingDrawn) {
      // 少し遅延してからフリップ開始
      const timer = setTimeout(() => {
        setFlipped(true);
        // フリップ完了後に宝石アニメーションをトリガー
        if (card.type === 'gem') {
          setTimeout(() => {
            setGemAnimationKey(`${card.id}-${Date.now()}`);
          }, 400); // フリップアニメーション後に少し遅延
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setFlipped(true);
    }
  }, [isBeingDrawn, card.id, card.type]);

  // カードめくり演出中の場合、3Dフリップを表示
  // カード比率: 590:803 ≈ 0.735:1
  if (isBeingDrawn) {
    const sizeClasses = {
      small: { width: '71px', height: '96px' },
      medium: { width: '106px', height: '144px' },
      large: { width: '141px', height: '192px' },
    };

    return (
      <div
        style={{
          ...sizeClasses[size],
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
          {/* 裏面（山札） */}
          <div
            className="absolute w-full h-full rounded-xl overflow-hidden shadow-lg"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <img src={getCardBackPath(isIncan)} alt="カード裏面" className="w-full h-full object-cover" />
          </div>

          {/* 表面 */}
          <div
            className="absolute w-full h-full"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            {/* ミステリーカードの場合は?を表示 */}
            {isMystery ? (
              <div className="w-full h-full rounded-xl overflow-hidden shadow-lg relative">
                <img src={getCardBackPath(isIncan)} alt="ミステリーカード" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-purple-600/50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">?</span>
                </div>
              </div>
            ) : (
              <CardFace card={card} size={size} remainderGems={remainderGems} isIncan={isIncan} />
            )}
          </div>
        </div>
      </div>
    );
  }
  // 公開されたばかりのミステリーカードは特別なスタイル
  const revealedStyle = wasJustRevealed
    ? 'ring-4 ring-purple-400 ring-opacity-75 animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.5)]'
    : '';
  // カード比率: 590:803 ≈ 0.735:1
  const sizeClasses = {
    small: 'w-[71px] h-24 text-sm',
    medium: 'w-[106px] h-36 text-lg',
    large: 'w-[141px] h-48 text-xl',
  };

  // 裏向き（ミステリー）の場合
  if (isMystery && !isRevealed) {
    return (
      <div className={`${sizeClasses[size]} rounded-xl overflow-hidden shadow-lg relative`}>
        <img src={getCardBackPath(isIncan)} alt="ミステリーカード" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-purple-600/50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">?</span>
        </div>
      </div>
    );
  }

  // 宝石カード
  if (card.type === 'gem') {
    const value = card.value ?? 0;
    const imagePath = getGemImagePath(value);

    // アニメーショントリガー: めくられた直後 or ミステリーから公開された時
    // ただし、宝石がプレイヤー数未満の場合は分配されないのでアニメーションなし
    const shouldAnimate = value >= exploringPlayerCount;
    const animationTrigger = shouldAnimate
      ? (gemAnimationKey || (wasJustRevealed ? `${card.id}-revealed` : ''))
      : '';

    return (
      <div className="relative">
        <div
          className={`${sizeClasses[size]} rounded-xl overflow-hidden shadow-lg ${revealedStyle} relative`}
        >
          <img src={imagePath} alt={`宝石 ${value}`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-bold text-white text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{value}</span>
          </div>
          {wasJustRevealed && (
            <div className="absolute bottom-1 left-0 right-0 text-center">
              <span className="text-xs text-white/90 bg-purple-500/70 px-2 py-0.5 rounded">公開!</span>
            </div>
          )}
        </div>
        {/* 宝石が飛び散るアニメーション（overflow-hiddenの外に配置） */}
        <GemDistributionAnimation gemValue={value} triggerKey={animationTrigger} exploringPlayerCount={exploringPlayerCount} />
        {/* 端数宝石の表示（カード上部に整列） */}
        <RemainderGems count={remainderGems} />
      </div>
    );
  }

  // 罠カード
  if (card.type === 'trap' && card.trapType) {
    const imagePath = getTrapImagePath(card.trapType);

    return (
      <div
        className={`${sizeClasses[size]} rounded-xl overflow-hidden shadow-lg ${revealedStyle} relative`}
      >
        <img src={imagePath} alt={`罠 ${card.trapType}`} className="w-full h-full object-cover" />
        {wasJustRevealed && (
          <div className="absolute bottom-1 left-0 right-0 text-center">
            <span className="text-xs text-white/90 bg-purple-500/70 px-2 py-0.5 rounded">公開!</span>
          </div>
        )}
      </div>
    );
  }

  // 特殊カード
  if (card.type === 'special' && card.specialEffect) {
    const effectLabels: Record<string, string> = {
      double_remainder: '端数2倍',
      bonus_all: '全員+5',
      draw_three: '3枚ドロー',
      remove_trap: '罠削除',
    };

    return (
      <div
        className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700
          border-4 border-cyan-300 shadow-lg flex flex-col items-center justify-center ${revealedStyle}`}
      >
        <span className="text-3xl">{SPECIAL_EMOJI[card.specialEffect]}</span>
        <span className="text-white font-bold text-xs mt-1 text-center px-1">
          {effectLabels[card.specialEffect]}
        </span>
        {wasJustRevealed && <span className="text-xs text-purple-200">公開!</span>}
      </div>
    );
  }

  // 遺物カード
  if (card.type === 'relic') {
    const imagePath = getRelicImagePath(card.id);
    // インカルールでは固定値（5点、4個目以降は10点だがプレイヤー依存のため5点と表示）
    const relicValueLabel = isIncan ? '5点' : '???点';

    return (
      <div
        className={`${sizeClasses[size]} rounded-xl overflow-hidden shadow-lg ${revealedStyle} relative`}
      >
        <img src={imagePath} alt="遺物" className="w-full h-full object-cover" />
        <div className="absolute bottom-1 left-0 right-0 text-center">
          <span className="text-xs text-white bg-black/50 px-2 py-0.5 rounded">{relicValueLabel}</span>
        </div>
        {wasJustRevealed && (
          <div className="absolute top-1 left-0 right-0 text-center">
            <span className="text-xs text-white/90 bg-purple-500/70 px-2 py-0.5 rounded">公開!</span>
          </div>
        )}
      </div>
    );
  }

  return null;
};

// カードの表面を描画するヘルパーコンポーネント
const CardFace = ({ card, size, remainderGems = 0, wasJustRevealed = false, isIncan = false }: {
  card: CardType;
  size: 'small' | 'medium' | 'large';
  remainderGems?: number;
  wasJustRevealed?: boolean;
  isIncan?: boolean;
}) => {
  // カード比率: 590:803 ≈ 0.735:1
  const sizeClasses = {
    small: 'w-[71px] h-24 text-sm',
    medium: 'w-[106px] h-36 text-lg',
    large: 'w-[141px] h-48 text-xl',
  };
  const revealedStyle = wasJustRevealed
    ? 'ring-4 ring-purple-400 ring-opacity-75 animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.5)]'
    : '';

  // 宝石カード
  if (card.type === 'gem') {
    const value = card.value ?? 0;
    const imagePath = getGemImagePath(value);

    return (
      <div className="relative w-full h-full">
        <div className={`${sizeClasses[size]} rounded-xl overflow-hidden shadow-lg ${revealedStyle} relative`}>
          <img src={imagePath} alt={`宝石 ${value}`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-bold text-white text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{value}</span>
          </div>
          {/* 端数宝石の表示（カード上に散らばせる） */}
          <RemainderGems count={remainderGems} />
        </div>
      </div>
    );
  }

  // 罠カード
  if (card.type === 'trap' && card.trapType) {
    const imagePath = getTrapImagePath(card.trapType);

    return (
      <div className={`${sizeClasses[size]} rounded-xl overflow-hidden shadow-lg ${revealedStyle}`}>
        <img src={imagePath} alt={`罠 ${card.trapType}`} className="w-full h-full object-cover" />
      </div>
    );
  }

  // 特殊カード（画像がまだないので絵文字のまま）
  if (card.type === 'special' && card.specialEffect) {
    const effectLabels: Record<string, string> = {
      double_remainder: '端数2倍',
      bonus_all: '全員+5',
      draw_three: '3枚ドロー',
      remove_trap: '罠削除',
    };

    return (
      <div
        className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700
          border-4 border-cyan-300 shadow-lg flex flex-col items-center justify-center ${revealedStyle}`}
      >
        <span className="text-3xl">{SPECIAL_EMOJI[card.specialEffect]}</span>
        <span className="text-white font-bold text-xs mt-1 text-center px-1">
          {effectLabels[card.specialEffect]}
        </span>
      </div>
    );
  }

  // 遺物カード
  if (card.type === 'relic') {
    const imagePath = getRelicImagePath(card.id);
    // インカルールでは固定値（5点、4個目以降は10点だがプレイヤー依存のため5点と表示）
    const relicValueLabel = isIncan ? '5点' : '???点';

    return (
      <div className={`${sizeClasses[size]} rounded-xl overflow-hidden shadow-lg ${revealedStyle} relative`}>
        <img src={imagePath} alt="遺物" className="w-full h-full object-cover" />
        <div className="absolute bottom-1 left-0 right-0 text-center">
          <span className="text-xs text-white bg-black/50 px-2 py-0.5 rounded">{relicValueLabel}</span>
        </div>
      </div>
    );
  }

  return null;
};

// 山札の表示用
// カード比率: 590:803 ≈ 0.735:1
export const DeckBack = ({ count, size = 'medium', isIncan = false }: { count: number; size?: 'small' | 'compact' | 'medium' | 'large'; isIncan?: boolean }) => {
  const sizeClasses = {
    small: 'w-[71px] h-24 text-sm',
    compact: 'w-[82px] h-28 text-sm',
    medium: 'w-[106px] h-36 text-lg',
    large: 'w-[141px] h-48 text-xl',
  };

  return (
    <div className={`${sizeClasses[size]} rounded-xl overflow-hidden shadow-lg relative`}>
      <img src={getCardBackPath(isIncan)} alt="山札" className="w-full h-full object-cover" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-bold text-sm bg-black/50 px-2 py-1 rounded">
          残り {count}
        </span>
      </div>
    </div>
  );
};
