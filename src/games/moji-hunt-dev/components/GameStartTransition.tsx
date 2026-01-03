import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface GameStartTransitionProps {
  topic: string;
  onComplete: () => void;
}

export const GameStartTransition = ({ topic, onComplete }: GameStartTransitionProps) => {
  const [phase, setPhase] = useState<'loading' | 'announce'>('loading');
  const [fadeOut, setFadeOut] = useState(false);
  const [contentFade, setContentFade] = useState(false);

  useEffect(() => {
    // ローディング表示 (1秒) → フェードアウト → お題表示
    const loadingTimer = setTimeout(() => {
      setContentFade(true); // ローディングをフェードアウト
      setTimeout(() => {
        setPhase('announce');
        setContentFade(false); // お題をフェードイン
      }, 300);
    }, 1000);

    return () => clearTimeout(loadingTimer);
  }, []);

  const handleDismiss = () => {
    setFadeOut(true);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  // 自動で閉じる（3秒後）
  useEffect(() => {
    if (phase === 'announce') {
      const autoClose = setTimeout(() => {
        handleDismiss();
      }, 3000);
      return () => clearTimeout(autoClose);
    }
  }, [phase]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-pink-900 to-orange-900 transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {phase === 'loading' ? (
        // ローディング画面
        <div className={`text-center transition-opacity duration-300 ${contentFade ? 'opacity-0' : 'opacity-100'}`}>
          <Loader2 className="w-16 h-16 text-white animate-spin mx-auto mb-4" />
          <p className="text-white/80 text-lg">ゲームを準備中...</p>
        </div>
      ) : (
        // お題アナウンス
        <div
          className={`text-center cursor-pointer transition-opacity duration-300 ${contentFade ? 'opacity-0' : 'opacity-100'}`}
          onClick={handleDismiss}
        >
          <p className="text-white/60 text-lg mb-4">今回のお題は...</p>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-12 py-8 mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              「{topic}」
            </h1>
          </div>
          <p className="text-white/40 text-sm animate-pulse">
            タップして開始
          </p>
        </div>
      )}
    </div>
  );
};
