import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { TileModel } from './TileModel';
import type { TileKind } from '../types/game';

// 全11種の牌配置定義
// 上段: 1s〜6s（5sは赤牌も並べる）
// 下段: 7s〜9s + hatsu + chun
interface TileEntry {
  kind: TileKind;
  isRed?: boolean;
  label: string;
}

const topRow: TileEntry[] = [
  { kind: '1s', label: '1索' },
  { kind: '2s', label: '2索' },
  { kind: '3s', label: '3索' },
  { kind: '4s', label: '4索' },
  { kind: '5s', label: '5索' },
  { kind: '5s', isRed: true, label: '赤5索' },
  { kind: '6s', label: '6索' },
];

const bottomRow: TileEntry[] = [
  { kind: '7s', label: '7索' },
  { kind: '8s', label: '8索' },
  { kind: '9s', label: '9索' },
  { kind: 'hatsu', label: '發' },
  { kind: 'chun', label: '中' },
];

const SPACING = 0.38;

const TileScene = () => {
  // 上段の中心オフセット
  const topOffset = -((topRow.length - 1) * SPACING) / 2;
  // 下段の中心オフセット
  const bottomOffset = -((bottomRow.length - 1) * SPACING) / 2;

  return (
    <>
      <Environment preset="studio" />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={1.2} />
      <directionalLight position={[-3, 3, -2]} intensity={0.6} />

      {/* 上段 */}
      {topRow.map((entry, i) => (
        <TileModel
          key={`top-${i}`}
          kind={entry.kind}
          isRed={entry.isRed}
          position={[topOffset + i * SPACING, 0.22, 0]}
        />
      ))}

      {/* 下段 */}
      {bottomRow.map((entry, i) => (
        <TileModel
          key={`bottom-${i}`}
          kind={entry.kind}
          isRed={entry.isRed}
          position={[bottomOffset + i * SPACING, -0.22, 0]}
        />
      ))}

      <OrbitControls makeDefault />
    </>
  );
};

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
        <h1 className="text-white font-bold text-lg">速雀 タイルテスト</h1>
      </header>

      {/* 3D Canvas */}
      <div className="flex-1 min-h-0">
        <Canvas
          camera={{ position: [0, 0, 3], fov: 40 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={['#0f172a']} />
          <TileScene />
        </Canvas>
      </div>
    </div>
  );
};
