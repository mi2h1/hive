import { useState, useEffect, useRef } from 'react';

const GEM_ICON_PATH = '/boards/images/i_gem.png';
// モノクロ画像を青色に着色するフィルター
const GEM_BLUE_FILTER = 'invert(40%) sepia(90%) saturate(1500%) hue-rotate(190deg) brightness(90%)';

interface GemDistributionAnimationProps {
  gemValue: number;
  triggerKey: string; // アニメーションをトリガーするためのキー
  exploringPlayerCount: number; // 探索中のプレイヤー数
}

// 分配数に基づいてウェーブ（繰り返し）回数を決定
const getWaveCount = (value: number, playerCount: number): number => {
  if (playerCount <= 0) return 0;
  const perPlayer = Math.floor(value / playerCount);
  if (perPlayer <= 2) return 1;
  if (perPlayer <= 4) return 2;
  if (perPlayer <= 6) return 3;
  if (perPlayer <= 8) return 4;
  return 5;
};

// 各プレイヤーの方向へ飛ぶ軌道を生成
// カードは場の左側にあり、プレイヤーカードは上部に横並び
// 各プレイヤーの位置に向かって扇状に飛ばす
const getPlayerDirection = (playerIndex: number, _totalPlayers: number) => {
  // プレイヤーカードの横位置（左から右へ）
  // プレイヤー0は左上、プレイヤー1はその右上...という感じで扇状に飛ばす

  // 基本のX位置: プレイヤーインデックスに応じて右に広がる
  // 右回りに角度をつけて、全体的に右上方向へ飛ぶように調整
  const baseX = 50 + playerIndex * 80; // 右寄りからスタート
  const x = baseX + (Math.random() - 0.5) * 30;

  // Y方向: 上に飛ぶ（プレイヤーカードエリアへ）
  const y = -200 - Math.random() * 30;

  return {
    x,
    y,
    rotation: Math.random() * 720 - 360,
  };
};

interface GemData {
  id: string;
  x: number;
  y: number;
  rotation: number;
  delay: number;
}

export const GemDistributionAnimation = ({ gemValue, triggerKey, exploringPlayerCount }: GemDistributionAnimationProps) => {
  const [gems, setGems] = useState<GemData[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // 宝石がプレイヤー数以上ある場合のみアニメーション（それ以下は端数として残るだけ）
    if (gemValue >= exploringPlayerCount && triggerKey && exploringPlayerCount > 0) {
      const waveCount = getWaveCount(gemValue, exploringPlayerCount);
      const allGems: GemData[] = [];

      // 各ウェーブごとに、全プレイヤー分の宝石を生成
      for (let wave = 0; wave < waveCount; wave++) {
        for (let playerIdx = 0; playerIdx < exploringPlayerCount; playerIdx++) {
          const direction = getPlayerDirection(playerIdx, exploringPlayerCount);
          allGems.push({
            id: `${wave}-${playerIdx}`,
            ...direction,
            delay: wave * 300 + playerIdx * 50, // ウェーブ間隔300ms、プレイヤー間50ms
          });
        }
      }

      setGems(allGems);
      setIsAnimating(true);

      // 全アニメーション終了後にクリーンアップ
      const totalDuration = waveCount * 300 + exploringPlayerCount * 50 + 800;
      timeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
        setGems([]);
      }, totalDuration);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [triggerKey, gemValue, exploringPlayerCount]);

  if (!isAnimating || gems.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-10">
      {gems.map((gem) => (
        <div
          key={gem.id}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: '32px',
            height: '21px',
            animation: `gemFly 0.6s ease-out ${gem.delay}ms forwards`,
            '--gem-x': `${gem.x}px`,
            '--gem-y': `${gem.y}px`,
            '--gem-rotation': `${gem.rotation}deg`,
          } as React.CSSProperties}
        >
          <img
            src={GEM_ICON_PATH}
            alt=""
            className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
            style={{ filter: GEM_BLUE_FILTER }}
          />
        </div>
      ))}
    </div>
  );
};
