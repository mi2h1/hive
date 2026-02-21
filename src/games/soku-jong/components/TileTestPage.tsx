import { useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { EffectComposer, SSAO, Bloom } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { TableScene } from './TableScene';
import type { Tile, TileKind, GameState } from '../types/game';
import { DEFAULT_SETTINGS } from '../types/game';

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

// テスト用モックデータ
const t = (id: string, kind: TileKind, isRed = false): Tile => ({ id, kind, isRed });

const MOCK_GAME_STATE: GameState = {
  phase: 'playing',
  round: 1,
  currentTurn: 'self',
  deck: [],
  doraTile: t('5s_r', '5s', true),
  lastDiscard: null,
  lastDiscardPlayerId: null,
  settings: DEFAULT_SETTINGS,
  players: [
    {
      id: 'self', name: 'プレイヤー1',
      hand: [t('1s_1', '1s'), t('3s_1', '3s'), t('5s_r', '5s', true), t('7s_1', '7s'), t('9s_1', '9s')],
      discards: [t('d1_1', '2s'), t('d1_2', '4s'), t('d1_3', '6s'), t('d1_4', '8s'), t('d1_5', 'hatsu'), t('d1_6', 'chun')],
      score: 40, isDealer: true, seatOrder: 0,
    },
    {
      id: 'p2', name: 'プレイヤー2',
      hand: [t('2s_2', '2s'), t('4s_2', '4s'), t('6s_2', '6s'), t('8s_1', '8s'), t('hatsu_1', 'hatsu')],
      discards: [t('d2_1', '1s'), t('d2_2', '3s'), t('d2_3', '5s'), t('d2_4', '7s'), t('d2_5', '9s'), t('d2_6', 'chun')],
      score: 40, isDealer: false, seatOrder: 1,
    },
    {
      id: 'p3', name: 'プレイヤー3',
      hand: [t('1s_2', '1s'), t('2s_3', '2s'), t('3s_2', '3s'), t('5s_1', '5s'), t('7s_2', '7s')],
      discards: [t('d3_1', '2s'), t('d3_2', '4s'), t('d3_3', '6s'), t('d3_4', '8s'), t('d3_5', 'hatsu'), t('d3_6', '1s')],
      score: 40, isDealer: false, seatOrder: 2,
    },
    {
      id: 'p4', name: 'プレイヤー4',
      hand: [t('6s_3', '6s'), t('8s_2', '8s'), t('9s_2', '9s'), t('hatsu_2', 'hatsu'), t('chun_2', 'chun')],
      discards: [t('d4_1', '1s'), t('d4_2', '3s'), t('d4_3', '5s'), t('d4_4', '7s'), t('d4_5', '9s')],
      score: 40, isDealer: false, seatOrder: 3,
    },
  ],
};

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
        <h1 className="flex items-center gap-2"><img src="/hive/images/vec_logo_soku-jong.svg" alt="速雀" className="h-7" /><span className="text-white font-bold text-lg">卓テスト</span></h1>
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
          shadows
        >
          <color attach="background" args={['#1a1a2e']} />
          <CameraUpdater x={x} y={y} z={z} fov={fov} />
          <TableScene gameState={MOCK_GAME_STATE} playerId="self" />
          <EffectComposer>
            <SSAO
              blendFunction={BlendFunction.MULTIPLY}
              samples={16}
              radius={0.1}
              intensity={15}
            />
            <Bloom
              intensity={0.15}
              luminanceThreshold={0.9}
              luminanceSmoothing={0.5}
            />
          </EffectComposer>
        </Canvas>
      </div>
    </div>
  );
};
