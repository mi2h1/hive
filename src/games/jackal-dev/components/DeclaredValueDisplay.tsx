// 中央に表示する宣言値コンポーネント

import { useState, useEffect, useRef } from 'react';

interface DeclaredValueDisplayProps {
  currentDeclaredValue: number | null;
  lastDeclarerName?: string;
  isMyTurn: boolean;
  currentPlayerName?: string;
  phase: 'round_start' | 'declaring';
}

export const DeclaredValueDisplay = ({
  currentDeclaredValue,
  lastDeclarerName,
  isMyTurn,
  currentPlayerName,
  phase,
}: DeclaredValueDisplayProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef<number | null>(null);

  // 宣言値が変わった時にアニメーションを発火
  useEffect(() => {
    // 初回レンダリングや null からの変化でもアニメーション
    if (currentDeclaredValue !== null && currentDeclaredValue !== prevValueRef.current) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300); // アニメーション時間

      prevValueRef.current = currentDeclaredValue;
      return () => clearTimeout(timer);
    }
    prevValueRef.current = currentDeclaredValue;
  }, [currentDeclaredValue]);

  return (
    <div className="flex flex-col items-center justify-center text-center">
      {/* 宣言値 */}
      <div
        className={`text-5xl md:text-6xl font-bold text-white mb-2 transition-transform duration-300 ease-out ${
          isAnimating ? 'scale-125' : 'scale-100'
        }`}
      >
        {currentDeclaredValue !== null ? currentDeclaredValue : '—'}
      </div>

      {/* 最後の宣言者 */}
      <div className="text-slate-400 text-sm mb-2">
        {lastDeclarerName ? `${lastDeclarerName}の宣言` : '最初の宣言を待っています'}
      </div>

      {/* ターン表示 */}
      <div className="text-sm">
        {phase === 'declaring' && (
          <span className="text-white">
            {isMyTurn ? (
              <span className="text-yellow-400 font-bold">あなたの番です</span>
            ) : (
              <span className="text-slate-300">{currentPlayerName}の番...</span>
            )}
          </span>
        )}
        {phase === 'round_start' && (
          <span className="text-white">ラウンド開始！</span>
        )}
      </div>
    </div>
  );
};
