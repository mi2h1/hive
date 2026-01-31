// ジャッカル宣言時のオーバーレイアニメーション

import { useEffect, useState } from 'react';

interface JackalCallOverlayProps {
  onAnimationEnd: () => void;
}

export const JackalCallOverlay = ({ onAnimationEnd }: JackalCallOverlayProps) => {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');

  useEffect(() => {
    // enter → visible
    const visibleTimer = setTimeout(() => {
      setPhase('visible');
    }, 50);

    // visible → exit
    const exitTimer = setTimeout(() => {
      setPhase('exit');
    }, 1200);

    // exit → end
    const endTimer = setTimeout(() => {
      onAnimationEnd();
    }, 1600);

    return () => {
      clearTimeout(visibleTimer);
      clearTimeout(exitTimer);
      clearTimeout(endTimer);
    };
  }, [onAnimationEnd]);

  // トゲトゲ（スターバースト）のポイント数
  const points = 16;
  const outerRadius = 200;
  const innerRadius = 140;

  // スターバーストのパスを生成
  const generateStarburstPath = () => {
    const pathPoints: string[] = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = 200 + radius * Math.cos(angle);
      const y = 200 + radius * Math.sin(angle);
      pathPoints.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }
    return pathPoints.join(' ') + ' Z';
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-400 ${
        phase === 'enter' ? 'opacity-0' : phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* 背景のオーバーレイ */}
      <div className="absolute inset-0 bg-black/30" />

      {/* トゲトゲ枠 + ロゴ */}
      <div
        className={`relative transition-transform duration-500 ease-out ${
          phase === 'enter'
            ? 'scale-50'
            : phase === 'exit'
            ? 'scale-125'
            : 'scale-100'
        }`}
      >
        {/* スターバーストSVG */}
        <svg
          width="400"
          height="400"
          viewBox="0 0 400 400"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <defs>
            <linearGradient id="jackalStarburst" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <filter id="jackalGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={generateStarburstPath()}
            fill="url(#jackalStarburst)"
            filter="url(#jackalGlow)"
            className="drop-shadow-2xl"
          />
        </svg>

        {/* ジャッカルロゴ */}
        <div className="relative z-10 w-48 h-48 flex items-center justify-center">
          <img
            src="/hive/images/vec_logo_jackal.svg"
            alt="JACKAL"
            className="w-32 h-32 filter brightness-0 invert drop-shadow-lg"
          />
        </div>
      </div>
    </div>
  );
};
