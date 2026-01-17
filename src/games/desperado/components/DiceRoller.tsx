import { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RigidBody, Physics, CuboidCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import type { DiceAnimation, DiceKeyframe } from '../types/game';

interface DiceRollerProps {
  onRollComplete: (die1: number, die2: number, animation: DiceAnimation) => void;
  isRolling: boolean;
  onStartRoll: () => void;
  // 観戦モード用
  isSpectator?: boolean;
  animation?: DiceAnimation | null;
  // ボタン表示制御
  showButton?: boolean;
}

// キーフレーム記録間隔（ms）- 約20fpsで記録
const KEYFRAME_INTERVAL = 50;

// サイコロの面のUV座標マッピング（各面に数字を表示）
const DICE_FACES = {
  posX: 3, negX: 4, posY: 1, negY: 6, posZ: 2, negZ: 5,
};

// サイコロの上面を判定
function getDiceTopFace(rotation: THREE.Euler): number {
  const up = new THREE.Vector3(0, 1, 0);
  const normals = [
    { face: DICE_FACES.posY, normal: new THREE.Vector3(0, 1, 0) },
    { face: DICE_FACES.negY, normal: new THREE.Vector3(0, -1, 0) },
    { face: DICE_FACES.posX, normal: new THREE.Vector3(1, 0, 0) },
    { face: DICE_FACES.negX, normal: new THREE.Vector3(-1, 0, 0) },
    { face: DICE_FACES.posZ, normal: new THREE.Vector3(0, 0, 1) },
    { face: DICE_FACES.negZ, normal: new THREE.Vector3(0, 0, -1) },
  ];
  const quaternion = new THREE.Quaternion().setFromEuler(rotation);
  let maxDot = -Infinity;
  let topFace = 1;
  for (const { face, normal } of normals) {
    const rotatedNormal = normal.clone().applyQuaternion(quaternion);
    const dot = rotatedNormal.dot(up);
    if (dot > maxDot) {
      maxDot = dot;
      topFace = face;
    }
  }
  return topFace;
}

// サイコロのマテリアルを作成
function createDiceMaterials(color: string): THREE.MeshStandardMaterial[] {
  const faceValues = [
    DICE_FACES.posX, DICE_FACES.negX, DICE_FACES.posY,
    DICE_FACES.negY, DICE_FACES.posZ, DICE_FACES.negZ,
  ];

  return faceValues.map((value) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 124);

    ctx.fillStyle = '#ffffff';
    const dotRadius = 12;
    const center = 64;
    const offset = 32;

    const drawDot = (x: number, y: number) => {
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    };

    switch (value) {
      case 1: drawDot(center, center); break;
      case 2: drawDot(center - offset, center - offset); drawDot(center + offset, center + offset); break;
      case 3: drawDot(center - offset, center - offset); drawDot(center, center); drawDot(center + offset, center + offset); break;
      case 4: drawDot(center - offset, center - offset); drawDot(center + offset, center - offset); drawDot(center - offset, center + offset); drawDot(center + offset, center + offset); break;
      case 5: drawDot(center - offset, center - offset); drawDot(center + offset, center - offset); drawDot(center, center); drawDot(center - offset, center + offset); drawDot(center + offset, center + offset); break;
      case 6: drawDot(center - offset, center - offset); drawDot(center - offset, center); drawDot(center - offset, center + offset); drawDot(center + offset, center - offset); drawDot(center + offset, center); drawDot(center + offset, center + offset); break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({ map: texture });
  });
}

// ===== 物理シミュレーション用サイコロ =====
function PhysicsDice({
  position,
  color,
  diceRef,
}: {
  position: [number, number, number];
  color: string;
  diceRef: React.RefObject<RapierRigidBody | null>;
}) {
  const materials = useRef<THREE.MeshStandardMaterial[]>(createDiceMaterials(color));

  return (
    <RigidBody
      ref={diceRef}
      position={position}
      colliders="cuboid"
      restitution={0.3}
      friction={0.8}
      linearDamping={0.5}
      angularDamping={0.5}
    >
      <mesh castShadow receiveShadow material={materials.current}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </RigidBody>
  );
}

// ===== キーフレーム再生用サイコロ =====
function PlaybackDice({ color }: { color: string }) {
  const materials = useRef<THREE.MeshStandardMaterial[]>(createDiceMaterials(color));

  return (
    <mesh castShadow receiveShadow material={materials.current}>
      <boxGeometry args={[1, 1, 1]} />
    </mesh>
  );
}

// テーブル（物理あり）
function PhysicsTable() {
  return (
    <>
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <CuboidCollider args={[10, 0.5, 10]} />
        <mesh receiveShadow>
          <boxGeometry args={[20, 1, 20]} />
          <meshStandardMaterial color="#2d4a3e" />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[0, 1, -5]}><CuboidCollider args={[10, 2, 0.1]} /></RigidBody>
      <RigidBody type="fixed" position={[0, 1, 5]}><CuboidCollider args={[10, 2, 0.1]} /></RigidBody>
      <RigidBody type="fixed" position={[-5, 1, 0]}><CuboidCollider args={[0.1, 2, 10]} /></RigidBody>
      <RigidBody type="fixed" position={[5, 1, 0]}><CuboidCollider args={[0.1, 2, 10]} /></RigidBody>
    </>
  );
}

// テーブル（表示のみ）
function StaticTable() {
  return (
    <mesh receiveShadow position={[0, -0.5, 0]}>
      <boxGeometry args={[20, 1, 20]} />
      <meshStandardMaterial color="#2d4a3e" />
    </mesh>
  );
}

// 照明
function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-5, 5, -5]} intensity={0.5} />
    </>
  );
}

// ===== 物理シミュレーション＆キーフレーム記録シーン =====
function RecordingScene({
  onComplete,
  isRolling,
}: {
  onComplete: (die1: number, die2: number, animation: DiceAnimation) => void;
  isRolling: boolean;
}) {
  const dice1Ref = useRef<RapierRigidBody>(null);
  const dice2Ref = useRef<RapierRigidBody>(null);
  const keyframesRef = useRef<DiceKeyframe[]>([]);
  const startTimeRef = useRef<number>(0);
  const lastKeyframeTimeRef = useRef<number>(0);
  const stableFrames = useRef(0);
  const hasCompleted = useRef(false);
  const hasStartedRoll = useRef(false);

  // ダイスを振る
  const rollDice = useCallback(() => {
    if (!dice1Ref.current || !dice2Ref.current) return;

    // リセット
    keyframesRef.current = [];
    startTimeRef.current = performance.now();
    lastKeyframeTimeRef.current = 0;
    stableFrames.current = 0;
    hasCompleted.current = false;

    // 位置をリセット
    dice1Ref.current.setTranslation({ x: -1.5, y: 5, z: 0 }, true);
    dice2Ref.current.setTranslation({ x: 1.5, y: 5, z: 0 }, true);

    // ランダムな回転
    const randomRotation1 = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
    );
    const randomRotation2 = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
    );
    dice1Ref.current.setRotation(randomRotation1, true);
    dice2Ref.current.setRotation(randomRotation2, true);

    // ランダムな初速
    dice1Ref.current.setLinvel({ x: (Math.random() - 0.5) * 5, y: -2, z: (Math.random() - 0.5) * 5 }, true);
    dice2Ref.current.setLinvel({ x: (Math.random() - 0.5) * 5, y: -2, z: (Math.random() - 0.5) * 5 }, true);

    // ランダムな回転速度
    dice1Ref.current.setAngvel({ x: (Math.random() - 0.5) * 20, y: (Math.random() - 0.5) * 20, z: (Math.random() - 0.5) * 20 }, true);
    dice2Ref.current.setAngvel({ x: (Math.random() - 0.5) * 20, y: (Math.random() - 0.5) * 20, z: (Math.random() - 0.5) * 20 }, true);
  }, []);

  // isRollingが true になったら振る
  useEffect(() => {
    if (isRolling && !hasStartedRoll.current) {
      hasStartedRoll.current = true;
      requestAnimationFrame(() => rollDice());
    }
    if (!isRolling) {
      hasStartedRoll.current = false;
    }
  }, [isRolling, rollDice]);

  // 毎フレーム: キーフレーム記録 & 安定判定
  useFrame(() => {
    if (!isRolling || hasCompleted.current) return;
    if (!dice1Ref.current || !dice2Ref.current) return;

    const now = performance.now();
    const elapsed = now - startTimeRef.current;

    // キーフレーム記録
    if (elapsed - lastKeyframeTimeRef.current >= KEYFRAME_INTERVAL) {
      lastKeyframeTimeRef.current = elapsed;

      const pos1 = dice1Ref.current.translation();
      const rot1 = dice1Ref.current.rotation();
      const pos2 = dice2Ref.current.translation();
      const rot2 = dice2Ref.current.rotation();

      keyframesRef.current.push({
        t: Math.round(elapsed),
        d1: {
          p: [Math.round(pos1.x * 100) / 100, Math.round(pos1.y * 100) / 100, Math.round(pos1.z * 100) / 100],
          r: [Math.round(rot1.x * 1000) / 1000, Math.round(rot1.y * 1000) / 1000, Math.round(rot1.z * 1000) / 1000, Math.round(rot1.w * 1000) / 1000],
        },
        d2: {
          p: [Math.round(pos2.x * 100) / 100, Math.round(pos2.y * 100) / 100, Math.round(pos2.z * 100) / 100],
          r: [Math.round(rot2.x * 1000) / 1000, Math.round(rot2.y * 1000) / 1000, Math.round(rot2.z * 1000) / 1000, Math.round(rot2.w * 1000) / 1000],
        },
      });
    }

    // 安定判定
    const vel1 = dice1Ref.current.linvel();
    const vel2 = dice2Ref.current.linvel();
    const angVel1 = dice1Ref.current.angvel();
    const angVel2 = dice2Ref.current.angvel();

    const speed1 = Math.sqrt(vel1.x ** 2 + vel1.y ** 2 + vel1.z ** 2);
    const speed2 = Math.sqrt(vel2.x ** 2 + vel2.y ** 2 + vel2.z ** 2);
    const angSpeed1 = Math.sqrt(angVel1.x ** 2 + angVel1.y ** 2 + angVel1.z ** 2);
    const angSpeed2 = Math.sqrt(angVel2.x ** 2 + angVel2.y ** 2 + angVel2.z ** 2);

    if (speed1 < 0.1 && speed2 < 0.1 && angSpeed1 < 0.1 && angSpeed2 < 0.1) {
      stableFrames.current++;
      if (stableFrames.current > 30) {
        hasCompleted.current = true;

        // 最終キーフレームを追加
        const pos1 = dice1Ref.current.translation();
        const rot1 = dice1Ref.current.rotation();
        const pos2 = dice2Ref.current.translation();
        const rot2 = dice2Ref.current.rotation();

        keyframesRef.current.push({
          t: Math.round(elapsed),
          d1: {
            p: [Math.round(pos1.x * 100) / 100, Math.round(pos1.y * 100) / 100, Math.round(pos1.z * 100) / 100],
            r: [Math.round(rot1.x * 1000) / 1000, Math.round(rot1.y * 1000) / 1000, Math.round(rot1.z * 1000) / 1000, Math.round(rot1.w * 1000) / 1000],
          },
          d2: {
            p: [Math.round(pos2.x * 100) / 100, Math.round(pos2.y * 100) / 100, Math.round(pos2.z * 100) / 100],
            r: [Math.round(rot2.x * 1000) / 1000, Math.round(rot2.y * 1000) / 1000, Math.round(rot2.z * 1000) / 1000, Math.round(rot2.w * 1000) / 1000],
          },
        });

        // 出目を判定
        const euler1 = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(rot1.x, rot1.y, rot1.z, rot1.w));
        const euler2 = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(rot2.x, rot2.y, rot2.z, rot2.w));
        const die1 = getDiceTopFace(euler1);
        const die2 = getDiceTopFace(euler2);

        onComplete(die1, die2, {
          frames: keyframesRef.current,
          result: { die1, die2 },
        });
      }
    } else {
      stableFrames.current = 0;
    }
  });

  return (
    <>
      <Lights />
      <PhysicsTable />
      <PhysicsDice position={[-1.5, 0.5, 0]} color="#dc2626" diceRef={dice1Ref} />
      <PhysicsDice position={[1.5, 0.5, 0]} color="#dc2626" diceRef={dice2Ref} />
    </>
  );
}

// ===== キーフレーム再生シーン =====
function PlaybackScene({ animation }: { animation: DiceAnimation }) {
  const dice1Ref = useRef<THREE.Group>(null);
  const dice2Ref = useRef<THREE.Group>(null);
  const startTimeRef = useRef<number | null>(null);

  useFrame(() => {
    if (!dice1Ref.current || !dice2Ref.current || animation.frames.length === 0) return;

    if (startTimeRef.current === null) {
      startTimeRef.current = performance.now();
    }

    const elapsed = performance.now() - startTimeRef.current;
    const frames = animation.frames;

    // 現在のフレームを探す
    let frameIndex = 0;
    for (let i = 0; i < frames.length - 1; i++) {
      if (elapsed >= frames[i].t && elapsed < frames[i + 1].t) {
        frameIndex = i;
        break;
      }
      if (elapsed >= frames[frames.length - 1].t) {
        frameIndex = frames.length - 1;
      }
    }

    const currentFrame = frames[frameIndex];
    const nextFrame = frames[Math.min(frameIndex + 1, frames.length - 1)];

    // 補間係数
    const frameDuration = nextFrame.t - currentFrame.t;
    const t = frameDuration > 0 ? Math.min((elapsed - currentFrame.t) / frameDuration, 1) : 1;

    // 線形補間で位置を設定
    dice1Ref.current.position.set(
      currentFrame.d1.p[0] + (nextFrame.d1.p[0] - currentFrame.d1.p[0]) * t,
      currentFrame.d1.p[1] + (nextFrame.d1.p[1] - currentFrame.d1.p[1]) * t,
      currentFrame.d1.p[2] + (nextFrame.d1.p[2] - currentFrame.d1.p[2]) * t
    );
    dice2Ref.current.position.set(
      currentFrame.d2.p[0] + (nextFrame.d2.p[0] - currentFrame.d2.p[0]) * t,
      currentFrame.d2.p[1] + (nextFrame.d2.p[1] - currentFrame.d2.p[1]) * t,
      currentFrame.d2.p[2] + (nextFrame.d2.p[2] - currentFrame.d2.p[2]) * t
    );

    // 球面線形補間で回転を設定
    const quat1From = new THREE.Quaternion(currentFrame.d1.r[0], currentFrame.d1.r[1], currentFrame.d1.r[2], currentFrame.d1.r[3]);
    const quat1To = new THREE.Quaternion(nextFrame.d1.r[0], nextFrame.d1.r[1], nextFrame.d1.r[2], nextFrame.d1.r[3]);
    const quat2From = new THREE.Quaternion(currentFrame.d2.r[0], currentFrame.d2.r[1], currentFrame.d2.r[2], currentFrame.d2.r[3]);
    const quat2To = new THREE.Quaternion(nextFrame.d2.r[0], nextFrame.d2.r[1], nextFrame.d2.r[2], nextFrame.d2.r[3]);

    dice1Ref.current.quaternion.slerpQuaternions(quat1From, quat1To, t);
    dice2Ref.current.quaternion.slerpQuaternions(quat2From, quat2To, t);
  });

  return (
    <>
      <Lights />
      <StaticTable />
      <group ref={dice1Ref} position={[-1.5, 0.5, 0]}>
        <PlaybackDice color="#dc2626" />
      </group>
      <group ref={dice2Ref} position={[1.5, 0.5, 0]}>
        <PlaybackDice color="#dc2626" />
      </group>
    </>
  );
}

// ===== 待機シーン =====
function IdleScene() {
  return (
    <>
      <Lights />
      <StaticTable />
      <group position={[-1.5, 0.5, 0]}>
        <PlaybackDice color="#dc2626" />
      </group>
      <group position={[1.5, 0.5, 0]}>
        <PlaybackDice color="#dc2626" />
      </group>
    </>
  );
}

export const DiceRoller = ({
  onRollComplete,
  isRolling,
  onStartRoll,
  isSpectator = false,
  animation,
  showButton,
}: DiceRollerProps) => {
  const [playbackKey, setPlaybackKey] = useState(0);

  // animationが変わったらキーをリセット（再生を最初から）
  useEffect(() => {
    if (animation) {
      setPlaybackKey(prev => prev + 1);
    }
  }, [animation]);

  // 観戦者モード
  if (isSpectator) {
    return (
      <div className="relative w-full h-64 bg-slate-900 rounded-xl overflow-hidden">
        <Canvas shadows camera={{ position: [0, 8, 8], fov: 45 }}>
          {animation ? (
            <PlaybackScene key={playbackKey} animation={animation} />
          ) : isRolling ? (
            <IdleScene />
          ) : (
            <IdleScene />
          )}
        </Canvas>
        {isRolling && !animation && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <p className="text-amber-400 animate-pulse">ダイスを振っています...</p>
          </div>
        )}
      </div>
    );
  }

  // 自分がダイスを振るモード
  return (
    <div className="relative w-full h-64 bg-slate-900 rounded-xl overflow-hidden">
      <Canvas shadows camera={{ position: [0, 8, 8], fov: 45 }}>
        <Physics gravity={[0, -20, 0]} paused={!isRolling}>
          <RecordingScene onComplete={onRollComplete} isRolling={isRolling} />
        </Physics>
      </Canvas>

      {showButton && (
        <button
          onClick={onStartRoll}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-8 py-3
            bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600
            rounded-lg text-white font-bold text-lg transition-all shadow-lg"
        >
          ダイスを振る
        </button>
      )}
    </div>
  );
};
