import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface GameStartTransitionProps {
  onComplete: () => void;
}

export const GameStartTransition = ({ onComplete }: GameStartTransitionProps) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // ローディング表示後、自動でフェードアウト
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        onComplete();
      }, 300);
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-teal-900 to-emerald-900 transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="text-center">
        <Loader2 className="w-16 h-16 text-white animate-spin mx-auto mb-4" />
        <p className="text-white/80 text-lg">ゲームを準備中...</p>
      </div>
    </div>
  );
};
