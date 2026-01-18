import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Environment } from '@react-three/drei';
import type { RigidBody as RigidBodyType } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { GemColor } from '../types/game';

// 宝石の色定義（MeshPhysicalMaterial用）
const gemColors: Record<GemColor, { color: string; emissive: string }> = {
  blue: { color: '#60a5fa', emissive: '#1e40af' },
  yellow: { color: '#fcd34d', emissive: '#b45309' },
  red: { color: '#f87171', emissive: '#b91c1c' },
  white: { color: '#f8fafc', emissive: '#cbd5e1' },
};

// ブリリアントカットのジオメトリを作成
const createBrilliantCutGeometry = (): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();

  // パラメータ
  const tableRadius = 0.22;    // テーブル面の半径
  const crownRadius = 0.35;    // クラウン（最大幅）の半径
  const girdleHeight = 0.05;   // ガードルの高さ
  const crownHeight = 0.15;    // クラウンの高さ
  const pavilionDepth = 0.35;  // パビリオンの深さ
  const segments = 8;          // 面の数

  const vertices: number[] = [];
  const indices: number[] = [];

  // 頂点を追加するヘルパー
  const addVertex = (x: number, y: number, z: number) => {
    vertices.push(x, y, z);
    return vertices.length / 3 - 1;
  };

  // 中心点
  const topCenter = addVertex(0, crownHeight + girdleHeight / 2, 0);
  const bottomPoint = addVertex(0, -(pavilionDepth + girdleHeight / 2), 0);

  // テーブル面の頂点（上部の平らな面）
  const tableVertices: number[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    tableVertices.push(
      addVertex(
        Math.cos(angle) * tableRadius,
        crownHeight + girdleHeight / 2,
        Math.sin(angle) * tableRadius
      )
    );
  }

  // クラウン（ガードル位置）の頂点
  const crownVertices: number[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    crownVertices.push(
      addVertex(
        Math.cos(angle) * crownRadius,
        girdleHeight / 2,
        Math.sin(angle) * crownRadius
      )
    );
  }

  // ガードル下の頂点
  const girdleBottomVertices: number[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    girdleBottomVertices.push(
      addVertex(
        Math.cos(angle) * crownRadius,
        -girdleHeight / 2,
        Math.sin(angle) * crownRadius
      )
    );
  }

  // テーブル面（上部の八角形）
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(topCenter, tableVertices[i], tableVertices[next]);
  }

  // クラウンファセット（テーブルからガードルへ）
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    // 三角形1
    indices.push(tableVertices[i], crownVertices[i], tableVertices[next]);
    // 三角形2
    indices.push(tableVertices[next], crownVertices[i], crownVertices[next]);
  }

  // ガードル（側面の帯）
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(crownVertices[i], girdleBottomVertices[i], crownVertices[next]);
    indices.push(crownVertices[next], girdleBottomVertices[i], girdleBottomVertices[next]);
  }

  // パビリオンファセット（ガードルから先端へ）
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(girdleBottomVertices[i], bottomPoint, girdleBottomVertices[next]);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
};

// ブリリアントカットジオメトリをキャッシュ
const brilliantGeometry = createBrilliantCutGeometry();

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
      <mesh castShadow receiveShadow geometry={brilliantGeometry}>
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
      <Physics gravity={[0, -15, 0]}>
        {/* 台（床）- 宝石の先端が埋まらないよう下げる */}
        <RigidBody type="fixed" position={[0, -0.8, 0]}>
          <CuboidCollider args={[1.5, 0.1, 1.5]} />
          <mesh receiveShadow>
            <boxGeometry args={[3, 0.2, 3]} />
            <meshStandardMaterial
              color="#1e293b"
              metalness={0.1}
              roughness={0.8}
            />
          </mesh>
        </RigidBody>

        {/* 見えない壁（宝石が落ちないように） */}
        <RigidBody type="fixed" position={[0, 0, -1.6]}>
          <CuboidCollider args={[1.6, 1.5, 0.1]} />
        </RigidBody>
        <RigidBody type="fixed" position={[0, 0, 1.6]}>
          <CuboidCollider args={[1.6, 1.5, 0.1]} />
        </RigidBody>
        <RigidBody type="fixed" position={[-1.6, 0, 0]}>
          <CuboidCollider args={[0.1, 1.5, 1.6]} />
        </RigidBody>
        <RigidBody type="fixed" position={[1.6, 0, 0]}>
          <CuboidCollider args={[0.1, 1.5, 1.6]} />
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
        camera={{ position: [0, 6, 3], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={[bgColor]} />
        <PlatformScene gems={gems} />
      </Canvas>
    </div>
  );
};
