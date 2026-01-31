import type { Card as CardType } from '../types/game';

interface CardProps {
  card?: CardType;
  hidden?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  highlighted?: boolean;
}

// カードの画像パスを取得
const getCardImagePath = (card: CardType): string => {
  const basePath = import.meta.env.BASE_URL + 'images/cards/';

  switch (card.type) {
    case 'number':
      if (card.value === null) return '';
      // 1-5は01-05形式、それ以外はそのまま
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

export const Card = ({
  card,
  hidden = false,
  size = 'md',
  highlighted = false,
}: CardProps) => {
  // サイズ設定（正方形 1:1）
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  };

  const baseClasses = `
    ${sizeClasses[size]}
    rounded-lg
    overflow-hidden
    transition-all
    ${highlighted ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-800' : ''}
  `;

  // カード裏面（自分のカード = 見えない）
  if (hidden || !card) {
    const backImagePath = import.meta.env.BASE_URL + 'images/cards/card_jackal_back.png';
    return (
      <div className={baseClasses}>
        <img
          src={backImagePath}
          alt="カード裏面"
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>
    );
  }

  const imagePath = getCardImagePath(card);

  return (
    <div className={baseClasses}>
      <img
        src={imagePath}
        alt={card.label}
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  );
};
