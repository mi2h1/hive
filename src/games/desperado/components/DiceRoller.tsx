import { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RigidBody, Physics, CuboidCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';

interface DiceRollerProps {
  onRollComplete: (die1: number, die2: number) => void;
  isRolling: boolean;
  onStartRoll: () => void;
  // 観戦モード用
  isSpectator?: boolean;
  forcedResult?: { die1: number; die2: number } | null;
  // ボタン表示制御
  showButton?: boolean;
}

// サイコロの面のUV座標マッピング（各面に数字を表示）
// 標準的なサイコロ: 対面の合計が7（1-6, 2-5, 3-4）
const DICE_FACES = {
  // Three.jsの立方体の面順序: +X, -X, +Y, -Y, +Z, -Z
  // 標準サイコロ配置: 1が上、6が下、2が前
  posX: 3, // 右面
  negX: 4, // 左面
  posY: 1, // 上面
  negY: 6, // 下面
  posZ: 2, // 前面
  negZ: 5, // 後面
};

// 各出目を上面にするための回転（Euler角）
const DICE_ROTATIONS: Record<number, [number, number, number]> = {
  1: [0, 0, 0],                          // 1が上（デフォルト）
  2: [-Math.PI / 2, 0, 0],               // 2が上
  3: [0, 0, Math.PI / 2],                // 3が上
  4: [0, 0, -Math.PI / 2],               // 4が上
  5: [Math.PI / 2, 0, 0],                // 5が上
  6: [Math.PI, 0, 0],                    // 6が上
};

// サイコロの上面を判定
function getDiceTopFace(rotation: THREE.Euler): number {
  const up = new THREE.Vector3(0, 1, 0);

  // 各面の法線ベクトル
  const normals = [
    { face: DICE_FACES.posY, normal: new THREE.Vector3(0, 1, 0) },  // +Y (1)
    { face: DICE_FACES.negY, normal: new THREE.Vector3(0, -1, 0) }, // -Y (6)
    { face: DICE_FACES.posX, normal: new THREE.Vector3(1, 0, 0) },  // +X (3)
    { face: DICE_FACES.negX, normal: new THREE.Vector3(-1, 0, 0) }, // -X (4)
    { face: DICE_FACES.posZ, normal: new THREE.Vector3(0, 0, 1) },  // +Z (2)
    { face: DICE_FACES.negZ, normal: new THREE.Vector3(0, 0, -1) }, // -Z (5)
  ];

  // 回転を適用
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

// サイコロメッシュ
function Dice({
  position,
  color,
  onStabilized,
  diceRef,
  canReport,
}: {
  position: [number, number, number];
  color: string;
  onStabilized: (face: number) => void;
  diceRef: React.RefObject<RapierRigidBody | null>;
  canReport: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isStable, setIsStable] = useState(false);
  const stableFrames = useRef(0);
  const hasReported = useRef(false);

  // canReportがfalseになったらリセット（次のロールに備える）
  useEffect(() => {
    if (!canReport) {
      hasReported.current = false;
      stableFrames.current = 0;
      setIsStable(false);
    }
  }, [canReport]);

  // サイコロのテクスチャを作成
  const materials = useRef<THREE.MeshStandardMaterial[]>([]);

  useEffect(() => {
    // 各面のテクスチャを作成
    const faceValues = [
      DICE_FACES.posX, // 右
      DICE_FACES.negX, // 左
      DICE_FACES.posY, // 上
      DICE_FACES.negY, // 下
      DICE_FACES.posZ, // 前
      DICE_FACES.negZ, // 後
    ];

    materials.current = faceValues.map((value) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      // 背景
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 128, 128);

      // 枠線
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 124, 124);

      // ドットを描画
      ctx.fillStyle = '#ffffff';
      const dotRadius = 12;
      const center = 64;
      const offset = 32;

      const drawDot = (x: number, y: number) => {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      };

      // 各数字のドット配置
      switch (value) {
        case 1:
          drawDot(center, center);
          break;
        case 2:
          drawDot(center - offset, center - offset);
          drawDot(center + offset, center + offset);
          break;
        case 3:
          drawDot(center - offset, center - offset);
          drawDot(center, center);
          drawDot(center + offset, center + offset);
          break;
        case 4:
          drawDot(center - offset, center - offset);
          drawDot(center + offset, center - offset);
          drawDot(center - offset, center + offset);
          drawDot(center + offset, center + offset);
          break;
        case 5:
          drawDot(center - offset, center - offset);
          drawDot(center + offset, center - offset);
          drawDot(center, center);
          drawDot(center - offset, center + offset);
          drawDot(center + offset, center + offset);
          break;
        case 6:
          drawDot(center - offset, center - offset);
          drawDot(center - offset, center);
          drawDot(center - offset, center + offset);
          drawDot(center + offset, center - offset);
          drawDot(center + offset, center);
          drawDot(center + offset, center + offset);
          break;
      }

      const texture = new THREE.CanvasTexture(canvas);
      return new THREE.MeshStandardMaterial({ map: texture });
    });
  }, [color]);

  useFrame(() => {
    // canReportがtrueになるまで（ボタンが押されるまで）は報告しない
    if (!diceRef.current || hasReported.current || !canReport) return;

    const velocity = diceRef.current.linvel();
    const angVel = diceRef.current.angvel();
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    const angSpeed = Math.sqrt(angVel.x ** 2 + angVel.y ** 2 + angVel.z ** 2);

    // サイコロが安定したかチェック
    if (speed < 0.1 && angSpeed < 0.1) {
      stableFrames.current++;
      if (stableFrames.current > 30 && !isStable) {
        setIsStable(true);
        hasReported.current = true;

        // 上面を判定
        const rotation = diceRef.current.rotation();
        const euler = new THREE.Euler().setFromQuaternion(
          new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w)
        );
        const topFace = getDiceTopFace(euler);
        onStabilized(topFace);
      }
    } else {
      stableFrames.current = 0;
    }
  });

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
      <mesh ref={meshRef} castShadow receiveShadow material={materials.current}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </RigidBody>
  );
}

// テーブル
function Table() {
  return (
    <>
      {/* 床 */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <CuboidCollider args={[10, 0.5, 10]} />
        <mesh receiveShadow>
          <boxGeometry args={[20, 1, 20]} />
          <meshStandardMaterial color="#2d4a3e" />
        </mesh>
      </RigidBody>

      {/* 壁（サイコロが転がり出ないように） */}
      <RigidBody type="fixed" position={[0, 1, -5]}>
        <CuboidCollider args={[10, 2, 0.1]} />
      </RigidBody>
      <RigidBody type="fixed" position={[0, 1, 5]}>
        <CuboidCollider args={[10, 2, 0.1]} />
      </RigidBody>
      <RigidBody type="fixed" position={[-5, 1, 0]}>
        <CuboidCollider args={[0.1, 2, 10]} />
      </RigidBody>
      <RigidBody type="fixed" position={[5, 1, 0]}>
        <CuboidCollider args={[0.1, 2, 10]} />
      </RigidBody>
    </>
  );
}

// シーン
function Scene({
  onRollComplete,
  isRolling,
  isSpectator,
  forcedResult,
}: {
  onRollComplete: (die1: number, die2: number) => void;
  isRolling: boolean;
  isSpectator?: boolean;
  forcedResult?: { die1: number; die2: number } | null;
}) {
  const dice1Ref = useRef<RapierRigidBody>(null);
  const dice2Ref = useRef<RapierRigidBody>(null);
  const [dice1Face, setDice1Face] = useState<number | null>(null);
  const [dice2Face, setDice2Face] = useState<number | null>(null);
  const [canReport, setCanReport] = useState(false);
  const hasStartedRoll = useRef(false);
  const hasReportedForcedResult = useRef(false);

  // ダイスを振る
  const rollDice = useCallback(() => {
    if (!dice1Ref.current || !dice2Ref.current) return;

    // 位置をリセット
    dice1Ref.current.setTranslation({ x: -1.5, y: 5, z: 0 }, true);
    dice2Ref.current.setTranslation({ x: 1.5, y: 5, z: 0 }, true);

    // ランダムな回転
    const randomRotation1 = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      )
    );
    const randomRotation2 = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      )
    );
    dice1Ref.current.setRotation(randomRotation1, true);
    dice2Ref.current.setRotation(randomRotation2, true);

    // ランダムな初速
    const impulse1 = {
      x: (Math.random() - 0.5) * 5,
      y: -2,
      z: (Math.random() - 0.5) * 5,
    };
    const impulse2 = {
      x: (Math.random() - 0.5) * 5,
      y: -2,
      z: (Math.random() - 0.5) * 5,
    };
    dice1Ref.current.setLinvel(impulse1, true);
    dice2Ref.current.setLinvel(impulse2, true);

    // ランダムな回転速度
    const torque1 = {
      x: (Math.random() - 0.5) * 20,
      y: (Math.random() - 0.5) * 20,
      z: (Math.random() - 0.5) * 20,
    };
    const torque2 = {
      x: (Math.random() - 0.5) * 20,
      y: (Math.random() - 0.5) * 20,
      z: (Math.random() - 0.5) * 20,
    };
    dice1Ref.current.setAngvel(torque1, true);
    dice2Ref.current.setAngvel(torque2, true);

    // 状態リセット
    setDice1Face(null);
    setDice2Face(null);
    // 少し遅延してからcanReportをtrueに（ダイスが動き始めてから）
    setTimeout(() => setCanReport(true), 200);
  }, []);

  // isRollingが true になったら振る
  useEffect(() => {
    if (isRolling && !hasStartedRoll.current) {
      hasStartedRoll.current = true;
      // 物理シミュレーションが再開されるのを待ってから振る
      requestAnimationFrame(() => {
        rollDice();
      });
    }
    if (!isRolling) {
      hasStartedRoll.current = false;
      setCanReport(false);
    }
  }, [isRolling, rollDice]);

  // 両方のサイコロが安定したら結果を返す（観戦モードでない場合のみ）
  useEffect(() => {
    if (!isSpectator && dice1Face !== null && dice2Face !== null) {
      onRollComplete(dice1Face, dice2Face);
    }
  }, [dice1Face, dice2Face, onRollComplete, isSpectator]);

  // 観戦モード: 強制結果が来たらダイスを正しい向きに回転
  useEffect(() => {
    if (isSpectator && forcedResult && !hasReportedForcedResult.current) {
      hasReportedForcedResult.current = true;
      setDice1Face(forcedResult.die1);
      setDice2Face(forcedResult.die2);
      setCanReport(false); // これ以上の報告を止める

      // ダイスを正しい向きに設定
      if (dice1Ref.current && dice2Ref.current) {
        // テーブル上の固定位置に移動
        dice1Ref.current.setTranslation({ x: -1.5, y: 0.5, z: 0 }, true);
        dice2Ref.current.setTranslation({ x: 1.5, y: 0.5, z: 0 }, true);

        // 速度をゼロにして止める
        dice1Ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        dice2Ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        dice1Ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        dice2Ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true);

        // 正しい出目が上を向くように回転を設定
        const rotation1 = DICE_ROTATIONS[forcedResult.die1] || [0, 0, 0];
        const rotation2 = DICE_ROTATIONS[forcedResult.die2] || [0, 0, 0];

        const quat1 = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(rotation1[0], rotation1[1], rotation1[2])
        );
        const quat2 = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(rotation2[0], rotation2[1], rotation2[2])
        );

        dice1Ref.current.setRotation(quat1, true);
        dice2Ref.current.setRotation(quat2, true);
      }
    }
    // forcedResultがnullになったらリセット
    if (!forcedResult) {
      hasReportedForcedResult.current = false;
    }
  }, [isSpectator, forcedResult]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-5, 5, -5]} intensity={0.5} />

      <Table />

      <Dice
        position={[-1.5, 0.5, 0]}
        color="#dc2626"
        onStabilized={setDice1Face}
        diceRef={dice1Ref}
        canReport={canReport}
      />
      <Dice
        position={[1.5, 0.5, 0]}
        color="#dc2626"
        onStabilized={setDice2Face}
        diceRef={dice2Ref}
        canReport={canReport}
      />
    </>
  );
}

export const DiceRoller = ({
  onRollComplete,
  isRolling,
  onStartRoll,
  isSpectator = false,
  forcedResult,
  showButton,
}: DiceRollerProps) => {
  // 観戦モードで結果が来たら物理シミュレーションを止める
  const shouldPausePhysics = !isRolling || (isSpectator && forcedResult !== null && forcedResult !== undefined);

  return (
    <div className="relative w-full h-64 bg-slate-900 rounded-xl overflow-hidden">
      <Canvas
        shadows
        camera={{ position: [0, 8, 8], fov: 45 }}
      >
        <Physics gravity={[0, -20, 0]} paused={shouldPausePhysics}>
          <Scene
            onRollComplete={onRollComplete}
            isRolling={isRolling}
            isSpectator={isSpectator}
            forcedResult={forcedResult}
          />
        </Physics>
      </Canvas>

      {/* ボタン表示 */}
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
