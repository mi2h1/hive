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

  // 横長の吹き出し風スターバースト
  const points = 14; // トゲの数
  const centerX = 300;
  const centerY = 150;
  const outerRadiusX = 280; // 横方向の外側半径
  const outerRadiusY = 140; // 縦方向の外側半径
  const innerRadiusX = 220; // 横方向の内側半径（トゲの谷）
  const innerRadiusY = 100; // 縦方向の内側半径
  const curveDepth = 0.4; // 谷の凹み具合（0-1）

  // 吹き出し風スターバーストのパスを生成（トゲ間が弧を描く）
  const generateBubbleStarburstPath = () => {
    const pathParts: string[] = [];
    const angleStep = (2 * Math.PI) / points;

    for (let i = 0; i < points; i++) {
      // トゲの先端
      const tipAngle = angleStep * i - Math.PI / 2;
      const tipX = centerX + outerRadiusX * Math.cos(tipAngle);
      const tipY = centerY + outerRadiusY * Math.sin(tipAngle);

      // 次のトゲの先端
      const nextTipAngle = angleStep * (i + 1) - Math.PI / 2;
      const nextTipX = centerX + outerRadiusX * Math.cos(nextTipAngle);
      const nextTipY = centerY + outerRadiusY * Math.sin(nextTipAngle);

      // トゲ間の谷（内側に凹む）
      const valleyAngle = (tipAngle + nextTipAngle) / 2;
      const valleyX = centerX + innerRadiusX * Math.cos(valleyAngle);
      const valleyY = centerY + innerRadiusY * Math.sin(valleyAngle);

      // 制御点（さらに内側に凹ませる）
      const controlX = centerX + innerRadiusX * curveDepth * Math.cos(valleyAngle);
      const controlY = centerY + innerRadiusY * curveDepth * Math.sin(valleyAngle);

      if (i === 0) {
        pathParts.push(`M ${tipX} ${tipY}`);
      }

      // トゲの先端から谷へ（二次ベジェ曲線で凹む）
      pathParts.push(`Q ${controlX} ${controlY} ${valleyX} ${valleyY}`);
      // 谷から次のトゲへ（二次ベジェ曲線で凹む）
      pathParts.push(`Q ${controlX} ${controlY} ${nextTipX} ${nextTipY}`);
    }

    return pathParts.join(' ') + ' Z';
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-400 ${
        phase === 'enter' ? 'opacity-0' : phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* 背景のオーバーレイ */}
      <div className="absolute inset-0 bg-black/30" />

      {/* トゲトゲ枠 + ロゴ（右上がりに傾斜） */}
      <div
        className={`relative transition-transform duration-500 ease-out ${
          phase === 'enter'
            ? 'scale-50 -rotate-12'
            : phase === 'exit'
            ? 'scale-125 -rotate-12'
            : 'scale-100 -rotate-12'
        }`}
      >
        {/* 吹き出し風スターバーストSVG */}
        <svg
          width="600"
          height="300"
          viewBox="0 0 600 300"
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
            d={generateBubbleStarburstPath()}
            fill="url(#jackalStarburst)"
            filter="url(#jackalGlow)"
            className="drop-shadow-2xl"
          />
        </svg>

        {/* ジャッカルロゴ */}
        <div className="relative z-10 w-72 h-48 flex items-center justify-center">
          <img
            src="/hive/images/vec_logo_jackal.svg"
            alt="JACKAL"
            className="w-48 h-48 filter brightness-0 invert drop-shadow-lg"
          />
        </div>
      </div>
    </div>
  );
};
