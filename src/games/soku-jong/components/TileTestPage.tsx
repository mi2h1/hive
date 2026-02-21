import { useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { TableScene } from './TableScene';

// Canvas内でカメラをリアルタイム更新するコンポーネント
const CameraUpdater = ({ x, y, z, fov }: { x: number; y: number; z: number; fov: number }) => {
  const { camera } = useThree();
  camera.position.set(x, y, z);
  (camera as THREE.PerspectiveCamera).fov = fov;
  (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  return null;
};

// Three.js の型参照用
import type * as THREE from 'three';

interface TileTestPageProps {
  onBack: () => void;
}

const DEFAULT = { x: 0, y: 6, z: 5, fov: 33 };

const SliderControl = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) => (
  <label className="flex items-center gap-1.5 text-slate-300 text-xs">
    <span className="w-7 text-right">{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-20 h-1 accent-sky-500"
    />
    <span className="w-8 text-slate-400 font-mono">{value}</span>
  </label>
);

export const TileTestPage = ({ onBack }: TileTestPageProps) => {
  const [x, setX] = useState(DEFAULT.x);
  const [y, setY] = useState(DEFAULT.y);
  const [z, setZ] = useState(DEFAULT.z);
  const [fov, setFov] = useState(DEFAULT.fov);

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-slate-800/90 border-b border-slate-700 px-4 py-2 flex items-center gap-4 shrink-0 flex-wrap">
        <button
          onClick={onBack}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm transition-colors"
        >
          ← 戻る
        </button>
        <h1 className="text-white font-bold text-lg">速雀 卓テスト</h1>
        <div className="flex items-center gap-3 ml-auto">
          <SliderControl label="X" value={x} min={-5} max={5} step={0.5} onChange={setX} />
          <SliderControl label="Y" value={y} min={1} max={12} step={0.5} onChange={setY} />
          <SliderControl label="Z" value={z} min={0} max={12} step={0.5} onChange={setZ} />
          <SliderControl label="FOV" value={fov} min={15} max={60} step={1} onChange={setFov} />
        </div>
      </header>

      {/* 3D Canvas */}
      <div className="flex-1 min-h-0">
        <Canvas
          camera={{ position: [x, y, z], fov }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={['#1a1a2e']} />
          <CameraUpdater x={x} y={y} z={z} fov={fov} />
          <TableScene />
        </Canvas>
      </div>
    </div>
  );
};
