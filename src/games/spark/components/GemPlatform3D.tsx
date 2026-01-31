import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Environment } from '@react-three/drei';
import type { RigidBody as RigidBodyType } from '@dimforge/rapier3d-compat';
import type { GemColor } from '../types/game';

// 宝石の色定義（原色に近く）
const gemColors: Record<GemColor, { color: string; emissive: string }> = {
  blue: { color: '#0055ff', emissive: '#0033aa' },
  yellow: { color: '#ffdd00', emissive: '#aa9900' },
  red: { color: '#ff1100', emissive: '#aa0000' },
  white: { color: '#ffffff', emissive: '#aaaaaa' },
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
      restitution={0.5}
      friction={0.4}
      linearDamping={0.5}
      angularDamping={0.5}
      linearVelocity={[0, -3, 0]}
    >
      <mesh castShadow receiveShadow>
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial
          color={colorConfig.color}
          emissive={colorConfig.emissive}
          emissiveIntensity={0.3}
          metalness={0.4}
          roughness={0.1}
          envMapIntensity={1.5}
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
  // 各宝石の初期位置・回転を決定（完全ランダム）
  // シーンがリマウントされるたびに新しい位置が生成される
  const gemConfigs = useMemo(() => {
    return gems.slice(0, 9).map((gem, index) => {
      // 初期位置（上から落とす）- ランダムに散らばらせる
      const x = (Math.random() - 0.5) * 3.5;
      const y = 2.5 + index * 0.8 + Math.random() * 0.3;
      const z = (Math.random() - 0.5) * 3.5;

      // 初期回転もランダム
      const rx = Math.random() * Math.PI * 2;
      const ry = Math.random() * Math.PI * 2;
      const rz = Math.random() * Math.PI * 2;

      return {
        ...gem,
        initialPosition: [x, y, z] as [number, number, number],
        initialRotation: [rx, ry, rz] as [number, number, number],
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gems.length]);

  return (
    <>
      {/* 環境マップ（反射・屈折用） */}
      <Environment preset="city" />

      {/* ライティング */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[512, 512]}
      />
      <pointLight position={[-3, 5, -3]} intensity={0.8} color="#fef3c7" />
      <pointLight position={[3, 3, 3]} intensity={0.5} color="#ffffff" />

      {/* 物理シミュレーション */}
      <Physics gravity={[0, -20, 0]}>
        {/* 台（床）- 宝石の先端が埋まらないよう下げる */}
        <RigidBody type="fixed" position={[0, -0.8, 0]}>
          <CuboidCollider args={[2.25, 0.1, 2.25]} />
          <mesh receiveShadow>
            <boxGeometry args={[4.5, 0.2, 4.5]} />
            <meshStandardMaterial
              color="#1e293b"
              metalness={0.1}
              roughness={0.8}
            />
          </mesh>
        </RigidBody>

        {/* 見えない壁（宝石が落ちないように） */}
        <RigidBody type="fixed" position={[0, 0, -2.4]}>
          <CuboidCollider args={[2.4, 1.5, 0.1]} />
        </RigidBody>
        <RigidBody type="fixed" position={[0, 0, 2.4]}>
          <CuboidCollider args={[2.4, 1.5, 0.1]} />
        </RigidBody>
        <RigidBody type="fixed" position={[-2.4, 0, 0]}>
          <CuboidCollider args={[0.1, 1.5, 2.4]} />
        </RigidBody>
        <RigidBody type="fixed" position={[2.4, 0, 0]}>
          <CuboidCollider args={[0.1, 1.5, 2.4]} />
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

  // インフォパネルと同じ背景色（slate-800）
  const bgColor = '#1e293b';

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
        camera={{ position: [0, 8, 0.01], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={[bgColor]} />
        <PlatformScene gems={gems} />
      </Canvas>
    </div>
  );
};
