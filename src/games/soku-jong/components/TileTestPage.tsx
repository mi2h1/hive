import { Canvas } from '@react-three/fiber';
import { TableScene } from './TableScene';

interface TileTestPageProps {
  onBack: () => void;
}

export const TileTestPage = ({ onBack }: TileTestPageProps) => {
  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-slate-800/90 border-b border-slate-700 px-4 py-3 flex items-center gap-4 shrink-0">
        <button
          onClick={onBack}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm transition-colors"
        >
          ← 戻る
        </button>
        <h1 className="text-white font-bold text-lg">速雀 卓テスト</h1>
      </header>

      {/* 3D Canvas */}
      <div className="flex-1 min-h-0">
        <Canvas
          camera={{ position: [0, 5, 7], fov: 40 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={['#1a1a2e']} />
          <TableScene />
        </Canvas>
      </div>
    </div>
  );
};
