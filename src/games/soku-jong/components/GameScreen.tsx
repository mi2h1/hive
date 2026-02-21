import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import { TableScene } from './TableScene';
import type { GameState } from '../types/game';

interface GameScreenProps {
  gameState: GameState;
  playerId: string;
  onBackToLobby: () => void;
}

const LoadingOverlay = () => {
  const { active, progress } = useProgress();
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!active && progress === 100) {
      const timer = setTimeout(() => setShow(false), 400);
      return () => clearTimeout(timer);
    }
  }, [active, progress]);

  if (!show) return null;

  return (
    <div
      className={`absolute inset-0 bg-[#1a1a2e] flex flex-col items-center justify-center z-10
        transition-opacity duration-300 ${!active && progress === 100 ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="mb-6">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
      <p className="text-slate-400 text-sm font-bold mb-3">対局準備中...</p>
      <div className="w-48 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const GameScreen = ({ gameState, playerId, onBackToLobby }: GameScreenProps) => {
  const currentPlayer = gameState.players.find((p) => p.id === gameState.currentTurn);

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-slate-800/90 border-b border-slate-700 px-4 py-2 flex items-center gap-4 shrink-0">
        <button
          onClick={onBackToLobby}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm transition-colors"
        >
          ← ロビーに戻る
        </button>
        <h1><img src="/hive/images/vec_logo_soku-jong.svg" alt="速雀" className="h-5" /></h1>
        <div className="ml-auto flex items-center gap-3 text-sm text-slate-400">
          <span>東{gameState.round}局</span>
          <span>手番: {currentPlayer?.name ?? '-'}</span>
        </div>
      </header>

      {/* 3D Canvas + ローディングオーバーレイ */}
      <div className="flex-1 min-h-0 relative">
        <LoadingOverlay />
        <Canvas
          camera={{ position: [0, 6, 5], fov: 33 }}
          gl={{ antialias: true }}
          shadows
        >
          <color attach="background" args={['#1a1a2e']} />
          <Suspense fallback={null}>
            <TableScene gameState={gameState} playerId={playerId} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
};
