import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import type { RigidBody as RigidBodyType } from '@dimforge/rapier3d-compat';
import type { GemColor } from '../types/game';

// 宝石の色定義（MeshStandardMaterial用）
const gemColors: Record<GemColor, { color: string; emissive: string }> = {
  blue: { color: '#3b82f6', emissive: '#1e40af' },
  yellow: { color: '#fbbf24', emissive: '#b45309' },
  red: { color: '#ef4444', emissive: '#b91c1c' },
  white: { color: '#f1f5f9', emissive: '#94a3b8' },
};

interface Gem3DProps {
  id: string;
  color: GemColor;
  initialPosition: [number, number, number];
  initialRotation: [number, number, number];
}

// 個別の宝石コンポーネント
const Gem3D = ({ color, initialPosition, initialRotation }: Gem3DProps) => {
  const rigidBodyRef = useRef<RigidBodyType>(null);
  const [isSleeping, setIsSleeping] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const colorConfig = gemColors[color];

  // 宝石が静止したかチェック（少し待ってから判定開始）
  useFrame(() => {
    setFrameCount(prev => prev + 1);

    if (rigidBodyRef.current && !isSleeping && frameCount > 60) {
      const vel = rigidBodyRef.current.linvel();
      const angVel = rigidBodyRef.current.angvel();
      const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
      const angSpeed = Math.sqrt(angVel.x ** 2 + angVel.y ** 2 + angVel.z ** 2);

      if (speed < 0.05 && angSpeed < 0.05) {
        setIsSleeping(true);
        rigidBodyRef.current.setEnabled(false);
      }
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={initialPosition}
      rotation={initialRotation}
      colliders="hull"
      restitution={0.3}
      friction={0.8}
      linearDamping={0.3}
      angularDamping={0.3}
      linearVelocity={[0, -2, 0]}
    >
      <mesh castShadow receiveShadow>
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial
          color={colorConfig.color}
          emissive={colorConfig.emissive}
          emissiveIntensity={0.2}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>
    </RigidBody>
  );
};

interface GemPlatform3DProps {
  gems: { id: string; color: GemColor }[];
  className?: string;
}

// 宝石台のシーン
const PlatformScene = ({ gems }: { gems: { id: string; color: GemColor }[] }) => {
  // 各宝石の初期位置・回転を決定（gemのidベースで決定的に）
  const gemConfigs = useMemo(() => {
    return gems.slice(0, 9).map((gem, index) => {
      // IDから決定的な乱数を生成
      const hash = gem.id.split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0);
      }, 0);

      const random = (offset: number) => {
        const val = Math.abs((hash + offset * 12345) % 10000) / 10000;
        return val;
      };

      // 初期位置（上から落とす）
      const x = (random(0) - 0.5) * 1.5;
      const y = 2 + index * 0.5 + random(1) * 0.5;
      const z = (random(2) - 0.5) * 1.5;

      // 初期回転
      const rx = random(3) * Math.PI * 2;
      const ry = random(4) * Math.PI * 2;
      const rz = random(5) * Math.PI * 2;

      return {
        ...gem,
        initialPosition: [x, y, z] as [number, number, number],
        initialRotation: [rx, ry, rz] as [number, number, number],
      };
    });
  }, [gems]);

  return (
    <>
      {/* ライティング */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[512, 512]}
      />
      <pointLight position={[-3, 5, -3]} intensity={0.5} color="#fef3c7" />

      {/* 物理シミュレーション */}
      <Physics gravity={[0, -15, 0]}>
        {/* 台（床） */}
        <RigidBody type="fixed" position={[0, -0.1, 0]}>
          <CuboidCollider args={[1.5, 0.1, 1.5]} />
          <mesh receiveShadow>
            <boxGeometry args={[3, 0.2, 3]} />
            <meshStandardMaterial
              color="#334155"
              metalness={0.1}
              roughness={0.8}
            />
          </mesh>
        </RigidBody>

        {/* 壁（宝石が落ちないように） */}
        <RigidBody type="fixed" position={[0, 0.5, -1.6]}>
          <CuboidCollider args={[1.5, 0.5, 0.1]} />
        </RigidBody>
        <RigidBody type="fixed" position={[0, 0.5, 1.6]}>
          <CuboidCollider args={[1.5, 0.5, 0.1]} />
        </RigidBody>
        <RigidBody type="fixed" position={[-1.6, 0.5, 0]}>
          <CuboidCollider args={[0.1, 0.5, 1.5]} />
        </RigidBody>
        <RigidBody type="fixed" position={[1.6, 0.5, 0]}>
          <CuboidCollider args={[0.1, 0.5, 1.5]} />
        </RigidBody>

        {/* 宝石 */}
        {gemConfigs.map((gem) => (
          <Gem3D
            key={gem.id}
            id={gem.id}
            color={gem.color}
            initialPosition={gem.initialPosition}
            initialRotation={gem.initialRotation}
          />
        ))}
      </Physics>
    </>
  );
};

export const GemPlatform3D = ({ gems, className = '' }: GemPlatform3DProps) => {
  const [key, setKey] = useState(0);

  // gems が変更されたらシーンをリセット
  useEffect(() => {
    setKey(prev => prev + 1);
  }, [gems.map(g => g.id).join(',')]);

  const platformSize = 180;

  // 外側と同じ背景色（slate-700）
  const bgColor = '#334155';

  if (gems.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg ${className}`}
        style={{ width: platformSize, height: platformSize, backgroundColor: bgColor }}
      >
        <span className="text-slate-500 text-sm">空</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg overflow-hidden ${className}`}
      style={{ width: platformSize, height: platformSize, backgroundColor: bgColor }}
    >
      <Canvas
        key={key}
        shadows
        camera={{ position: [0, 6, 3], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={[bgColor]} />
        <PlatformScene gems={gems} />
      </Canvas>
    </div>
  );
};
