import { Canvas } from '@react-three/fiber';
import { TableScene } from './TableScene';
import type { GameState } from '../types/game';

interface GameScreenProps {
  gameState: GameState;
  playerId: string;
  onBackToLobby: () => void;
}

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
        <h1 className="text-white font-bold text-lg">速雀</h1>
        <div className="ml-auto flex items-center gap-3 text-sm text-slate-400">
          <span>東{gameState.round}局</span>
          <span>手番: {currentPlayer?.name ?? '-'}</span>
        </div>
      </header>

      {/* 3D Canvas */}
      <div className="flex-1 min-h-0">
        <Canvas
          camera={{ position: [0, 6, 5], fov: 33 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={['#1a1a2e']} />
          <TableScene gameState={gameState} playerId={playerId} />
        </Canvas>
      </div>
    </div>
  );
};
